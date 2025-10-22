// Conversation types
export type ConversationStatus = 'open' | 'assigned' | 'closed';
export type MessageDirection = 'incoming' | 'outgoing';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Conversation {
  _id: string;
  patientName: string;
  patientPhone: string;
  status: ConversationStatus;
  lastMessage: string;
  unreadCount: number;
  lastActivity: string;
  assignedTo?: string;
  assignedToName?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  content: string;
  direction: MessageDirection;
  timestamp: string;
  status: MessageStatus;
  senderName?: string;
}

export interface ConversationsState {
  list: Conversation[];
  messages: Message[];
  selectedConversation: Conversation | null;
  unreadCount: number;
  loading: boolean;
  sendingMessage: boolean;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
}

export interface AssignConversationData {
  conversationId: string;
  agentId: string;
  agentName: string;
}

export interface UpdateStatusData {
  conversationId: string;
  status: ConversationStatus;
}
