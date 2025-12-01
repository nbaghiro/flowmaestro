interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
}

export function Slider({ value, onChange, min, max, step }: SliderProps) {
    return (
        <div className="flex items-center gap-3">
            <input
                type="range"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                min={min}
                max={max}
                step={step}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm font-mono w-12 text-right">{value}</span>
        </div>
    );
}
