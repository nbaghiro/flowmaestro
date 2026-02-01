import {
    FileText,
    HelpCircle,
    GraduationCap,
    Building2,
    BookOpen,
    Scale,
    TrendingUp,
    Code,
    Plus,
    type LucideIcon
} from "lucide-react";
import { KB_CATEGORIES, type KBCategory } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { KBChunkMosaicPreview } from "./KBChunkMosaicPreview";

interface KBCategoryPickerProps {
    selectedCategory: string | null;
    onSelect: (categoryId: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
    FileText,
    HelpCircle,
    GraduationCap,
    Building2,
    BookOpen,
    Scale,
    TrendingUp,
    Code,
    Plus
};

function getCategoryBorderColor(color: string, isSelected: boolean): string {
    if (!isSelected) return "border-border/50 hover:border-border";

    const colorMap: Record<string, string> = {
        blue: "border-blue-500",
        emerald: "border-emerald-500",
        violet: "border-violet-500",
        amber: "border-amber-500",
        cyan: "border-cyan-500",
        rose: "border-rose-500",
        orange: "border-orange-500",
        purple: "border-purple-500",
        gray: "border-gray-400"
    };
    return colorMap[color] || "border-primary";
}

function getCategoryTextColor(color: string): string {
    const colorMap: Record<string, string> = {
        blue: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        violet: "text-violet-600 dark:text-violet-400",
        amber: "text-amber-600 dark:text-amber-400",
        cyan: "text-cyan-600 dark:text-cyan-400",
        rose: "text-rose-600 dark:text-rose-400",
        orange: "text-orange-600 dark:text-orange-400",
        purple: "text-purple-600 dark:text-purple-400",
        gray: "text-gray-500"
    };
    return colorMap[color] || "text-foreground";
}

function CategoryCard({
    category,
    isSelected,
    onSelect
}: {
    category: KBCategory;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const Icon = iconMap[category.icon] || FileText;
    const borderColor = getCategoryBorderColor(category.color, isSelected);
    const textColor = getCategoryTextColor(category.color);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex flex-col rounded-lg border-2 transition-all duration-150 overflow-hidden",
                "bg-card hover:bg-card/80",
                borderColor,
                isSelected && "ring-2 ring-offset-2 ring-offset-background",
                isSelected && category.color === "blue" && "ring-blue-500/50",
                isSelected && category.color === "emerald" && "ring-emerald-500/50",
                isSelected && category.color === "violet" && "ring-violet-500/50",
                isSelected && category.color === "amber" && "ring-amber-500/50",
                isSelected && category.color === "cyan" && "ring-cyan-500/50",
                isSelected && category.color === "rose" && "ring-rose-500/50",
                isSelected && category.color === "orange" && "ring-orange-500/50",
                isSelected && category.color === "purple" && "ring-purple-500/50",
                isSelected && category.color === "gray" && "ring-gray-400/50"
            )}
        >
            {/* Mosaic Preview */}
            <KBChunkMosaicPreview
                categoryId={category.id}
                color={category.color}
                height="h-20"
                animated={isSelected}
            />

            {/* Content */}
            <div className="p-3 flex items-center gap-2.5">
                <div
                    className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-md",
                        "bg-muted/50"
                    )}
                >
                    <Icon className={cn("w-4 h-4", textColor)} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-sm font-medium text-foreground truncate">
                        {category.name}
                    </h3>
                </div>
            </div>
        </button>
    );
}

export function KBCategoryPicker({ selectedCategory, onSelect }: KBCategoryPickerProps) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {KB_CATEGORIES.map((category) => (
                <CategoryCard
                    key={category.id}
                    category={category}
                    isSelected={selectedCategory === category.id}
                    onSelect={() => onSelect(category.id)}
                />
            ))}
        </div>
    );
}
