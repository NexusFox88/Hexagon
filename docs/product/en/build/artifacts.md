# Retrieve, retain, and deliver artifacts

An Artifact is an exported Run file snapshot stored by the control plane. It remains downloadable after the Session's cloud resources are closed.

Continue from the [first Session guide](../start/first-session.md) with an authorized Run ID and initialized client.

## Ask for exported deliverables

Tell the Agent to write deliverables into its supplied Run artifact directory, currently `artifacts/<run-id>/` within the workspace. Each Run has its own directory. Saving somewhere in the project does not automatically export a file.

The worker exports files after the Harness exits and before completing the Run. Limit violations fail visibly rather than silently dropping files. Query actual artifact metadata instead of relying on the assistant's claim that it created a file.

## Download and verify

```python
from pathlib import Path
import hashlib
output = Path('downloads')
output.mkdir(exist_ok=True)
items = client.artifacts(run_id)['artifacts']
for index, item in enumerate(items):
    data = client.download_artifact(item['id'])
    if len(data) != item['size'] or hashlib.sha256(data).hexdigest() != item['sha256']:
        raise RuntimeError('Artifact integrity mismatch')
    (output / f'output-{index}.bin').write_bytes(data)
```

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await mkdir('downloads', { recursive: true });
const { artifacts } = await client.artifacts(runId);
for (const [index, item] of artifacts.entries()) {
  const bytes = await client.downloadArtifact(item.id);
  if (bytes.length !== item.size || createHash('sha256').update(bytes).digest('hex') !== item.sha256)
    throw new Error('Artifact integrity mismatch');
  await writeFile(`downloads/output-${index}.bin`, bytes);
}
```

Use a caller-controlled directory without valuable existing `output-N.bin` files: these examples overwrite those names. A production application can create a unique task directory and use exclusive writes. Never trust a remote name as an absolute local destination.

Metadata includes name, size, SHA-256, Session ID, Run ID, and creation time. Downloads return binary content. Authorize business users again before delivery and select a safe response content type and download filename.

## Limits and retention

Current exports allow 64 files, 4 MiB per file, and 8 MiB per Run. Symbolic links and nonregular files are rejected. See the [artifact implementation](../../../../modules/artifacts/artifacts.ts) and Runtime export logic.

Bytes reside in PostgreSQL. Session closure does not delete them, and subsequent Runs do not overwrite earlier snapshots. This is not an unlimited-capacity or permanent archival guarantee; backups, storage capacity, and deployment retention remain operational responsibilities.

## Diagnose and verify

For an empty list, check terminal state, output directory, actual Harness execution, and export errors. Do not resubmit merely to inspect files. Cross-tenant artifact reads must fail; your application must also check business ownership.

Verify metadata, size, digest, task-specific content, and a second download of the same Artifact ID after Session closure. Keep unresolved cleanup records even when artifact export succeeds.

Next: [Private Web previews](private-preview.md).
