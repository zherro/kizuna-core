/**
 * Registry de skills de IA (server-side). Uma `AiSkill` empacota tudo que o
 * orquestrador (`runSkill`) precisa: como carregar contexto, montar o prompt,
 * o schema estruturado esperado e como validar/mapear a resposta crua.
 *
 * O `context` agrupa skills para o liga/desliga em `ai_assistant.contexts`
 * (ver `run-skill.ts`).
 */
const registry = new Map();
export function registerSkill(skill) {
    registry.set(skill.key, skill);
}
export function getSkill(key) {
    return registry.get(key);
}
/** Contextos distintos das skills registradas — usado pela tela de configuração. */
export function listSkillContexts() {
    return [...new Set([...registry.values()].map((s) => s.context))];
}
//# sourceMappingURL=skill.js.map