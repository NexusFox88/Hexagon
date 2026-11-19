# Reuse Agent configuration

Create Sessions directly when each task supplies explicit execution configuration. Use revisioned Agent templates when multiple Sessions should reuse a Harness, behavior, and policy.

A template is configuration, not a running process or shared workspace. Continue a project through its Session; reuse configuration through a template. See [multi-turn work](multi-turn.md).

## Create and use a template

With initialized clients and verified connections, pin the returned revision explicitly:

```python
agent = client.create_agent(
    name='Project assistant',
    harness={'id': 'pi', 'version': '1.5.2'},
    env={'APP_MODE': 'review'},
)
session = client.create_session(
    agent_id=agent['id'], agent_revision=agent['revision'],
    sandbox_connection_id=sandbox_connection_id,
    model_connection_id=model_connection_id,
)
```

```typescript
const agent = await client.createAgent({
  name: 'Project assistant',
  harness: { id: 'pi', version: '1.5.2' },
  env: { APP_MODE: 'review' },
});
const session = await client.createSession({
  agent_id: agent.id, agent_revision: agent.revision,
  sandbox_connection_id: sandboxConnectionId,
  model_connection_id: modelConnectionId,
});
```

Do not supply `harness` together with `agent_id`. This path does not accept arbitrary overrides of template behavior and resource policy. Session environment overrides follow their dedicated contract. Sandbox code can read those values; keep protected connection credentials out of them.

## Revise the complete definition

Use Python `revise_agent(agent_id, definition, expected_revision)` or TypeScript `reviseAgent(agentId, definition, expectedRevision)`. The definition is complete, not a partial patch: retain the intended Harness, behavior, and policy explicitly.

Read the current Agent and revision before editing. Successful revision increments the version; a concurrent change produces `agent_revision_changed`. Reload and review rather than force-overwriting the other editor's changes.

Omitting `env` / `variables` preserves the existing environment. Supplying one replaces that map, and an empty map clears it. Returned `env_names` do not contain recoverable plaintext values.

## Pinning and archival

A Session pins its chosen revision and connection configuration. Template changes do not rewrite existing Sessions or switch their running Harness.

`archive_agent` / `archiveAgent` prevents new Sessions from using the template and prevents further revision. Existing Sessions and historical records retain their own lifecycle. Archiving does not close cloud resources or delete conversations/artifacts.

## Verify

Create two independent Sessions from one revision and confirm separate workspaces. Revise, create a third, and compare initialization snapshots: the original Sessions retain their revisions and the new one uses the selected update. Archive, verify new creation is rejected, then close all Sessions and confirm cleanup.

Revision and archival require appropriate permissions. Permission to create a template does not imply all management routes are available to application Tokens. See [Token routes](../../../../modules/credentials/application-tokens.ts). Sources: [Agent/Session implementation](../../../../modules/execution/sessions.ts), [initialization](../../../session-initialization.md). Next: [Backend integration](backend-integration.md).
