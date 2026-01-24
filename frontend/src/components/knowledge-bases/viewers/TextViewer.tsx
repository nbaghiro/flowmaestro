import { FileText } from "lucide-react";

interface TextViewerProps {
    content: string | null;
    fileType: string;
}

export function TextViewer({ content, fileType }: TextViewerProps) {
    if (!content) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="w-12 h-12 mb-4" />
                <p>No content available</p>
            </div>
        );
    }

    // Pretty-print JSON
    if (fileType === "json") {
        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);
            return (
                <div className="h-full overflow-auto">
                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words bg-muted/50 rounded-lg m-4">
                        {formatted}
                    </pre>
                </div>
            );
        } catch {
            // If JSON parsing fails, fall through to plain text
        }
    }

    // Plain text for all other formats
    return (
        <div className="h-full overflow-auto">
            <pre className="p-4 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {content}
            </pre>
        </div>
    );
}
