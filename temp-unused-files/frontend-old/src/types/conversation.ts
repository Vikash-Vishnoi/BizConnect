export type ConversationStatus = 'active' | 'archived' | 'blocked' | 'closed';
export type MessageDirection = 'incoming' | 'outgoing';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'template' | 'interactive' | 'reaction' | 'contacts' | 'sticker';

export interface Contact {
  phoneNumber: string;
  name: string;
  profilePicture?: string;
  email?: string;
  waId?: string;
  profileName?: string;
}

export interface LastMessage {
  text: string;
  type: string;
  direction: MessageDirection;
  timestamp: Date | string;
  status: string;
}

export interface ConversationWindow {
  isOpen: boolean;
  openedAt: Date | string;
  expiresAt: Date | string;
  category: 'user_initiated' | 'business_initiated';
}

export interface InteractiveButton {
  id: string;
  title: string;
  type?: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

export interface InteractiveContent {
  type?: 'button' | 'list' | 'product' | 'product_list' | 'poll' | 'cta';
  header?: string;
  body?: string;
  footer?: string;
  buttons?: InteractiveButton[];
  sections?: InteractiveListSection[];
  buttonReply?: {
    id: string;
    title: string;
  };
  listReply?: {
    id: string;
    title: string;
    description?: string;
  };
  // Poll fields
  options?: string[];
  votes?: Array<{
    option: string;
    voter: string;
    timestamp: Date;
  }>;
  // CTA button fields
  ctaButtons?: Array<{
    type: 'PHONE_NUMBER' | 'URL';
    title: string;
    phone_number?: string;
    url?: string;
  }>;
}

export interface MessageContent {
  text?: string;
  mediaUrl?: string;
  mediaId?: string;
  mediaType?: string;
  mimeType?: string;
  caption?: string;
  filename?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: InteractiveContent;
  template?: {
    name: string;
    language?: string;
    components?: any[];
  };
  reaction?: {
    messageId: string;
    emoji: string;
  };
  contacts?: any[];
  context?: {
    messageId: string;
    from: string;
  };
}

export interface Message {
  _id: string;
  whatsappMessageId?: string;
  from: string;
  to: string;
  direction: MessageDirection;
  type: MessageType;
  content: MessageContent;
  status: MessageStatus;
  timestamp: Date | string;
  deliveredAt?: Date | string;
  readAt?: Date | string;
  isDeleted?: boolean;
  deletedAt?: Date | string;
  deletedBy?: 'user' | 'system';
  reactions?: Array<{
    from: string;
    emoji: string;
    timestamp: Date | string;
  }>;
  isPinned?: boolean;
  pinnedAt?: Date | string;
  pinnedBy?: string;
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
  pricing?: {
    billable?: boolean;
    category?: 'service' | 'marketing' | 'utility' | 'authentication' | 'referral_conversion';
    pricingModel?: string;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Conversation {
  _id: string;
  contact: Contact;
  messages?: Message[];
  lastMessage: LastMessage;
  lastMessageAt: Date | string;
  unreadCount: number;
  status: ConversationStatus;
  conversationWindow?: ConversationWindow;
  source?: 'campaign' | 'webhook' | 'manual' | 'api' | 'import' | 'whatsapp' | 'qr_code' | 'click_to_chat';
  campaignId?: string;
  metrics?: {
    totalMessages: number;
    incomingMessages: number;
    outgoingMessages: number;
    templateMessagesSent?: number;
    conversationsOpened?: number;
    responseRate?: number;
    avgResponseTime?: number;
    firstResponseTime?: number;
    lastResponseTime?: number;
  };
  quality?: {
    hasReplied: boolean;
    isResponsive?: boolean;
    qualityScore?: number;
    engagementLevel?: 'none' | 'low' | 'medium' | 'high';
  };
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Date | string;
  tags?: string[];
  userId: string;
  isDeleted?: boolean;
  deletedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  isWindowOpen?: boolean;
  unreadMessages?: Message[];
  recentMessages?: Message[];
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
