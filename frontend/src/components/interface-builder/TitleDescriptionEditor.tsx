interface Props {
    name: string;
    onNameChange: (value: string) => void;

    slug: string;
    onSlugChange: (value: string) => void;

    title: string;
    onTitleChange: (value: string) => void;
}

export function TitleDescriptionEditor({
    name,
    onNameChange,
    slug,
    onSlugChange,
    title,
    onTitleChange
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
                <label className="text-sm font-medium">Slug</label>
                <input
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Title</label>
                <input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                />
            </div>
        </div>
    );
}
