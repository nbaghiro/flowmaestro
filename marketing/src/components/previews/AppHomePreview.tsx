import React from "react";
import {
    IconAgents,
    IconAttach,
    IconKnowledge,
    IconPersonas,
    IconSend,
    IconWorkflows
} from "./icons";
import { PreviewRail } from "./PreviewRail";

interface BlockProps {
    icon: React.ReactNode;
    title: string;
    text: string;
    cta: string;
}

const Block: React.FC<BlockProps> = ({ icon, title, text, cta }) => (
    <div className="block">
        {icon}
        <p style={{ fontWeight: 600, fontSize: 14 }}>{title}</p>
        <p style={{ fontSize: 12, color: "#9b9ba3" }}>{text}</p>
        <span className="btn b2" style={{ marginTop: "auto", border: 0 }}>
            {cta}
        </span>
    </div>
);

/** The home screen on first open: a composer and the four building blocks. */
export const AppHomePreview: React.FC = () => (
    <div className="pv" style={{ gridTemplateColumns: "232px 1fr" }}>
        <PreviewRail active="chat" credits="250 / 250" chevron settings />
        <main
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 48px",
                gap: 28
            }}
        >
            <div className="dotfield" />
            <div
                style={{
                    position: "relative",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10
                }}
            >
                <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.03em" }}>
                    What should we automate?
                </h1>
                <p style={{ color: "#9b9ba3", fontSize: 15 }}>
                    Describe it. We will turn it into a workflow, an agent, or a persona you can
                    keep.
                </p>
            </div>
            <div className="composer" style={{ padding: "16px 16px 12px" }}>
                <p style={{ color: "#6f6f78", fontSize: 15, padding: "4px 4px 30px" }}>
                    Review every GitHub pull request and post a summary in Slack…
                </p>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10
                    }}
                >
                    <span className="chip lg" style={{ padding: "6px 10px" }}>
                        <IconAttach size={14} />
                        Attach
                    </span>
                    <span className="btn b1" style={{ width: 34, padding: 0 }}>
                        <IconSend color="#0b0b0d" strokeWidth={2.5} />
                    </span>
                </div>
            </div>
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 8
                }}
            >
                <span className="chip lg">Qualify new leads from a Google Sheet</span>
                <span className="chip lg">Weekly regulatory digest to Slack</span>
                <span className="chip lg">Answer support emails with our docs</span>
            </div>
            <div style={{ position: "relative", width: "100%", maxWidth: 760 }}>
                <p
                    className="mono"
                    style={{
                        fontSize: 11,
                        color: "#6f6f78",
                        letterSpacing: ".08em",
                        marginBottom: 10
                    }}
                >
                    BUILDING BLOCKS
                </p>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 10
                    }}
                >
                    <Block
                        icon={<IconWorkflows size={18} color="#fafafa" strokeWidth={1.8} />}
                        title="Workflows"
                        text="Deterministic steps on a canvas."
                        cta="Set up"
                    />
                    <Block
                        icon={<IconAgents size={18} color="#fafafa" strokeWidth={1.8} />}
                        title="Agents"
                        text="Chat with tools and memory."
                        cta="Set up"
                    />
                    <Block
                        icon={<IconKnowledge size={18} color="#fafafa" strokeWidth={1.8} />}
                        title="Knowledge bases"
                        text="Documents your agents can cite."
                        cta="Set up"
                    />
                    <Block
                        icon={<IconPersonas size={18} color="#fafafa" strokeWidth={1.8} />}
                        title="Personas"
                        text="Brief a specialist, get a file."
                        cta="Browse 38"
                    />
                </div>
            </div>
        </main>
    </div>
);
