import React from "react";
import { cn } from "../../lib/utils";
import {
    FmMark,
    IconBolt,
    IconBranch,
    IconChat,
    IconFit,
    IconInputs,
    IconIntegrations,
    IconLock,
    IconOut,
    IconOutputs,
    IconSearch,
    IconSparkle,
    IconSparkles,
    IconTools
} from "./icons";

interface NodeProps {
    left: number;
    top: number;
    height: number;
    icon: React.ReactNode;
    label: string;
    status?: "ok" | "run" | "idle";
    selected?: boolean;
    handles: React.ReactNode;
    children: React.ReactNode;
}

const Node: React.FC<NodeProps> = ({
    left,
    top,
    height,
    icon,
    label,
    status = "idle",
    selected,
    handles,
    children
}) => (
    <div className={cn("node", selected && "sel")} style={{ left, top, height }}>
        <div className="hd">
            <span className="ic">{icon}</span>
            <span className="lb">{label}</span>
            <span className={cn("st", status !== "idle" && status)} />
        </div>
        <div className="bd">{children}</div>
        {handles}
    </div>
);

const Row: React.FC<{ k: string; v: string; mono?: boolean }> = ({ k, v, mono }) => (
    <div className="row">
        <span>{k}</span>
        <b className={mono ? "mono" : undefined}>{v}</b>
    </div>
);

const Field: React.FC<{
    label: string;
    mono?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
}> = ({ label, mono, children, style }) => (
    <div className="field">
        <span className="lb">{label}</span>
        <div className={mono ? "v mono" : "v"} style={mono ? { fontSize: 12, ...style } : style}>
            {children}
        </div>
    </div>
);

const PROMPT =
    "Summarise the change in two lines and flag risks: security, migrations, breaking API changes. Output JSON with summary and riskLevel.";

