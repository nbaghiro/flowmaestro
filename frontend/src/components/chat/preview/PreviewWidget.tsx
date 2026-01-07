import { useState } from "react";
import type { ChatInterface, PublicChatInterface, PublicChatMessage } from "@flowmaestro/shared";
import { ChatContainer } from "../public";

type DeviceSize = "desktop" | "tablet" | "mobile";

interface PreviewWidgetProps {
    chatInterface: ChatInterface;
    deviceSize?: DeviceSize;
}

interface WidgetBubbleProps {
    iconUrl: string | null;
    buttonIcon: string;
    buttonText: string | null;
    primaryColor: string;
    borderRadius: number;
    onClick: () => void;
}

/**
 * Widget bubble component that matches the actual widget SDK behavior
 */
function WidgetBubble({
    iconUrl,
    buttonIcon,
    buttonText,
    primaryColor,
    borderRadius,
    onClick
}: WidgetBubbleProps) {
    const hasText = buttonText && buttonText.length > 0;
    const hasIconUrl = !!iconUrl;

    // When we have an icon URL and no text, show just the icon (no background)
    if (hasIconUrl && !hasText) {
        return (
            <button
                onClick={onClick}
                className="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer shadow-lg transition-transform hover:scale-105"
                style={{ borderRadius: `${borderRadius}px` }}
            >
                <img
                    src={iconUrl}
                    alt=""
                    className="object-cover"
                    style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: `${borderRadius}px`
                    }}
                />
            </button>
        );
    }

    // Otherwise, show the colored bubble with icon/text
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 text-white shadow-lg transition-transform hover:scale-105"
            style={{
                padding: hasText ? "12px 20px" : "14px",
                backgroundColor: primaryColor,
                borderRadius: hasText ? `${borderRadius * 2}px` : "50%"
            }}
        >
            {hasIconUrl ? (
                <img
                    src={iconUrl}
                    alt=""
                    className="object-contain"
                    style={{ width: "24px", height: "24px", borderRadius: "4px" }}
                />
            ) : (
                <span className="text-xl">{buttonIcon}</span>
            )}
            {hasText && <span className="font-medium">{buttonText}</span>}
        </button>
    );
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

export function PreviewWidget({ chatInterface, deviceSize = "desktop" }: PreviewWidgetProps) {
    const [isOpen, setIsOpen] = useState(chatInterface.widgetInitialState === "expanded");
    const publicInterface = toPublicInterface(chatInterface);
    const isMobile = deviceSize === "mobile";

    const { widgetPosition, widgetButtonIcon, widgetButtonText, primaryColor, borderRadius } =
        chatInterface;

    const bubblePositionClasses =
        widgetPosition === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4";
    const positionClasses = isMobile && isOpen ? "inset-0" : bubblePositionClasses;

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
        <div className="h-full p-2 overflow-hidden">
            {/* Simulated webpage with browser chrome */}
            <div className="h-full bg-neutral-50 dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden flex flex-col relative border border-neutral-200 dark:border-neutral-800">
                {/* Fake browser chrome */}
                <div className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 ml-4">
                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md px-3 py-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">
                            https://example.com
                        </div>
                    </div>
                </div>

                {/* Webpage content */}
                <div className="flex-1 relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 p-6">
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

                    {/* Fake content cards */}
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

                    {/* Widget - positioned within the webpage content */}
                    <div className={`absolute ${positionClasses} z-50`}>
                        {isOpen ? (
                            <div
                                className={
                                    isMobile
                                        ? "w-full h-full shadow-2xl overflow-hidden"
                                        : "w-[420px] h-[650px] max-h-[calc(100%-2rem)] shadow-2xl overflow-hidden"
                                }
                                style={{ borderRadius: isMobile ? 0 : `${borderRadius}px` }}
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
                            <WidgetBubble
                                iconUrl={chatInterface.iconUrl}
                                buttonIcon={widgetButtonIcon}
                                buttonText={widgetButtonText}
                                primaryColor={primaryColor}
                                borderRadius={borderRadius}
                                onClick={() => setIsOpen(true)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
