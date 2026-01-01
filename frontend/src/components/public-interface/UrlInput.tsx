interface Props {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function UrlInput({ value, onChange, disabled = false }: Props) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium">URLs</label>
            <textarea
                rows={2}
                disabled={disabled}
                placeholder="https://example.com"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full resize-none rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">Separate multiple URLs with commas.</p>
        </div>
    );
}
