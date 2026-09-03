#!/usr/bin/env bash
# Removes what aws-provision.sh created, in the order AWS allows.
#
#   AWS_REGION=eu-central-1 ./deploy/aws-destroy.sh
#
# The backup bucket and the TLS certificate are kept by default — the bucket
# because it holds the only copy of the data once the instance is gone, the
# certificate because it is free and re-validating takes minutes. Pass
# --delete-backups and --delete-certificate to remove those too.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=deploy/aws-lib.sh
source ./deploy/aws-lib.sh

DELETE_BACKUPS=false
DELETE_CERT=false
DOMAIN="${DOMAIN:-}"
for arg in "$@"; do
  case "$arg" in
    --delete-backups)    DELETE_BACKUPS=true ;;
    --delete-certificate) DELETE_CERT=true ;;
    *) die "unknown option: $arg" ;;
  esac
done

require_tools
ACCOUNT=$(account_id)
BUCKET="${BACKUP_BUCKET:-${STACK}-backups-${ACCOUNT}}"

printf '%sThis deletes the %s stack in %s (account %s):%s\n' \
  "$c_bold" "$STACK" "$AWS_REGION" "$ACCOUNT" "$c_reset"
info 'load balancer, listeners, target group'
info 'EC2 instance and its EBS volume'
info 'instance profile, IAM role, security groups'
$DELETE_BACKUPS && printf '    %sand s3://%s, including every backup in it%s\n' "$c_red" "$BUCKET" "$c_reset"
$DELETE_CERT    && printf '    %sand the ACM certificate%s\n' "$c_red" "$c_reset"
$DELETE_BACKUPS || info "keeping s3://$BUCKET (pass --delete-backups to remove it)"

printf '\nType %s to confirm: ' "$STACK"
read -r reply
[ "$reply" = "$STACK" ] || die 'not confirmed, nothing was deleted'

# ---------------------------------------------------------------------------
step 'Load balancer'

ALB=$(q elbv2 describe-load-balancers --names "${STACK}-alb" \
      | jq -r '.LoadBalancers[0].LoadBalancerArn // empty')
if [ -n "$ALB" ]; then
  for arn in $(q elbv2 describe-listeners --load-balancer-arn "$ALB" \
                | jq -r '.Listeners[]?.ListenerArn'); do
    aws_ elbv2 delete-listener --listener-arn "$arn" >/dev/null
  done
  aws_ elbv2 delete-load-balancer --load-balancer-arn "$ALB" >/dev/null
  # The target group cannot go while the load balancer still references it, and
  # the security group cannot go while the ALB's network interfaces exist.
  wait_for 180 'the load balancer to disappear' \
    bash -c "! aws --region '$AWS_REGION' elbv2 describe-load-balancers --load-balancer-arns '$ALB' >/dev/null 2>&1" \
    || warn 'still deleting; later steps may need a second run'
  ok 'load balancer deleted'
else
  skip 'no load balancer'
fi

TG=$(q elbv2 describe-target-groups --names "${STACK}-tg" \
     | jq -r '.TargetGroups[0].TargetGroupArn // empty')
if [ -n "$TG" ]; then
  if aws_ elbv2 delete-target-group --target-group-arn "$TG" >/dev/null 2>&1; then
    ok 'target group deleted'
  else
    warn 'target group still in use — run again in a minute'
  fi
else
  skip 'no target group'
fi

# ---------------------------------------------------------------------------
step 'Instance'

INSTANCE=$(q ec2 describe-instances \
           --filters "Name=tag:Name,Values=${STACK}-app" \
                     'Name=instance-state-name,Values=pending,running,stopping,stopped' \
           | jq -r '.Reservations[0].Instances[0].InstanceId // empty')
if [ -n "$INSTANCE" ]; then
  aws_ ec2 terminate-instances --instance-ids "$INSTANCE" >/dev/null
  info "terminating $INSTANCE"
  aws_ ec2 wait instance-terminated --instance-ids "$INSTANCE"
  ok 'instance terminated'
