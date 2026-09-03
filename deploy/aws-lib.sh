#!/usr/bin/env bash
# Shared helpers for aws-provision.sh and aws-destroy.sh. Not runnable on its own.

STACK="${STACK:-portfolio}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

# Every resource carries this tag, so `aws-destroy.sh` can find what we made and
# leave everything else in the account alone.
# shellcheck disable=SC2034  # read by the scripts that source this file
TAG_KEY='ManagedBy'
# shellcheck disable=SC2034
TAG_VALUE="portfolio-deploy/${STACK}"

c_reset=$'\033[0m'; c_dim=$'\033[2m'; c_bold=$'\033[1m'
c_red=$'\033[31m'; c_green=$'\033[32m'; c_yellow=$'\033[33m'

step()  { printf '\n%s==>%s %s%s%s\n' "$c_bold" "$c_reset" "$c_bold" "$*" "$c_reset"; }
info()  { printf '    %s\n' "$*"; }
ok()    { printf '    %s✓%s %s\n' "$c_green" "$c_reset" "$*"; }
skip()  { printf '    %s·%s %s %s(already exists)%s\n' "$c_dim" "$c_reset" "$*" "$c_dim" "$c_reset"; }
warn()  { printf '    %s!%s %s\n' "$c_yellow" "$c_reset" "$*" >&2; }
die()   { printf '\n%serror:%s %s\n' "$c_red" "$c_reset" "$*" >&2; exit 1; }

aws_() { aws --region "$AWS_REGION" --output json "$@"; }

# Query helper: prints the result, or an empty string when the resource is absent.
# AWS is inconsistent about whether a missing thing is an empty list or an error,
# so both are flattened to "".
q() {
  local out
  out=$(aws_ "$@" 2>/dev/null) || return 0
  [ "$out" = 'null' ] && return 0
  printf '%s' "$out"
}

require_tools() {
  command -v aws >/dev/null || die 'the AWS CLI is not installed — https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html'
  command -v jq  >/dev/null || die 'jq is not installed'
  [ -n "$AWS_REGION" ] || die 'set AWS_REGION (for example: AWS_REGION=eu-central-1)'
  aws sts get-caller-identity >/dev/null 2>&1 \
    || die 'the AWS CLI has no working credentials — run `aws configure`'
}

account_id() { aws sts get-caller-identity --query Account --output text; }

# Waits for a condition, printing a dot per attempt. wait_for <seconds> <label> <cmd...>
wait_for() {
  local timeout=$1 label=$2; shift 2
  local waited=0
  printf '    waiting for %s' "$label"
  while ! "$@" >/dev/null 2>&1; do
    if [ "$waited" -ge "$timeout" ]; then
      printf '\n'; return 1
    fi
    printf '.'
    sleep 5
    waited=$((waited + 5))
  done
  printf ' done\n'
}
