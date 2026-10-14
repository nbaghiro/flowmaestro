import React from "react";
import { IconAgents, IconSend } from "./icons";
import { PreviewRail } from "./PreviewRail";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="field">
        <span className="lb">{label}</span>
        {children}
    </div>
);

/** An agent thread with its tools, knowledge and memory in a side panel. */
export const AppAgentPreview: React.FC = () => (
    <div className="pv" style={{ gridTemplateColumns: "232px 240px 1fr 300px" }}>
        <PreviewRail
            active="agents"
            counts={{ workflows: 3, agents: 2, knowledge: 1 }}
            credits="201 / 250"
        />

        <aside
            style={{
                borderRight: "1px solid #18181c",
                padding: "16px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 4
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 6px 10px"
                }}
            >
                <span style={{ fontWeight: 600, fontSize: 14 }}>Sales Assistant</span>
                <span className="btn b2" style={{ height: 28, padding: "0 10px" }}>
                    New
                </span>
            </div>
            <span className="thread on">Who should I call first this week?</span>
            <span className="thread">Halden Logistics renewal risks</span>
            <span className="thread">Draft the Brightwave proposal</span>
            <span className="thread">Q3 pipeline review</span>
            <p
                className="mono"
                style={{ marginTop: "auto", padding: "0 6px", fontSize: 11, color: "#6f6f78" }}
            >
                memory · 42 messages
            </p>
        </aside>

        <main style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    padding: "32px 36px 0",
                    flex: 1,
                    overflow: "hidden"
                }}
            >
                <div className="bubble" style={{ maxWidth: "70%" }}>
                    Who should I call first this week?
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span
                        style={{
                            flex: "none",
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#161619",
                            border: "1px solid #2a2a30",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <IconAgents size={14} color="#fafafa" />
                    </span>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            maxWidth: "78%"
                        }}
                    >
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span className="chip">
                                <span style={{ color: "#9b9ba3" }}>✓</span>hubspot_listContacts ·
                                0.8 s
                            </span>
                            <span className="chip">
                                <span style={{ color: "#9b9ba3" }}>✓</span>web_search · 1.4 s
                            </span>
                        </div>
                        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#e4e4e8" }}>
                            Three stand out. <strong>Halden Logistics</strong> asked for pricing for
                            42 seats on Tuesday. <strong>Brightwave</strong> opened the pricing page
                            four times since Monday. <strong>Meridian Health</strong> signed up
                            through the healthcare template you published last week and has not been
                            contacted
                            <span className="cursor" />
                        </p>
                    </div>
                </div>
            </div>
            <div style={{ padding: "16px 36px 24px" }}>
                <div
                    className="card"
                    style={{
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10
                    }}
                >
                    <span style={{ color: "#6f6f78", fontSize: 14, flex: 1 }}>
                        Message Sales Assistant…
                    </span>
                    <span className="btn b1" style={{ width: 34, padding: 0 }}>
                        <IconSend color="#0b0b0d" strokeWidth={2.5} />
                    </span>
                </div>
            </div>
        </main>

        <aside
            style={{
                borderLeft: "1px solid #18181c",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflow: "hidden"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Agent</span>
                <span className="btn b2" style={{ height: 28, padding: "0 10px" }}>
                    Edit
                </span>
            </div>
            <Field label="MODEL">
                <div className="tool">gpt-4.1 · OpenAI · your key</div>
            </Field>
            <Field label="TOOLS">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="tool">hubspot_listContacts</div>
                    <div className="tool">hubspot_getDeal</div>
                    <div className="tool">web_search</div>
                    <div className="tool" style={{ color: "#9b9ba3", borderStyle: "dashed" }}>
                        + add a tool
                    </div>
                </div>
            </Field>
            <Field label="KNOWLEDGE">
                <div className="tool">Sales playbook · 128 chunks</div>
            </Field>
            <Field label="MEMORY">
                <div className="tool">Across threads · 50 messages</div>
            </Field>
            <p className="mono" style={{ marginTop: "auto", fontSize: 11, color: "#6f6f78" }}>
                this thread · 1,880 tokens · 49 credits
            </p>
        </aside>
    </div>
);
