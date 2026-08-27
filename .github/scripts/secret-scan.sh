#!/usr/bin/env bash

# Scan tracked files in the current tree and every reachable commit without
# ever printing a candidate secret. This intentionally uses high-confidence
# token formats and a long-value assignment heuristic to avoid blocking on
# ordinary documentation or the checked-in *.env.example templates.

set -uo pipefail

readonly MATCH_FILE="$(mktemp)"
trap 'rm -f "$MATCH_FILE"' EXIT

declare -a PATHSPEC=(
  "."
  ":(exclude)**/*.lock"
  ":(exclude)**/*.map"
  ":(exclude).env.example"
  ":(exclude)**/.env.example"
)

# The values below are deterministic, format-only fixtures used by security
# tests. They are allow-listed by exact path, detector and complete source
# line in allowlisted_fixture() below. Keeping the live-key prefix split keeps
# this policy file itself free of a scanner match.
readonly SYNTHETIC_STRIPE_PREFIX='sk_live_'
readonly SYNTHETIC_STRIPE_BODY='51productionKey123'

declare -a LABELS=(
  "private-key"
  "aws-access-key"
  "github-token"
  "npm-token"
  "stripe-live-key"
  "slack-token"
  "google-api-key"
  "credential-url"
  "long-secret-assignment"
  "long-secret-assignment"
)

declare -a PATTERNS=(
  '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'
  '\bAKIA[0-9A-Z]{16}\b'
  '\b(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{22,})\b'
  '\bnpm_[A-Za-z0-9]{30,}\b'
  '\b(sk|rk)_live_[A-Za-z0-9]{16,}\b'
  '\bxox[baprs]-[A-Za-z0-9-]{10,}\b'
  '\bAIza[0-9A-Za-z_-]{30,}\b'
  'https?://[^/[:space:]@:]+:[^@[:space:]]{20,}@'
  "(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|jwt[_-]?secret|password|secret|token)[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9+/=_-]{20,}[\"']"
  "(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|jwt[_-]?secret|password|secret|token)[[:space:]]*=[[:space:]]*[A-Za-z0-9+/=_-]{20,}"
)

# Return success only for a deliberately synthetic fixture line. The complete
# line check is important: a real value in the same file or a copied fixture in
# another file must still fail the scan. No candidate line is printed here.
allowlisted_fixture() {
  local path="$1"
  local label="$2"
  local content="$3"
  local expected_value=''
  local expected_pattern=''

  case "$path|$label" in
    'backend/tests/securityAuth.test.js|long-secret-assignment')
      expected_value='local-security-test-secret-with-more-than-32-chars'
      expected_pattern="^[[:space:]]*process[.]env[.]JWT_SECRET[[:space:]]*=[[:space:]]*'${expected_value}'[[:space:]]*;[[:space:]]*$"
      ;;
    'backend/tests/securitySecrets.test.js|long-secret-assignment')
      if [[ "$content" == *'JWT_SECRET'* ]]; then
        expected_value='v3ry-long-random-production-secret-value-123'
        expected_pattern="^[[:space:]]*JWT_SECRET[[:space:]]*:[[:space:]]*'${expected_value}',[[:space:]]*$"
      elif [[ "$content" == *'STRIPE_WEBHOOK_SECRET'* ]]; then
        expected_value='whsec_productionWebhook123'
        expected_pattern="^[[:space:]]*STRIPE_WEBHOOK_SECRET[[:space:]]*:[[:space:]]*'${expected_value}',[[:space:]]*$"
      fi
      ;;
    'backend/tests/securitySecrets.test.js|stripe-live-key')
      expected_value="${SYNTHETIC_STRIPE_PREFIX}${SYNTHETIC_STRIPE_BODY}"
      expected_pattern="^[[:space:]]*STRIPE_SECRET_KEY[[:space:]]*:[[:space:]]*'${expected_value}',[[:space:]]*$"
      ;;
    'backend/tests/emailService.test.js|long-secret-assignment')
      if [[ "$content" == *'JWT_SECRET'* ]]; then
        expected_value='v3ry-long-random-staging-secret-value-123'
        expected_pattern="^[[:space:]]*JWT_SECRET[[:space:]]*:[[:space:]]*'${expected_value}',[[:space:]]*$"
      elif [[ "$content" == *'STRIPE_WEBHOOK_SECRET'* ]]; then
        expected_value='whsec_productionWebhook123'
        expected_pattern="^[[:space:]]*STRIPE_WEBHOOK_SECRET[[:space:]]*:[[:space:]]*'${expected_value}',[[:space:]]*$"
      fi
      ;;
    'backend/tests/emailService.test.js|stripe-live-key')
      expected_value="${SYNTHETIC_STRIPE_PREFIX}${SYNTHETIC_STRIPE_BODY}"
      expected_pattern="^[[:space:]]*STRIPE_SECRET_KEY[[:space:]]*:[[:space:]]*'${expected_value}',[[:space:]]*$"
      ;;
  esac

  [[ -n "$expected_pattern" && "$content" =~ $expected_pattern ]]
}

