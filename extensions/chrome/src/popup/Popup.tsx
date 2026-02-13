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
import { ThemeToggle } from "../shared/components/ThemeToggle";
import {
    applyTheme,
    getAuthState,
    getSettings,
    getTheme,
    setInitialTab,
    type SidebarTab
} from "../shared/storage";

export default function Popup() {
    const [authState, setAuthState] = useState<ExtensionAuthState | null>(null);
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [auth, settingsData, theme] = await Promise.all([
                getAuthState(),
                getSettings(),
                getTheme()
            ]);
            setAuthState(auth);
            setSettings(settingsData);
            applyTheme(theme);
            setIsLoading(false);
        }
        load();
    }, []);

    const openSidePanel = async (initialTab?: SidebarTab) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            if (initialTab) {
                await setInitialTab(initialTab);
            }
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
            <div className="flex items-center justify-center h-48 bg-background">
                <Loader2 className="w-6 h-6 text-foreground animate-spin" />
            </div>
        );
    }

    const isAuthenticated = authState?.isAuthenticated;

    return (
        <div className="p-3 abstract-bg">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <img
                        src="/assets/icons/icon-32.png"
                        alt="FlowMaestro"
                        className="w-8 h-8 rounded-lg"
                    />
                    <div>
                        <h1 className="text-sm font-semibold text-foreground">FlowMaestro</h1>
                        {isAuthenticated && authState?.user && (
                            <p className="text-xs text-muted-foreground">{authState.user.email}</p>
                        )}
                    </div>
                </div>
                <ThemeToggle />
            </div>

            {!isAuthenticated ? (
                /* Not Authenticated */
                <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Sign in to use FlowMaestro with this page
                    </p>
                    <button
                        onClick={() => openSidePanel()}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <LogIn className="w-4 h-4" />
                        <span className="text-sm font-medium">Sign In</span>
                    </button>
                </div>
            ) : (
                /* Authenticated Menu */
                <div className="space-y-1">
                    <button
                        onClick={() => openSidePanel("agents")}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Bot className="w-5 h-5 text-foreground" />
                            <span className="text-sm font-medium text-foreground">
                                Chat with Agent
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </button>

                    <button
                        onClick={() => openSidePanel("workflows")}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Workflow className="w-5 h-5 text-foreground" />
                            <span className="text-sm font-medium text-foreground">
                                Run Workflow
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </button>

                    <button
                        onClick={() => openSidePanel("kb")}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-foreground" />
                            <span className="text-sm font-medium text-foreground">Add to KB</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </button>

                    <hr className="my-2 border-border" />

                    <button
                        onClick={openFlowMaestro}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <ExternalLink className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Open FlowMaestro</span>
                        </div>
                    </button>

                    <button
                        onClick={openSettings}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Settings</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
