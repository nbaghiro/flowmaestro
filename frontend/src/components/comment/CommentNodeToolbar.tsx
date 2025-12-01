import * as Popover from "@radix-ui/react-popover";
import { memo } from "react";

interface Props {
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onSetBg: (color: string) => void;
    onSetText: (color: string) => void;
    activeBg: string;
    activeText: string;
    activeBold: boolean;
    activeItalic: boolean;
    activeUnderline: boolean;
}

const BG_COLORS = ["#FEF3C7", "#FFEDD5", "#E0F2FE", "#E9D5FF", "#DCFCE7"];
const TEXT_COLORS = ["#1F2937", "#6B7280", "#9CA3AF"];

function CommentNodeToolbar({
    onBold,
    onItalic,
    onUnderline,
    onSetBg,
    onSetText,
    activeBg,
    activeText,
    activeBold,
    activeItalic,
    activeUnderline
}: Props) {
    const stopPointer = (e: React.PointerEvent) => {
        // Keep focus on the contentEditable so formatting applies to the current selection.
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Popover.Root modal={false}>
            <Popover.Trigger asChild>
                <button
                    data-role="comment-toolbar"
                    className="pointer-events-auto absolute top-2 right-2 pb- bg-white/70 hover:bg-white rounded p-1 shadow-sm border border-gray-200 text-xs text-gray-800"
                    onPointerDown={stopPointer}
                    type="button"
                >
                    Aa
                </button>
            </Popover.Trigger>

            <Popover.Content
                data-role="comment-toolbar"
                side="top"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onPointerDown={stopPointer}
                className="rounded-md bg-white shadow-lg border p-3 space-y-3 z-50 text-gray-800"
            >
                <div>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onBold clicked");
                            onBold();
                        }}
                        className={`px-1.5 py-0.5 border rounded text-xs ${
                            activeBold ? "bg-blue-50 border-blue-400" : ""
                        }`}
                    >
                        <b>B</b>
                    </button>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onItalic clicked");
                            onItalic();
                        }}
                        className={`px-1.5 py-0.5 border rounded text-xs italic ${
                            activeItalic ? "bg-blue-50 border-blue-400" : ""
                        }`}
                    >
                        I
                    </button>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onUnderline clicked");
                            onUnderline();
                        }}
                        className={`px-1.5 py-0.5 border rounded text-xs underline ${
                            activeUnderline ? "bg-blue-50 border-blue-400" : ""
                        }`}
                    >
                        U
                    </button>
                </div>

                <div className="text-[10px] text-gray-500 mb-1">Background</div>
                <div className="flex gap-2">
                    {BG_COLORS.map((c) => (
                        <button
                            key={c}
                            onPointerDown={stopPointer}
                            onClick={() => {
                                console.log("onSetBg clicked", c);
                                onSetBg(c);
                            }}
                            className={`w-5 h-5 rounded border ${
                                activeBg === c ? "ring-2 ring-blue-500 ring-offset-1" : ""
                            }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <div className="text-[10px] text-gray-500 mb-1">Text</div>
                <div className="flex gap-2">
                    {TEXT_COLORS.map((c) => (
                        <button
                            key={c}
                            onPointerDown={stopPointer}
                            onClick={() => {
                                console.log("onSetText clicked", c);
                                onSetText(c);
                            }}
                            className={`w-5 h-5 rounded border ${
                                activeText === c ? "ring-2 ring-blue-500 ring-offset-1" : ""
                            }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <Popover.Arrow className="fill-white" />
            </Popover.Content>
        </Popover.Root>
    );
}

export default memo(CommentNodeToolbar);
