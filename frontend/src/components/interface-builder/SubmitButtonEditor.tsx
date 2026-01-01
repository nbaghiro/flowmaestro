interface Props {
    value: string;
    onChange: (value: string) => void;
}

export function SubmitButtonEditor({ value, onChange }: Props) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Submit button text</label>

            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Submit"
                className="w-full rounded-md border px-3 py-2 text-sm"
            />

            <p className="text-xs text-muted-foreground">
                Text shown on the submit button in the public interface.
            </p>
        </div>
    );
}
