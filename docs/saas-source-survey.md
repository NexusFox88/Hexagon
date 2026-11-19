# SaaS integration sources and reuse decisions

The current development direction is breadth-first migration without interactive account onboarding or real-provider acceptance. User authorization is not a prerequisite for importing connector code. Keep actual live-validation claims separate from implemented coverage.

| Project | Inspected material | Reuse decision |
|---|---|---|
| [Activepieces](https://github.com/activepieces/activepieces/tree/main/packages/pieces/community) | Community app catalog, selected action source, auth definitions, root license | Primary migration source. MIT community files; do not copy enterprise paths. 17 provider action snapshots plus 2 auth snapshots retained for this expansion. |
| [LangChain](https://github.com/langchain-ai/langchain/blob/master/LICENSE) | MIT license | Compatible source candidate for future agent-oriented tools; no source imported this batch. |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev/blob/main/LICENSE) | Apache-2.0 license | Compatible source candidate, subject to preserving notices for any future copied files; no source imported this batch. |
| [n8n](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) | Sustainable Use License and enterprise exclusions | Do not copy into the planned hosted commercial product under assumed permissive terms. |
| [Pipedream](https://github.com/PipedreamHQ/pipedream/blob/master/LICENSE) | Source Available License, excluded commercial-purpose language | No source copied into this implementation. |

Provider differences that required adapting the upstream code:

- [Trello authentication](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/): use the documented OAuth-style Authorization header instead of the source action's key/token query parameters. Preserve both credentials only in encrypted storage.
- [Microsoft Graph pagination](https://learn.microsoft.com/en-us/graph/paging): preserve opaque nextLink query parameters while preventing caller-controlled host/resource changes.
- [Google Sheets values.append](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append): preserve append semantics and explicit valueInputOption; default to RAW.
- [Asana OAuth scopes](https://developers.asana.com/docs/oauth-scopes): use explicit resource scopes rather than blindly carrying over the source's legacy default scope.
- [Dropbox offline authorization](https://docs.dropboxapi.com/dropbox-api/docs/get-started/authorization): request offline access for refresh-token support.

This is a source and license selection record, not a vendor runtime acceptance report. The root license of a repository alone is never sufficient evidence that every nested file is reusable; imported files are specifically from the MIT community paths and their full content is retained.
