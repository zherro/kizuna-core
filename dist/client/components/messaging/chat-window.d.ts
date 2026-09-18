import type { ReactNode } from 'react';
import type { ChatConversationSummary } from '../../../types';
export declare function ChatWindow({ conversation, me, onBack, renderContextBanner, }: {
    conversation: ChatConversationSummary;
    me: string;
    onBack?: () => void;
    renderContextBanner?: (conversation: ChatConversationSummary) => ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chat-window.d.ts.map