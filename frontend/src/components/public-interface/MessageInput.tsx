interface Props {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function MessageInput({ label, placeholder, value, onChange, disabled = false }: Props) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{label}</label>
            <textarea
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                rows={6}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
        </div>
    );
}
