import {it,expect,vi} from 'vitest';
// @ts-expect-error Browser module supports pure flow testing.
import {verifySandboxConnection} from '../apps/console/sandbox-connect.js';
it('retains saved identity before verification and only enables on success',async()=>{
 const saved={id:'existing',status:'draft'},checked={id:'existing',status:'ready'},retain=vi.fn();
 const api=vi.fn().mockImplementationOnce(async()=>{expect(retain).toHaveBeenCalledWith(saved);return checked;}).mockResolvedValueOnce({...checked,enabled:true});
 await expect(verifySandboxConnection(api,saved,retain)).resolves.toMatchObject({enabled:true});
 expect(api.mock.calls).toEqual([['POST','/connections/existing/validate'],['PATCH','/connections/existing',{enabled:true}]]);
});
it('keeps a failed saved connection editable without enabling or creating another',async()=>{
 const retain=vi.fn(),api=vi.fn().mockResolvedValue({id:'existing',status:'invalid',validation:{code:'bad_credential'}});
 await expect(verifySandboxConnection(api,{id:'existing'},retain)).rejects.toThrow();expect(api).toHaveBeenCalledTimes(1);expect(retain).toHaveBeenLastCalledWith(expect.objectContaining({id:'existing',status:'invalid'}));
});
it('retains identity when verification outcome cannot be obtained',async()=>{
 const retain=vi.fn(),api=vi.fn().mockRejectedValue(new Error('offline'));
 await expect(verifySandboxConnection(api,{id:'existing'},retain)).rejects.toThrow('offline');expect(retain).toHaveBeenCalledWith({id:'existing'});expect(api).toHaveBeenCalledTimes(1);
});
it('supports model and tool validation errors and retains identity if enable fails',async()=>{
 const saved={id:'model'},retain=vi.fn();
 const rejected=vi.fn().mockResolvedValue({id:'model',status:'invalid'});
 await expect(verifySandboxConnection(rejected,saved,retain,'ui.connect_verify_failed')).rejects.toMatchObject({key:'ui.connect_verify_failed'});
 const api=vi.fn().mockResolvedValueOnce({id:'model',status:'ready'}).mockRejectedValueOnce(new Error('enable unavailable'));
 await expect(verifySandboxConnection(api,saved,retain,'ui.connect_verify_failed')).rejects.toThrow('enable unavailable');
 expect(retain).toHaveBeenLastCalledWith({id:'model',status:'ready'});expect(api).toHaveBeenCalledTimes(2);
});