else
  skip 'no instance'
fi

# ---------------------------------------------------------------------------
step 'IAM'

if q iam get-instance-profile --instance-profile-name "${STACK}-instance" | grep -q InstanceProfile; then
  aws_ iam remove-role-from-instance-profile \
    --instance-profile-name "${STACK}-instance" --role-name "${STACK}-instance" >/dev/null 2>&1 || true
  aws_ iam delete-instance-profile --instance-profile-name "${STACK}-instance" >/dev/null
  ok 'instance profile deleted'
else
  skip 'no instance profile'
fi

if q iam get-role --role-name "${STACK}-instance" | grep -q Role; then
  aws_ iam delete-role-policy --role-name "${STACK}-instance" --policy-name 'backup-to-s3' >/dev/null 2>&1 || true
  aws_ iam detach-role-policy --role-name "${STACK}-instance" \
    --policy-arn 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' >/dev/null 2>&1 || true
  aws_ iam delete-role --role-name "${STACK}-instance" >/dev/null
  ok 'role deleted'
else
  skip 'no role'
fi

# ---------------------------------------------------------------------------
step 'Security groups'

# The app group references the ALB group, so it has to go first.
for name in "${STACK}-app" "${STACK}-alb"; do
  id=$(q ec2 describe-security-groups --filters "Name=group-name,Values=$name" \
       | jq -r '.SecurityGroups[0].GroupId // empty')
  if [ -z "$id" ]; then skip "no $name"; continue; fi
  if aws_ ec2 delete-security-group --group-id "$id" >/dev/null 2>&1; then
    ok "$name deleted"
  else
    # Usually the ALB's network interfaces have not been reclaimed yet.
    warn "$name ($id) is still in use — run this script again in a few minutes"
  fi
done

# ---------------------------------------------------------------------------
if $DELETE_CERT; then
  step 'Certificate'
  [ -n "$DOMAIN" ] || die 'set DOMAIN to say which certificate to delete'
  CERT=$(q acm list-certificates --certificate-statuses PENDING_VALIDATION ISSUED \
         | jq -r --arg d "$DOMAIN" '.CertificateSummaryList[]? | select(.DomainName==$d) | .CertificateArn' | head -1)
  if [ -n "$CERT" ]; then
    if aws_ acm delete-certificate --certificate-arn "$CERT" >/dev/null 2>&1; then
      ok 'certificate deleted'
    else
      warn 'certificate still attached to something — delete it by hand'
    fi
  else
    skip "no certificate for $DOMAIN"
  fi
fi

if $DELETE_BACKUPS; then
  step 'Backups'
  if aws_ s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
    # Versioning is on, so every version and delete marker has to go first.
    aws s3 rm "s3://$BUCKET" --recursive --only-show-errors >/dev/null 2>&1 || true
    versions=$(q s3api list-object-versions --bucket "$BUCKET" \
               | jq -c '[(.Versions[]?, .DeleteMarkers[]?) | {Key, VersionId}]')
    if [ -n "$versions" ] && [ "$(printf '%s' "$versions" | jq 'length')" -gt 0 ]; then
      printf '%s' "$versions" | jq -c '{Objects: .[0:1000], Quiet: true}' \
        | xargs -0 -I{} aws --region "$AWS_REGION" s3api delete-objects --bucket "$BUCKET" --delete '{}' >/dev/null 2>&1 || true
    fi
    if aws_ s3api delete-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
      ok "s3://$BUCKET deleted"
    else
      warn "s3://$BUCKET is not empty — empty it in the console and delete it there"
    fi
  else
    skip 'no bucket'
  fi
fi

printf '\n%sDone.%s\n' "$c_bold" "$c_reset"
$DELETE_BACKUPS || printf '%ss3://%s was kept.%s\n' "$c_dim" "$BUCKET" "$c_reset"
