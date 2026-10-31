export type MessageChannel =
  | 'platform'
  | 'whatsapp'
  | 'instagram'
  | 'telegram'
  | 'email'
  | 'system';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';

export interface ChatMessage {
  id: number;
  uid: string;
  conversationId: number;
  senderId: string | null;
  source: MessageChannel;
  direction: MessageDirection;
  messageType: MessageContentType;
  content: string | null;
  status: MessageStatus;
  externalId: string | null;
  createdAt: string;
  /** presente só em mensagens optimistic ainda não confirmadas */
  clientToken?: string;
}

export interface ChatConversationSummary {
  id: number;
  uid: string;
  status: 'open' | 'closed' | 'archived';
  contextType: string | null;
  contextId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSource: MessageChannel | null;
  unreadCount: number;
  other: { uid: string; displayName: string; avatarUrl: string | null } | null;
}

export interface MessagesPage {
  items: ChatMessage[]; // ordem cronológica ASC
  nextCursor: number | null; // id da mais antiga da página (pra buscar anteriores)
  hasMore: boolean;
}

export interface MessagingClientConfig {
  messagesPerPage: number;
  pollActiveMs: number;
  pollIdleMs: number;
  pollBackoffMs: number[];
  enableWhatsapp: boolean;
}
