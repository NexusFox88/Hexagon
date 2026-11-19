import type { ConnectionAdapter } from '../../modules/connections/connections.js';
import { httpConnectionConfig } from '../../modules/access/policy.js';
export const httpAccessConnection:ConnectionAdapter={kind:'http',provider:'http',config:httpConnectionConfig,capabilities:['protected_credentials','exact_path_policy'],
  async validate(config,credential){
    httpConnectionConfig.parse(config);
    if(!credential || /[\r\n\0]/.test(credential))throw Error('invalid_credential');
    // A structural check deliberately does not dispatch an arbitrary user operation.
    return {operations:['configuration_checked_remote_authentication_unverified']};
  }
};
