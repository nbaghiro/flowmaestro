import React from "react";
import { getProviderLogoUrl } from "@flowmaestro/shared";
import { PIXEL_FRAMES, PIXEL_GRID, pixelCells } from "../brand/PixelMark";
import { IconChat } from "../previews/icons";
import { Reveal } from "./Reveal";

/** Isometric plane: a square in local space becomes a rhombus 1.732 wide by 1 tall. */
const ISO = "matrix(0.866 0.5 -0.866 0.5 0 0)";

interface ChipProps {
    cx: number;
    cy: number;
    size: number;
    strong?: boolean;
    children?: React.ReactNode;
}

/** Two stacked plates in the isometric plane, with a face drawn in that plane on top. */
const Chip: React.FC<ChipProps> = ({ cx, cy, size, strong, children }) => {
    const half = size / 2;
    const rx = size * 0.2;
    return (
        <g transform={`translate(${cx} ${cy})`}>
            <g transform={`translate(0 ${size * 0.14}) ${ISO}`}>
                <rect
                    x={-half}
                    y={-half}
                    width={size}
                    height={size}
                    rx={rx}
                    fill="#0b0b0d"
                    stroke="#2a2a30"
                />
            </g>
            <g transform={ISO}>
                <rect
                    x={-half}
                    y={-half}
                    width={size}
                    height={size}
                    rx={rx}
                    fill="#121216"
                    stroke={strong ? "#6f6f78" : "#3a3a42"}
                />
                {children}
            </g>
        </g>
    );
};

const Logo: React.FC<{ domain: string; size: number }> = ({ domain, size }) => (
    <image
        href={getProviderLogoUrl(domain)}
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        style={{ borderRadius: 6 }}
    />
);

/** A small isometric cube that travels along a wire. */
const Packet: React.FC<{ path: string; dur: number; begin: number; s?: number }> = ({
    path,
    dur,
    begin,
    s = 7
}) => {
    const w = s * 0.866;
    return (
        <g className="pkt">
            <polygon points={`0,${-s} ${w},${-s / 2} 0,0 ${-w},${-s / 2}`} fill="#fafafa" />
            <polygon points={`${-w},${-s / 2} 0,0 0,${s} ${-w},${s / 2}`} fill="#9b9ba3" />
            <polygon points={`0,0 ${w},${-s / 2} ${w},${s / 2} 0,${s}`} fill="#5c5c64" />
            <animateMotion
                dur={`${dur}s`}
                begin={`${begin}s`}
                repeatCount="indefinite"
                path={path}
            />
        </g>
    );
};

interface Wire {
    d: string;
    dur: number;
    begin: number;
}

const INPUTS: Wire[] = [
    { d: "M362 150 C 420 150, 430 238, 478 244", dur: 5.2, begin: 0 },
    { d: "M362 250 C 410 250, 430 250, 476 250", dur: 4.6, begin: 1.7 },
    { d: "M362 350 C 420 350, 430 262, 478 256", dur: 5.6, begin: 3.1 },
    { d: "M362 480 C 440 480, 440 276, 482 262", dur: 6.2, begin: 0.9 }
];

const OUTPUTS: Wire[] = [
    { d: "M724 244 C 770 238, 780 150, 838 150", dur: 5.4, begin: 2.2 },
    { d: "M726 250 C 770 250, 790 250, 838 250", dur: 4.8, begin: 0.4 },
    { d: "M724 256 C 770 262, 780 350, 838 350", dur: 5.8, begin: 3.6 }
];

const DOWN = "M582 332 L582 486";
const UP = "M618 486 L618 332";

const CELL = 4;

/** The pixel mark laid flat on the centre chip, conducting like the one in the hero. */
const FlatMark: React.FC = () => (
    <g
        className="pm live"
        transform={`translate(${(-CELL * PIXEL_GRID) / 2} ${(-CELL * PIXEL_GRID) / 2})`}
    >
        {PIXEL_FRAMES.map((frame, index) => (
            <g key={index} className={`f f${index + 1}`}>
                {pixelCells(frame).map((cell) => (
                    <rect
                        key={`${cell.x}-${cell.y}`}
                        x={cell.x * CELL}
                        y={cell.y * CELL}
                        width={CELL}
                        height={CELL}
                        fill={cell.fill}
                    />
                ))}
            </g>
        ))}
    </g>
);

const BOARD_ROWS = [
    { done: true, w: 120 },
    { done: true, w: 96 },
    { done: false, w: 132 },
    { done: false, w: 84 }
];

