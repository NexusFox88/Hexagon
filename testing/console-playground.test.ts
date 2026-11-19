import {it,expect,vi} from 'vitest';
// @ts-expect-error Browser module exercised without a DOM.
import {submitPlayground} from '../apps/console/playground.js';
it('preserves the same session, message and key after a lost submission response',async()=>{
 const api=vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({id:'session-1'}).mockRejectedValueOnce(new Error('lost')).mockResolvedValueOnce({id:'run-1'});
 const request={definition:{harness:{id:'pi',version:'1'}},input:'hello'},state={};
 await expect(submitPlayground(api,request,state)).rejects.toThrow('lost');
 await expect(submitPlayground(api,request,state)).resolves.toEqual({id:'run-1'});
 expect(api.mock.calls[3]).toEqual(api.mock.calls[2]);expect(api.mock.calls.filter(c=>c[1]==='/sessions')).toHaveLength(1);
});
it('does not blindly retry unknown Session creation',async()=>{
 const api=vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('lost')),state={};
 await expect(submitPlayground(api,{definition:{},input:'hi'},state)).rejects.toThrow('lost');
 await expect(submitPlayground(api,{definition:{},input:'hi'},state)).rejects.toThrow('session_creation_unconfirmed');expect(api).toHaveBeenCalledTimes(2);
});
