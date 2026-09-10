export type RpcTesterProps = {
    /** Endpoint que recebe { schema, functionName, params } via POST e repassa pro PostgREST RPC. */
    endpoint?: string;
    /** Rota pra onde o link "Voltar" aponta. Omitir esconde o link. */
    backHref?: string;
    backLabel?: string;
    title?: string;
    description?: string;
    eyebrow?: string;
};
/**
 * Formulário genérico de teste de função RPC contra um endpoint PostgREST — schema, nome da
 * função e parâmetros em JSON, mostrando status HTTP e payload de resposta. Sem nenhuma
 * taxonomia/regra de negócio: qualquer projeto que exponha `pgrstRpc` atrás de uma rota
 * `POST` pode usar como está.
 */
export declare function RpcTester({ endpoint, backHref, backLabel, title, description, eyebrow, }?: RpcTesterProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=rpc-tester.d.ts.map