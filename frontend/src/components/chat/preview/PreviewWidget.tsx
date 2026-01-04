import { useState } from "react";
import type { ChatInterface, PublicChatInterface, PublicChatMessage } from "@flowmaestro/shared";
import { ChatContainer } from "../public";

interface PreviewWidgetProps {
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

export function PreviewWidget({ chatInterface }: PreviewWidgetProps) {
    const [isOpen, setIsOpen] = useState(chatInterface.widgetInitialState === "expanded");
    const publicInterface = toPublicInterface(chatInterface);

    const { widgetPosition, widgetButtonIcon, widgetButtonText, primaryColor, borderRadius } =
        chatInterface;

    const positionClasses =
        widgetPosition === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4";

    // Mock messages for preview
    const previewMessages: PublicChatMessage[] = [
        {
            id: "1",
            role: "user",
            content: "Hi, I need help!",
            timestamp: new Date().toISOString()
        },
        {
            id: "2",
            role: "assistant",
            content: "Hello! How can I assist you today?",
            timestamp: new Date().toISOString()
        }
    ];

    return (
        <div className="bg-muted/30 h-full relative overflow-hidden">
            {/* Simulated webpage */}
            <div className="absolute inset-0 bg-white">
                {/* Fake navigation */}
                <div className="bg-gray-800 px-6 py-4">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="h-6 w-24 bg-gray-600 rounded" />
                        <div className="flex gap-6">
                            <div className="h-4 w-16 bg-gray-600 rounded" />
                            <div className="h-4 w-16 bg-gray-600 rounded" />
                            <div className="h-4 w-16 bg-gray-600 rounded" />
                        </div>
                    </div>
                </div>

                {/* Fake hero */}
                <div className="max-w-4xl mx-auto px-6 py-12">
                    <div className="h-10 w-96 bg-gray-200 rounded mb-4" />
                    <div className="h-6 w-80 bg-gray-100 rounded mb-8" />
                    <div className="h-10 w-32 bg-gray-300 rounded" />
                </div>

                {/* Fake content grid */}
                <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-4">
                            <div className="h-24 bg-gray-200 rounded mb-3" />
                            <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                            <div className="h-4 w-3/4 bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Widget */}
            <div className={`absolute ${positionClasses} z-50`}>
                {isOpen ? (
                    <div
                        className="w-80 h-[450px] shadow-2xl overflow-hidden"
                        style={{ borderRadius: `${borderRadius}px` }}
                    >
                        <ChatContainer
                            chatInterface={publicInterface}
                            messages={previewMessages}
                            inputValue=""
                            isSending={false}
                            isTyping={false}
                            error={null}
                            onInputChange={() => {}}
                            onSendMessage={() => {}}
                            onClose={() => setIsOpen(false)}
                            showCloseButton={true}
                            variant="widget"
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 text-white shadow-lg transition-transform hover:scale-105"
                        style={{
                            backgroundColor: primaryColor,
                            borderRadius: `${borderRadius * 2}px`
                        }}
                    >
                        <span className="text-xl">{widgetButtonIcon}</span>
                        {widgetButtonText && (
                            <span className="font-medium">{widgetButtonText}</span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
