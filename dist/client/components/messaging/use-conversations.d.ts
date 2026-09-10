export declare function useConversations(): {
    items: ChatConversationSummary[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    markReadLocally: (uid: string) => void;
};
//# sourceMappingURL=use-conversations.d.ts.map