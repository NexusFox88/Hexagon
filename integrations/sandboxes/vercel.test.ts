import { APIError, Sandbox } from '@vercel/sandbox';
import { afterEach, expect, it, vi } from 'vitest';
import { VercelConnector } from './vercel.js';

afterEach(() => vi.restoreAllMocks());
const connector = () => new VercelConnector({ project_id: 'prj_test', team_id: 'team_test' }, 'test-token');

it('treats only provider 404 as absence, preserving auth and transport uncertainty', async () => {
  const get = vi.spyOn(Sandbox, 'get');
  get.mockRejectedValueOnce(new APIError(new Response('', { status: 404 })));
  expect(await connector().inspect('owned')).toBeNull();
  for (const failure of [new APIError(new Response('', { status: 401 })), new Error('network')]) {
    get.mockRejectedValueOnce(failure);
    await expect(connector().inspect('owned')).rejects.toBe(failure);
  }
});

it('does not invoke resumable execution APIs for stopped compute', async () => {
  const runCommand = vi.fn();
  vi.spyOn(Sandbox, 'get').mockResolvedValue({ persistent: false, status: 'stopped', runCommand } as unknown as Sandbox);
  await expect(connector().execute('owned', 'echo unsafe-replay')).rejects.toThrow('vercel_sandbox_not_running');
  expect(runCommand).not.toHaveBeenCalled();
  expect(Sandbox.get).toHaveBeenCalledWith(expect.objectContaining({ name: 'owned', resume: false }));
});

it('rejects unsupported egress policy before allocating a resource', async () => {
  const create = vi.spyOn(Sandbox, 'create');
  await expect(connector().create({ operation_id: 'operation', session_id: 'session', timeout_seconds: 60,
    network: { mode: 'allowlist', allowed_hosts: ['example.com'] } })).rejects.toThrow('vercel_network_allowlist_unsupported');
  expect(create).not.toHaveBeenCalled();
});

it('injects only scoped proxy grants outside the guest and preserves the network contract',async()=>{
  const updateNetworkPolicy=vi.fn().mockResolvedValue(undefined);
  vi.spyOn(Sandbox,'get').mockResolvedValue({persistent:false,status:'running',updateNetworkPolicy} as unknown as Sandbox);
  const id='11111111-1111-4111-8111-111111111111',token='a'.repeat(64);
  await connector().configureCredentialAccess('owned',{mode:'unrestricted',allowed_hosts:[]},[{base_url:`https://credentials.example.com/access/${id}`,token}]);
  expect(updateNetworkPolicy).toHaveBeenCalledWith({allow:{'credentials.example.com':[{match:{path:{startsWith:`/access/${id}/`}},transform:[{headers:{authorization:`Bearer ${token}`,'x-api-key':token}}]}],'*':[]}},expect.anything());
  await expect(connector().configureCredentialAccess('owned',{mode:'unrestricted',allowed_hosts:[]},[{base_url:'https://evil.example.com/anything',token}])).rejects.toThrow('invalid_native_access_binding');
  expect(updateNetworkPolicy).toHaveBeenCalledTimes(1);
});
