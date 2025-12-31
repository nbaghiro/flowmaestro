import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
    preview?: ReactNode;
}

export function InterfaceEditorLayout({ children, preview }: Props) {
    return (
        <div className="flex h-full w-full">
            {/* Left panel — editor */}
            <div className="flex-1 overflow-y-auto border-r bg-background">
                <div className="mx-auto max-w-3xl p-6">{children}</div>
            </div>

            {/* Right panel — preview (placeholder for now) */}
            <div className="hidden w-[420px] shrink-0 bg-muted lg:block">
                <div className="h-full p-4">
                    {preview ?? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Preview coming soon
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
