import { X, Upload, Search, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface IconPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (icon: string) => void;
    onFileUpload?: (file: File) => Promise<string | null>;
    currentIcon?: string | null;
}

// Emoji categories with common emojis
const EMOJI_CATEGORIES = {
    "Smileys & People": [
        "😀",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "🤣",
        "😂",
        "🙂",
        "🙃",
        "😉",
        "😊",
        "😇",
        "🥰",
        "😍",
        "🤩",
        "😘",
        "😗",
        "😚",
        "😙",
        "🥲",
        "😋",
        "😛",
        "😜",
        "🤪",
        "😝",
        "🤑",
        "🤗",
        "🤭",
        "🤫",
        "🤔",
        "🤐",
        "🤨",
        "😐",
        "😑",
        "😶",
        "😏",
        "😒",
        "🙄",
        "😬"
    ],
    "Animals & Nature": [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐸",
        "🐵",
        "🐔",
        "🐧",
        "🐦",
        "🐤",
        "🦆",
        "🦅",
        "🦉",
        "🦇",
        "🐺",
        "🐗",
        "🐴",
        "🦄",
        "🐝",
        "🐛",
        "🦋",
        "🐌",
        "🐞",
        "🐜",
        "🌸",
        "🌺",
        "🌻",
        "🌹",
        "🌷",
        "🌱",
        "🌲"
    ],
    "Food & Drink": [
        "🍎",
        "🍐",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🫐",
        "🍈",
        "🍒",
        "🍑",
        "🥭",
        "🍍",
        "🥥",
        "🥝",
        "🍅",
        "🥑",
        "🍆",
        "🥦",
        "🥬",
        "🥒",
        "🌶️",
        "🫑",
        "🌽",
        "🥕",
        "🧄",
        "🧅",
        "🥔",
        "🍠",
        "🍕",
        "🍔",
        "🍟",
        "🌭",
        "🍿",
        "🧈",
        "🥞",
        "🧇",
        "🥓",
        "☕"
    ],
    Activities: [
        "⚽",
        "🏀",
        "🏈",
        "⚾",
        "🥎",
        "🎾",
        "🏐",
        "🏉",
        "🥏",
        "🎱",
        "🪀",
        "🏓",
        "🏸",
        "🏒",
        "🏑",
        "🥍",
        "🏏",
        "🪃",
        "🥅",
        "⛳",
        "🎯",
        "🪁",
        "🎮",
        "🎲",
        "🧩",
        "♟️",
        "🎨",
        "🎭",
        "🎪",
        "🎤",
        "🎧",
        "🎼",
        "🎹",
        "🥁",
        "🪘",
        "🎷",
        "🎺",
        "🪗",
        "🎸",
        "🎻"
    ],
    Objects: [
        "⌚",
        "📱",
        "💻",
        "⌨️",
        "🖥️",
        "🖨️",
        "🖱️",
        "🖲️",
        "💽",
        "💾",
        "💿",
        "📀",
        "📷",
        "📸",
        "📹",
        "🎥",
        "📽️",
        "🎬",
        "📺",
        "📻",
        "🎙️",
        "🎚️",
        "🎛️",
        "🧭",
        "⏱️",
        "⏲️",
        "⏰",
        "🕰️",
        "💡",
        "🔦",
        "🏮",
        "📔",
        "📕",
        "📖",
        "📗",
        "📘",
        "📙",
        "📚",
        "📓",
        "📒"
    ],
    Symbols: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "🤍",
        "🤎",
        "💔",
        "❣️",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "💝",
        "✨",
        "⭐",
        "🌟",
        "💫",
        "⚡",
        "🔥",
        "💥",
        "🎉",
        "🎊",
        "✅",
        "❌",
        "⚠️",
        "🚀",
        "💎",
        "🔮",
        "🏆",
        "🥇",
        "🥈",
        "🥉",
        "🎖️",
        "🏅",
        "📍"
    ],
    Flags: ["🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️"]
};

// Category icons for quick nav
const CATEGORY_ICONS: Record<string, string> = {
    "Smileys & People": "😀",
    "Animals & Nature": "🐱",
    "Food & Drink": "🍎",
    Activities: "⚽",
    Objects: "💻",
    Symbols: "❤️",
    Flags: "🏁"
};

type TabType = "emoji" | "upload";

export function IconPicker({
    isOpen,
    onClose,
    onSelect,
    onFileUpload,
    currentIcon
}: IconPickerProps) {
    const [activeTab, setActiveTab] = useState<TabType>("emoji");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Smileys & People");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Delay adding listener to avoid immediate close from the button click
        const timeoutId = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleEmojiSelect = (emoji: string) => {
        onSelect(emoji);
        onClose();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // If onFileUpload callback is provided, use it to upload to server
        if (onFileUpload) {
            setIsUploading(true);
            try {
                const url = await onFileUpload(file);
                if (url) {
                    onSelect(url);
                    onClose();
                }
            } finally {
                setIsUploading(false);
            }
        } else {
            // Fallback: create a local URL (for contexts without server upload)
            const url = URL.createObjectURL(file);
            onSelect(url);
            onClose();
        }
    };

    // Filter emojis by search
    const getFilteredEmojis = () => {
        if (!searchQuery) {
            return EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || [];
        }

        // Search across all categories
        const allEmojis: string[] = [];
        Object.values(EMOJI_CATEGORIES).forEach((emojis) => {
            allEmojis.push(...emojis);
        });
        return allEmojis;
    };

    return (
        <div
            ref={pickerRef}
            className="absolute top-full left-0 mt-2 z-50"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Modal */}
            <div className="bg-card border border-border rounded-xl shadow-xl w-80 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab("emoji")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                activeTab === "emoji"
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            Emoji
                        </button>
                        <button
                            onClick={() => setActiveTab("upload")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                activeTab === "upload"
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            Upload
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {activeTab === "emoji" && (
                    <>
                        {/* Search */}
                        <div className="p-3 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search emoji..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-muted border-0 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* Category quick nav */}
                        {!searchQuery && (
                            <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
                                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`p-2 text-lg rounded-lg transition-colors ${
                                            selectedCategory === category
                                                ? "bg-primary/10"
                                                : "hover:bg-muted"
                                        }`}
                                        title={category}
                                    >
                                        {CATEGORY_ICONS[category]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Emoji grid */}
                        <div className="p-3 max-h-64 overflow-y-auto">
                            {!searchQuery && (
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                    {selectedCategory}
                                </p>
                            )}
                            <div className="grid grid-cols-8 gap-1">
                                {getFilteredEmojis().map((emoji, index) => (
                                    <button
                                        key={`${emoji}-${index}`}
                                        onClick={() => handleEmojiSelect(emoji)}
                                        className={`p-2 text-xl rounded-lg hover:bg-muted transition-colors ${
                                            currentIcon === emoji ? "bg-primary/10" : ""
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "upload" && (
                    <div className="p-6">
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-3 p-6">
                                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                                <p className="text-sm text-muted-foreground">Uploading...</p>
                            </div>
                        ) : (
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground">
                                            Upload icon
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            PNG, JPG up to 1MB
                                        </p>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
