import { useInView } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { useFitScene } from "../../hooks/useFitScene";
import { HomePageEvents } from "../../lib/analytics";
import { Reveal } from "./Reveal";
import { Tile } from "./Tile";

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="font-mono text-[11px] text-dim mb-2">{children}</p>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-[22px] font-semibold">{children}</h3>
);

const SCENE_W = 635;
const SCENE_H = 150;

const STREAMED_WORDS = [
    "Three",
    "leads",
    "stand",
    "out.",
    "Two",
    "replied",
    "to",
    "the",
    "proposal",
    "this",
    "week."
];

/** The seven feature tiles with their looping animations. */
export const FeatureBento: React.FC = () => {
    const [stageRef, sceneScale, sceneOffset] = useFitScene(SCENE_W, 1.45);
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    const tracked = useRef(false);

    useEffect(() => {
        if (inView && !tracked.current) {
            HomePageEvents.featuresSectionViewed();
            tracked.current = true;
        }
    }, [inView]);

    return (
        <section id="features" ref={ref} className="sec">
            <div className="wrap bento">
                <Reveal className="span4">
                    <Tile className="min-h-[260px] flex flex-col gap-[18px]">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <Label>VISUAL WORKFLOW BUILDER</Label>
                                <Title>Drag, drop, run.</Title>
                            </div>
                            <span className="chip runchip font-mono">
                                <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path d="M6 4l14 8-14 8z" />
                                </svg>
                                run
                            </span>
                        </div>
                        <div
                            ref={stageRef}
                            className="stage dotgrid mt-auto"
                            style={{ height: SCENE_H * sceneScale }}
                        >
                            <div
                                className="fx"
                                style={{
                                    transform: `translateX(${sceneOffset}px) scale(${sceneScale})`,
                                    transformOrigin: "0 0"
                                }}
                            >
                                <svg
                                    width="635"
                                    height="150"
                                    viewBox="0 0 635 150"
                                    className="absolute left-0 top-0"
                                    aria-hidden="true"
                                >
                                    <path
                                        className="wire1"
                                        d="M124 75 H165"
                                        stroke="#4a4a52"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        className="wire2"
                                        d="M289 75 H330"
                                        stroke="#4a4a52"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        className="e3"
                                        d="M454 75 H495"
                                        stroke="#4a4a52"
                                        strokeWidth="1.5"
                                    />
                                    <circle r="10" fill="#fafafa" opacity="0.16">
                                        <animateMotion
                                            dur="7s"
                                            repeatCount="indefinite"
                                            path="M124 75 H495"
                                            keyPoints="0;0;1;1"
                                            keyTimes="0;0.2;0.55;1"
                                            calcMode="linear"
                                        />
                                        <animate
                                            attributeName="opacity"
                                            values="0;0;0.16;0.16;0;0"
                                            keyTimes="0;0.19;0.2;0.55;0.57;1"
                                            dur="7s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                    <circle r="4" fill="#fafafa">
                                        <animateMotion
                                            dur="7s"
                                            repeatCount="indefinite"
                                            path="M124 75 H495"
                                            keyPoints="0;0;1;1"
                                            keyTimes="0;0.2;0.55;1"
                                            calcMode="linear"
                                        />
                                        <animate
                                            attributeName="opacity"
                                            values="0;0;1;1;0;0"
                                            keyTimes="0;0.19;0.2;0.55;0.57;1"
                                            dur="7s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                </svg>
                                <div
                                    className="fxnode hit"
                                    style={{ left: 0, top: 53, animationDelay: "1.4s" }}
                                >
                                    <span className="k">TRIGGER</span>Webhook
                                </div>
                                <div
                                    className="fxnode hit"
                                    style={{ left: 165, top: 53, animationDelay: "1.67s" }}
                                >
                                    <span className="k">AGENT</span>Qualify lead
                                </div>
                                <div
                                    className="fxnode hit"
                                    style={{ left: 330, top: 53, animationDelay: "2.76s" }}
                                >
                                    <span className="k">CONDITION</span>Score &gt; 70
                                </div>
                                <div className="drop">
                                    <div className="fxnode hit" style={{ animationDelay: "3.85s" }}>
                                        <span className="k">ACTION · HUBSPOT</span>Create deal
                                    </div>
                                    <svg
                                        className="cur"
                                        width="14"
                                        height="16"
                                        viewBox="0 0 14 16"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M1 1l12 7-5 1.5L5 15z"
                                            fill="#fafafa"
                                            stroke="#0b0b0d"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Tile>
                </Reveal>

                <Reveal className="span2">
                    <Tile className="min-h-[260px] flex flex-col gap-4">
                        <div>
                            <Label>DURABLE EXECUTION</Label>
                            <Title>Survives failures.</Title>
                        </div>
                        <div className="stage flex items-center mt-auto" style={{ height: 64 }}>
                            <svg
                                className="w-full block"
                                style={{ height: 60 }}
                                viewBox="0 0 286 60"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M0 30 H58 L66 30 L74 8 L82 52 L90 30 H150 L158 30 L166 12 L174 48 L182 30 H286"
                                    fill="none"
                                    stroke="#1f1f25"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <path
                                    className="ecg"
                                    pathLength={100}
                                    d="M0 30 H58 L66 30 L74 8 L82 52 L90 30 H150 L158 30 L166 12 L174 48 L182 30 H286"
                                    fill="none"
                                    stroke="#fafafa"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                        </div>
                        <div className="flex flex-col gap-[7px]">
                            <div className="logline" style={{ animationDelay: "0s" }}>
                                <i style={{ background: "#f87171" }} />
                                12:04:07 · step 3 · api timeout
                            </div>
                            <div className="logline" style={{ animationDelay: ".7s" }}>
                                <i style={{ background: "#fbbf24" }} />
                                12:04:08 · retry 2/3 · backoff 1.2 s
                            </div>
                            <div className="logline" style={{ animationDelay: "1.4s" }}>
                                <i style={{ background: "#34d399" }} />
                                12:04:09 · resumed · state intact
                            </div>
                        </div>
                        <p className="text-[13px] text-muted-foreground">Powered by Temporal.</p>
                    </Tile>
                </Reveal>

                <Reveal className="span2">
                    <Tile className="min-h-[250px] flex flex-col gap-4">
                        <div>
                            <Label>AI AGENT ORCHESTRATION</Label>
                            <Title>Streams as it thinks.</Title>
                        </div>
                        <div className="stage p-[14px] flex flex-col gap-[10px] flex-1">
                            <div className="flex gap-1.5 flex-wrap">
                                <span
                                    className="chip pop font-mono gap-1.5"
                                    style={{ fontSize: 11, animationDelay: ".3s" }}
                                >
                                    <span className="text-ok">✓</span>hubspot_listContacts
                                </span>
                                <span
                                    className="chip pop font-mono gap-1.5"
                                    style={{ fontSize: 11, animationDelay: ".9s" }}
                                >
                                    <span className="text-ok">✓</span>web_search
                                </span>
                            </div>
                            <p className="text-sm leading-[1.55]" style={{ color: "#e4e4e8" }}>
                                {STREAMED_WORDS.map((word, index) => (
                                    <span
                                        key={word + index}
                                        className="w"
                                        style={{
                                            animationDelay: `${(1.5 + index * 0.17).toFixed(2)}s`
                                        }}
                                    >
                                        {word}{" "}
                                    </span>
                                ))}
                                <span className="caret" />
                            </p>
                        </div>
                    </Tile>
                </Reveal>

                <Reveal className="span2">
                    <Tile className="min-h-[250px] flex flex-col gap-4">
                        <div>
                            <Label>PERSONAS</Label>
                            <Title>Brief it. Get the file.</Title>
                        </div>
                        <div className="stage p-[14px] flex flex-col gap-3 flex-1 justify-center">
                            <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground">
                                <span>Competitor gap analysis</span>
                                <span
                                    className="chip approve font-mono"
                                    style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        borderColor: "#fbbf24",
                                        color: "#fbbf24"
                                    }}
                                >
                                    approve 40 credits?
                                </span>
                            </div>
                            <div className="pbar">
                                <i />
                            </div>
                            <span
                                className="chip file self-start gap-2"
                                style={{ borderColor: "#34d399" }}
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    aria-hidden="true"
                                >
                                    <path d="M6 3h8l4 4v14H6zM14 3v4h4" />
                                </svg>
                                gap-analysis.docx<span className="text-ok">ready</span>
                            </span>
                        </div>
                    </Tile>
                </Reveal>

                <Reveal className="span2">
                    <Tile className="min-h-[250px] flex flex-col gap-4">
                        <div>
                            <Label>SMART ROUTING</Label>
                            <Title>Right executor, every step.</Title>
                        </div>
                        <div className="stage flex-1 flex items-center p-2">
                            <svg
                                className="w-full h-auto block"
                                viewBox="0 0 286 110"
                                aria-hidden="true"
                            >
                                <path
                                    d="M72 55 C 120 55, 120 25, 172 25 H 206"
                                    fill="none"
                                    stroke="#2a2a30"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M72 55 C 120 55, 120 85, 172 85 H 206"
                                    fill="none"
                                    stroke="#2a2a30"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="0"
                                    y="43"
                                    width="72"
                                    height="24"
                                    rx="8"
                                    fill="#121216"
                                    stroke="#2a2a30"
                                />
                                <text
                                    x="36"
                                    y="59"
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill="#fafafa"
                                >
                                    request
                                </text>
                                <rect
                                    x="206"
                                    y="13"
                                    width="80"
                                    height="24"
                                    rx="8"
                                    fill="#121216"
                                    stroke="#2a2a30"
                                />
                                <text
                                    x="246"
                                    y="29"
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill="#fafafa"
                                >
                                    deterministic
                                </text>
                                <rect
                                    x="206"
                                    y="73"
                                    width="80"
                                    height="24"
                                    rx="8"
                                    fill="#121216"
                                    stroke="#fafafa"
                                />
                                <text
                                    x="246"
                                    y="89"
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill="#fafafa"
                                >
                                    agent
                                </text>
                                <circle r="3.5" fill="#fafafa">
                                    <animateMotion
                                        dur="2.4s"
                                        repeatCount="indefinite"
                                        path="M72 55 C 120 55, 120 25, 172 25 H 206"
                                    />
                                </circle>
                                <circle r="3.5" opacity="0" fill="#9b9ba3">
                                    <set attributeName="opacity" to="1" begin="1.2s" />
                                    <animateMotion
                                        dur="2.4s"
                                        begin="1.2s"
                                        repeatCount="indefinite"
                                        path="M72 55 C 120 55, 120 85, 172 85 H 206"
                                    />
                                </circle>
                            </svg>
                        </div>
                    </Tile>
                </Reveal>

                <Reveal className="span3">
                    <Tile className="flex flex-col gap-4">
                        <div>
                            <Label>UNIFIED ORCHESTRATION</Label>
                            <Title>Agents trigger workflows. Workflows delegate to agents.</Title>
                        </div>
                        <div className="stage mt-auto">
                            <svg
                                className="w-full h-auto block"
                                viewBox="0 0 461 120"
                                aria-hidden="true"
                            >
                                <defs>
                                    <marker
                                        id="lp-arrow"
                                        viewBox="0 0 10 10"
                                        refX="8"
                                        refY="5"
                                        markerWidth="7"
                                        markerHeight="7"
                                        orient="auto"
                                    >
                                        <path d="M0 0L10 5L0 10z" fill="#4a4a52" />
                                    </marker>
                                </defs>
                                <path
                                    d="M164 50 H 290"
                                    stroke="#4a4a52"
                                    strokeWidth="1.5"
                                    markerEnd="url(#lp-arrow)"
                                />
                                <path
                                    d="M297 70 H 171"
                                    stroke="#4a4a52"
                                    strokeWidth="1.5"
                                    markerEnd="url(#lp-arrow)"
                                />
                                <text
                                    x="230"
                                    y="41"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#6f6f78"
                                    fontFamily="IBM Plex Mono, monospace"
                                    letterSpacing="1"
                                >
                                    TRIGGERS
                                </text>
                                <text
                                    x="230"
                                    y="88"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#6f6f78"
                                    fontFamily="IBM Plex Mono, monospace"
                                    letterSpacing="1"
                                >
                                    DELEGATES
                                </text>
                                <rect
                                    x="24"
                                    y="35"
                                    width="140"
                                    height="50"
                                    rx="12"
                                    fill="#121216"
                                    stroke="#2a2a30"
                                />
                                <text
                                    x="40"
                                    y="54"
                                    fontSize="9"
                                    fill="#6f6f78"
                                    fontFamily="IBM Plex Mono, monospace"
                                    letterSpacing="1"
                                >
                                    AGENT
                                </text>
                                <text x="40" y="72" fontSize="13" fontWeight="600" fill="#fafafa">
                                    Sales Assistant
                                </text>
                                <rect
                                    x="297"
                                    y="35"
                                    width="140"
                                    height="50"
                                    rx="12"
                                    fill="#121216"
                                    stroke="#2a2a30"
                                />
                                <text
                                    x="313"
                                    y="54"
                                    fontSize="9"
                                    fill="#6f6f78"
                                    fontFamily="IBM Plex Mono, monospace"
                                    letterSpacing="1"
                                >
                                    WORKFLOW
                                </text>
                                <text x="313" y="72" fontSize="13" fontWeight="600" fill="#fafafa">
                                    Enrich and notify
                                </text>
                                <circle r="3.5" fill="#fafafa">
                                    <animateMotion
                                        dur="2s"
                                        repeatCount="indefinite"
                                        path="M164 50 H 290"
                                    />
                                </circle>
                                <circle r="3.5" fill="#9b9ba3" opacity="0">
                                    <set attributeName="opacity" to="1" begin="1s" />
                                    <animateMotion
                                        dur="2s"
                                        begin="1s"
                                        repeatCount="indefinite"
                                        path="M297 70 H 171"
                                    />
                                </circle>
                            </svg>
                        </div>
                    </Tile>
                </Reveal>

                <Reveal className="span3">
                    <Tile className="flex flex-col gap-4">
                        <div>
                            <Label>CREDITS</Label>
                            <Title>One meter for all of it.</Title>
                        </div>
                        <div className="flex items-center gap-[22px] mt-auto">
                            <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
                                <circle
                                    cx="52"
                                    cy="52"
                                    r="44"
                                    fill="none"
                                    stroke="#1f1f25"
                                    strokeWidth="10"
                                />
                                <circle
                                    className="gauge"
                                    cx="52"
                                    cy="52"
                                    r="44"
                                    fill="none"
                                    stroke="#fafafa"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    pathLength={100}
                                    transform="rotate(-90 52 52)"
                                />
                            </svg>
                            <div className="flex flex-col gap-3 flex-1">
                                <p className="text-4xl font-bold tracking-[-0.03em] leading-none">
                                    <span data-count="84">84</span>
                                    <span className="text-sm text-dim font-medium">
                                        {" "}
                                        / 250 this month
                                    </span>
                                </p>
                                <div className="seg">
                                    <i
                                        style={
                                            {
                                                ["--w" as string]: "49%",
                                                background: "#fafafa"
                                            } as React.CSSProperties
                                        }
                                    />
                                    <i
                                        style={
                                            {
                                                ["--w" as string]: "37%",
                                                background: "#6f6f78"
                                            } as React.CSSProperties
                                        }
                                    />
                                    <i
                                        style={
                                            {
                                                ["--w" as string]: "14%",
                                                background: "#34d399"
                                            } as React.CSSProperties
                                        }
                                    />
                                </div>
                                <div className="font-mono flex gap-[14px] flex-wrap text-[11px] text-muted-foreground">
                                    <span>
                                        <i className="dot" style={{ background: "#fafafa" }} />
                                        workflows 41
                                    </span>
                                    <span>
                                        <i className="dot" style={{ background: "#6f6f78" }} />
                                        agents 31
                                    </span>
                                    <span>
                                        <i className="dot" style={{ background: "#34d399" }} />
                                        personas 12
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Tile>
                </Reveal>
            </div>
        </section>
    );
};
