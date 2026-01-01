interface Props {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function MessageInput({ label, placeholder, value, onChange, disabled = false }: Props) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <textarea
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                rows={4}
                className="w-full resize-none rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
        </div>
    );
}
