#!/usr/bin/env bash
# Creates the AWS resources this site runs on, in the account the AWS CLI is
# currently pointed at. Everything it makes is tagged, and aws-destroy.sh removes
# exactly those resources again.
#
#   AWS_REGION=eu-central-1 DOMAIN=example.com ./deploy/aws-provision.sh
#
# Safe to re-run: every step checks whether the resource already exists first, so
# a run interrupted half way through — waiting on DNS validation, most likely —
# picks up where it stopped.
#
# What it creates, and what it costs while it exists:
#   ALB              ~$16/month plus traffic   the only always-on charge worth noting
#   EC2 t3.small     ~$15/month                on-demand, one instance
#   EBS 20 GB gp3    ~$2/month
#   S3 bucket        cents                     backups
#   ACM certificate  free
#
# Pass --plan to print what would be created and change nothing.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=deploy/aws-lib.sh
source ./deploy/aws-lib.sh

PLAN=false
[ "${1:-}" = '--plan' ] && PLAN=true

DOMAIN="${DOMAIN:-}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"
VOLUME_SIZE="${VOLUME_SIZE:-20}"
KEY_NAME="${KEY_NAME:-}"
ADMIN_CIDR="${ADMIN_CIDR:-}"

require_tools
[ -n "$DOMAIN" ] || die 'set DOMAIN to the hostname the site will answer on (for example: DOMAIN=example.com)'

ACCOUNT=$(account_id)
BUCKET="${BACKUP_BUCKET:-${STACK}-backups-${ACCOUNT}}"
ALB_SG_NAME="${STACK}-alb"
APP_SG_NAME="${STACK}-app"
ROLE_NAME="${STACK}-instance"
PROFILE_NAME="${STACK}-instance"
TG_NAME="${STACK}-tg"
ALB_NAME="${STACK}-alb"
INSTANCE_NAME="${STACK}-app"

TAGS="ResourceType=%s,Tags=[{Key=Name,Value=%s},{Key=${TAG_KEY},Value=${TAG_VALUE}}]"

printf '%sPlan%s\n' "$c_bold" "$c_reset"
info "account       $ACCOUNT"
info "region        $AWS_REGION"
info "domain        $DOMAIN (and www.$DOMAIN)"
info "instance      $INSTANCE_TYPE, ${VOLUME_SIZE} GB gp3"
info "backups       s3://$BUCKET"
info "ssh key       ${KEY_NAME:-<none — use SSM Session Manager>}"
$PLAN && { printf '\n%s--plan: nothing was created.%s\n' "$c_dim" "$c_reset"; exit 0; }

# ---------------------------------------------------------------------------
step 'Network'

VPC=$(aws_ ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)
[ "$VPC" != 'None' ] && [ -n "$VPC" ] \
  || die 'no default VPC in this region. Create one with `aws ec2 create-default-vpc`, or set up networking yourself.'
ok "VPC $VPC"

