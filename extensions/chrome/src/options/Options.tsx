import { LogOut, Moon, Save, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ExtensionAuthState, ExtensionSettings } from "@flowmaestro/shared";
import {
    applyTheme,
    clearAuthState,
    getAuthState,
    getSettings,
    getTheme,
    setTheme,
    updateSettings,
    type Theme
} from "../shared/storage";

export default function Options() {
    const [authState, setAuthStateLocal] = useState<ExtensionAuthState | null>(null);
    const [_settings, setSettingsLocal] = useState<ExtensionSettings | null>(null);
    const [theme, setThemeLocal] = useState<Theme>("system");
    const [apiBaseUrl, setApiBaseUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const [auth, settingsData, themeData] = await Promise.all([
                getAuthState(),
                getSettings(),
                getTheme()
            ]);
            setAuthStateLocal(auth);
            setSettingsLocal(settingsData);
            setThemeLocal(themeData);
            setApiBaseUrl(settingsData?.apiBaseUrl || "http://localhost:3001");
            applyTheme(themeData);
        }
        load();
    }, []);

    const handleThemeChange = async (newTheme: Theme) => {
        setThemeLocal(newTheme);
        await setTheme(newTheme);
        applyTheme(newTheme);
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            await updateSettings({ apiBaseUrl });
            setSaveMessage("Settings saved successfully");
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        await clearAuthState();
        setAuthStateLocal(null);
        // Reload the page to reflect signed out state
        window.location.reload();
    };

    const resolvedTheme =
        theme === "system"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            : theme;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <img
                        src="/assets/icons/icon-48.png"
                        alt="FlowMaestro"
                        className="w-10 h-10 rounded-lg"
                    />
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            FlowMaestro Settings
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Configure your extension preferences
                        </p>
                    </div>
                </div>

                {/* Account Section */}
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        Account
                    </h2>
                    <div className="bg-card border border-border rounded-lg p-4">
                        {authState?.isAuthenticated ? (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {authState.user?.name || authState.user?.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {authState.user?.email}
                                    </p>
                                    {authState.workspace && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Workspace: {authState.workspace.name}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Not signed in. Open the extension popup to sign in.
                            </p>
                        )}
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        Appearance
                    </h2>
                    <div className="bg-card border border-border rounded-lg p-4">
                        <label className="text-sm font-medium text-foreground mb-3 block">
                            Theme
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleThemeChange("light")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                    theme === "light"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:bg-accent"
                                }`}
                            >
                                <Sun className="w-4 h-4" />
                                Light
                            </button>
                            <button
                                onClick={() => handleThemeChange("dark")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                    theme === "dark"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:bg-accent"
                                }`}
                            >
                                <Moon className="w-4 h-4" />
                                Dark
                            </button>
                            <button
                                onClick={() => handleThemeChange("system")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                    theme === "system"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:bg-accent"
                                }`}
                            >
                                {resolvedTheme === "dark" ? (
                                    <Moon className="w-4 h-4" />
                                ) : (
                                    <Sun className="w-4 h-4" />
                                )}
                                System
                            </button>
                        </div>
                    </div>
                </section>

                {/* Advanced Section */}
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        Advanced
                    </h2>
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                        <div>
                            <label
                                htmlFor="apiBaseUrl"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                API Base URL
                            </label>
                            <input
                                id="apiBaseUrl"
                                type="text"
                                value={apiBaseUrl}
                                onChange={(e) => setApiBaseUrl(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="https://api.flowmaestro.ai"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                The FlowMaestro API endpoint. Change this for development or
                                self-hosted instances.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? "Saving..." : "Save Settings"}
                            </button>
                            {saveMessage && (
                                <span
                                    className={`text-sm ${saveMessage.includes("success") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
                                >
                                    {saveMessage}
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        About
                    </h2>
                    <div className="bg-card border border-border rounded-lg p-4">
                        <p className="text-sm text-foreground">FlowMaestro Extension v1.0.0</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Use workflows and AI agents with any web page.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
