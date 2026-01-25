import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

interface HorizontalCardRowProps {
    title: string;
    viewAllLink: string;
    viewAllText?: string;
    children: ReactNode;
    emptyState?: ReactNode;
    isEmpty?: boolean;
}

export function HorizontalCardRow({
    title,
    viewAllLink,
    viewAllText = "View all",
    children,
    emptyState,
    isEmpty = false
}: HorizontalCardRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;

        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (el) {
            el.addEventListener("scroll", checkScroll);
            window.addEventListener("resize", checkScroll);
        }
        return () => {
            if (el) {
                el.removeEventListener("scroll", checkScroll);
            }
            window.removeEventListener("resize", checkScroll);
        };
    }, [children]);

    const scroll = (direction: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;

        const cardWidth = 320; // Approximate card width + gap
        const scrollAmount = direction === "left" ? -cardWidth * 2 : cardWidth * 2;
        el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    if (isEmpty && emptyState) {
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                </div>
                {emptyState}
            </section>
        );
    }

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <Link
                    to={viewAllLink}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                    {viewAllText}
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="relative group/scroll -mx-4 px-4">
                {/* Left scroll button */}
                <button
                    onClick={() => scroll("left")}
                    className={cn(
                        "absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center",
                        "text-foreground hover:bg-muted transition-all",
                        "opacity-0 group-hover/scroll:opacity-100",
                        !canScrollLeft && "hidden"
                    )}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Scrollable container */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-2"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {children}
                </div>

                {/* Right scroll button */}
                <button
                    onClick={() => scroll("right")}
                    className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center",
                        "text-foreground hover:bg-muted transition-all",
                        "opacity-0 group-hover/scroll:opacity-100",
                        !canScrollRight && "hidden"
                    )}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                {/* Gradient overlays */}
                <div
                    className={cn(
                        "absolute left-0 top-0 bottom-2 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none transition-opacity",
                        canScrollLeft ? "opacity-100" : "opacity-0"
                    )}
                />
                <div
                    className={cn(
                        "absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none transition-opacity",
                        canScrollRight ? "opacity-100" : "opacity-0"
                    )}
                />
            </div>
        </section>
    );
}
