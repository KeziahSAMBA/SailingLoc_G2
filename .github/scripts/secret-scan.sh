#!/usr/bin/env bash

# Scan tracked files in the current tree and every reachable commit without
# ever printing a candidate secret. This intentionally uses high-confidence
# token formats and a long-value assignment heuristic to avoid blocking on
# ordinary documentation or the checked-in *.env.example templates.

set -uo pipefail

readonly MATCH_FILE="$(mktemp)"
trap 'rm -f "$MATCH_FILE"' EXIT

# Keep each git-grep invocation comfortably below the smallest command-line
# limit we support. Windows CreateProcess has a 32 KiB limit, while hosted
# runners and shells can add their own overhead; 12 KiB leaves room for the
# fixed options and pathspecs as well as quoting/encoding differences.
readonly DEFAULT_REVISION_ARG_BYTES=12000

# The override is intentionally capped and exists mainly to make the
# self-test exercise chunk boundaries. Production scans always use the safe
# default unless a smaller value is requested.
revision_arg_limit() {
  local limit="${SECRET_SCAN_MAX_ARG_BYTES:-$DEFAULT_REVISION_ARG_BYTES}"
  if ! [[ "$limit" =~ ^[0-9]+$ ]]; then
    limit="$DEFAULT_REVISION_ARG_BYTES"
  else
    limit=$((10#$limit))
    if ((limit < 32 || limit > DEFAULT_REVISION_ARG_BYTES)); then
      limit="$DEFAULT_REVISION_ARG_BYTES"
    fi
  fi
  printf '%s\n' "$limit"
}

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

  # Exercise both working-tree and historical git-grep paths in a temporary
  # repository. It has two independent branches and several commits so the
  # batcher is forced across revision chunks while the exact allowlist and
  # value-redaction guarantees remain covered.
  local fixture_repo
  fixture_repo="$(mktemp -d)"
  local integration_prefix='integration-'
  local integration_suffix='secret-fixture-value-1234567890'
  local integration_value="${integration_prefix}${integration_suffix}"
  local blocked_key='INTEGRATION_'
  blocked_key+='SECRET'
  local blocked_line="const ${blocked_key} = ${quote}${integration_value}${quote};"
  local branch_prefix='branch-'
  local branch_suffix='secret-fixture-value-0987654321'
  local branch_value="${branch_prefix}${branch_suffix}"
  local branch_key='BRANCH_'
  branch_key+='SECRET'
  local branch_line="const ${branch_key} = ${quote}${branch_value}${quote};"
  local working_output=''
  local working_status=0
  local history_output=''
  local history_status=0
  local main_commit=''
  local side_commit=''

  if ! mkdir -p "$fixture_repo/backend/tests" "$fixture_repo/backend/src" \
    || ! printf '%s\n' "$env_line" >"$fixture_repo/backend/tests/securityAuth.test.js" \
    || ! printf '%s\n' 'const safeValue = true;' >"$fixture_repo/backend/src/server.js" \
    || ! git -C "$fixture_repo" init -q \
    || ! git -C "$fixture_repo" config user.name 'secret-scan-self-test' \
    || ! git -C "$fixture_repo" config user.email 'secret-scan-self-test@example.invalid' \
    || ! git -C "$fixture_repo" add -- backend/tests/securityAuth.test.js backend/src/server.js \
    || ! git -C "$fixture_repo" commit -qm 'secret scanner fixture base' \
    || ! git -C "$fixture_repo" branch -M scan-main \
    || ! git -C "$fixture_repo" branch scan-side \
    || ! printf '%s\n' "$blocked_line" >"$fixture_repo/backend/src/server.js" \
    || ! git -C "$fixture_repo" add -- backend/src/server.js \
    || ! git -C "$fixture_repo" commit -qm 'secret scanner fixture main finding'; then
    rm -rf -- "$fixture_repo"
    printf 'Secret scanner integration self-test failed: unable to create main fixture history.\n' >&2
    return 1
  fi

  if ! git -C "$fixture_repo" checkout -q scan-side \
    || ! printf '%s\n' "$branch_line" >"$fixture_repo/backend/src/branch-secret.js" \
    || ! git -C "$fixture_repo" add -- backend/src/branch-secret.js \
    || ! git -C "$fixture_repo" commit -qm 'secret scanner fixture side finding' \
    || ! git -C "$fixture_repo" checkout -q scan-main; then
    rm -rf -- "$fixture_repo"
    printf 'Secret scanner integration self-test failed: unable to create side fixture history.\n' >&2
    return 1
  fi

  if ! pushd "$fixture_repo" >/dev/null; then
    rm -rf -- "$fixture_repo"
    printf 'Secret scanner integration self-test failed: unable to enter fixture repository.\n' >&2
    return 1
  fi
  main_commit="$(git rev-parse scan-main)"
  side_commit="$(git rev-parse scan-side)"
  working_output="$(scan_revision HEAD 'long-secret-assignment' "${PATTERNS[8]}")" || working_status=$?

  # Force one revision per batch in this tiny repository. The production
  # default remains 12 KiB; this override is scoped to the self-test process.
  local previous_chunk_limit="${SECRET_SCAN_MAX_ARG_BYTES+x}"
  local previous_chunk_value="${SECRET_SCAN_MAX_ARG_BYTES-}"
  SECRET_SCAN_MAX_ARG_BYTES='64'
  history_output="$(scan_all_history)" || history_status=$?
  if [[ -n "$previous_chunk_limit" ]]; then
    SECRET_SCAN_MAX_ARG_BYTES="$previous_chunk_value"
  else
    unset SECRET_SCAN_MAX_ARG_BYTES
  fi
  popd >/dev/null || true
  rm -rf -- "$fixture_repo"

  if ((working_status == 0)); then
    printf 'Secret scanner integration self-test failed: working-tree fixture was not detected.\n' >&2
    return 1
  fi
  if [[ "$working_output" != *'backend/src/server.js'* \
    || "$working_output" == *'backend/tests/securityAuth.test.js'* \
    || "$working_output" == *"$integration_value"* ]]; then
    printf 'Secret scanner integration self-test failed: working-tree normalization or redaction is incorrect.\n' >&2
    return 1
  fi
  if ((history_status == 0)); then
    printf 'Secret scanner integration self-test failed: historical fixtures were not detected.\n' >&2
    return 1
  fi
  if [[ "$history_output" != *"$main_commit"* \
    || "$history_output" != *"$side_commit"* \
    || "$history_output" != *'backend/src/server.js'* \
    || "$history_output" != *'backend/src/branch-secret.js'* \
    || "$history_output" == *'backend/tests/securityAuth.test.js'* \
    || "$history_output" == *"$integration_value"* \
    || "$history_output" == *"$branch_value"* ]]; then
    printf 'Secret scanner integration self-test failed: batched history handling or redaction is incorrect.\n' >&2
    return 1
  fi

  printf 'Secret scanner policy self-test passed.\n'
}

# Parse the stable part of git-grep's revision:path:line:content format. The
# path component is deliberately greedy so a valid repository path containing
# a colon is normalized correctly. Only the complete source line is passed to
# the exact allowlist; it is never printed.
parse_match_fields() {
  local match="$1"
  if [[ "$match" =~ ^([^:]+):(.+):([0-9]+):(.*)$ ]]; then
    MATCH_REVISION="${BASH_REMATCH[1]}"
    MATCH_PATH="${BASH_REMATCH[2]}"
    MATCH_LINE="${BASH_REMATCH[3]}"
    MATCH_CONTENT="${BASH_REMATCH[4]}"
    return 0
  fi
  return 1
}

# Scan one or more revisions in a single git-grep invocation. Matching lines
# are held in temporary files and only their revision/path/line are printed;
# secret material never reaches the Actions log.
scan_revision_batch() {
  local label="$1"
  local pattern="$2"
  shift 2
  local -a revisions=("$@")
  local raw_file
  raw_file="$(mktemp)" || {
    printf 'Unable to create a temporary file for the secret scan.\n' >&2
    return 1
  }
  local exit_code=0

  if git grep -I -i -n -E -e "$pattern" "${revisions[@]}" -- "${PATHSPEC[@]}" >"$raw_file" 2>/dev/null; then
    exit_code=0
  else
    exit_code=$?
  fi
  if ((exit_code > 1)); then
    rm -f -- "$raw_file"
    printf 'Unable to scan a revision batch.\n' >&2
    return 1
  fi

  : >"$MATCH_FILE"
  while IFS= read -r match || [[ -n "$match" ]]; do
    [[ -z "$match" ]] && continue
    if ! parse_match_fields "$match"; then
      rm -f -- "$raw_file"
      printf 'Unable to normalize a git-grep match.\n' >&2
      return 1
    fi
    if allowlisted_fixture "$MATCH_PATH" "$label" "$MATCH_CONTENT"; then
      continue
    fi
    # Store only non-sensitive normalized fields. Tabs are not valid in the
    # paths produced by this project and keep the delimiter unambiguous.
    printf '%s\t%s\t%s\n' "$MATCH_REVISION" "$MATCH_PATH" "$MATCH_LINE" >>"$MATCH_FILE"
  done <"$raw_file"
  rm -f -- "$raw_file"

  if [[ ! -s "$MATCH_FILE" ]]; then
    return 0
  fi

  # A batch can contain many revisions. Keep the historical output grouped by
  # revision while emitting only path/line locations (never matching content).
  local printed_revision=''
  local match_revision=''
  local match_path=''
  local match_line=''
  while IFS=$'\t' read -r match_revision match_path match_line; do
    [[ -z "$match_revision" ]] && continue
    if [[ "$match_revision" != "$printed_revision" ]]; then
      if [[ "$match_revision" == "HEAD" ]]; then
        printf 'Potential %s in the tracked working tree at:\n' "$label"
      else
        printf 'Potential %s in commit %s (matching paths):\n' "$label" "$match_revision"
      fi
      printed_revision="$match_revision"
    fi
    printf '  %s:%s\n' "$match_path" "$match_line"
  done <"$MATCH_FILE"
  return 1
}

# Preserve the single-revision helper used by the policy self-test and keep
# its output/normalization identical to the batched implementation.
scan_revision() {
  local revision="$1"
  local label="$2"
  local pattern="$3"
  scan_revision_batch "$label" "$pattern" "$revision"
}

# Scan all detector patterns in one git-grep pass. Git has to walk and
# decompress every selected tree/blob, so combining the patterns avoids doing
# that expensive history traversal once per detector. The matching line is
# classified locally afterwards with the same case-insensitive expressions;
# this keeps the exact allowlist semantics while retaining detector labels in
# the redacted report.
scan_all_detectors_batch() {
  local -a revisions=("$@")
  local combined_pattern=''
  local index
  for index in "${!PATTERNS[@]}"; do
    if [[ -n "$combined_pattern" ]]; then
      combined_pattern+='|'
    fi
    combined_pattern+="(${PATTERNS[$index]})"
  done

  local raw_file
  raw_file="$(mktemp)" || {
    printf 'Unable to create a temporary file for the secret scan.\n' >&2
    return 1
  }
  local exit_code=0
  if git grep -I -i -n -E -e "$combined_pattern" "${revisions[@]}" -- "${PATHSPEC[@]}" >"$raw_file" 2>/dev/null; then
    exit_code=0
  else
    exit_code=$?
  fi
  if ((exit_code > 1)); then
    rm -f -- "$raw_file"
    printf 'Unable to scan a revision batch.\n' >&2
    return 1
  fi

  : >"$MATCH_FILE"
  local match=''
  while IFS= read -r match || [[ -n "$match" ]]; do
    [[ -z "$match" ]] && continue
    if ! parse_match_fields "$match"; then
      rm -f -- "$raw_file"
      printf 'Unable to normalize a git-grep match.\n' >&2
      return 1
    fi
    for index in "${!PATTERNS[@]}"; do
      # Use the same ERE implementation for classification that selected the
      # line. Bash's [[ =~ ]] does not interpret GNU grep's \b word-boundary
      # extension consistently (it treats it as a backspace), which could
      # otherwise drop token findings after the combined git-grep pass. The
      # candidate remains in a temporary shell here-string and grep is quiet,
      # so neither the value nor the matching line reaches the log.
      if grep -E -i -q -- "${PATTERNS[$index]}" <<<"$MATCH_CONTENT"; then
        if allowlisted_fixture "$MATCH_PATH" "${LABELS[$index]}" "$MATCH_CONTENT"; then
          continue
        fi
        # Store only non-sensitive normalized fields. Tabs are not valid in
        # the paths produced by this project and keep the delimiter clear.
        printf '%s\t%s\t%s\t%s\n' "${LABELS[$index]}" "$MATCH_REVISION" "$MATCH_PATH" "$MATCH_LINE" >>"$MATCH_FILE"
      fi
    done
  done <"$raw_file"
  rm -f -- "$raw_file"

  if [[ ! -s "$MATCH_FILE" ]]; then
    return 0
  fi

  local printed_label=''
  local printed_revision=''
  local match_label=''
  local match_revision=''
  local match_path=''
  local match_line=''
  while IFS=$'\t' read -r match_label match_revision match_path match_line; do
    [[ -z "$match_label" || -z "$match_revision" ]] && continue
    if [[ "$match_label" != "$printed_label" || "$match_revision" != "$printed_revision" ]]; then
      if [[ "$match_revision" == "HEAD" ]]; then
        printf 'Potential %s in the tracked working tree at:\n' "$match_label"
      else
        printf 'Potential %s in commit %s (matching paths):\n' "$match_label" "$match_revision"
      fi
      printed_label="$match_label"
      printed_revision="$match_revision"
    fi
    printf '  %s:%s\n' "$match_path" "$match_line"
  done <"$MATCH_FILE"
  return 1
}

# Scan every commit reachable from every local, remote, or tag ref. Revisions
# are chunked by argument bytes before invoking git grep so the same code is
# safe on Linux runners and Windows Git Bash. A single rev-list and combined
# detector expression are reused for all chunks, reducing the historical scan
# from commits*patterns git processes to one process per chunk.
scan_all_history() {
  local revisions_file
  revisions_file="$(mktemp)" || {
    printf 'Unable to create a revision list for the secret scan.\n' >&2
    return 1
  }
  if ! git rev-list --all --topo-order >"$revisions_file" 2>/dev/null; then
    rm -f -- "$revisions_file"
    printf 'Unable to enumerate reachable revisions for the secret scan.\n' >&2
    return 1
  fi

  local -a revisions=()
  local revision=''
  while IFS= read -r revision || [[ -n "$revision" ]]; do
    [[ -z "$revision" ]] && continue
    revisions+=("$revision")
  done <"$revisions_file"
  rm -f -- "$revisions_file"

  local chunk_limit
  chunk_limit="$(revision_arg_limit)"
  local found=0
  local index
  local -a chunk=()
  local chunk_bytes=0
  local revision_bytes

  for revision in "${revisions[@]}"; do
    revision_bytes=$(( ${#revision} + 1 ))
    if ((${#chunk[@]} > 0 && chunk_bytes + revision_bytes > chunk_limit)); then
      if ! scan_all_detectors_batch "${chunk[@]}"; then
        found=1
      fi
      chunk=()
      chunk_bytes=0
    fi
    chunk+=("$revision")
    chunk_bytes=$((chunk_bytes + revision_bytes))
  done
  if ((${#chunk[@]} > 0)); then
    if ! scan_all_detectors_batch "${chunk[@]}"; then
      found=1
    fi
  fi
  return "$found"
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
if ! scan_all_history; then
  found=1
fi

if ((found)); then
  printf '\nSecret scan failed. Rotate any exposed credential before removing it from history.\n'
  exit 1
fi

printf 'Secret scan passed for the tracked tree and %s reachable commits.\n' "$(git rev-list --all --count)"