/** The workflow builder: node library rail, canvas with a running node, inspector and run strip. */
export const AppWorkflowPreview: React.FC = () => (
    <div
        className="pv"
        style={{ gridTemplateColumns: "48px 1fr 384px", gridTemplateRows: "56px 1fr 52px" }}
    >
        <header
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                borderBottom: "1px solid #18181c"
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FmMark size={24} />
                <span style={{ color: "#9b9ba3", fontSize: 13 }}>Workflows</span>
                <span style={{ color: "#4a4a52" }}>/</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>PR summaries to Slack</span>
                <span className="chip">
                    <span
                        style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }}
                    />
                    Active
                </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="chip mono">saved 12 s ago</span>
                <span className="btn b2" style={{ padding: "0 14px" }}>
                    Test run
                </span>
                <span className="btn b1" style={{ padding: "0 14px" }}>
                    Publish
                </span>
            </div>
        </header>

        <nav
            style={{
                borderRight: "1px solid #18181c",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 0"
            }}
        >
            <span className="ico on">
                <IconSearch />
            </span>
            <span className="ico">
                <IconInputs />
            </span>
            <span className="ico">
                <IconOutputs />
            </span>
            <span className="ico">
                <IconSparkles />
            </span>
            <span className="ico">
                <IconIntegrations />
            </span>
            <span className="ico">
                <IconBranch />
            </span>
            <span className="ico">
                <IconTools />
            </span>
            <span className="ico" style={{ marginTop: "auto" }}>
                <IconChat />
            </span>
        </nav>

        <section style={{ position: "relative", overflow: "hidden", background: "#0b0b0d" }}>
            <div className="canvasdots" />
            <div className="zoom">
                <svg
                    width="1340"
                    height="720"
                    viewBox="0 0 1340 720"
                    style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                    aria-hidden="true"
                >
                    <path className="edge" d="M300 222 C 320 222, 320 222, 340 222" />
                    <path className="edge sel" d="M600 222 C 620 222, 620 222, 640 222" />
                    <path className="edge" d="M900 202 C 920 202, 920 112, 940 112" />
                    <path className="edge" d="M900 242 C 920 242, 920 342, 940 342" />
                </svg>

                <Node
                    left={40}
                    top={170}
                    height={104}
                    icon={<IconBolt size={13} strokeWidth={2.2} />}
                    label="Pull request opened"
                    status="ok"
                    handles={<span className="h out" />}
                >
                    <Row k="Provider" v="GitHub" />
                    <Row k="Event" v="pull_request.opened" mono />
                </Node>

                <Node
                    left={340}
                    top={147}
                    height={150}
                    icon={<IconSparkle size={13} strokeWidth={2.2} />}
                    label="Review the diff"
                    status="run"
                    selected
                    handles={
                        <>
                            <span className="h in" />
                            <span className="h out" style={{ borderColor: "#fafafa" }} />
                        </>
                    }
                >
                    <Row k="Provider" v="Anthropic" />
                    <Row k="Model" v="claude-sonnet-4-5" mono />
                    <p className="pvw">{PROMPT}</p>
                </Node>

                <Node
                    left={640}
                    top={154}
                    height={136}
                    icon={<IconBranch size={13} strokeWidth={2.2} />}
                    label="Risk found?"
                    handles={
                        <>
                            <span className="h in" />
                            <span className="h t" />
                            <span className="h f" />
                        </>
                    }
                >
                    <p className="mono" style={{ color: "#c6c6cc", fontSize: 11 }}>
                        {'{{review.riskLevel}} != "low"'}
                    </p>
                    <div className="row" style={{ color: "#c6c6cc" }}>
                        <span>✓ True</span>
                        <span style={{ color: "#6f6f78" }}>Post to Slack</span>
                    </div>
                    <div className="row" style={{ color: "#c6c6cc" }}>
                        <span>✗ False</span>
                        <span style={{ color: "#6f6f78" }}>Done</span>
                    </div>
                </Node>

                <Node
                    left={940}
                    top={60}
                    height={104}
                    icon={<IconIntegrations size={13} strokeWidth={2.2} />}
                    label="Post to #eng-reviews"
                    handles={
                        <>
                            <span className="h in" />
                            <span className="h out" />
                        </>
                    }
                >
                    <Row k="Provider" v="Slack" />
                    <Row k="Action" v="chat.postMessage" mono />
                </Node>

                <Node
                    left={940}
                    top={300}
                    height={84}
                    icon={<IconOut size={13} strokeWidth={2.2} />}
                    label="Done"
                    handles={<span className="h in" />}
                >
                    <Row k="Returns" v="{{review.summary}}" mono />
                </Node>
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 16,
                    bottom: 16,
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid #2a2a30",
                    borderRadius: 8,
                    background: "#0e0e12",
                    overflow: "hidden"
                }}
            >
                <span className="ctl">+</span>
                <span className="ctl">−</span>
                <span className="ctl">
                    <IconFit size={12} strokeWidth={2.2} />
                </span>
                <span className="ctl">
                    <IconLock size={12} strokeWidth={2.2} />
                </span>
            </div>
        </section>

        <aside
            style={{
                borderLeft: "1px solid #18181c",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #18181c"
                }}
            >
                <span style={{ fontWeight: 600, fontSize: 14 }}>Node configuration</span>
                <span style={{ color: "#9b9ba3", fontSize: 18, lineHeight: 1 }}>×</span>
            </div>
            <div
                style={{
                    padding: "12px 16px",
                    background: "#0e0e12",
                    borderBottom: "1px solid #18181c",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                }}
            >
                <span
                    className="mono"
                    style={{ fontSize: 10, color: "#6f6f78", letterSpacing: ".08em" }}
                >
                    NODE NAME
                </span>
                <div
                    style={{
                        height: 34,
                        borderRadius: 8,
                        background: "#121216",
                        border: "1px solid #2a2a30",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 10px",
                        fontSize: 13,
                        color: "#fafafa"
                    }}
                >
                    Review the diff
                    <span
                        className="chip mono"
                        style={{ padding: "2px 7px", fontSize: 10, color: "#9b9ba3" }}
                    >
                        llm
                    </span>
                </div>
            </div>
            <div
                style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    overflow: "hidden",
                    flex: 1
                }}
            >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="PROVIDER">Anthropic</Field>
                    <Field label="CONNECTION" style={{ justifyContent: "space-between" }}>
                        Workspace key<span style={{ color: "#9b9ba3" }}>✓</span>
                    </Field>
                </div>
                <Field label="MODEL" mono>
                    claude-sonnet-4-5-20250929
                </Field>
                <Field
                    label="PROMPT"
                    style={{
                        minHeight: 92,
                        alignItems: "flex-start",
                        padding: "8px 10px",
                        lineHeight: 1.5
                    }}
                >
                    {PROMPT}
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="TEMPERATURE" mono>
                        0.2
                    </Field>
                    <Field label="MAX TOKENS" mono>
                        1200
                    </Field>
                </div>
                <Field
                    label="TOOLS"
                    style={{ minHeight: "auto", padding: "8px 10px", gap: 6, flexWrap: "wrap" }}
                >
                    <span className="chip mono">github_getPullRequest</span>
                    <span className="chip mono">github_listFiles</span>
                </Field>
                <Field label="OUTPUT VARIABLE" mono>
                    review
                </Field>
                <p
                    className="mono"
                    style={{ marginTop: "auto", fontSize: 11, color: "#6f6f78", lineHeight: 1.5 }}
                >
                    {"downstream nodes can use {{review.summary}} and {{review.riskLevel}}"}
                </p>
            </div>
        </aside>

        <footer
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                borderTop: "1px solid #18181c",
                fontSize: 13
            }}
        >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="chip">
                    <span
                        style={{ width: 6, height: 6, borderRadius: "50%", background: "#fafafa" }}
                    />
                    Running · 6.2 s
                </span>
                <span className="chip mono">run #4,812</span>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span className="mono" style={{ color: "#9b9ba3", fontSize: 12 }}>
                    credits this month 238 / 250
                </span>
                <div
                    style={{
                        width: 120,
                        height: 5,
                        borderRadius: 999,
                        background: "#1f1f25",
                        overflow: "hidden"
                    }}
                >
                    <div style={{ width: "95%", height: "100%", background: "#6f6f78" }} />
                </div>
            </div>
        </footer>
    </div>
);
