# Provide files and context

Upload project inputs before the first Run. Uploaded files become workspace inputs; they are not automatically complete model context or exported artifacts.

Create a Session with no submitted Runs first. The snippets below continue with an initialized `client` and `session` from the [first Session guide](../start/first-session.md).

## Upload files

Python accepts workspace-relative paths mapped to bytes:

```python
from pathlib import Path
import hashlib
source = Path('hello.py').read_bytes()
uploaded = client.upload(session['id'], {'src/hello.py': source})
assert uploaded[0]['sha256'] == hashlib.sha256(source).hexdigest()
assert uploaded[0]['size'] == len(source)
```

TypeScript accepts base64-encoded file entries:

```typescript
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = await readFile('hello.py');
const uploaded = await client.upload(session.id, [
  { path: 'src/hello.py', content_base64: source.toString('base64') },
]);
if (uploaded[0].sha256 !== createHash('sha256').update(source).digest('hex') ||
    uploaded[0].size !== source.length) throw new Error('Stored input mismatch');
```

Prepare a local `hello.py`, for example containing `print("hello")`. The returned hash and size verify stored control-plane input, not cloud workspace readiness. Ask the next Run to read and execute `src/hello.py` to verify actual execution.

## Paths, limits, and timing

Paths must be relative. Absolute paths, backslashes, empty segments, `.`, `..`, and NUL are rejected. A request cannot repeat a path. Before execution starts, uploading the same path again updates its stored input.

The current implementation allows 1–100 files per request, at most 2 MiB characters in each base64 field, and 8 MiB total decoded content. The encoded field limit is not a 2 MiB source-file allowance. Paths have a 500-character limit. These values come from the current [input implementation](../../../../modules/execution/inputs.ts).

After any Run is submitted, or a Sandbox is bound, uploads fail with `workspace_already_started`. Make subsequent changes through Agent work. Create a new Session for a fresh input project. When initialization is configured, `SOUL.md` is reserved and cannot be overwritten through uploads.

## Distinguish files from model context

Uploading makes files available in the workspace. Task instructions and Harness tools determine whether they are read. Do not assume the model has read every uploaded byte.

Session `context.files` references paths and expected SHA-256 values. Submission checks existence, digest, size, and UTF-8 encoding. Referenced context text is currently limited to 32768 bytes per file and rejects NUL and invalid UTF-8; ordinary upload limits are different. See the [initialization contract](../../../session-initialization.md).

Resolve `context_file_missing` or `context_file_changed` before submitting again. Repeating the same invalid configuration will not repair it.

## Environment and credentials

Use `env` / `variables` for ordinary configuration such as application mode. Sandbox code can read these values. Keep managed model, Provider, and Tool credentials in their dedicated connection mechanisms rather than project files or environment values.

## Verify completion

Check stored input hashes, prove that a real Run can read the file and execute a fixed check, then explicitly export and download required deliverables. Stored inputs, live workspace files, and final artifacts are separate verification targets.

Retain the Session ID on failure. Correct invalid input paths before execution; uploads cannot overwrite a started workspace. Explicitly close unused Sessions and confirm cleanup. Next: [Continue across turns](multi-turn.md).
