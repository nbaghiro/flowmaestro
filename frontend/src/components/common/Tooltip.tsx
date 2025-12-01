import { ReactNode, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
    content: string;
    children: ReactNode;
    delay?: number;
    position?: TooltipPosition;
}

export function Tooltip({ content, children, delay = 300, position = "right" }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let newCoords = { top: 0, left: 0 };

            switch (position) {
                case "top":
                    newCoords = {
                        top: rect.top - 8,
                        left: rect.left + rect.width / 2
                    };
                    break;
                case "bottom":
                    newCoords = {
                        top: rect.bottom + 8,
                        left: rect.left + rect.width / 2
                    };
                    break;
                case "left":
                    newCoords = {
                        top: rect.top + rect.height / 2,
                        left: rect.left - 8
                    };
                    break;
                case "right":
                default:
                    newCoords = {
                        top: rect.top + rect.height / 2,
                        left: rect.right + 8
                    };
                    break;
            }

            setCoords(newCoords);
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Get transform and arrow styles based on position
    const getPositionStyles = () => {
        switch (position) {
            case "top":
                return {
                    transform: "translate(-50%, -100%)",
                    arrowClass:
                        "absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900"
                };
            case "bottom":
                return {
                    transform: "translate(-50%, 0)",
                    arrowClass:
                        "absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-gray-900"
                };
            case "left":
                return {
                    transform: "translate(-100%, -50%)",
                    arrowClass:
                        "absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"
                };
            case "right":
            default:
                return {
                    transform: "translateY(-50%)",
                    arrowClass:
                        "absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"
                };
        }
    };

    const { transform, arrowClass } = getPositionStyles();

    return (
        <>
            <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                {children}
            </div>
            {isVisible &&
                createPortal(
                    <div
                        className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
                        style={{
                            top: coords.top,
                            left: coords.left,
                            transform
                        }}
                    >
                        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-nowrap">
                            {content}
                            <div className={arrowClass} />
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
