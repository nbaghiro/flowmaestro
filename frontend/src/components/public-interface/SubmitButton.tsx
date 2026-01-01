interface Props {
    text: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export function SubmitButton({ text, onClick, loading = false, disabled = false }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
            {loading ? "Submitting..." : text}
        </button>
    );
}
