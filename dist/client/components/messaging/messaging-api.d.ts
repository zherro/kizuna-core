import type { ChatConversationSummary } from '../../../types';
export declare const fetchConfig: () => Promise<any>;
export declare const fetchConversations: (before?: string | null) => Promise<{
    items: ChatConversationSummary[];
    nextCursor: string | null;
    hasMore: boolean;
    badgeCount?: number;
}>;
export declare const fetchMessages: (uid: string, p: {
    limit?: number;
    before?: number;
    after?: number;
}) => Promise<any>;
export declare const postMessage: (uid: string, body: {
    content: string;
    clientToken: string;
}) => Promise<any>;
export declare const patchRead: (uid: string, upToMessageId: number) => Promise<Response>;
//# sourceMappingURL=messaging-api.d.ts.map