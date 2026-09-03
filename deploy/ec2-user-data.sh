#!/bin/bash
# EC2 user-data for Amazon Linux 2023. Paste into "Advanced details → User data"
# when launching the instance; it runs once, as root, on first boot.
#
# It only prepares the box — Docker, Compose, swap, log rotation. The application
# itself is deployed afterwards, see the AWS section of README.md.
set -euxo pipefail

dnf update -y
dnf install -y docker git

# The Compose v2 plugin is not in the AL2023 repos, so install it by hand.
COMPOSE_VERSION=v2.32.4
install -d /usr/local/lib/docker/cli-plugins
curl -fsSL \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

systemctl enable --now docker
usermod -aG docker ec2-user

# Building the frontend runs tsc and Vite in one Node process. On a 1 GB
# instance that is the difference between a build and an OOM kill, so give the
# box swap even if it never uses it.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Second line of defence behind the per-container log caps in docker-compose.yml.
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" }
}
JSON
systemctl restart docker

install -d -o ec2-user -g ec2-user /opt/portfolio
echo "Instance ready. Deploy into /opt/portfolio."
