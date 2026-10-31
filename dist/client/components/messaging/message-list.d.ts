import type { ChatMessage } from '../../../types';
export declare function MessageList({ messages, me, hasMore, onLoadOlder, onRetry, }: {
    messages: ChatMessage[];
    me: string;
    hasMore: boolean;
    onLoadOlder: () => void;
    onRetry: (clientToken?: string) => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=message-list.d.ts.map