# The load balancer needs two availability zones; take the default subnet in each.
mapfile -t SUBNETS < <(aws_ ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC" Name=default-for-az,Values=true \
  --query 'Subnets[].SubnetId' --output text | tr '\t' '\n' | sed '/^$/d')
[ "${#SUBNETS[@]}" -ge 2 ] \
  || die "need default subnets in at least two availability zones, found ${#SUBNETS[@]}"
ok "subnets ${SUBNETS[*]}"

if [ -z "$ADMIN_CIDR" ]; then
  my_ip=$(curl -fsS --max-time 10 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)
  if [ -n "$my_ip" ]; then
    ADMIN_CIDR="$my_ip/32"
    info "SSH will be opened to $ADMIN_CIDR (this machine). Override with ADMIN_CIDR."
  else
    warn 'could not detect your public IP; SSH will not be opened. Set ADMIN_CIDR to allow it.'
  fi
fi

# ---------------------------------------------------------------------------
step 'Security groups'

ensure_sg() { # name description -> group id on stdout
  local name=$1 desc=$2 id
  id=$(q ec2 describe-security-groups \
        --filters "Name=group-name,Values=$name" "Name=vpc-id,Values=$VPC" \
        | jq -r '.SecurityGroups[0].GroupId // empty')
  if [ -n "$id" ]; then
    skip "security group $name ($id)" >&2
  else
    local tags
    # shellcheck disable=SC2059  # TAGS is deliberately a format string
    tags=$(printf "$TAGS" security-group "$name")
    id=$(aws_ ec2 create-security-group --group-name "$name" --description "$desc" \
          --vpc-id "$VPC" --tag-specifications "$tags" \
          --query GroupId --output text)
    ok "security group $name ($id)" >&2
  fi
  printf '%s' "$id"
}

# Duplicate rules are not an error here; re-running the script must be harmless.
allow() {
  aws_ ec2 authorize-security-group-ingress --group-id "$1" --ip-permissions "$2" >/dev/null 2>&1 \
    || true
}

ALB_SG=$(ensure_sg "$ALB_SG_NAME" 'Public HTTPS for the portfolio load balancer')
APP_SG=$(ensure_sg "$APP_SG_NAME" 'Portfolio instance: Nginx from the load balancer only')

allow "$ALB_SG" 'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description="public HTTPS"}]'
allow "$ALB_SG" 'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description="redirected to HTTPS"}]'
# Nginx is reachable from the load balancer and from nowhere else.
allow "$APP_SG" "IpProtocol=tcp,FromPort=80,ToPort=80,UserIdGroupPairs=[{GroupId=$ALB_SG,Description=\"from the ALB\"}]"
[ -n "$ADMIN_CIDR" ] && \
  allow "$APP_SG" "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$ADMIN_CIDR,Description=\"admin ssh\"}]"
ok 'ingress rules applied'

# ---------------------------------------------------------------------------
step 'Backup bucket'

if aws_ s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  skip "s3://$BUCKET"
else
  if [ "$AWS_REGION" = 'us-east-1' ]; then
    aws_ s3api create-bucket --bucket "$BUCKET" >/dev/null
  else
    aws_ s3api create-bucket --bucket "$BUCKET" \
      --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
  fi
  ok "s3://$BUCKET"
fi

aws_ s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' >/dev/null
aws_ s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled >/dev/null
aws_ s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null
# Backups older than a quarter are not worth their storage; versions of them even less.
aws_ s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration '{
  "Rules": [{
    "ID": "expire-old-backups",
    "Status": "Enabled",
    "Filter": {"Prefix": ""},
    "Expiration": {"Days": 90},
    "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
    "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
  }]
}' >/dev/null
ok 'private, encrypted, versioned, 90-day expiry'

# ---------------------------------------------------------------------------
step 'Instance role'

if q iam get-role --role-name "$ROLE_NAME" | grep -q Role; then
  skip "role $ROLE_NAME"
else
  aws_ iam create-role --role-name "$ROLE_NAME" \
    --description 'Portfolio instance: write backups to S3, and Session Manager access' \
    --tags "Key=${TAG_KEY},Value=${TAG_VALUE}" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ec2.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' >/dev/null
  ok "role $ROLE_NAME"
fi

# Write-only on the backup prefix: an instance that is compromised can add
# backups, but cannot read or delete the ones already there.
aws_ iam put-role-policy --role-name "$ROLE_NAME" --policy-name 'backup-to-s3' \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"s3:PutObject\", \"s3:AbortMultipartUpload\"],
      \"Resource\": \"arn:aws:s3:::${BUCKET}/*\"
    }]
  }" >/dev/null
# Lets you open a shell without SSH, and without a key pair.
aws_ iam attach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' >/dev/null
ok 'policies attached'

if q iam get-instance-profile --instance-profile-name "$PROFILE_NAME" | grep -q InstanceProfile; then
  skip "instance profile $PROFILE_NAME"
else
  aws_ iam create-instance-profile --instance-profile-name "$PROFILE_NAME" >/dev/null
  aws_ iam add-role-to-instance-profile --instance-profile-name "$PROFILE_NAME" \
    --role-name "$ROLE_NAME" >/dev/null
  # IAM is eventually consistent; run-instances fails if it looks too early.
  sleep 12
  ok "instance profile $PROFILE_NAME"
fi

# ---------------------------------------------------------------------------
step 'TLS certificate'

CERT=$(q acm list-certificates --certificate-statuses PENDING_VALIDATION ISSUED \
       | jq -r --arg d "$DOMAIN" '.CertificateSummaryList[]? | select(.DomainName==$d) | .CertificateArn' \
       | head -1)
if [ -n "$CERT" ]; then
  skip "certificate for $DOMAIN"
else
  CERT=$(aws_ acm request-certificate --domain-name "$DOMAIN" \
          --subject-alternative-names "www.$DOMAIN" \
          --validation-method DNS \
          --tags "Key=${TAG_KEY},Value=${TAG_VALUE}" \
          --query CertificateArn --output text)
  ok "requested $CERT"
fi

# ACM fills the validation records in a few seconds after the request.
records=''
for _ in $(seq 1 20); do
  records=$(q acm describe-certificate --certificate-arn "$CERT" \
            | jq -c '[.Certificate.DomainValidationOptions[]? | select(.ResourceRecord != null) | .ResourceRecord] | unique_by(.Name)')
  [ "$(printf '%s' "$records" | jq 'length')" -gt 0 ] 2>/dev/null && break
  sleep 3
