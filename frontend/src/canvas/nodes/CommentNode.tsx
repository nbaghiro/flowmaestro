import { GripHorizontal } from "lucide-react";
import { memo, useState, useEffect, useRef } from "react";
import { NodeProps } from "reactflow";
import CommentNodeToolbar from "../../components/comment/CommentNodeToolbar";
import ContentArea from "../../components/comment/ContentArea";
import { useWorkflowStore } from "../../stores/workflowStore";

function CommentNode({ id, data, selected }: NodeProps) {
    const { content, backgroundColor, textColor } = data;

    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [startWidth, setStartWidth] = useState<number | null>(null);
    const [startHeight, setStartHeight] = useState<number | null>(null);
    const [didResize, setDidResize] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const selectionRef = useRef<Range | null>(null);
    const [activeFormats, setActiveFormats] = useState<string[]>([]);
    const [activeTextColor, setActiveTextColor] = useState(textColor);

    const normalizeColorToHex = (value: string | null): string => {
        if (!value) return textColor;
        if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
            return value.length === 4
                ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toUpperCase()
                : value.toUpperCase();
        }

        const match = value.match(/\d+/g);
        if (!match || match.length < 3) return textColor;

        const [r, g, b] = match.map((n) => {
            const hex = Math.max(0, Math.min(255, Number(n)))
                .toString(16)
                .padStart(2, "0");
            return hex;
        });
        return `#${r}${g}${b}`.toUpperCase();
    };

    const readSelectionColor = (range: Range | null) => {
        if (!range) return textColor;
        let node: Node | null = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }
        if (node && node instanceof HTMLElement) {
            const color = getComputedStyle(node).color;
            return normalizeColorToHex(color);
        }
        return textColor;
    };

    const refreshFormatState = () => {
        const next: string[] = [];
        if (document.queryCommandState("bold")) next.push("bold");
        if (document.queryCommandState("italic")) next.push("italic");
        if (document.queryCommandState("underline")) next.push("underline");
        setActiveFormats(next);
    };

    const updateNodeStyle = useWorkflowStore((s) => s.updateNodeStyle);
    const updateNode = useWorkflowStore((s) => s.updateNode);

    // Ensure formatting targets the active content area.
    const focusContent = () => {
        const el = document.querySelector(
            `[data-id="${id}"] [data-role="comment-content"]`
        ) as HTMLDivElement | null;
        if (el) el.focus();
        return el;
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        const el = focusContent();
        if (!sel || !el) return;

        sel.removeAllRanges();
        if (selectionRef.current) {
            sel.addRange(selectionRef.current);
            return;
        }

        // Create a caret inside the contentEditable when no prior selection exists.
        const range = document.createRange();
        const firstTextNode = el.firstChild as ChildNode | null;
        if (firstTextNode && firstTextNode.nodeType === Node.TEXT_NODE) {
            range.setStart(firstTextNode, (firstTextNode.textContent || "").length);
        } else if (firstTextNode) {
            range.setStart(
                firstTextNode,
                firstTextNode.textContent ? firstTextNode.textContent.length : 0
            );
        } else {
            const textNode = document.createTextNode("");
            el.appendChild(textNode);
            range.setStart(textNode, 0);
        }
        range.collapse(true);
        sel.addRange(range);
        selectionRef.current = range;
    };

    const exec = (cmd: string, value?: string) => {
        restoreSelection();
        document.execCommand(cmd, false, value);
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            selectionRef.current = sel.getRangeAt(0).cloneRange();
        }
        setTimeout(refreshFormatState, 0);
    };

    const runFormatting = (cmd: string, value?: string) => {
        // Ensure contentEditable is enabled before executing.
        setIsEditing(true);
        requestAnimationFrame(() => exec(cmd, value));
    };

    const onBold = () => {
        setActiveFormats((prev) =>
            prev.includes("bold") ? prev.filter((f) => f !== "bold") : [...prev, "bold"]
        );
        runFormatting("bold");
    };
    const onItalic = () => {
        setActiveFormats((prev) =>
            prev.includes("italic") ? prev.filter((f) => f !== "italic") : [...prev, "italic"]
        );
        runFormatting("italic");
    };
    const onUnderline = () => {
        setActiveFormats((prev) =>
            prev.includes("underline")
                ? prev.filter((f) => f !== "underline")
                : [...prev, "underline"]
        );
        runFormatting("underline");
    };

    // Color updates
    const onSetBg = (c: string) => {
        updateNode(id, { backgroundColor: c });
    };

    const onSetText = (c: string) => {
        const normalized = normalizeColorToHex(c);
        const hasSelection = selectionRef.current && !selectionRef.current.collapsed;
        if (hasSelection) {
            setActiveTextColor(normalized);
            runFormatting("foreColor", normalized);
            return;
        }

        setActiveTextColor(normalized);
        updateNode(id, { textColor: normalized });
    };

    // --- Resize logic (same as BaseNode) ---
    const onResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const el = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
        if (!el) return;

        const width = parseFloat(el.style.width || "200");
        const height = parseFloat(el.style.height || "140");

        setIsResizing(true);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartWidth(width);
        setStartHeight(height);
        setDidResize(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !startPos || startWidth == null || startHeight == null) return;

        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            setDidResize(true);
        }

        const newWidth = Math.max(150, startWidth + dx);
        const newHeight = Math.max(100, startHeight + dy);

        const el = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
        el.style.width = `${newWidth}px`;
        el.style.height = `${newHeight}px`;
    };

    const handleMouseUp = () => {
        if (!isResizing) return;

        const el = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
        if (el) {
            updateNodeStyle(id, {
                width: parseFloat(el.style.width),
                height: parseFloat(el.style.height)
            });
        }

        setIsResizing(false);
        setStartPos(null);
        setStartWidth(null);
        setStartHeight(null);
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        setActiveTextColor(textColor);
    }, [textColor]);

    return (
        <div
            data-id={id}
            onWheelCapture={(e) => {
                // Prevent canvas zoom when scrolling inside the note.
                e.stopPropagation();
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className={`w-full h-full rounded-md p-3 text-sm shadow-md relative ${
                selected ? "ring-2 ring-blue-500" : ""
            } ${isEditing ? "" : "cursor-grab active:cursor-grabbing"}`}
            style={{
                backgroundColor,
                color: textColor
            }}
        >
            {/* Toolbar */}
            {selected && isEditing && (
                <CommentNodeToolbar
                    onBold={onBold}
                    onItalic={onItalic}
                    onUnderline={onUnderline}
                    onSetBg={onSetBg}
                    onSetText={onSetText}
                    activeBg={backgroundColor}
                    activeText={activeTextColor}
                    activeBold={activeFormats.includes("bold")}
                    activeItalic={activeFormats.includes("italic")}
                    activeUnderline={activeFormats.includes("underline")}
                />
            )}

            {/* Editable Content */}
            <ContentArea
                nodeId={id}
                content={content}
                textColor={textColor}
                isEditing={isEditing}
                onStopEditing={() => setIsEditing(false)}
                onSelectionChange={(range) => {
                    selectionRef.current = range;
                    setActiveTextColor(readSelectionColor(range));
                    refreshFormatState();
                }}
                onStartEditing={() => setIsEditing(true)}
            />

            {/* Resize Handle */}
            <div
                onMouseDown={onResizeMouseDown}
                onClick={(e) => {
                    if (didResize) e.stopPropagation();
                    setDidResize(false);
                }}
                className="
                    nodrag
                    absolute bottom-1 right-1
                    w-4 h-4
                    cursor-se-resize z-20
                    rotate-45 text-gray-400
                "
            >
                <GripHorizontal className="w-3 h-3" />
            </div>
        </div>
    );
}

export default memo(CommentNode);
