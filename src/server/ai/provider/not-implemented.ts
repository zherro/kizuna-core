/**
 * `NotImplementedProvider` — placeholder para providers ainda não escritos (`openai`, `claude`).
 * Sempre lança `AiUnavailableError` com `reason: 'blocked'` (não adianta tentar de novo).
 */

import { AiUnavailableError } from '../errors';
import type { AiProvider } from './types';

export class NotImplementedProvider implements AiProvider {
  constructor(public readonly id: 'openai' | 'claude') {}

  async generateStructured(): Promise<Record<string, unknown>> {
    throw new AiUnavailableError(`provider "${this.id}" ainda não implementado.`, {
      reason: 'blocked',
    });
  }
}
