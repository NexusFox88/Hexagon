# Third-party materials

This inventory records existing provenance; it does not grant a project license or certify trademark/redistribution rights. Project code is licensed under Apache-2.0 at the owner’s direction; retained third-party materials keep their original terms.

| Material | Local source / notice | Distribution treatment |
|---|---|---|
| Activepieces community action snapshots/adaptations | `third_party/activepieces/LICENSE`, `provenance.json`, `expansion/provenance.json` | Preserve notices and exact source hashes; enterprise paths excluded |
| Simple Icons | `apps/console/brands/SIMPLE-ICONS-LICENSE.md`, `README.md` | Preserve attribution/source record; trademarks remain upstream |
| Geist font | `apps/console/fonts/OFL.txt` | Preserve bundled license |
| Official product favicons/artwork | `apps/console/brands/README.md` | Source recorded; redistribution review still required, not inferred from download availability |
| npm dependencies | `package-lock.json` | Installed separately; inventory includes exact versions, integrity and recorded license metadata; metadata is not a legal audit |
| Harness recipes | `examples/harnesses/oci/*/Dockerfile` | Build recipes, not a blanket license to redistribute every upstream binary/image; review exact upstream artifact before publishing |

`npm run release:check` verifies retained Activepieces source hashes and generates a private inventory. Local builds preserve this file, retained source notices and provenance, and font/icon license files. Public release remains blocked until artwork review and artifact-specific review are completed. See [source survey](docs/saas-source-survey.md).
