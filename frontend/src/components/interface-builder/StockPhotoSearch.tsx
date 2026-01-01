import { useState } from "react";

interface UnsplashPhoto {
    id: string;
    urls: {
        small: string;
        regular: string;
    };
    alt_description: string | null;
}

interface Props {
    value?: string;
    onSelect: (url: string) => void;
}

export function StockPhotoSearch({ value, onSelect }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UnsplashPhoto[]>([]);
    const [loading, setLoading] = useState(false);

    async function search() {
        if (!query) return;

        setLoading(true);
        try {
            const res = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
                    query
                )}&per_page=12`,
                {
                    headers: {
                        Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`
                    }
                }
            );
            const data = await res.json();
            setResults(data.results ?? []);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium">Stock photos</label>

            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Unsplash…"
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                />
                <button
                    type="button"
                    onClick={search}
                    className="rounded-md border px-3 py-2 text-sm"
                >
                    Search
                </button>
            </div>

            {loading && <div className="text-xs text-muted-foreground">Searching…</div>}

            <div className="grid grid-cols-3 gap-2">
                {results.map((photo) => (
                    <button
                        key={photo.id}
                        type="button"
                        onClick={() => onSelect(photo.urls.regular)}
                        className={`overflow-hidden rounded-md border ${
                            value === photo.urls.regular ? "ring-2 ring-primary ring-offset-1" : ""
                        }`}
                    >
                        <img
                            src={photo.urls.small}
                            alt={photo.alt_description ?? "Stock photo"}
                            className="h-24 w-full object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
