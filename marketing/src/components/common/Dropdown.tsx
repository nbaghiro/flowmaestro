import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { NavigationEvents } from "../../lib/analytics";

export interface DropdownItem {
    label: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    description?: string;
}

interface DropdownProps {
    label: string;
    items: DropdownItem[];
}

export const Dropdown: React.FC<DropdownProps> = ({ label, items }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasTrackedOpen = React.useRef(false);

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (!isOpen && !hasTrackedOpen.current) {
            NavigationEvents.dropdownOpened({ menuItem: label });
            hasTrackedOpen.current = true;
        }
        setIsOpen(true);
    };

    const handleLinkClick = (itemLabel: string) => {
        NavigationEvents.navLinkClicked({ menuItem: itemLabel, isDropdown: true });
        setIsOpen(false);
        hasTrackedOpen.current = false;
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
            hasTrackedOpen.current = false;
        }, 150);
    };

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {label}
                <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 mt-3 w-72 py-2 bg-card border border-border rounded-xl shadow-2xl shadow-black/20"
                    >
                        {/* Arrow pointer */}
                        <div className="absolute -top-2 left-6 w-4 h-4 bg-card border-l border-t border-border rotate-45" />

                        <div className="relative z-10">
                            {items.map((item) => (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => handleLinkClick(item.label)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                                >
                                    {item.icon && (
                                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center">
                                            <item.icon className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground">
                                            {item.label}
                                        </div>
                                        {item.description && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
