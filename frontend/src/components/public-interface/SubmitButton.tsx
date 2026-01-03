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
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Submitting...
                </span>
            ) : (
                text
            )}
        </button>
    );
}
