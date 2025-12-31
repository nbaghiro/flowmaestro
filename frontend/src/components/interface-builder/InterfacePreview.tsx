interface Props {
    title?: string;
    description?: string;
}

export function InterfacePreview({ title, description }: Props) {
    return (
        <div className="flex h-full flex-col rounded-lg border bg-background">
            {/* Header */}
            <div className="border-b p-4">
                <h2 className="text-lg font-semibold">{title || "Untitled Interface"}</h2>

                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-3 p-4">
                <textarea
                    disabled
                    placeholder="User input will appear here…"
                    className="min-h-[120px] resize-none rounded-md border px-3 py-2 text-sm text-muted-foreground"
                />

                <button
                    disabled
                    className="mt-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-70"
                >
                    Submit
                </button>
            </div>
        </div>
    );
}
