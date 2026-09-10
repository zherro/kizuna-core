import type { ChatConversationSummary } from '../../../types';
export declare function ConversationList({ items, activeUid, loading, onSelect, onRefresh, }: {
    items: ChatConversationSummary[];
    activeUid: string | null;
    loading: boolean;
    onSelect: (uid: string) => void;
    onRefresh: () => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=conversation-list.d.ts.map