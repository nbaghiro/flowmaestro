import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Creates a custom drag preview element that follows the mouse during drag.
 * Call this in onDragStart - it automatically cleans up on dragend.
 */
export function createDragPreview(e: React.DragEvent, itemCount: number, itemType: string): void {
    // Create an off-screen element for setDragImage to hide the default preview
    const offscreen = document.createElement("div");
    offscreen.style.cssText =
        "position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px;";
    document.body.appendChild(offscreen);
    e.dataTransfer.setDragImage(offscreen, 0, 0);
    // Remove offscreen element after browser captures it
    requestAnimationFrame(() => offscreen.remove());

    // Create the visible preview element
    const preview = document.createElement("div");
    preview.id = "drag-preview";
    preview.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 99999;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        padding: 8px 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        top: ${e.clientY + 16}px;
        left: ${e.clientX + 16}px;
    `;

    // Set the content
    const label = itemCount === 1 ? itemType : `${itemType}s`;
    preview.innerHTML = `
        <span style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            font-size: 11px;
        ">${itemCount}</span>
        <span>${itemCount} ${label}</span>
    `;

    // Remove any existing preview
    const existing = document.getElementById("drag-preview");
    if (existing) {
        existing.remove();
    }

    document.body.appendChild(preview);

    // Update position using dragover (fires on elements being dragged over)
    const handleDragOver = (dragEvent: DragEvent) => {
        preview.style.top = `${dragEvent.clientY + 16}px`;
        preview.style.left = `${dragEvent.clientX + 16}px`;
    };

    // Cleanup on drag end
    const handleDragEnd = () => {
        preview.remove();
        document.removeEventListener("dragover", handleDragOver);
        document.removeEventListener("dragend", handleDragEnd);
        document.removeEventListener("drop", handleDragEnd);
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragend", handleDragEnd);
    document.addEventListener("drop", handleDragEnd);
}

export function generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep equality check for objects and arrays
 */
export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    if (typeof a === "object" && typeof b === "object") {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;
        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);

        if (aKeys.length !== bKeys.length) return false;

        for (const key of aKeys) {
            if (!bKeys.includes(key)) return false;
            if (!deepEqual(aObj[key], bObj[key])) return false;
        }
        return true;
    }

    return false;
}
