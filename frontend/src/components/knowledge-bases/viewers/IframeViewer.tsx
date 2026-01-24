import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";

interface IframeViewerProps {
    url: string;
    title: string;
}

export function IframeViewer({ url, title }: IframeViewerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
        setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
                <p className="text-center mb-4">
                    Unable to load this page in the viewer.
                    <br />
                    The website may block embedding.
                </p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                </a>
            </div>
        );
    }

    return (
        <div className="relative h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading page...</p>
                    </div>
                </div>
            )}
            <iframe
                src={url}
                title={title}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}
