type Status = 'idle' | 'loading' | 'ready' | 'error';
export declare function useConversationMessages(uid: string | null): {
    messages: ChatMessage[];
    status: Status;
    hasMore: boolean;
    sending: boolean;
    loadOlder: () => Promise<void>;
    send: (text: string) => void;
    retry: (token?: string) => void;
    refreshNow: () => void;
};
export {};
//# sourceMappingURL=use-conversation-messages.d.ts.map