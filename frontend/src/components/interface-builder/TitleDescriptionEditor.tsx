interface Props {
    name: string;
    onNameChange: (value: string) => void;

    slug: string;
    onSlugChange: (value: string) => void;

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
    title,
    onTitleChange,
    description,
    onDescriptionChange
}: Props) {
    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium">Name</label>
                <input
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Public URL</label>
                <input
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                />
                <p className={`mt-1 text-xs ${slug.trim() ? "text-green-600" : "text-red-600"}`}>
                    https://flowmaestro.ai/i/{slug.trim() ? slug.trim() : "your-url"}
                </p>
            </div>

            <div>
                <label className="text-sm font-medium">Title</label>
                <input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-md border px-3 py-2"
                />
            </div>
        </div>
    );
}
