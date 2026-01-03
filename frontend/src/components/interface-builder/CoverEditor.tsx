import { useState } from "react";

import { ColorPalette } from "./ColorPalete";
import { ColorPicker } from "./ColorPicker";
import { ImageUploader } from "./ImageUploader";
import { StockPhotoSearch } from "./StockPhotoSearch";

export type CoverType = "color" | "palette" | "image" | "stock";

interface Props {
    coverType?: CoverType;
    coverColor?: string;
    coverImageUrl?: string;
    onImageFileSelect?: (file: File) => void;
    disabled?: boolean;

    onChange: (value: {
        coverType: CoverType;
        coverColor?: string;
        coverImageUrl?: string;
    }) => void;
}

export function CoverEditor({
    coverType = "color",
    coverColor,
    coverImageUrl,
    onChange,
    onImageFileSelect,
    disabled = false
}: Props) {
    const [mode, setMode] = useState<CoverType>(coverType);

    function update(
        values: Partial<{
            coverType: CoverType;
            coverColor?: string;
            coverImageUrl?: string;
        }>
    ) {
        onChange({
            coverType: values.coverType ?? mode,
            coverColor: values.coverColor ?? coverColor,
            coverImageUrl: values.coverImageUrl ?? coverImageUrl
        });
    }

    function changeMode(next: CoverType) {
        setMode(next);
        update({ coverType: next });
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Cover</h3>

            {/* Mode selector */}
            <div className="flex gap-3">
                {(["color", "palette", "image", "stock"] as CoverType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => changeMode(t)}
                        className={`rounded-md border border-border px-3 py-1.5 text-sm ${
                            mode === t
                                ? "bg-muted font-medium text-foreground"
                                : "bg-card text-muted-foreground"
                        }`}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Active editor */}
            {mode === "color" && (
                <ColorPicker
                    value={coverColor}
                    onChange={(color) => update({ coverColor: color })}
                />
            )}

            {mode === "palette" && (
                <ColorPalette
                    value={coverColor}
                    onChange={(color) => update({ coverColor: color })}
                />
            )}

            {mode === "image" && (
                <ImageUploader
                    value={coverImageUrl}
                    onChange={(url) => update({ coverImageUrl: url })}
                    onFileSelect={onImageFileSelect}
                    disabled={disabled}
                />
            )}

            {mode === "stock" && (
                <StockPhotoSearch
                    value={coverImageUrl}
                    onSelect={(url) => update({ coverImageUrl: url })}
                />
            )}
        </div>
    );
}
