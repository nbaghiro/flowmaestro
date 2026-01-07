import type { ChatInterface, PublicChatInterface, PublicChatMessage } from "@flowmaestro/shared";
import { ChatContainer } from "../public";

interface PreviewFullPageProps {
    chatInterface: ChatInterface;
}

// Convert full ChatInterface to PublicChatInterface for preview
function toPublicInterface(ci: ChatInterface): PublicChatInterface {
    return {
        id: ci.id,
        slug: ci.slug,
        title: ci.title,
        description: ci.description,
        coverType: ci.coverType,
        coverValue: ci.coverValue,
        iconUrl: ci.iconUrl,
        primaryColor: ci.primaryColor,
        fontFamily: ci.fontFamily,
        borderRadius: ci.borderRadius,
        welcomeMessage: ci.welcomeMessage,
        placeholderText: ci.placeholderText,
        suggestedPrompts: ci.suggestedPrompts,
        allowFileUpload: ci.allowFileUpload,
        maxFiles: ci.maxFiles,
        maxFileSizeMb: ci.maxFileSizeMb,
        allowedFileTypes: ci.allowedFileTypes,
        persistenceType: ci.persistenceType,
        widgetPosition: ci.widgetPosition,
        widgetButtonIcon: ci.widgetButtonIcon,
        widgetButtonText: ci.widgetButtonText,
        widgetInitialState: ci.widgetInitialState
    };
}

// Mock messages for preview
const PREVIEW_MESSAGES: PublicChatMessage[] = [
    {
        id: "1",
        role: "user",
        content: "Hello! I have a question about your product.",
        timestamp: new Date().toISOString()
    },
    {
        id: "2",
        role: "assistant",
        content:
            "Hi there! I'd be happy to help answer any questions you have about our product. What would you like to know?",
        timestamp: new Date().toISOString()
    }
];

export function PreviewFullPage({ chatInterface }: PreviewFullPageProps) {
    const publicInterface = toPublicInterface(chatInterface);

    return (
        <div className="bg-muted/30 h-full flex items-center justify-center p-4">
            <div
                className="w-full max-w-lg h-full max-h-[800px] rounded-xl shadow-lg overflow-hidden border border-border bg-background"
                style={{ borderRadius: `${chatInterface.borderRadius}px` }}
            >
                <ChatContainer
                    chatInterface={publicInterface}
                    messages={PREVIEW_MESSAGES}
                    inputValue=""
                    isSending={false}
                    isTyping={false}
                    error={null}
                    onInputChange={() => {}}
                    onSendMessage={() => {}}
                    variant="full"
                />
            </div>
        </div>
    );
}
