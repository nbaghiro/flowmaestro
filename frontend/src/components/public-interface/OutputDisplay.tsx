import { LoadingState } from "./LoadingState";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { OutputActions } from "./OutputActions";

interface Props {
    content?: string | null;
    isLoading?: boolean;

    showCopy?: boolean;
    showDownload?: boolean;
    allowEdit?: boolean;
}

export function OutputDisplay({
    content,
    isLoading = false,
    showCopy,
    showDownload,
    allowEdit
}: Props) {
    return (
        <div className="space-y-2 rounded-md border bg-background p-4">
            {isLoading && <LoadingState />}

            {!isLoading && content && (
                <>
                    <MarkdownRenderer content={content} />

                    <OutputActions
                        showCopy={showCopy}
                        showDownload={showDownload}
                        allowEdit={allowEdit}
                    />
                </>
            )}

            {!isLoading && !content && (
                <div className="text-sm text-muted-foreground">No output yet.</div>
            )}
        </div>
    );
}
