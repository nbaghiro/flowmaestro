import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";

export function UserDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }

        return undefined;
    }, [isOpen]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const getInitials = (email: string): string => {
        const parts = email.split("@")[0].split(".");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    if (!user) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
            >
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-medium text-xs">
                    {getInitials(user.email)}
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-foreground">{user.name || "User"}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                    {/* User info */}
                    <div className="px-3 py-2 border-b border-border">
                        <div className="text-sm font-medium text-foreground">
                            {user.name || "User"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                navigate("/account");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                            <User className="w-4 h-4" />
                            <span>Account Settings</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                navigate("/settings");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Preferences</span>
                        </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border py-1">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