export const ArchitectureSection: React.FC = () => (
    <section id="architecture" className="sec overflow-x-clip">
        <div className="wrap flex flex-col items-center">
            <Reveal>
                <h2 className="h2">One runtime between your apps and the models.</h2>
            </Reveal>
            <Reveal>
                <p className="lead">
                    Events come in from the tools you already use. FlowMaestro drafts the steps,
                    runs them durably and meters every model call.
                </p>
            </Reveal>
            <Reveal className="bleed overflow-x-auto">
                <svg
                    className="iso"
                    viewBox="0 0 1200 720"
                    role="img"
                    aria-label="Diagram: Slack, GitHub, Gmail and your own app feed events into FlowMaestro, which calls Anthropic, OpenAI and Gemini models and records every run durably"
                >
                    <defs>
                        <pattern
                            id="iso-grid"
                            width="69.28"
                            height="40"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M0 0 L69.28 40 M0 40 L69.28 0"
                                stroke="#fafafa"
                                strokeOpacity="0.045"
                                strokeWidth="1"
                                fill="none"
                            />
                        </pattern>
                        <radialGradient id="iso-fade" cx="50%" cy="45%" r="60%">
                            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                        </radialGradient>
                        <mask id="iso-mask">
                            <rect width="1200" height="720" fill="url(#iso-fade)" />
                        </mask>
                    </defs>
                    <rect width="1200" height="720" fill="url(#iso-grid)" mask="url(#iso-mask)" />

                    {/* wires */}
                    {INPUTS.map((wire) => (
                        <path key={wire.d} className="wire" d={wire.d} />
                    ))}
                    {OUTPUTS.map((wire) => (
                        <path key={wire.d} className="wire" d={wire.d} />
                    ))}
                    <path className="dash" d={DOWN} />
                    <path className="dash" d={UP} />
                    <path className="arrow" d="M577 480 L582 487 L587 480" />
                    <path className="arrow" d="M613 338 L618 331 L623 338" />

                    {/* column labels */}
                    <text className="lbl" x="300" y="100" textAnchor="middle">
                        APPS YOU CONNECT
                    </text>
                    <text className="lbl" x="300" y="434" textAnchor="middle">
                        WORK YOU DESCRIBE
                    </text>
                    <text className="lbl" x="900" y="100" textAnchor="middle">
                        MODELS
                    </text>
                    <text className="lbl" x="552" y="414" textAnchor="end">
                        RUNS
                    </text>
                    <text className="lbl" x="648" y="414">
                        RESULTS
                    </text>

                    {/* left: apps */}
                    <Chip cx={300} cy={150} size={70}>
                        <Logo domain="slack.com" size={30} />
                    </Chip>
                    <text className="name" x="228" y="157" textAnchor="end">
                        Slack
                    </text>
                    <Chip cx={300} cy={250} size={70}>
                        <Logo domain="github.com" size={30} />
                    </Chip>
                    <text className="name" x="228" y="257" textAnchor="end">
                        GitHub
                    </text>
                    <Chip cx={300} cy={350} size={70}>
                        <Logo domain="gmail.com" size={30} />
                    </Chip>
                    <text className="name" x="228" y="357" textAnchor="end">
                        Gmail
                    </text>
                    <text className="sub" x="228" y="384" textAnchor="end">
                        and 110+ more
                    </text>
                    <Chip cx={300} cy={480} size={70}>
                        <g transform="translate(-9 -9)">
                            <IconChat size={18} color="#fafafa" strokeWidth={1.8} />
                        </g>
                    </Chip>
                    <text className="name" x="228" y="487" textAnchor="end">
                        Chat
                    </text>
                    <text className="sub" x="228" y="514" textAnchor="end">
                        or your app · API and webhooks
                    </text>

                    {/* centre */}
                    <text className="title" x="600" y="64" textAnchor="middle">
                        FlowMaestro
                    </text>
                    <text className="lbl tagline" x="600" y="94" textAnchor="middle">
                        DRAFTS · RUNS DURABLY · METERS EVERY CALL
                    </text>
                    <Chip cx={600} cy={250} size={150} strong>
                        <FlatMark />
                    </Chip>

                    {/* right: models */}
                    <Chip cx={900} cy={150} size={70}>
                        <Logo domain="anthropic.com" size={30} />
                    </Chip>
                    <text className="name" x="972" y="157">
                        Anthropic
                    </text>
                    <Chip cx={900} cy={250} size={70}>
                        <Logo domain="openai.com" size={30} />
                    </Chip>
                    <text className="name" x="972" y="257">
                        OpenAI
                    </text>
                    <Chip cx={900} cy={350} size={70}>
                        <Logo domain="google.com" size={30} />
                    </Chip>
                    <text className="name" x="972" y="357">
                        Gemini
                    </text>
                    <text className="sub" x="972" y="384">
                        or your own keys
                    </text>

                    {/* bottom: durable runs */}
                    <Chip cx={600} cy={590} size={190}>
                        {BOARD_ROWS.map((row, index) => (
                            <g key={index} transform={`translate(-70 ${-66 + index * 34})`}>
                                <rect
                                    width="12"
                                    height="12"
                                    rx="2"
                                    fill={row.done ? "#fafafa" : "none"}
                                    stroke={row.done ? "none" : "#6f6f78"}
                                />
                                <rect
                                    x="22"
                                    y="5"
                                    width={row.w}
                                    height="2"
                                    fill={row.done ? "#4a4a52" : "#2a2a30"}
                                />
                            </g>
                        ))}
                    </Chip>
                    <circle cx="804" cy="551" r="4" fill="#34d399" />
                    <text className="title" x="820" y="558">
                        Durable runs
                    </text>
                    <text className="lbl" x="820" y="596">
                        SURVIVES FAILURES
                    </text>
                    <text className="lbl" x="820" y="624">
                        RETRIES EACH STEP
                    </text>
                    <text className="lbl" x="820" y="652">
                        KEEPS THE AUDIT TRAIL
                    </text>

                    {/* packets */}
                    {INPUTS.map((wire) => (
                        <Packet key={wire.d} path={wire.d} dur={wire.dur} begin={wire.begin} />
                    ))}
                    {OUTPUTS.map((wire) => (
                        <Packet key={wire.d} path={wire.d} dur={wire.dur} begin={wire.begin} />
                    ))}
                    <Packet path={DOWN} dur={3.4} begin={0.6} s={6} />
                    <Packet path={UP} dur={3.4} begin={2.3} s={6} />
                </svg>
            </Reveal>
        </div>
    </section>
);