# This is intentionally runnable without a repository checkout. It protects
# the narrow exceptions and the unquoted environment detector from accidental
# broadening when the scanner is changed.
run_policy_self_test() {
  local quote="'"
  local jwt_key='JWT_'
  jwt_key+='SECRET'
  local env_line="process.env.${jwt_key} = ${quote}local-security-test-secret-with-more-than-32-chars${quote};"
  local altered_env_line="process.env.${jwt_key} = ${quote}local-security-test-secret-with-more-than-32-charX${quote};"
  local production_object_line="  ${jwt_key}: ${quote}v3ry-long-random-production-secret-value-123${quote},"
  local webhook_key='STRIPE_'
  webhook_key+='WEBHOOK_SECRET'
  local webhook_line="  ${webhook_key}: ${quote}whsec_productionWebhook123${quote},"
  local stripe_key='STRIPE_'
  stripe_key+='SECRET_KEY'
  local stripe_value="${SYNTHETIC_STRIPE_PREFIX}${SYNTHETIC_STRIPE_BODY}"
  local stripe_line="      ${stripe_key}: ${quote}${stripe_value}${quote},"

  if ! allowlisted_fixture 'backend/tests/securityAuth.test.js' 'long-secret-assignment' "$env_line"; then
    printf 'Secret scanner policy self-test failed: known fixture was not allow-listed.\n' >&2
    return 1
  fi
  if allowlisted_fixture 'backend/tests/securityAuth.test.js' 'long-secret-assignment' "$altered_env_line"; then
    printf 'Secret scanner policy self-test failed: altered fixture was allow-listed.\n' >&2
    return 1
  fi
  if ! allowlisted_fixture 'backend/tests/securitySecrets.test.js' 'long-secret-assignment' "$production_object_line"; then
    printf 'Secret scanner policy self-test failed: object fixture was not allow-listed.\n' >&2
    return 1
  fi
  if ! allowlisted_fixture 'backend/tests/securitySecrets.test.js' 'long-secret-assignment' "$webhook_line"; then
    printf 'Secret scanner policy self-test failed: webhook fixture was not allow-listed.\n' >&2
    return 1
  fi
  if ! allowlisted_fixture 'backend/tests/emailService.test.js' 'long-secret-assignment' "$webhook_line"; then
    printf 'Secret scanner policy self-test failed: staging webhook fixture was not allow-listed.\n' >&2
    return 1
  fi
  if ! allowlisted_fixture 'backend/tests/emailService.test.js' 'stripe-live-key' "$stripe_line"; then
    printf 'Secret scanner policy self-test failed: key fixture was not allow-listed.\n' >&2
    return 1
  fi
  if ! allowlisted_fixture 'backend/tests/securitySecrets.test.js' 'stripe-live-key' "$stripe_line"; then
    printf 'Secret scanner policy self-test failed: production key fixture was not allow-listed.\n' >&2
    return 1
  fi
  if allowlisted_fixture 'backend/src/server.js' 'long-secret-assignment' "$env_line"; then
    printf 'Secret scanner policy self-test failed: copied fixture was allow-listed.\n' >&2
    return 1
  fi
  if allowlisted_fixture 'backend/tests/securityAuth.test.js' 'stripe-live-key' "$stripe_line"; then
    printf 'Secret scanner policy self-test failed: fixture was allow-listed for the wrong detector.\n' >&2
    return 1
  fi
  printf 'Secret scanner policy self-test passed.\n'
}

# git grep is deliberately used so the same pathspec is applied to the
# working tree and commit history. Matching lines are held in a temporary file
# and only their path/line or commit is printed; secret material never reaches
# the Actions log.
scan_revision() {
  local revision="$1"
  local label="$2"
  local pattern="$3"
  local output
  local exit_code=0

  output="$(git grep -I -i -n -E -e "$pattern" "$revision" -- "${PATHSPEC[@]}" 2>/dev/null)" || exit_code=$?
  if ((exit_code > 1)); then
    printf 'Unable to scan revision %s.\n' "$revision" >&2
    return 1
  fi
  : >"$MATCH_FILE"
  while IFS= read -r match; do
    [[ -z "$match" ]] && continue
    local match_fields
    if [[ "$revision" == "HEAD" ]]; then
      match_fields="$match"
    else
      match_fields="${match#*:}"
    fi
    local path="${match_fields%%:*}"
    local line_fields="${match_fields#*:}"
    local content="${line_fields#*:}"
    if allowlisted_fixture "$path" "$label" "$content"; then
      continue
    fi
    printf '%s\n' "$match" >>"$MATCH_FILE"
  done <<< "$output"
  if [[ -s "$MATCH_FILE" ]]; then
    # Only print revision/path/line. Never emit the matching line.
    if [[ "$revision" == "HEAD" ]]; then
      printf 'Potential %s in the tracked working tree at:\n' "$label"
      cut -d: -f2-3 "$MATCH_FILE" | sort -u | sed 's/^/  /'
    else
      printf 'Potential %s in commit %s (matching paths):\n' "$label" "$revision"
      sed 's/^[^:]*://' "$MATCH_FILE" | cut -d: -f1 | sort -u | sed 's/^/  /'
    fi
    return 1
  fi
  return 0
}

if [[ "${1:-}" == '--self-test' ]]; then
  run_policy_self_test
  exit $?
fi

found=0
for index in "${!PATTERNS[@]}"; do
  if ! scan_revision HEAD "${LABELS[$index]}" "${PATTERNS[$index]}"; then
    found=1
  fi
done

# fetch-depth: 0 is required by the workflow so deleted or rotated secrets are
# also checked. Scan all reachable refs, including branches and tags.
while IFS= read -r revision; do
  [[ -z "$revision" ]] && continue
  for index in "${!PATTERNS[@]}"; do
    if ! scan_revision "$revision" "${LABELS[$index]}" "${PATTERNS[$index]}"; then
      found=1
    fi
  done
done < <(git rev-list --all --topo-order)

if ((found)); then
  printf '\nSecret scan failed. Rotate any exposed credential before removing it from history.\n'
  exit 1
fi

printf 'Secret scan passed for the tracked tree and %s reachable commits.\n' "$(git rev-list --all --count)"