done
[ -n "$records" ] || die 'ACM did not return the DNS validation records'

ZONE=$(q route53 list-hosted-zones-by-name --dns-name "$DOMAIN" \
       | jq -r --arg n "${DOMAIN}." '.HostedZones[]? | select(.Name==$n) | .Id' \
       | head -1 | sed 's#^/hostedzone/##')

CERT_STATUS=$(aws_ acm describe-certificate --certificate-arn "$CERT" \
              --query 'Certificate.Status' --output text)

if [ "$CERT_STATUS" = 'ISSUED' ]; then
  ok 'certificate issued'
elif [ -n "$ZONE" ]; then
  info "hosted zone $ZONE found — writing the validation records"
  batch=$(printf '%s' "$records" | jq '{Changes: [.[] | {
    Action: "UPSERT",
    ResourceRecordSet: {Name: .Name, Type: .Type, TTL: 300, ResourceRecords: [{Value: .Value}]}
  }]}')
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" \
    --change-batch "$batch" --output json >/dev/null
  ok 'validation records written'
  info 'waiting for ACM to validate — this usually takes a few minutes'
  if aws_ acm wait certificate-validated --certificate-arn "$CERT" 2>/dev/null; then
    ok 'certificate issued'
  else
    die "the certificate is still not issued. Check it with:
      aws acm describe-certificate --certificate-arn $CERT --region $AWS_REGION
    then run this script again — it will carry on from here."
  fi
else
  # No hosted zone in this account: the records have to go into whichever DNS
  # provider actually serves the domain.
  warn "no Route 53 hosted zone for $DOMAIN. Add these CNAME records at your DNS provider:"
  printf '%s' "$records" | jq -r '.[] | "      \(.Name)  CNAME  \(.Value)"'
  die 'then run this script again — it will continue once the certificate is issued.'
fi

# ---------------------------------------------------------------------------
step 'Instance'

INSTANCE=$(q ec2 describe-instances \
           --filters "Name=tag:Name,Values=$INSTANCE_NAME" \
                     'Name=instance-state-name,Values=pending,running,stopped' \
           | jq -r '.Reservations[0].Instances[0].InstanceId // empty')

if [ -n "$INSTANCE" ]; then
  skip "instance $INSTANCE"
else
  AMI=$(aws_ ssm get-parameter \
        --name '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64' \
        --query 'Parameter.Value' --output text)
  info "AMI $AMI"

  # shellcheck disable=SC2059  # TAGS is deliberately a format string
  instance_tags=$(printf "$TAGS" instance "$INSTANCE_NAME")

  run_args=(
    --image-id "$AMI"
    --instance-type "$INSTANCE_TYPE"
    --subnet-id "${SUBNETS[0]}"
    --security-group-ids "$APP_SG"
    --iam-instance-profile "Name=$PROFILE_NAME"
    --user-data file://deploy/ec2-user-data.sh
    --metadata-options 'HttpTokens=required,HttpEndpoint=enabled'
    --block-device-mappings
      "DeviceName=/dev/xvda,Ebs={VolumeSize=$VOLUME_SIZE,VolumeType=gp3,Encrypted=true,DeleteOnTermination=true}"
    --tag-specifications "$instance_tags"
    --query 'Instances[0].InstanceId' --output text
  )
  [ -n "$KEY_NAME" ] && run_args+=(--key-name "$KEY_NAME")

  INSTANCE=$(aws_ ec2 run-instances "${run_args[@]}")
  ok "launched $INSTANCE"
fi

