import { clsx } from "clsx";
import { Send, ChevronDown, Loader2, Camera, FileText, Trash2, Bot } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TypingDots } from "../../shared/components/TypingDots";
import { useSidebarStore } from "../stores/sidebarStore";

export function AgentChat() {
    const {
        userContext,
        selectedAgent,
        setSelectedAgent,
        messages,
        isStreaming,
        sendMessage,
        clearChat,
        includePageText,
        includeScreenshot,
        setIncludePageText,
        setIncludeScreenshot,
        captureScreenshot
    } = useSidebarStore();

    const [input, setInput] = useState("");
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const agents = userContext?.agents || [];

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const message = input.trim();
        setInput("");
        await sendMessage(message);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Agent Selector */}
            <div className="p-3 border-b border-border">
                <div className="relative">
                    <button
                        onClick={() => setShowAgentSelector(!showAgentSelector)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-muted border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-foreground" />
                            <span className="text-sm font-medium text-foreground">
                                {selectedAgent?.name || "Select an agent"}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showAgentSelector && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                            {agents.length === 0 ? (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                    No agents available
                                </div>
                            ) : (
                                agents.map((agent) => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setShowAgentSelector(false);
                                        }}
                                        className={clsx(
                                            "w-full px-3 py-2 text-left hover:bg-accent transition-colors",
                                            selectedAgent?.id === agent.id && "bg-accent"
                                        )}
                                    >
                                        <div className="text-sm font-medium text-foreground">
                                            {agent.name}
                                        </div>
                                        {agent.description && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {agent.description}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Bot className="w-12 h-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {selectedAgent
                                ? `Start a conversation with ${selectedAgent.name}`
                                : "Select an agent to start chatting"}
                        </p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={clsx(
                                "flex",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div
                                className={clsx(
                                    "max-w-[85%] rounded-lg px-3 py-2",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
                                )}
                            >
                                <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isStreaming && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                            <TypingDots />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Page Context Controls */}
            <div className="px-3 py-2 border-t border-border bg-muted">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIncludePageText(!includePageText)}
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors",
                            includePageText
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-accent"
                        )}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Page Text
                    </button>
                    <button
                        onClick={async () => {
                            if (!includeScreenshot) {
                                await captureScreenshot();
                            }
                            setIncludeScreenshot(!includeScreenshot);
                        }}
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors",
                            includeScreenshot
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-accent"
                        )}
                    >
                        <Camera className="w-3.5 h-3.5" />
                        Screenshot
                    </button>
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="ml-auto p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Clear chat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            selectedAgent ? "Type your message..." : "Select an agent first"
                        }
                        disabled={!selectedAgent || isStreaming}
                        className="flex-1 resize-none rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:bg-muted disabled:cursor-not-allowed min-h-[40px] max-h-[120px] placeholder:text-muted-foreground"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || !selectedAgent || isStreaming}
                        className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                        {isStreaming ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
