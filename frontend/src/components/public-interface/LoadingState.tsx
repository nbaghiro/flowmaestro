export function LoadingState() {
    return (
        <div className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            Generating output…
        </div>
    );
}
