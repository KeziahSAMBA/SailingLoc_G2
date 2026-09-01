#!/usr/bin/env bash

# Apply an exact, metadata-only baseline to TruffleHog's JSON stream.  The
# open-source TruffleHog v3.97.1 CLI does not provide a fingerprint ignore file;
# this wrapper is the equivalent for historical, intentional test fixtures.
# It never reads, stores, or prints Raw/RawV2/Redacted/SecretParts values.

set -euo pipefail

usage() {
  printf 'Usage: %s --report FILE --status CODE [--ignore-file FILE]\n' "${0##*/}" >&2
  printf '       %s --self-test\n' "${0##*/}" >&2
}

readonly DEFAULT_IGNORE_FILE='.trufflehogignore'

fail_policy() {
  printf 'TruffleHog history policy failed: %s\n' "$1" >&2
  return 1
}

validate_ignore_file() {
  local ignore_file="$1"
  local line_number=0
  local line=''
  local commit=''
  local detector=''
  local path=''
  local line_no=''
  local extra=''
  local key=''
  declare -gA IGNORED_FINDINGS=()

  if [[ ! -r "$ignore_file" ]]; then
    fail_policy "ignore file is missing or unreadable"
    return 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    [[ -z "$line" || "$line" == \#* ]] && continue

    # Fingerprint format: commit:detector:path:line.  Do not accept globs,
    # detector-only entries, path-only entries, or trailing fields.
    IFS=':' read -r commit detector path line_no extra <<<"$line"
    if [[ -n "$extra" || ! "$commit" =~ ^[0-9a-fA-F]{40}$ || -z "$detector" || -z "$path" || ! "$line_no" =~ ^[1-9][0-9]*$ ]]; then
      fail_policy "malformed exact fingerprint at line $line_number"
      return 1
    fi
    if [[ "$detector" =~ [*?\[\]] || "$path" =~ [*?\[\]\\] || "$path" == /* || "$path" == *$'\t'* ]]; then
      fail_policy "non-exact fingerprint at line $line_number"
      return 1
    fi

    key="${commit,,}:$detector:$path:$line_no"
    if [[ -n "${IGNORED_FINDINGS[$key]+present}" ]]; then
      fail_policy "duplicate fingerprint at line $line_number"
      return 1
    fi
    IGNORED_FINDINGS["$key"]=1
  done <"$ignore_file"
}

extract_finding_metadata() {
  local report="$1"
  local metadata="$2"

  # Keep this projection deliberately limited to the fields used to form an
  # exact location fingerprint. jq never emits any candidate secret fields.
  if ! jq -er -r '
    if (type != "object") then error("non-object result") else
      (.SourceMetadata.Data.Git // null) as $git |
      [($git.commit // ""), (.DetectorName // ""), ($git.file // ""), (($git.line // "") | tostring)] | @tsv
    end
  ' "$report" 2>/dev/null | sed 's/\r$//' >"$metadata"; then
    fail_policy 'scanner output was not valid JSON'
    return 1
  fi
}

scan_report() {
  local report="$1"
  local scanner_status="$2"
  local ignore_file="$3"
  local metadata=''
  local commit=''
  local detector=''
  local path=''
  local line_no=''
  local key=''
  local ignored_count=0
  local unexpected_count=0

  if [[ ! "$scanner_status" =~ ^[0-9]+$ ]]; then
    fail_policy 'scanner status was not numeric'
    return 1
  fi
  # TruffleHog --fail returns 183 when results are found. Any other non-zero
  # status includes scan errors and remains blocking.
  if ((scanner_status != 0 && scanner_status != 183)); then
    fail_policy "TruffleHog failed with scanner status $scanner_status"
    return 1
  fi
  if [[ ! -r "$report" ]]; then
    fail_policy 'scanner report is missing or unreadable'
    return 1
  fi

  validate_ignore_file "$ignore_file"
  metadata="$(mktemp)"
  extract_finding_metadata "$report" "$metadata"

  while IFS=$'\t' read -r commit detector path line_no; do
    # Missing Git metadata is never allow-listed: it could represent a new
    # source type or a scanner regression and must remain visible to CI.
    key="${commit,,}:$detector:$path:$line_no"
    if [[ -n "${IGNORED_FINDINGS[$key]+present}" ]]; then
      ignored_count=$((ignored_count + 1))
    else
      unexpected_count=$((unexpected_count + 1))
    fi
  done <"$metadata"

  if ((unexpected_count > 0)); then
    rm -f -- "$metadata"
    fail_policy "TruffleHog found $unexpected_count unignored verified/unknown result(s)"
    return 1
  fi
  if ((scanner_status == 183 && ignored_count == 0)); then
    rm -f -- "$metadata"
    fail_policy 'TruffleHog reported findings but no exact fixture fingerprint matched'
    return 1
  fi

  rm -f -- "$metadata"
  printf 'TruffleHog full-history secret scan passed (%s intentional fixture result(s) ignored by exact fingerprint).\n' "$ignored_count"
}

run_self_test() {
  local test_dir=''
  local report=''
  local ignore_file=''

  test_dir="$(mktemp -d)"
  report="$test_dir/report.jsonl"
  ignore_file="$test_dir/.trufflehogignore"

  # Metadata-only synthetic results avoid putting any secret-like value in the
  # test source, report, process arguments, or test output.
  printf '%s\n' \
    '{"SourceMetadata":{"Data":{"Git":{"commit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","file":"tests/fixture.js","line":7}}},"DetectorName":"URI","Verified":false}' \
    >"$report"
  printf '%s\n' \
    '# Synthetic fixture location only; no secret value is ignored.' \
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:URI:tests/fixture.js:7' \
    >"$ignore_file"

  if ! scan_report "$report" 183 "$ignore_file" >/dev/null; then
    rm -rf -- "$test_dir"
    fail_policy 'self-test exact fixture was not ignored'
    return 1
  fi

  # A copied fixture with a new commit must remain blocking.
  printf '%s\n' '{"SourceMetadata":{"Data":{"Git":{"commit":"cccccccccccccccccccccccccccccccccccccccc","file":"tests/fixture-copy.js","line":7}}},"DetectorName":"URI","Verified":false}' >"$report"
  if scan_report "$report" 183 "$ignore_file" >/dev/null 2>&1; then
    rm -rf -- "$test_dir"
    fail_policy 'self-test copied fixture was incorrectly ignored'
    return 1
  fi

  # A changed detector at the same location must remain blocking.
  printf '%s\n' '{"SourceMetadata":{"Data":{"Git":{"commit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","file":"tests/fixture.js","line":7}}},"DetectorName":"AWS","Verified":false}' >"$report"
  if scan_report "$report" 183 "$ignore_file" >/dev/null 2>&1; then
    rm -rf -- "$test_dir"
    fail_policy 'self-test changed detector was incorrectly ignored'
    return 1
  fi

  rm -rf -- "$test_dir"
  printf 'TruffleHog history ignore policy self-test passed.\n'
}

if [[ "${1:-}" == '--self-test' ]]; then
  [[ "$#" -eq 1 ]] || { usage; exit 2; }
  run_self_test
  exit $?
fi

if [[ "${1:-}" != '--report' || "$#" -lt 4 ]]; then
  usage
  exit 2
fi

report="$2"
if [[ "${3:-}" != '--status' ]]; then
  usage
  exit 2
fi
status="$4"
ignore_file="$DEFAULT_IGNORE_FILE"
if [[ "$#" -gt 4 ]]; then
  [[ "$#" -eq 6 && "$5" == '--ignore-file' ]] || { usage; exit 2; }
  ignore_file="$6"
fi

scan_report "$report" "$status" "$ignore_file"
