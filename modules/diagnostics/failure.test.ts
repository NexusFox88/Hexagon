import { expect, it } from 'vitest';
import { failureDiagnostic } from './failure.js';
it('retains status and known transport codes while excluding arbitrary provider data', () => {
  expect(failureDiagnostic(Object.assign(new Error('credential-in-message'), {status:429, code:'credential-in-code', body:'private', url:'private'}))).toEqual({category:'Error', status:429});
  expect(failureDiagnostic(Object.assign(new TypeError('private'), {cause:{code:'ECONNRESET'}}))).toEqual({category:'TypeError', code:'ECONNRESET'});
  expect(failureDiagnostic({name:'credential-in-name',status:'private',code:'private'})).toEqual({category:'provider_error'});
});
