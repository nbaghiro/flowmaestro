// Chat Interface Types
// Public-facing embeddable chat interfaces linked to agents

// Cover types
export type ChatInterfaceCoverType = "image" | "color" | "gradient";

// Widget position options
export type ChatInterfaceWidgetPosition = "bottom-right" | "bottom-left";

// Persistence type
export type ChatInterfacePersistenceType = "session" | "local_storage";

// Chat interface status
export type ChatInterfaceStatus = "draft" | "published";

// Session status
export type ChatInterfaceSessionStatus = "active" | "ended" | "expired";

// Suggested prompt configuration
export interface ChatInterfaceSuggestedPrompt {
    text: string;
    icon?: string; // Emoji or icon name
}

// Main chat interface configuration
export interface ChatInterface {
    id: string;
    userId: string;

    // Identity
    name: string;
    slug: string;

    // Target (agents only)
    agentId: string;

    // Branding - Header
    coverType: ChatInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;

    // Branding - Theme
    primaryColor: string;
    fontFamily: string;
    borderRadius: number;

    // Chat Configuration
    welcomeMessage: string;
    placeholderText: string;
    suggestedPrompts: ChatInterfaceSuggestedPrompt[];

    // File Upload Configuration
    allowFileUpload: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];

    // Session Configuration
    persistenceType: ChatInterfacePersistenceType;
    sessionTimeoutMinutes: number;

    // Widget Configuration
    widgetPosition: ChatInterfaceWidgetPosition;
    widgetButtonIcon: string;
    widgetButtonText: string | null;
    widgetInitialState: "collapsed" | "expanded";

    // Rate Limiting
    rateLimitMessages: number;
    rateLimitWindowSeconds: number;

    // State
    status: ChatInterfaceStatus;
    publishedAt: Date | null;

    // Stats
    sessionCount: number;
    messageCount: number;
    lastActivityAt: Date | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Chat interface session (visitor)
export interface ChatInterfaceSession {
    id: string;
    interfaceId: string;
    sessionToken: string;
    browserFingerprint: string | null;
    threadId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    referrer: string | null;
    countryCode: string | null;
    status: ChatInterfaceSessionStatus;
    messageCount: number;
    persistenceToken: string | null;
    firstSeenAt: Date;
    lastActivityAt: Date;
    endedAt: Date | null;
}

// Create chat interface input
export interface CreateChatInterfaceInput {
    name: string;
    slug: string;
    agentId: string;
    title: string;
    description?: string;
    coverType?: ChatInterfaceCoverType;
    coverValue?: string;
    primaryColor?: string;
    welcomeMessage?: string;
    suggestedPrompts?: ChatInterfaceSuggestedPrompt[];
}

// Update chat interface input
export interface UpdateChatInterfaceInput {
    name?: string;
    slug?: string;
    title?: string;
    description?: string | null;
    coverType?: ChatInterfaceCoverType;
    coverValue?: string;
    iconUrl?: string | null;
    primaryColor?: string;
    fontFamily?: string;
    borderRadius?: number;
    welcomeMessage?: string;
    placeholderText?: string;
    suggestedPrompts?: ChatInterfaceSuggestedPrompt[];
    allowFileUpload?: boolean;
    maxFiles?: number;
    maxFileSizeMb?: number;
    allowedFileTypes?: string[];
    persistenceType?: ChatInterfacePersistenceType;
    sessionTimeoutMinutes?: number;
    widgetPosition?: ChatInterfaceWidgetPosition;
    widgetButtonIcon?: string;
    widgetButtonText?: string | null;
    widgetInitialState?: "collapsed" | "expanded";
    rateLimitMessages?: number;
    rateLimitWindowSeconds?: number;
}

// Public chat interface (for rendering - excludes sensitive data)
export interface PublicChatInterface {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverType: ChatInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    primaryColor: string;
    fontFamily: string;
    borderRadius: number;
    welcomeMessage: string;
    placeholderText: string;
    suggestedPrompts: ChatInterfaceSuggestedPrompt[];
    allowFileUpload: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    persistenceType: ChatInterfacePersistenceType;
    widgetPosition: ChatInterfaceWidgetPosition;
    widgetButtonIcon: string;
    widgetButtonText: string | null;
    widgetInitialState: "collapsed" | "expanded";
}

// Session creation input (from widget/embed)
export interface CreateChatSessionInput {
    browserFingerprint?: string;
    referrer?: string;
    persistenceToken?: string; // For resuming localStorage sessions
}

// Session response
export interface ChatSessionResponse {
    sessionId: string;
    sessionToken: string;
    threadId: string | null;
    persistenceToken?: string; // For localStorage persistence
    existingMessages?: PublicChatMessage[]; // If resuming session
}

// Chat message (simplified view for public interface)
// Named PublicChatMessage to avoid conflict with in-app ChatMessage type
export interface PublicChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    attachments?: PublicChatMessageAttachment[];
}

// Chat message attachment for public interface
export interface PublicChatMessageAttachment {
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string; // Signed download URL
}

// Send message input
export interface SendChatMessageInput {
    sessionToken: string;
    message: string;
    attachments?: PublicChatMessageAttachment[];
}

// Send message response
export interface SendChatMessageResponse {
    messageId: string;
    status: "stored" | "processing";
}

// SSE streaming events (for Phase 2)
export type ChatStreamingEventType =
    | "chat:message:start"
    | "chat:message:token"
    | "chat:message:complete"
    | "chat:message:error"
    | "chat:thinking"
    | "chat:tool:started"
    | "chat:tool:completed"
    | "chat:tool:failed";

export interface ChatStreamingEvent {
    type: ChatStreamingEventType;
    sessionId: string;
    threadId: string;
    data: Record<string, unknown>;
}

// Chat interface with agent name (for list display)
export interface ChatInterfaceWithAgent extends ChatInterface {
    agentName?: string;
}

// Admin analytics (for future use)
export interface ChatInterfaceAnalytics {
    interfaceId: string;
    period: "day" | "week" | "month";
    totalSessions: number;
    uniqueVisitors: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    avgSessionDuration: number;
    topReferrers: Array<{ referrer: string; count: number }>;
    messagesByHour: Array<{ hour: number; count: number }>;
}
