import { ArrowLeft, ExternalLink, Monitor, Smartphone, Code, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import type { ChatInterface } from "@flowmaestro/shared";
import {
    PreviewFullPage,
    PreviewIframe,
    PreviewWidget,
    EmbedCodeDisplay
} from "../components/chat/preview";
import { getChatInterface } from "../lib/api";

type PreviewMode = "fullpage" | "iframe" | "widget";
type DeviceSize = "desktop" | "tablet" | "mobile";

export function ChatInterfacePreviewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the folder ID if passed from the editor
    const fromFolderId = (location.state as { fromFolderId?: string } | null)?.fromFolderId;

    const [chatInterface, setChatInterface] = useState<ChatInterface | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<PreviewMode>("fullpage");
    const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
    const [showEmbedCode, setShowEmbedCode] = useState(false);

    useEffect(() => {
        const loadInterface = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const response = await getChatInterface(id);
                if (response.success && response.data) {
                    setChatInterface(response.data);
                } else {
                    setError(response.error || "Failed to load chat interface");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load");
            } finally {
                setIsLoading(false);
            }
        };

        loadInterface();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !chatInterface) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                        {error || "Chat interface not found"}
                    </p>
                    <button
                        onClick={() => navigate("/chat-interfaces")}
                        className="text-primary hover:underline"
                    >
                        Back to Chat Interfaces
                    </button>
                </div>
            </div>
        );
    }

    const deviceWidths: Record<DeviceSize, string> = {
        desktop: "w-full",
        tablet: "w-[768px]",
        mobile: "w-[480px]"
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() =>
                            navigate(`/chat-interfaces/${id}/edit`, {
                                replace: true,
                                state: fromFolderId ? { fromFolderId } : undefined
                            })
                        }
                        className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-foreground">{chatInterface.name}</h1>
                        <p className="text-xs text-muted-foreground">Preview</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Device size toggle */}
                    <div className="flex items-center border border-border rounded-lg p-1">
                        <button
                            onClick={() => setDeviceSize("desktop")}
                            className={`p-1.5 rounded ${deviceSize === "desktop" ? "bg-muted" : ""}`}
                            title="Desktop"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDeviceSize("tablet")}
                            className={`p-1.5 rounded ${deviceSize === "tablet" ? "bg-muted" : ""}`}
                            title="Tablet"
                        >
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <rect x="4" y="2" width="16" height="20" rx="2" />
                                <line x1="12" y1="18" x2="12" y2="18" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setDeviceSize("mobile")}
                            className={`p-1.5 rounded ${deviceSize === "mobile" ? "bg-muted" : ""}`}
                            title="Mobile"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Embed code toggle */}
                    <button
                        onClick={() => setShowEmbedCode(!showEmbedCode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            showEmbedCode
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border hover:bg-muted"
                        }`}
                    >
                        <Code className="w-4 h-4" />
                        Embed
                    </button>

                    {/* Open in new tab */}
                    {chatInterface.status === "published" ? (
                        <Link
                            to={`/c/${chatInterface.slug}`}
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open
                        </Link>
                    ) : (
                        <span
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground cursor-not-allowed opacity-50"
                            title="Publish the chat interface to open it"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open
                        </span>
                    )}
                </div>
            </header>

            {/* Preview mode tabs */}
            <div className="border-b border-border bg-card">
                <div className="flex gap-1 px-4">
                    {[
                        { key: "fullpage", label: "Full Page" },
                        { key: "iframe", label: "Iframe Embed" },
                        { key: "widget", label: "Widget" }
                    ].map((mode) => (
                        <button
                            key={mode.key}
                            onClick={() => setPreviewMode(mode.key as PreviewMode)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                previewMode === mode.key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Preview */}
                <div className="flex-1 overflow-auto flex justify-center p-4">
                    <div
                        className={`${deviceWidths[deviceSize]} h-full transition-all duration-300`}
                    >
                        {previewMode === "fullpage" && (
                            <PreviewFullPage chatInterface={chatInterface} />
                        )}
                        {previewMode === "iframe" && (
                            <PreviewIframe chatInterface={chatInterface} deviceSize={deviceSize} />
                        )}
                        {previewMode === "widget" && (
                            <PreviewWidget chatInterface={chatInterface} deviceSize={deviceSize} />
                        )}
                    </div>
                </div>

                {/* Embed code panel */}
                {showEmbedCode && (
                    <div className="w-96 border-l border-border bg-card p-4 overflow-y-auto">
                        <h3 className="font-semibold text-foreground mb-4">Embed Code</h3>
                        <EmbedCodeDisplay chatInterface={chatInterface} />
                    </div>
                )}
            </div>
        </div>
    );
}
