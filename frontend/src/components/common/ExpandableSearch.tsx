import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";
import { Input } from "./Input";

interface ExpandableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function ExpandableSearch({
    value,
    onChange,
    placeholder = "Search...",
    className
}: ExpandableSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-expand when there's a value
    useEffect(() => {
        if (value && !isExpanded) {
            setIsExpanded(true);
        }
    }, [value, isExpanded]);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
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

    return (
        <div
            className={cn(
                "flex items-center animate-in slide-in-from-right-2 duration-200",
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
    );
}
