import { Hexagon, HexagonError } from '../sdk/typescript/index.js';

/** Public API checks against a live Session; never revokes a provider key. */
export async function checkConnectionLifecycle(client: Hexagon, input: {
  connection: any; session: any; agent: any; model: any; tools: Record<string, string>;
  credential: string; alternateConfig: Record<string, unknown>;
}) {
  const { connection, session } = input;
  const result: Record<string, unknown> = {};
  async function denied(work: () => Promise<unknown>, status: number, code: string) {
    try { await work(); } catch (error) {
      if (error instanceof HexagonError && error.status === status && error.code === code) return;
      throw error;
    }
    throw new Error(`expected_${code}`);
  }
  const createSession = () => client.createSession({ agent_id: input.agent.id, sandbox_connection_id: connection.id, model_connection_id: input.model.id, tools: input.tools });
  await denied(() => client.deleteConnection(connection.id), 409, 'connection_in_use');
  result.active_dependency_blocks_delete = true;
  const edited = await client.updateConnection(connection.id, { name: 'Updated acceptance sandbox', config: input.alternateConfig });
  if (edited.name !== 'Updated acceptance sandbox' || edited.status !== 'draft' || edited.enabled || JSON.stringify(edited.config) !== JSON.stringify(input.alternateConfig)) throw new Error('configuration_update_failed');
  await denied(() => client.updateConnection(connection.id, { enabled: true }), 409, 'validation_required');
  const pinned = await client.session(session.id);
  if (JSON.stringify(pinned.definition) !== JSON.stringify(session.definition)) throw new Error('session_definition_changed');
  result.config_update_invalidates_validation = true;
  result.existing_session_definition_unchanged = true;

  // This changes only the test Connection's stored value, not the user's account.
  await client.updateConnection(connection.id, { config: connection.config, credential: 'hexagon-deliberately-invalid-test-key' });
  const invalid = await client.validateConnection(connection.id);
  if (invalid.status !== 'invalid' || invalid.enabled) throw new Error('invalid_credential_accepted');
  await denied(createSession, 409, 'connection_not_ready');
  result.invalid_credential_rejected = true;
  await client.updateConnection(connection.id, { credential: input.credential });
  const verified = await client.validateConnection(connection.id);
  if (verified.status !== 'ready' || verified.enabled) throw new Error('revalidation_failed');
  await client.updateConnection(connection.id, { enabled: true });
  result.credential_replacement_and_revalidation = true;

  const sibling = await client.createConnection({ kind: connection.kind, provider: connection.provider, name: 'Shared account acceptance sibling', config: connection.config, credential: input.credential });
  if ((await client.validateConnection(sibling.id)).status !== 'ready') throw new Error('sibling_validation_failed');
  await client.updateConnection(sibling.id, { enabled: true });
  await client.updateConnection(connection.id, { enabled: false });
  await denied(createSession, 409, 'connection_not_ready');
  await denied(() => client.submit(session.id, 'Must not run after disabling the connection', 'disabled-connection'), 409, 'connection_not_ready');
  await denied(() => client.deleteConnection(connection.id), 409, 'connection_in_use');
  result.disabled_connection_rejects_new_session = true;
  result.disabled_connection_rejects_new_run = true;
  return { result, sibling, async verifyAfterClose() {
    if ((await client.session(session.id)).state !== 'closed') throw new Error('session_not_closed');
    await client.deleteConnection(connection.id);
    await denied(() => client.request('GET', `/connections/${connection.id}`), 404, 'connection_not_found');
    if ((await client.validateConnection(sibling.id)).status !== 'ready') throw new Error('shared_account_affected_by_deletion');
    result.disabled_connection_cleanup_and_delete = true;
    result.shared_account_credential_still_valid = true;
    await client.deleteConnection(sibling.id);
    return result;
  } };
}
