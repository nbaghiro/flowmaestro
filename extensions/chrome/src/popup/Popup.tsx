import {
    Bot,
    Workflow,
    BookOpen,
    Settings,
    ExternalLink,
    ChevronRight,
    Loader2,
    LogIn
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ExtensionAuthState, ExtensionSettings } from "@flowmaestro/shared";
import { getAuthState, getSettings } from "../shared/storage";

export default function Popup() {
    const [authState, setAuthState] = useState<ExtensionAuthState | null>(null);
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [auth, settingsData] = await Promise.all([getAuthState(), getSettings()]);
            setAuthState(auth);
            setSettings(settingsData);
            setIsLoading(false);
        }
        load();
    }, []);

    const openSidePanel = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            await chrome.sidePanel.open({ tabId: tab.id });
            window.close();
        }
    };

    const openFlowMaestro = () => {
        const url = settings?.apiBaseUrl?.replace("/api", "") || "https://app.flowmaestro.io";
        chrome.tabs.create({ url });
        window.close();
    };

    const openSettings = () => {
        chrome.runtime.openOptionsPage();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
        );
    }

    const isAuthenticated = authState?.isAuthenticated;

    return (
        <div className="p-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <img
                    src="/assets/icons/icon-32.png"
                    alt="FlowMaestro"
                    className="w-8 h-8 rounded-lg"
                />
                <div>
                    <h1 className="text-sm font-semibold text-gray-900">FlowMaestro</h1>
                    {isAuthenticated && authState?.user && (
                        <p className="text-xs text-gray-500">{authState.user.email}</p>
                    )}
                </div>
            </div>

            {!isAuthenticated ? (
                /* Not Authenticated */
                <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Sign in to use FlowMaestro with this page
                    </p>
                    <button
                        onClick={openSidePanel}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <LogIn className="w-4 h-4" />
                        <span className="text-sm font-medium">Sign In</span>
                    </button>
                </div>
            ) : (
                /* Authenticated Menu */
                <div className="space-y-1">
                    <button
                        onClick={openSidePanel}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Bot className="w-5 h-5 text-primary-600" />
                            <span className="text-sm font-medium text-gray-700">
                                Chat with Agent
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>

                    <button
                        onClick={openSidePanel}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Workflow className="w-5 h-5 text-primary-600" />
                            <span className="text-sm font-medium text-gray-700">Run Workflow</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>

                    <button
                        onClick={openSidePanel}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-primary-600" />
                            <span className="text-sm font-medium text-gray-700">Add to KB</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>

                    <hr className="my-2 border-gray-200" />

                    <button
                        onClick={openFlowMaestro}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <ExternalLink className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Open FlowMaestro</span>
                        </div>
                    </button>

                    <button
                        onClick={openSettings}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Settings</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