aws_ ec2 wait instance-running --instance-ids "$INSTANCE"
PUBLIC_IP=$(aws_ ec2 describe-instances --instance-ids "$INSTANCE" \
            --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
ok "running at $PUBLIC_IP"

# ---------------------------------------------------------------------------
step 'Load balancer'

TG=$(q elbv2 describe-target-groups --names "$TG_NAME" \
     | jq -r '.TargetGroups[0].TargetGroupArn // empty')
if [ -n "$TG" ]; then
  skip "target group $TG_NAME"
else
  # /healthz is answered by Nginx alone, so a healthy target means the web tier
  # is serving — without waking the API on every check.
  TG=$(aws_ elbv2 create-target-group --name "$TG_NAME" \
        --protocol HTTP --port 80 --vpc-id "$VPC" --target-type instance \
        --health-check-protocol HTTP --health-check-path /healthz \
        --health-check-interval-seconds 15 --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 --unhealthy-threshold-count 3 \
        --matcher HttpCode=200 \
        --tags "Key=${TAG_KEY},Value=${TAG_VALUE}" \
        --query 'TargetGroups[0].TargetGroupArn' --output text)
  ok "target group $TG_NAME"
fi
aws_ elbv2 register-targets --target-group-arn "$TG" --targets "Id=$INSTANCE" >/dev/null
ok 'instance registered'

ALB=$(q elbv2 describe-load-balancers --names "$ALB_NAME" \
      | jq -r '.LoadBalancers[0].LoadBalancerArn // empty')
if [ -n "$ALB" ]; then
  skip "load balancer $ALB_NAME"
else
  ALB=$(aws_ elbv2 create-load-balancer --name "$ALB_NAME" \
        --subnets "${SUBNETS[@]}" --security-groups "$ALB_SG" \
        --scheme internet-facing --type application --ip-address-type ipv4 \
        --tags "Key=${TAG_KEY},Value=${TAG_VALUE}" \
        --query 'LoadBalancers[0].LoadBalancerArn' --output text)
  ok "load balancer $ALB_NAME"
fi
aws_ elbv2 wait load-balancer-available --load-balancer-arns "$ALB"

listener_on_port() {
  q elbv2 describe-listeners --load-balancer-arn "$ALB" \
    | jq -r --argjson p "$1" '.Listeners[]? | select(.Port==$p) | .ListenerArn' | head -1
}

if [ -n "$(listener_on_port 443)" ]; then
  skip 'HTTPS listener'
else
  aws_ elbv2 create-listener --load-balancer-arn "$ALB" \
    --protocol HTTPS --port 443 \
    --certificates "CertificateArn=$CERT" \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions "[{\"Type\":\"forward\",\"TargetGroupArn\":\"$TG\"}]" >/dev/null
  ok 'HTTPS listener on 443'
fi

if [ -n "$(listener_on_port 80)" ]; then
  skip 'HTTP redirect listener'
else
  # Path and query are preserved by default; only the scheme changes.
  aws_ elbv2 create-listener --load-balancer-arn "$ALB" \
    --protocol HTTP --port 80 \
    --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' >/dev/null
  ok 'HTTP on 80 redirects to HTTPS'
fi

ALB_DNS=$(aws_ elbv2 describe-load-balancers --load-balancer-arns "$ALB" \
          --query 'LoadBalancers[0].DNSName' --output text)
ALB_ZONE=$(aws_ elbv2 describe-load-balancers --load-balancer-arns "$ALB" \
           --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)

# ---------------------------------------------------------------------------
step 'DNS'

if [ -n "$ZONE" ]; then
  batch=$(jq -n --arg dns "$ALB_DNS" --arg zid "$ALB_ZONE" --arg d "$DOMAIN" '{
    Changes: [$d, "www.\($d)"] | map({
      Action: "UPSERT",
      ResourceRecordSet: {
        Name: .,
        Type: "A",
        AliasTarget: {HostedZoneId: $zid, DNSName: $dns, EvaluateTargetHealth: false}
      }
    })
  }')
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" \
    --change-batch "$batch" --output json >/dev/null
  ok "$DOMAIN and www.$DOMAIN point at the load balancer"
else
  warn "point $DOMAIN at the load balancer yourself:"
  info "  CNAME  $DOMAIN  ->  $ALB_DNS"
fi

# ---------------------------------------------------------------------------
cat <<SUMMARY

$(printf '%sInfrastructure is up.%s' "$c_bold" "$c_reset")

  load balancer   https://$ALB_DNS
  instance        $INSTANCE  ($PUBLIC_IP)
  backups         s3://$BUCKET
  certificate     $CERT

$(printf '%sThe application is not deployed yet.%s' "$c_bold" "$c_reset") The instance is still
running user-data, which takes a minute or two. Then:

  ssh ec2-user@$PUBLIC_IP           $(printf '%s# or: aws ssm start-session --target %s%s' "$c_dim" "$INSTANCE" "$c_reset")

  git clone <your-repo> /opt/portfolio && cd /opt/portfolio
  cp .env.production.example .env
  openssl rand -base64 48           $(printf '%s# once per secret%s' "$c_dim" "$c_reset")
  vi .env                           $(printf '%s# PUBLIC_SITE_URL=https://%s, COOKIE_SECURE=true, TRUST_PROXY_HOPS=2%s' "$c_dim" "$DOMAIN" "$c_reset")

  docker compose up -d --build --wait
  docker compose exec api npm run seed:prod

  sudo crontab -l 2>/dev/null | { cat; echo "0 3 * * * BACKUP_S3_URI=s3://$BUCKET /opt/portfolio/deploy/backup.sh >> /var/log/portfolio-backup.log 2>&1"; } | sudo crontab -

The target group stays unhealthy until that is done — nothing is listening on
port 80 before the containers start. Watch it with:

  aws elbv2 describe-target-health --target-group-arn $TG --region $AWS_REGION

To remove everything this script created: ./deploy/aws-destroy.sh
SUMMARY
