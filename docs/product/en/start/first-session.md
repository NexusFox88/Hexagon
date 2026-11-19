# Create your first Agent Session

Run built-in Pi 1.5.2 in a cloud sandbox, create a small text artifact, and verify that the artifact remains readable after closing the Session.

## Prerequisites and evidence scope

Start a [local control plane](../../../local-installation.md). Verify and enable a Sandbox connection and a compatible model connection in Console. Select an exact combination from the [execution matrix](../../../../testing/execution-matrix.md): a Provider name alone does not establish compatibility with every model endpoint or protocol.

The programs linked below have syntax / type checks. They have not yet received a fresh cloud acceptance run as part of this documentation work. Running them consumes your Provider and model resources. No saved Agent template or additional Tool is required.

## Run the complete example

From the repository root, set your verified connection IDs. These values are identifiers, not Provider credentials:

```sh
export HEXAGON_EXAMPLE_SANDBOX_ID='YOUR_SANDBOX_CONNECTION_ID'
export HEXAGON_EXAMPLE_MODEL_ID='YOUR_MODEL_CONNECTION_ID'
```

Choose one language. The programs create independent Sessions; running both creates two separate journeys.

Python: install the local SDK, then run the [complete program](../../../../examples/documentation/first-session.py):

```sh
python3 examples/documentation/first-session.py
```

TypeScript: with repository dependencies installed, build the SDK and run the [complete program](../../../../examples/documentation/first-session.ts):

```sh
npm --prefix sdk/typescript run build
./node_modules/.bin/tsx examples/documentation/first-session.ts
```

The program creates a Session directly with a pinned Pi version and your connections. It asks the Harness to place `hello.txt` in the supplied Run artifact directory, polls the Run, checks the exported bytes, closes the Session, and downloads an artifact again to check retention.

## Verify the outcome

Look for the Session and Run IDs, the final answer, and `Completed; artifacts and journal:`. Python uses `.local/docs-first-python/`; TypeScript uses `.local/docs-first-typescript/`.

Each directory contains a private `journal.json` and locally named artifact files. Remote paths are not used as local write destinations. At least one exported file must contain `Hello from Hexagon`, allowing surrounding whitespace.

The final journal phase, `closed_and_retention_checked`, records that this program observed successful execution, matching output bytes, a `closed` response, and a successful artifact download after closure. It is evidence only for that execution and combination.

## Recover from interruption

The ten-minute observation deadline does not cancel server execution. A Run can remain active after a timeout, lost connection, or closed terminal. Inspect the original IDs in Console.

The program refuses to overwrite an existing journal. Do not delete it simply to retry:

| Saved information | Recovery action |
| --- | --- |
| No Session ID | Creation may have succeeded without a response; inspect Sessions and resource operations before creating another |
| Session ID but no Run ID | If the submission response was lost, call `submit` with the same Session, input, and saved key |
| Run ID | Query that Run; do not submit another task to resume observation |
| `closing` phase | Inspect the same Session and resource operations; repeated close reconciles the original resources |
| Failed Run or incorrect artifact | Inspect events, retain the journal, and explicitly close the Session after investigation |

Request cancellation with Python `client.cancel(run_id)` or TypeScript `await client.cancel(runId)`, then query the terminal state. Cancellation does not reverse dispatched external effects and does not replace Session closure.

Close with Python `client.close(session_id)` or TypeScript `await client.close(sessionId)`. Check the returned state and Console resource operations. An exception is not proof that resources are absent. Unknown external effects require [reconciliation](../../../tool-reconciliation.md).

Use each journal from one process only. After confirming cleanup, archive the directory before starting a new independent experiment.

Next: [Understand what happened](what-happened.md).

Continue with a larger task: [Complete a real project task](project-task.md).
