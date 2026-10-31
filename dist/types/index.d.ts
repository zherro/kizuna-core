import type { ResourceConfig, RpcConfig } from './resource';
import type { ScreenConfig } from './screen';
export { parseActive, makeSlug } from './resource';
export type { ResourceConfig, RpcConfig } from './resource';
export type { ScreenBlock, ScreenConfig, ScreenContext } from './screen';
export type { ResourceScreenFieldBase, ResourceScreenTextField, ResourceScreenTextareaField, ResourceScreenSwitchField, ResourceScreenRelationField, ResourceScreenSelectField, ResourceScreenField, ResourceScreenListConfig, ResourceScreenMessages, ResourceScreenConfig, } from './resource-screen';
export type { UserSession, AuthContext, LoginCredentials, RegisterData, AuthResponse, PermissionCheck, PermissionResult, } from './auth';
export type { MessageChannel, MessageDirection, MessageStatus, MessageContentType, ChatMessage, ChatConversationSummary, MessagesPage, MessagingClientConfig, } from './messaging';
export type ResourceRegistry = Record<string, ResourceConfig>;
export type ScreenRegistry = Record<string, ScreenConfig>;
export type RpcRegistry = Record<string, RpcConfig>;
//# sourceMappingURL=index.d.ts.map