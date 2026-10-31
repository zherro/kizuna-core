/**
 * `NotImplementedProvider` — placeholder para providers ainda não escritos (`openai`, `claude`).
 * Sempre lança `AiUnavailableError` com `reason: 'blocked'` (não adianta tentar de novo).
 */
import { AiUnavailableError } from '../errors';
export class NotImplementedProvider {
    constructor(id) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: id
        });
    }
    async generateStructured() {
        throw new AiUnavailableError(`provider "${this.id}" ainda não implementado.`, {
            reason: 'blocked',
        });
    }
}
//# sourceMappingURL=not-implemented.js.map