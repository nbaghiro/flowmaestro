import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { Button } from "./Button";
import { Input } from "./Input";

interface ExpandableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    /** ID of the element to portal the mobile expanded search into */
    mobilePortalId?: string;
}

export function ExpandableSearch({
    value,
    onChange,
    placeholder = "Search...",
    className,
    mobilePortalId = "mobile-search-portal"
}: ExpandableSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    // Find portal container when expanded
    useEffect(() => {
        if (isExpanded) {
            const container = document.getElementById(mobilePortalId);
            setPortalContainer(container);
        } else {
            setPortalContainer(null);
        }
    }, [mobilePortalId, isExpanded]);

    // Auto-expand when there's a value
    useEffect(() => {
        if (value && !isExpanded) {
            setIsExpanded(true);
        }
    }, [value, isExpanded]);

    // Focus input when expanded (desktop input or mobile input)
    useEffect(() => {
        if (isExpanded) {
            // Small delay to allow DOM to render
            setTimeout(() => {
                // Check if we're on mobile
                const isMobile = window.innerWidth < 768;
                if (!isMobile && inputRef.current) {
                    inputRef.current.focus();
                } else if (isMobile && mobileInputRef.current) {
                    mobileInputRef.current.focus();
                }
            }, 100);
        }
    }, [isExpanded]);

    // Handle escape key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleClose();
        }
    };

    const handleClose = () => {
        onChange("");
        setIsExpanded(false);
    };

    if (!isExpanded) {
        return (
            <Button
                variant="ghost"
                onClick={() => setIsExpanded(true)}
                title="Search"
                className={className}
            >
                <Search className="w-4 h-4" />
            </Button>
        );
    }

    const mobileSearchInput = (
        <div className="md:hidden animate-in fade-in slide-in-from-top-2 duration-200 mb-4">
            <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                    ref={mobileInputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="pl-9 pr-3 w-full"
                />
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop: inline expanded search */}
            <div
                className={cn(
                    "hidden md:flex items-center animate-in slide-in-from-right-2 duration-200",
                    className
                )}
            >
                <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="pl-9 pr-8 w-48 sm:w-64"
                    />
                    <button
                        onClick={handleClose}
                        className="absolute right-2 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                        title="Close search"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Mobile: close button inline */}
            <Button
                variant="ghost"
                onClick={handleClose}
                title="Close search"
                className={cn("md:hidden", className)}
            >
                <X className="w-4 h-4" />
            </Button>

            {/* Mobile: full-width search input - portaled to below header */}
            {portalContainer && createPortal(mobileSearchInput, portalContainer)}
        </>
    );
}
