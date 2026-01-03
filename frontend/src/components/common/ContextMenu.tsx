import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "danger";
    disabled?: boolean;
}

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    items: ContextMenuItem[];
    onClose: () => void;
}

export function ContextMenu({ isOpen, position, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Adjust position to keep menu within viewport
    const adjustedPosition = { ...position };
    const menuWidth = 200;
    const menuHeight = items.length * 40 + 8; // Approximate height

    if (position.x + menuWidth > window.innerWidth) {
        adjustedPosition.x = window.innerWidth - menuWidth - 8;
    }
    if (position.y + menuHeight > window.innerHeight) {
        adjustedPosition.y = window.innerHeight - menuHeight - 8;
    }

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: adjustedPosition.y,
                left: adjustedPosition.x
            }}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        if (!item.disabled) {
                            item.onClick();
                            onClose();
                        }
                    }}
                    disabled={item.disabled}
                    className={`
                        w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                        ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        ${
                            item.variant === "danger"
                                ? "text-destructive hover:bg-destructive/10"
                                : "text-foreground hover:bg-muted"
                        }
                    `}
                >
                    {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>,
        document.body
    );
}
