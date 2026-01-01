const PRESET_COLORS = [
    "#000000",
    "#1f2937",
    "#374151",
    "#6b7280",
    "#9ca3af",
    "#d1d5db",
    "#ffffff",

    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899"
];

interface Props {
    value?: string;
    onChange: (value: string) => void;
}

export function ColorPalette({ value, onChange }: Props) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Color palette</label>

            <div className="grid grid-cols-7 gap-2">
                {PRESET_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onChange(color)}
                        className={`h-8 w-8 rounded border ${
                            value === color ? "ring-2 ring-primary ring-offset-1" : ""
                        }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
        </div>
    );
}
