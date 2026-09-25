import type { RpcConfig } from '../types/resource';

export type RpcAuthMode = 'required' | 'optional' | 'none';

export function rpcAuthMode(config: RpcConfig): RpcAuthMode {
  if (config.requiresAuth !== false) return 'required';
  return config.optionalAuth ? 'optional' : 'none';
}
