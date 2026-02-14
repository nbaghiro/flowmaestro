import { Loader2 } from "lucide-react";

export function LoadingScreen() {
    return (
        <div className="flex flex-col items-center justify-center h-screen abstract-bg">
            <img
                src="/assets/icons/icon-48.png"
                alt="FlowMaestro"
                className="w-12 h-12 rounded-lg mb-4"
            />
            <Loader2 className="w-6 h-6 text-foreground animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
    );
}
