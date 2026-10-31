export declare function buildPgHeaders(init?: RequestInit, opts?: {
    auth?: string | null;
}, prefer?: string): Promise<Headers>;
export declare function pgrstRpc(name: string, body: unknown, opts?: {
    auth?: string | null;
    schema?: string;
}): Promise<Response>;
export declare function pgrstTable(path: string, init?: RequestInit, opts?: {
    auth?: string | null;
}): Promise<Response>;
//# sourceMappingURL=conn.d.ts.map