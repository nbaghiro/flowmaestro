interface Props {
    title?: string;
    description?: string;
    inputPlaceholder?: string;
    inputLabel?: string;
    allowFileUpload?: boolean;
    allowUrlInput?: boolean;
    submitButtonText?: string;
    coverType?: "color" | "image" | "stock";
    coverValue?: string;
    iconUrl?: string;
}

export function InterfacePreview({
    title,
    description,
    submitButtonText,
    inputPlaceholder,
    inputLabel,
    allowFileUpload,
    allowUrlInput,
    coverType,
    coverValue,
    iconUrl
}: Props) {
    const headerStyle =
        coverType === "color"
            ? { backgroundColor: coverValue || "#6366f1" }
            : coverType === "image" || coverType === "stock"
              ? {
                    backgroundImage: `url(${coverValue})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                }
              : { backgroundColor: "#e5e7eb" };

    return (
        <div className="flex h-full flex-col rounded-lg border bg-background overflow-hidden">
            {/* Header */}
            <div className="border-b">
                <div className="h-24 w-full rounded-t-lg" style={headerStyle} />
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        {iconUrl ? (
                            <img
                                src={iconUrl}
                                alt="Interface icon"
                                className="h-10 w-10 rounded-md border bg-background object-cover"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-md border bg-muted" />
                        )}
                        <div>
                            <h2 className="text-lg font-semibold">
                                {title || "Untitled Interface"}
                            </h2>
                            {description && (
                                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="text-sm font-medium">{inputLabel || "Message"}</div>
                <textarea
                    disabled
                    placeholder={inputPlaceholder || "User input will appear here..."}
                    className="min-h-[120px] resize-none rounded-md border px-3 py-2 text-sm text-muted-foreground"
                />

                {allowFileUpload && (
                    <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        File uploads enabled
                    </div>
                )}

                {allowUrlInput && (
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">URLs</div>
                        <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                            https://example.com
                        </div>
                    </div>
                )}

                <button
                    disabled
                    className="mt-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-70"
                >
                    {submitButtonText || "Submit"}
                </button>
            </div>
        </div>
    );
}
