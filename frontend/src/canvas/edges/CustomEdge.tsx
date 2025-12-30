import { X } from "lucide-react";
import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from "reactflow";

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    markerEnd
}: EdgeProps) {
    const { setEdges } = useReactFlow();

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
    });

    const onDelete = (event: React.MouseEvent) => {
        event.stopPropagation();
        setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} />
            {selected && (
                <foreignObject
                    width={20}
                    height={20}
                    x={labelX - 10}
                    y={labelY - 10}
                    className="overflow-visible"
                    requiredExtensions="http://www.w3.org/1999/xhtml"
                >
                    <button
                        onClick={onDelete}
                        className="
                            w-5 h-5
                            flex items-center justify-center
                            bg-white dark:bg-gray-800
                            border border-gray-300 dark:border-gray-600
                            rounded-full
                            text-gray-500 dark:text-gray-400
                            hover:text-red-500 dark:hover:text-red-400
                            hover:border-red-300 dark:hover:border-red-500
                            cursor-pointer
                            transition-colors
                            shadow-sm
                        "
                    >
                        <X className="w-3 h-3" />
                    </button>
                </foreignObject>
            )}
        </>
    );
}
