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
  # These security tests intentionally use format-only credential fixtures to
  # exercise production validation. Keep the exception narrow so all other
  # tracked tests and the complete production tree remain covered.
  ":(exclude)backend/tests/securityAuth.test.js"
  ":(exclude)backend/tests/securitySecrets.test.js"
)

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
)

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
  if [[ -n "$output" ]]; then
    printf '%s\n' "$output" >"$MATCH_FILE"
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
