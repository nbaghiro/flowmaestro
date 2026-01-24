import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OverflowMenuItem {
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
}

interface OverflowMenuProps {
    items: OverflowMenuItem[];
    className?: string;
}

export function OverflowMenu({ items, className = "" }: OverflowMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const getMenuPosition = () => {
        if (!buttonRef.current) return { top: 0, left: 0 };

        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 200;

        let left = rect.right - menuWidth;
        if (left < 8) {
            left = rect.left;
        }

        return {
            top: rect.bottom + 4,
            left
        };
    };

    const position = getMenuPosition();

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors ${
                    isOpen ? "bg-muted" : ""
                } ${className}`}
                aria-label="More options"
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        className="fixed z-50 min-w-[200px] bg-card border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            top: position.top,
                            left: position.left
                        }}
                    >
                        {items.map((item, index) => (
                            <button
                                key={index}
                                role="menuitem"
                                onClick={() => {
                                    if (!item.disabled) {
                                        item.onClick();
                                        setIsOpen(false);
                                    }
                                }}
                                disabled={item.disabled}
                                className={`
                                    w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors
                                    ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted"}
                                    text-foreground
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    {item.icon && (
                                        <span className="w-4 h-4 flex items-center justify-center">
                                            {item.icon}
                                        </span>
                                    )}
                                    {item.label}
                                </span>
                                {item.shortcut && (
                                    <span className="text-xs text-muted-foreground ml-4">
                                        {item.shortcut}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    );
}
