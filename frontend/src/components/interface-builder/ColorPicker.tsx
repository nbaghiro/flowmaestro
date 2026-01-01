interface Props {
    value?: string;
    onChange: (value: string) => void;
}

export function ColorPicker({ value = "#000000", onChange }: Props) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Cover color</label>

            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border p-1"
                />

                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-28 rounded-md border px-2 py-1 text-sm"
                />
            </div>
        </div>
    );
}
