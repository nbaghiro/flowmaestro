interface Props {
    targetType: "workflow" | "agent";
    targetName: string;
}

export function TargetDisplay({ targetType, targetName }: Props) {
    return (
        <div className="rounded-md border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Target</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {targetType === "workflow" ? "Workflow" : "Agent"}
                </span>
                <span>— {targetName}</span>
            </div>
        </div>
    );
}
