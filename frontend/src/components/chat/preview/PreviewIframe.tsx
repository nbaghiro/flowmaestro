import type { ChatInterface, PublicChatInterface, PublicChatMessage } from "@flowmaestro/shared";
import { ChatContainer } from "../public";

type DeviceSize = "desktop" | "tablet" | "mobile";

interface PreviewIframeProps {
    chatInterface: ChatInterface;
    deviceSize?: DeviceSize;
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

export function PreviewIframe({ chatInterface, deviceSize = "desktop" }: PreviewIframeProps) {
    const publicInterface = toPublicInterface(chatInterface);
    const isMobile = deviceSize === "mobile";

    return (
        <div className="h-full p-2 overflow-hidden">
            {/* Simulated webpage container */}
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden h-full flex flex-col border border-neutral-200 dark:border-neutral-800">
                {/* Fake browser chrome */}
                <div className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 ml-4">
                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md px-3 py-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 truncate">
                            https://example.com/support
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <div
                    className={`flex-1 flex bg-neutral-100 dark:bg-neutral-900 overflow-hidden ${isMobile ? "" : "p-6 gap-6"}`}
                >
                    {/* Left side: Fake page content - hidden on mobile */}
                    {!isMobile && (
                        <div className="flex-1 flex flex-col">
                            {/* Fake page header */}
                            <div className="mb-6">
                                <div className="h-6 w-32 bg-neutral-300 dark:bg-neutral-800 rounded mb-2" />
                                <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
                            </div>

                            {/* Fake page content */}
                            <div className="space-y-3 mb-6">
                                <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                                <div className="h-3 w-5/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
                                <div className="h-3 w-4/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
                                <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                                <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                            </div>

                            {/* More fake content */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4">
                                    <div className="h-20 bg-neutral-300 dark:bg-neutral-700 rounded mb-2" />
                                    <div className="h-3 w-full bg-neutral-300 dark:bg-neutral-700 rounded mb-1" />
                                    <div className="h-3 w-3/4 bg-neutral-300 dark:bg-neutral-700 rounded" />
                                </div>
                                <div className="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4">
                                    <div className="h-20 bg-neutral-300 dark:bg-neutral-700 rounded mb-2" />
                                    <div className="h-3 w-full bg-neutral-300 dark:bg-neutral-700 rounded mb-1" />
                                    <div className="h-3 w-3/4 bg-neutral-300 dark:bg-neutral-700 rounded" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Embedded chat - full width on mobile */}
                    <div
                        className={`flex flex-col ${isMobile ? "flex-1" : "w-[420px] flex-shrink-0"}`}
                    >
                        {!isMobile && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                Embedded chat:
                            </p>
                        )}
                        <div
                            className={`flex-1 overflow-hidden ${isMobile ? "" : "border-2 border-dashed border-neutral-300 dark:border-neutral-700"}`}
                            style={{
                                borderRadius: isMobile ? 0 : `${chatInterface.borderRadius}px`
                            }}
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
                                variant="embed"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
