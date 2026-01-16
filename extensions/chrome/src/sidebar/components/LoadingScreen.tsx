import { Loader2 } from "lucide-react";

export function LoadingScreen() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <img
                src="/assets/icons/icon-48.png"
                alt="FlowMaestro"
                className="w-12 h-12 rounded-lg mb-4"
            />
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
    );
}
