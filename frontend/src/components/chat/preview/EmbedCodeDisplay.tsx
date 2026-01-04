import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ChatInterface } from "@flowmaestro/shared";

interface EmbedCodeDisplayProps {
    chatInterface: ChatInterface;
}

type EmbedType = "fullpage" | "iframe" | "widget";

export function EmbedCodeDisplay({ chatInterface }: EmbedCodeDisplayProps) {
    const [activeType, setActiveType] = useState<EmbedType>("fullpage");
    const [copiedType, setCopiedType] = useState<EmbedType | null>(null);

    const baseUrl = window.location.origin;
    const { slug } = chatInterface;

    const embedCodes: Record<EmbedType, { title: string; description: string; code: string }> = {
        fullpage: {
            title: "Full Page Link",
            description: "Direct link to the chat interface as a standalone page.",
            code: `${baseUrl}/c/${slug}`
        },
        iframe: {
            title: "Iframe Embed",
            description: "Embed the chat in an iframe on your website.",
            code: `<iframe
  src="${baseUrl}/embed/${slug}"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: ${chatInterface.borderRadius}px;"
></iframe>`
        },
        widget: {
            title: "Widget Script",
            description: "Add a floating chat widget to any page on your website.",
            code: `<script
  src="${baseUrl}/widget/${slug}.js"
  data-position="${chatInterface.widgetPosition}"
  data-initial="${chatInterface.widgetInitialState}"
  async
></script>`
        }
    };

    const handleCopy = async (type: EmbedType) => {
        await navigator.clipboard.writeText(embedCodes[type].code);
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
                {(Object.keys(embedCodes) as EmbedType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setActiveType(type)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            activeType === type
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {embedCodes[type].title}
                    </button>
                ))}
            </div>

            {/* Active embed code */}
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                    {embedCodes[activeType].description}
                </p>

                <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                        <code>{embedCodes[activeType].code}</code>
                    </pre>
                    <button
                        onClick={() => handleCopy(activeType)}
                        className="absolute top-2 right-2 p-2 bg-background border border-border rounded-md hover:bg-muted transition-colors"
                        aria-label="Copy code"
                    >
                        {copiedType === activeType ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                </div>
            </div>

            {/* Quick copy buttons for all types */}
            <div className="flex gap-2 pt-2 border-t border-border">
                {(Object.keys(embedCodes) as EmbedType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => handleCopy(type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                        {copiedType === type ? (
                            <Check className="w-3 h-3 text-green-500" />
                        ) : (
                            <Copy className="w-3 h-3" />
                        )}
                        Copy {embedCodes[type].title}
                    </button>
                ))}
            </div>
        </div>
    );
}
