import { Check, Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "../common/Dialog";

interface AvatarPickerPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (avatarUrl: string) => void;
    currentAvatarUrl: string | null;
    personaName: string;
}

// Seed words for generating diverse avatars
const SEED_WORDS = [
    "alex",
    "jordan",
    "taylor",
    "morgan",
    "casey",
    "riley",
    "avery",
    "quinn",
    "parker",
    "skyler",
    "sage",
    "river",
    "blake",
    "cameron",
    "harper",
    "logan",
    "emma",
    "olivia",
    "ava",
    "sophia",
    "isabella",
    "mia",
    "charlotte",
    "amelia",
    "liam",
    "noah",
    "oliver",
    "elijah",
    "james",
    "william",
    "benjamin",
    "lucas",
    "henry",
    "alexander",
    "mason",
    "michael",
    "ethan",
    "daniel",
    "matthew",
    "aiden",
    "luna",
    "aria",
    "penelope",
    "chloe",
    "layla",
    "aurora",
    "ivy",
    "hazel",
    "violet",
    "stella",
    "nova",
    "willow",
    "scarlett",
    "maya",
    "elena",
    "nora",
    "leo",
    "jack",
    "hudson",
    "lincoln",
    "julian",
    "asher",
    "david",
    "joseph",
    "john",
    "owen",
    "samuel",
    "sebastian",
    "levi",
    "isaac",
    "ryan",
    "nathan",
    "zoe",
    "lily",
    "hannah",
    "ellie",
    "natalie",
    "paisley",
    "audrey",
    "brooklyn",
    "leah",
    "savannah",
    "claire",
    "skylar",
    "lucy",
    "paislee",
    "anna",
    "caroline",
    "genesis",
    "aaliyah",
    "kennedy",
    "kinsley",
    "allison",
    "maya",
    "sarah",
    "madelyn"
];

// Avatar styles available in DiceBear
const AVATAR_STYLES = ["lorelei", "avataaars", "bottts", "micah", "notionists", "personas"];

function generateAvatarUrl(seed: string, style: string = "lorelei"): string {
    const params = new URLSearchParams({
        seed: seed,
        backgroundColor: "f0f0f0"
    });
    return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

function generateAvatarBatch(startIndex: number, count: number, style: string): string[] {
    const avatars: string[] = [];
    for (let i = 0; i < count; i++) {
        const index = startIndex + i;
        // Combine seed words and index for variety
        const seedWord = SEED_WORDS[index % SEED_WORDS.length];
        const seed =
            index < SEED_WORDS.length
                ? seedWord
                : `${seedWord}${Math.floor(index / SEED_WORDS.length)}`;
        avatars.push(generateAvatarUrl(seed, style));
    }
    return avatars;
}

const BATCH_SIZE = 24;

export const AvatarPickerPopup: React.FC<AvatarPickerPopupProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentAvatarUrl,
    personaName
}) => {
    const [selectedUrl, setSelectedUrl] = useState<string | null>(currentAvatarUrl);
    const [avatars, setAvatars] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedStyle, setSelectedStyle] = useState("lorelei");
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedUrl(currentAvatarUrl);
            setAvatars(generateAvatarBatch(0, BATCH_SIZE, selectedStyle));
            setHasMore(true);
        }
    }, [isOpen, currentAvatarUrl, selectedStyle]);

    // Load more avatars
    const loadMore = useCallback(() => {
        if (loading || !hasMore) return;

        setLoading(true);
        // Simulate slight delay for smoother UX
        setTimeout(() => {
            const newAvatars = generateAvatarBatch(avatars.length, BATCH_SIZE, selectedStyle);
            setAvatars((prev) => [...prev, ...newAvatars]);
            // Limit to prevent infinite memory growth
            if (avatars.length + BATCH_SIZE >= 500) {
                setHasMore(false);
            }
            setLoading(false);
        }, 100);
    }, [avatars.length, loading, hasMore, selectedStyle]);

    // Intersection observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [loadMore, hasMore, loading]);

    // Handle style change
    const handleStyleChange = (style: string) => {
        setSelectedStyle(style);
        setAvatars(generateAvatarBatch(0, BATCH_SIZE, style));
        setHasMore(true);
        // Scroll to top when changing styles
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    const handleApply = () => {
        if (selectedUrl) {
            onSelect(selectedUrl);
        }
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Choose Avatar"
            description="Select an avatar from the gallery below"
            size="2xl"
            maxHeight="80vh"
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={!selectedUrl}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Apply
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Style selector */}
                <div className="flex flex-wrap gap-2">
                    {AVATAR_STYLES.map((style) => (
                        <button
                            key={style}
                            onClick={() => handleStyleChange(style)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
                                selectedStyle === style
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>

                {/* Avatar grid */}
                <div
                    ref={scrollContainerRef}
                    className="h-[400px] overflow-y-auto border border-border rounded-lg p-4"
                >
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {avatars.map((url, index) => (
                            <button
                                key={`${selectedStyle}-${index}`}
                                onClick={() => setSelectedUrl(url)}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                                    selectedUrl === url
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-transparent hover:border-border"
                                }`}
                            >
                                <img
                                    src={url}
                                    alt={`Avatar option ${index + 1}`}
                                    className="w-full h-full object-cover bg-muted"
                                    loading="lazy"
                                />
                                {selectedUrl === url && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="bg-primary rounded-full p-1">
                                            <Check className="w-3 h-3 text-primary-foreground" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Load more trigger */}
                    <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-4">
                        {loading && (
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        )}
                        {!hasMore && avatars.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                                No more avatars to load
                            </span>
                        )}
                    </div>
                </div>

                {/* Preview */}
                {selectedUrl && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <img
                            src={selectedUrl}
                            alt={`${personaName} avatar preview`}
                            className="w-16 h-16 rounded-xl border border-border"
                        />
                        <div className="text-sm font-medium text-foreground">{personaName}</div>
                    </div>
                )}
            </div>
        </Dialog>
    );
};
