import { memo, useRef, useCallback, useEffect } from "react";
import { useWorkflowStore } from "../../stores/workflowStore";

interface Props {
    nodeId: string;
    content: string;
    textColor: string;
    isEditing: boolean;
    onStopEditing: () => void;
    onSelectionChange?: (range: Range | null) => void;
    onStartEditing?: () => void;
}

function ContentArea({
    nodeId,
    content,
    textColor,
    isEditing,
    onStopEditing,
    onSelectionChange,
    onStartEditing
}: Props) {
    const updateNode = useWorkflowStore((s) => s.updateNode);
    const divRef = useRef<HTMLDivElement>(null);

    // Keep DOM in sync when external content changes (e.g., undo/redo, remote updates).
    useEffect(() => {
        if (!divRef.current) return;
        if (divRef.current.innerHTML !== content) {
            divRef.current.innerHTML = content || "";
        }
    }, [content]);

    // Focus contentEditable when entering edit mode.
    useEffect(() => {
        if (!isEditing || !divRef.current) return;
        const el = divRef.current;
        el.focus();
        // Move caret to end so typing resumes after existing content.
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    }, [isEditing]);

    const readContent = useCallback((el: HTMLDivElement) => {
        // Normalize to empty string when only whitespace/line breaks remain so placeholder shows.
        const text = el.innerText.replace(/\u200B/g, "").trim();
        if (!text) {
            el.innerHTML = "";
            return "";
        }
        return el.innerHTML;
    }, []);

    const handleInput = useCallback(() => {
        const el = divRef.current;
        if (!el) return;

        updateNode(nodeId, {
            content: readContent(el)
        });
    }, [nodeId, updateNode, readContent]);

    const handleSelectionChange = useCallback(() => {
        const el = divRef.current;
        const sel = window.getSelection();
        if (!el || !sel || sel.rangeCount === 0) {
            onSelectionChange?.(null);
            return;
        }

        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        if (el.contains(container)) {
            onSelectionChange?.(range.cloneRange());
        } else {
            onSelectionChange?.(null);
        }
    }, [onSelectionChange]);

    const handleBlur = useCallback(
        (e: React.FocusEvent<HTMLDivElement>) => {
            const el = divRef.current;
            if (!el) return;

            const normalized = readContent(el);
            updateNode(nodeId, {
                content: normalized
            });

            const next = (e.relatedTarget as HTMLElement | null) || document.activeElement;
            if (!next) {
                // If focus destination is unknown (e.g., Radix portal), keep editing.
                requestAnimationFrame(() => el.focus());
                return;
            }
            if (el.contains(next) || next.closest('[data-role="comment-toolbar"]')) {
                requestAnimationFrame(() => el.focus());
                return;
            }

            onStopEditing();
        },
        [nodeId, updateNode, onStopEditing, readContent]
    );

    return (
        <div
            ref={divRef}
            className={`pr-6 pt-1 pb-2 outline-none w-full h-full comment-scrollbar [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 [&_*]:bg-transparent ${
                isEditing ? "cursor-text nodrag" : "cursor-grab active:cursor-grabbing"
            }`}
            tabIndex={0}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleBlur}
            onDoubleClick={onStartEditing}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            style={{
                color: textColor,
                background: "transparent",
                height: "100%",
                minHeight: "96px",
                maxHeight: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                boxSizing: "border-box"
            }}
            data-role="comment-content"
            data-placeholder="Add a note..."
        ></div>
    );
}

export default memo(ContentArea);
