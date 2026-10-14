import React from "react";
import { useFitScene } from "../../hooks/useFitScene";

export interface PipelineStep {
    /** Mono category label, for example "TRIGGER" or "ACTION · HUBSPOT". */
    k: string;
    /** The step's name. */
    v: string;
}

interface MiniPipelineProps {
    steps: PipelineStep[];
    /** Seconds to offset this scene's loop so neighbouring tiles do not run in step. */
    delay?: number;
    /** Stage height in scene pixels before scaling. */
    height?: number;
    /** Largest scale the scene may grow to. */
    max?: number;
}

const NODE_W = 124;
const NODE_H = 44;
const GAP = 41;

/** The builder tile's run, generalised: a short chain of nodes the run lights up one by one. */
export const MiniPipeline: React.FC<MiniPipelineProps> = ({
    steps,
    delay = 0,
    height = 96,
    max = 1
}) => {
    const sceneW = steps.length * NODE_W + (steps.length - 1) * GAP;
    const [stageRef, scale, offset] = useFitScene(sceneW, max);
    const top = (height - NODE_H) / 2;
    const mid = height / 2;
    // The run reaches the first node at 1.4 s and crosses each wire in a little over a second,
    // the same pace as the builder tile.
    const hitAt = (index: number): number => delay + 1.4 + index * 1.1;
    const travelFrom = NODE_W;
    const travelTo = sceneW - NODE_W;
    const start = 1.4 / 7;
    const end = (1.4 + (steps.length - 1) * 1.1) / 7;

    return (
        <div ref={stageRef} className="stage dotgrid" style={{ height: height * scale }}>
            <div
                className="fx"
                style={{
                    width: sceneW,
                    height,
                    transform: `translateX(${offset}px) scale(${scale})`,
                    transformOrigin: "0 0"
                }}
            >
                <svg
                    width={sceneW}
                    height={height}
                    viewBox={`0 0 ${sceneW} ${height}`}
                    className="absolute left-0 top-0"
                    aria-hidden="true"
                >
                    {steps.slice(0, -1).map((_, index) => {
                        const x = (index + 1) * NODE_W + index * GAP;
                        return (
                            <path
                                key={index}
                                className="mpwire"
                                d={`M${x} ${mid} H${x + GAP}`}
                                stroke="#4a4a52"
                                strokeWidth="1.5"
                                style={{ animationDelay: `${hitAt(index) + 0.1}s` }}
                            />
                        );
                    })}
                    {steps.length > 1 && (
                        <>
                            <circle r="10" fill="#fafafa" opacity="0.16">
                                <animateMotion
                                    dur="7s"
                                    begin={`${delay}s`}
                                    repeatCount="indefinite"
                                    path={`M${travelFrom} ${mid} H${travelTo}`}
                                    keyPoints="0;0;1;1"
                                    keyTimes={`0;${start};${end};1`}
                                    calcMode="linear"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0;0.16;0.16;0;0"
                                    keyTimes={`0;${start - 0.01};${start};${end};${end + 0.02};1`}
                                    dur="7s"
                                    begin={`${delay}s`}
                                    repeatCount="indefinite"
                                />
                            </circle>
                            <circle r="4" fill="#fafafa">
                                <animateMotion
                                    dur="7s"
                                    begin={`${delay}s`}
                                    repeatCount="indefinite"
                                    path={`M${travelFrom} ${mid} H${travelTo}`}
                                    keyPoints="0;0;1;1"
                                    keyTimes={`0;${start};${end};1`}
                                    calcMode="linear"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0;1;1;0;0"
                                    keyTimes={`0;${start - 0.01};${start};${end};${end + 0.02};1`}
                                    dur="7s"
                                    begin={`${delay}s`}
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </>
                    )}
                </svg>
                {steps.map((step, index) => (
                    <div
                        key={step.k + step.v}
                        className="fxnode hit"
                        style={{
                            left: index * (NODE_W + GAP),
                            top,
                            animationDelay: `${hitAt(index)}s`
                        }}
                    >
                        <span className="k">{step.k}</span>
                        {step.v}
                    </div>
                ))}
            </div>
        </div>
    );
};
