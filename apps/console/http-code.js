/** HTTP uses the same Session definition and durable submission semantics as SDK examples. */
export function httpCode({base,agentId,bindings,sessionId,prompt,sessionDefinition}){
 const sh=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
 return `# Requires curl, jq, python3 and a POSIX shell. Run one client per journal.
set -eu
umask 077
: "\${HEXAGON_API_TOKEN:?Set an application access token}"
BASE="\${HEXAGON_API_URL:-${base}}"
mkdir -p "\${HEXAGON_HTTP_JOURNAL:-hexagon-http-session}"
cd "\${HEXAGON_HTTP_JOURNAL:-hexagon-http-session}"
if ! mkdir lock 2>/dev/null; then echo 'journal_in_use_check_process_before_removing_lock' >&2; exit 1; fi
printf '%s' "$$" > lock/pid
trap 'rm -rf lock' EXIT
if [ -f endpoint.txt ]; then [ "$(cat endpoint.txt)" = "$BASE" ] || { echo 'journal_endpoint_mismatch' >&2; exit 1; }; else printf '%s' "$BASE" > endpoint.txt; fi
[ ! -f closed ] || { echo 'session_closed_use_new_journal' >&2; exit 1; }
api() { curl --fail-with-body -sS -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' "$@"; }
if [ ! -f session-id.txt ]; then
${sessionId?`  printf '%s' ${sh(sessionId)} > session-id.txt`:`  if [ -f session-creation-pending ]; then echo 'session_creation_unconfirmed_check_console' >&2; exit 1; fi
  case "\${1:-}" in --resume|--close) echo 'no_saved_session' >&2; exit 1;; esac
  cat > session-request.json <<'HEXAGON_JSON'
${JSON.stringify(sessionDefinition??{agent_id:agentId,...bindings},null,2)}
HEXAGON_JSON
  api -d @session-request.json "$BASE/v1/sessions/preflight"
  touch session-creation-pending
  api -d @session-request.json "$BASE/v1/sessions" > session-response.json
  jq -er '.id' session-response.json > session-id.txt.tmp
  mv session-id.txt.tmp session-id.txt
  rm session-creation-pending`}
fi
SESSION=$(cat session-id.txt)
${sessionId?`[ "$SESSION" = ${sh(sessionId)} ] || { echo 'journal_session_mismatch_choose_new_HEXAGON_HTTP_JOURNAL' >&2; exit 1; }`:''}
${agentId?`if [ -f session-request.json ]; then
  [ "$(jq -r .agent_id session-request.json)" = ${sh(agentId)} ] || { echo 'journal_agent_mismatch_choose_new_HEXAGON_HTTP_JOURNAL' >&2; exit 1; }
else
  api "$BASE/v1/sessions/$SESSION" > session-check.json
  [ "$(jq -r .agent_id session-check.json)" = ${sh(agentId)} ] || { echo 'journal_agent_mismatch_choose_new_HEXAGON_HTTP_JOURNAL' >&2; exit 1; }
fi`:''}
if [ "\${1:-}" = '--close' ]; then
  if [ -f run-id.txt ]; then
    RUN=$(cat run-id.txt)
    api "$BASE/v1/runs/$RUN" > run-status.json
    case "$(jq -r .state run-status.json)" in completed|failed|cancelled) ;; *) api -X POST "$BASE/v1/runs/$RUN/cancel";; esac
    COUNT=0
    while :; do
      api "$BASE/v1/runs/$RUN" > run-status.json
      case "$(jq -r .state run-status.json)" in completed|failed|cancelled) break;; esac
      COUNT=$((COUNT+1)); [ "$COUNT" -lt 60 ] || { echo 'cancellation_pending_resume_close' >&2; exit 1; }; sleep 2
    done
  fi
  api -X POST "$BASE/v1/sessions/$SESSION/close" > cleanup.json
  [ "$(jq -r .state cleanup.json)" = closed ] || { echo 'cleanup_pending_resume_close' >&2; exit 1; }
  touch closed; exit 0
fi
if [ "\${1:-}" = '--new-turn' ]; then
  if [ -f run-key.txt ] && [ ! -f run-id.txt ]; then echo 'submission_unconfirmed_use_resume' >&2; exit 1; fi
  if [ -f run-id.txt ]; then
    api "$BASE/v1/runs/$(cat run-id.txt)" > run-status.json
    case "$(jq -r .state run-status.json)" in completed|failed|cancelled) ;; *) echo 'active_run_use_resume' >&2; exit 1;; esac
  fi
  rm -f run-id.txt run-key.txt run-request.json
fi
if [ ! -f run-key.txt ]; then
  [ "\${1:-}" != '--resume' ] || { echo 'no_saved_run' >&2; exit 1; }
  cat > run-request.json <<'HEXAGON_JSON'
${JSON.stringify({input:prompt},null,2)}
HEXAGON_JSON
  python3 -c 'import uuid; print(uuid.uuid4())' > run-key.txt.tmp
  mv run-key.txt.tmp run-key.txt
fi
if [ ! -f run-id.txt ]; then
  api -H "Idempotency-Key: $(cat run-key.txt)" -d @run-request.json "$BASE/v1/sessions/$SESSION/runs" > run-response.json
  jq -er '.id' run-response.json > run-id.txt.tmp
  mv run-id.txt.tmp run-id.txt
fi
RUN=$(cat run-id.txt)
printf '%s\\n' "$BASE/console/#runs?id=$RUN"
# Optional stream: reconnect with the last event ID you durably saved.
# api -N "$BASE/v1/runs/$RUN/stream?after=0"
COUNT=0
while :; do
  api "$BASE/v1/runs/$RUN" > run-status.json
  STATE=$(jq -r .state run-status.json)
  case "$STATE" in completed|failed|cancelled) break;; esac
  COUNT=$((COUNT+1)); [ "$COUNT" -lt 300 ] || { echo 'run_continues_in_background_use_resume' >&2; exit 1; }; sleep 2
 done
jq '.output // .error // {state:.state}' run-status.json
[ "$STATE" = completed ]
# Session remains open. --resume recovers the same Run; --new-turn submits a new turn;
# --close cancels active work, waits for termination and confirms cloud cleanup.
`;
}
