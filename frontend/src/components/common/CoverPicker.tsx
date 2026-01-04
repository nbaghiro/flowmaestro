import { X, Upload, Image, Search, Loader2, Plus } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import type { FormInterfaceCoverType, ChatInterfaceCoverType } from "@flowmaestro/shared";
import { logger } from "../../lib/logger";

// Generic cover type that works for both form and chat interfaces
type CoverType = FormInterfaceCoverType | ChatInterfaceCoverType;

interface CoverPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: CoverType, value: string) => void;
    currentType?: CoverType;
    currentValue?: string;
}

interface UnsplashPhoto {
    id: string;
    urls: {
        regular: string;
        small: string;
    };
    alt_description: string | null;
    user: {
        name: string;
        links: {
            html: string;
        };
    };
}

// Preset color palette
const COLOR_PALETTE = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#ef4444", // Red
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#84cc16", // Lime
    "#22c55e", // Green
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#64748b" // Slate
];

// Stock images gallery organized by category
const STOCK_IMAGES = {
    Abstract: [
        "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=800&h=400&fit=crop"
    ],
    Nature: [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=400&fit=crop"
    ],
    Minimal: [
        "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop"
    ],
    Gradients: [
        "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1557682260-96773eb01377?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=800&h=400&fit=crop"
    ]
};

type TabType = "gallery" | "upload";

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

