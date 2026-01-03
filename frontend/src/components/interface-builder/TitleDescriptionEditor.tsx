interface Props {
    name: string;
    onNameChange: (value: string) => void;

    slug: string;
    onSlugChange: (value: string) => void;
    slugStatus?: "idle" | "checking" | "available" | "unavailable";
    slugMessage?: string | null;

    title: string;
    onTitleChange: (value: string) => void;

    description: string;
    onDescriptionChange: (value: string) => void;
}

export function TitleDescriptionEditor({
    name,
    onNameChange,
    slug,
    onSlugChange,
    slugStatus = "idle",
    slugMessage,
    title,
    onTitleChange,
    description,
    onDescriptionChange
}: Props) {
    const slugColor = "text-muted-foreground";

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium">Name</label>
                <input
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Public URL</label>
                <input
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
                <div className="relative mt-1 min-h-[20px]">
                    <p className={`text-xs ${slugColor}`}>
                        https://flowmaestro.ai/i/{slug.trim() ? slug.trim() : "your-url"}
                    </p>
                    {slugStatus === "unavailable" && slugMessage && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                            {slugMessage}
                        </span>
                    )}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium">Title</label>
                <input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
            </div>
        </div>
    );
}
