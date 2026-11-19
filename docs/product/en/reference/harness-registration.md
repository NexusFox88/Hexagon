# Catalog and Harness registration HTTP contract

Catalog discovery is available to owner/application tokens; both registration routes require an owner. Registrations are tenant-scoped. Registration is not a Sandbox launch, model test or certification of a declared capability.

## Discover catalogs

`GET /v1/catalog` returns **200**, `{connections,harnesses,harness_templates,harness_protocols}`, with no pagination. Connections contains adapter kind/provider/capabilities and optional setup_url/evidence. Harnesses contains tenant-visible executable definitions; harness_templates is a separate template collection, not a promise that every image is registered or available. Harness_protocols describes adapter protocol contracts.

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" "$HEXAGON_API_URL/v1/catalog"
```

Harness entries include their source definition plus protocol, model_providers, continuation, distribution and verification. The current projection computes distribution from image, recipe and source metadata; do not use that label alone as proof of installation. Verification entries match exact image reference, protocol and command and include their Sandbox/model/client/scenario scope. An empty verification array means this projection has no matching evidence, not necessarily that execution is impossible. Choose compatible connections and preflight the actual Session.

## Register an OCI Harness

`POST /v1/harnesses` accepts a strict object:

| Field | Requirement / default |
| --- | --- |
| image | Required string, 1–512 characters; registry reference resolved by the image resolver |
| id | Optional, matches `^custom\.[a-z0-9][a-z0-9.-]{0,79}$`; otherwise derived from resolved reference |
| version | Optional, matches `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`; otherwise first 16 digest hex characters |
| name | Optional string 1–100; defaults to resolved ID |
| protocol | Optional registered protocol enum; otherwise image label ai.hexagon.harness.protocol, then hexagon-json-v1 |
| command | Optional array of 1–32 nonempty strings, each ≤65,536 without NUL; otherwise resolved image command |
| capabilities | 1–3 entries from conversation/tools/initialization, default conversation |
| registry_secret_id | Optional tenant-owned enabled managed Secret UUID |

For private registry authentication, the managed Secret value must be strict JSON `{username,password}` with nonempty strings. Do not put registry secrets into image URLs or request logs. The resolver checks the supported image/platform contract; current registrations pin linux/amd64. See [OCI integration](../integrations/harnesses/oci.md) for runnable image requirements.

Save your actual image definition as `harness-image.json`:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @harness-image.json "$HEXAGON_API_URL/v1/harnesses"
```

Success returns **201** with id/version/name, source=oci, protocol, effective capabilities/model_providers, image (reference/digest/platform/user and optional registry_secret_id), command and registration_digest. It contacts a registry and saves a resolved definition; it does not execute the image. Tools/initialization must be supported by the selected protocol, and a missing resolved command returns `400 harness_entrypoint_missing`.

The immutable key is tenant/id/version. Re-registering an identical resolved definition returns it; different content at the same key yields `409 harness_version_conflict`. Image tags can move between requests, so preserve the returned digest and use an immutable image reference. OCI and source packages share this version namespace. No public update/delete route is defined here.

## Register a source package

`POST /v1/harness-packages` accepts a strict object:

| Field | Requirement |
| --- | --- |
| id, version | Required, same explicit ID/version patterns as OCI |
| capabilities | At most 3 conversation/tools/initialization entries; default empty |
| model_providers | Exactly `["anthropic-compatible"]` |
| protocol | Exactly hexagon-json-v1 |
| interpreter | python3 or node |
| entrypoint | Valid package path, present in files |
| files | 1–32 strict `{path,content}` objects |

Paths are at most 240 characters, begin with an alphanumeric/underscore/hyphen and use alphanumeric, underscore, dot, slash or hyphen characters. Empty/`.`/`..` segments, duplicate paths and file/directory collisions are rejected. Content is text, not Base64, ≤262,144 JavaScript string code units per file; total UTF-8 content is at most 512 KiB. This endpoint is not a general dependency installer.

Prepare `harness-package.json` following the [source-package guide](../integrations/harnesses/source-package.md), including actual executable protocol implementation:

```sh
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $HEXAGON_API_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @harness-package.json "$HEXAGON_API_URL/v1/harness-packages"
```

Success **201** returns id/version/capabilities/model_providers, digest and created_at, not the full source files. Digest is computed over a canonical package with deduplicated/sorted capabilities and sorted files. Identical canonical content at the same key is accepted; different content or an OCI collision yields `409 harness_version_conflict`.

Registration stores inert data in the control plane. During execution, files are installed and byte-checked in the Sandbox, the interpreter must exist, and the program must implement the declared protocol. Source acceptance alone does not establish tool support, continuation, correctness or isolation beyond the documented Sandbox boundary.

Malformed strict inputs return `400 invalid_request`; image-specific registry/manifest failures use resolver errors. Private registry lookup may return secret_not_found (404), secret_disabled (409), secret_store_unavailable (503) or image_registry_credential_invalid (400). A lost registration response should be reconciled against catalog identity/digest rather than changing version to bypass a conflict.

Sources: [catalog projection](../../../../modules/harnesses/catalog.ts), [OCI registration](../../../../modules/harnesses/images.ts), [source packages](../../../../modules/execution/harness-packages.ts), [routes](../../../../apps/control-plane/server.ts). Examples assume an origin without `/v1`; no registry request, registration or cloud execution was performed in this documentation pass. Next: [HTTP overview](http.md), [Harness selection](../integrations/harnesses.md).