export function CoverPicker({
    isOpen,
    onClose,
    onSelect,
    currentType,
    currentValue
}: CoverPickerProps) {
    const [activeTab, setActiveTab] = useState<TabType>("gallery");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UnsplashPhoto[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState("#6366f1");
    const customColorRef = useRef<HTMLDivElement>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setHasSearched(false);
            setActiveTab("gallery");
            setShowCustomColorPicker(false);
        }
    }, [isOpen]);

    // Close custom color picker when clicking outside
    useEffect(() => {
        if (!showCustomColorPicker) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (customColorRef.current && !customColorRef.current.contains(event.target as Node)) {
                setShowCustomColorPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showCustomColorPicker]);

    const searchUnsplash = useCallback(async (query: string) => {
        if (!query.trim() || !UNSPLASH_ACCESS_KEY) return;

        setIsSearching(true);
        setHasSearched(true);

        try {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=12`,
                {
                    headers: {
                        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to search Unsplash");
            }

            const data = await response.json();
            setSearchResults(data.results || []);
        } catch (error) {
            logger.error("Unsplash search failed", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            setIsSearching(false);
            return;
        }

        // Show loading state immediately when query changes
        setIsSearching(true);
        setHasSearched(true);

        const timeoutId = setTimeout(() => {
            searchUnsplash(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchUnsplash]);

    if (!isOpen) return null;

    const handleColorSelect = (color: string) => {
        onSelect("color", color);
        onClose();
    };

    const handleCustomColorSelect = () => {
        onSelect("color", customColor);
        setShowCustomColorPicker(false);
        onClose();
    };

    const handleImageSelect = (url: string) => {
        onSelect("stock", url);
        onClose();
    };

    const handleUnsplashSelect = (photo: UnsplashPhoto) => {
        // Use the regular size URL with crop parameters for cover photos
        const url = `${photo.urls.regular}&w=800&h=400&fit=crop`;
        onSelect("stock", url);
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // For now, create a local URL - in production this would upload to server
        const url = URL.createObjectURL(file);
        onSelect("image", url);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Choose Cover</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 px-4 pt-4 border-b border-border">
                    <button
                        onClick={() => setActiveTab("gallery")}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "gallery"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Image className="w-4 h-4 inline mr-2" />
                        Gallery
                    </button>
                    <button
                        onClick={() => setActiveTab("upload")}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "upload"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {activeTab === "gallery" && (
                        <div className="space-y-6">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={
                                        UNSPLASH_ACCESS_KEY
                                            ? "Search Unsplash photos..."
                                            : "Search disabled (no API key)"
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    disabled={!UNSPLASH_ACCESS_KEY}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                                )}
                            </div>

                            {/* Search Results / Loading State */}
                            {hasSearched && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-foreground">
                                            {isSearching ? "Searching..." : "Search Results"}
                                        </h4>
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSearchResults([]);
                                                setHasSearched(false);
                                                setIsSearching(false);
                                            }}
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {/* Loading skeleton */}
                                    {isSearching && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[...Array(8)].map((_, index) => (
                                                <div
                                                    key={index}
                                                    className="aspect-[2/1] rounded-lg bg-muted animate-pulse"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Actual results */}
                                    {!isSearching && searchResults.length > 0 && (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {searchResults.map((photo) => (
                                                    <button
                                                        key={photo.id}
                                                        onClick={() => handleUnsplashSelect(photo)}
                                                        className="relative aspect-[2/1] rounded-lg overflow-hidden transition-all hover:scale-105 group"
                                                    >
                                                        <img
                                                            src={photo.urls.small}
                                                            alt={
                                                                photo.alt_description ||
                                                                "Unsplash photo"
                                                            }
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {/* Attribution overlay */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-[10px] text-white truncate">
                                                                Photo by {photo.user.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Unsplash attribution */}
                                            <p className="text-[10px] text-muted-foreground text-center mt-3">
                                                Photos by{" "}
                                                <a
                                                    href="https://unsplash.com"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline hover:text-foreground"
                                                >
                                                    Unsplash
                                                </a>
                                            </p>
                                        </>
                                    )}

                                    {/* No results message */}
                                    {!isSearching && searchResults.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-muted-foreground">
                                                No photos found for "{searchQuery}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Colors - show when not searching or no results */}
                            {!hasSearched && (
                                <div>
                                    <h4 className="text-sm font-medium text-foreground mb-3">
                                        Solid Colors
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_PALETTE.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => handleColorSelect(color)}
                                                className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                                                    currentType === "color" &&
                                                    currentValue === color
                                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                                        : ""
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                        {/* Custom color picker */}
                                        <div className="relative" ref={customColorRef}>
                                            <button
                                                onClick={() =>
                                                    setShowCustomColorPicker(!showCustomColorPicker)
                                                }
                                                className={`w-10 h-10 rounded-lg transition-all hover:scale-110 border-2 border-dashed border-border hover:border-muted-foreground flex items-center justify-center ${
                                                    showCustomColorPicker
                                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                                        : ""
                                                }`}
                                                style={{
                                                    background:
                                                        "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)"
                                                }}
                                                title="Custom color"
                                            >
                                                <Plus className="w-4 h-4 text-white drop-shadow-md" />
                                            </button>
                                            {/* Custom color popover */}
                                            {showCustomColorPicker && (
                                                <div className="absolute top-12 left-0 z-10 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        Choose custom color
                                                    </p>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <input
                                                            type="color"
                                                            value={customColor}
                                                            onChange={(e) =>
                                                                setCustomColor(e.target.value)
                                                            }
                                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customColor}
                                                            onChange={(e) =>
                                                                setCustomColor(e.target.value)
                                                            }
                                                            className="flex-1 px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground font-mono uppercase"
                                                            placeholder="#000000"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() =>
                                                                setShowCustomColorPicker(false)
                                                            }
                                                            className="flex-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded border border-border hover:bg-muted transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleCustomColorSelect}
                                                            className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stock Images - show when not searching */}
                            {!hasSearched &&
                                Object.entries(STOCK_IMAGES).map(([category, images]) => (
                                    <div key={category}>
                                        <h4 className="text-sm font-medium text-foreground mb-3">
                                            {category}
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {images.map((url, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleImageSelect(url)}
                                                    className={`relative aspect-[2/1] rounded-lg overflow-hidden transition-all hover:scale-105 ${
                                                        currentType === "stock" &&
                                                        currentValue === url
                                                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                                            : ""
                                                    }`}
                                                >
                                                    <img
                                                        src={url}
                                                        alt={`${category} ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {activeTab === "upload" && (
                        <div className="py-4">
                            <label className="cursor-pointer block">
                                <div className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors">
                                    <Upload className="w-12 h-12 text-muted-foreground" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground">
                                            Click to upload an image
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            PNG, JPG, GIF up to 5MB
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
