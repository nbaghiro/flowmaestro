interface Props {
    inputLabel: string;
    onInputLabelChange: (value: string) => void;

    inputPlaceholder: string;
    onInputPlaceholderChange: (value: string) => void;
}

export function InputConfigEditor({
    inputLabel,
    onInputLabelChange,
    inputPlaceholder,
    onInputPlaceholderChange
}: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Input</h3>

            {/* Input label */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Input label</label>
                <input
                    value={inputLabel}
                    onChange={(e) => onInputLabelChange(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
            </div>

            {/* Placeholder */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Placeholder</label>
                <input
                    value={inputPlaceholder}
                    onChange={(e) => onInputPlaceholderChange(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
            </div>
        </div>
    );
}
