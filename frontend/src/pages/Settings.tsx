import { Palette, Bell, Key, Shield, Sun, Moon, Monitor } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { ApiKeysSection } from "../components/settings/ApiKeysSection";
import { cn } from "../lib/utils";
import { useThemeStore } from "../stores/themeStore";

export function Settings() {
    const { theme, setTheme } = useThemeStore();

    const themeOptions = [
        {
            value: "light" as const,
            icon: Sun,
            label: "Light",
            description: "Light mode"
        },
        {
            value: "dark" as const,
            icon: Moon,
            label: "Dark",
            description: "Dark mode"
        },
        {
            value: "system" as const,
            icon: Monitor,
            label: "System",
            description: "Follow system preference"
        }
    ];

    const settingsSections = [
        {
            icon: Palette,
            title: "Appearance",
            description: "Customize the look and feel",
            customContent: (
                <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground mb-3">Theme</div>
                    <div className="grid grid-cols-3 gap-3">
                        {themeOptions.map((option) => {
                            const Icon = option.icon;
                            const isActive = theme === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setTheme(option.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                        isActive
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "w-5 h-5",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}
                                    />
                                    <div className="text-center">
                                        <div
                                            className={cn(
                                                "text-sm font-medium",
                                                isActive ? "text-primary" : "text-foreground"
                                            )}
                                        >
                                            {option.label}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )
        },
        {
            icon: Bell,
            title: "Notifications",
            description: "Manage your notification preferences",
            items: ["Email notifications", "Workflow alerts", "Execution reports"]
        },
        {
            icon: Key,
            title: "API & Webhooks",
            description: "API keys and webhook configuration",
            customContent: <ApiKeysSection />
        },
        {
            icon: Shield,
            title: "Security",
            description: "Security and privacy settings",
            items: ["Two-factor authentication", "Active sessions", "Audit log"]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
            <PageHeader
                title="Settings"
                description="Manage your application preferences and configuration"
            />

            <div className="space-y-6">
                {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div
                            key={section.title}
                            className="bg-card border border-border rounded-lg p-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-foreground mb-1">
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {section.description}
                                    </p>
                                    {section.customContent ? (
                                        section.customContent
                                    ) : (
                                        <div className="space-y-2">
                                            {section.items?.map((item) => (
                                                <div
                                                    key={item}
                                                    className="flex items-center justify-between py-2 px-3 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <span className="text-sm text-foreground">
                                                        {item}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Configure →
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
