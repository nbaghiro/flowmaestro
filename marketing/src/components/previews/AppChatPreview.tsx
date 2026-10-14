import React from "react";
import { FmMark, IconSend } from "./icons";
import { PreviewRail } from "./PreviewRail";

/** Chat turning a request into a workflow proposal. */
export const AppChatPreview: React.FC = () => (
    <div className="pv" style={{ gridTemplateColumns: "232px 1fr" }}>
        <PreviewRail
            active="chat"
            counts={{ workflows: 1 }}
            credits="238 / 250"
            recent={["PR summaries to Slack"]}
        />
        <main style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 22,
                    padding: "36px 0 0",
                    flex: 1,
                    width: "100%",
                    maxWidth: 760,
                    margin: "0 auto",
                    overflow: "hidden"
                }}
            >
                <div className="bubble">
                    Review every GitHub pull request on flowmaestro/app and post a two-line summary
                    with risks in #eng-reviews.
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ flex: "none", display: "inline-flex" }}>
                        <FmMark size={28} />
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                        <p style={{ fontSize: 15, lineHeight: 1.55, color: "#c6c6cc" }}>
                            This is a recurring job with fixed steps, so a workflow fits best.
                        </p>

                        <div
                            className="card"
                            style={{
                                padding: "18px 20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 16
                            }}
                        >
                            <span style={{ fontWeight: 600, fontSize: 14 }}>
                                PR summaries to Slack
                            </span>
                            <div className="step">
                                <span>GitHub: PR opened</span>
                                <i />
                                <span>Agent: review the diff</span>
                                <i />
                                <span>Risk found?</span>
                                <i />
                                <span>Slack: #eng-reviews</span>
                            </div>
                            <p style={{ fontSize: 13, color: "#9b9ba3" }}>
                                GitHub is connected. Slack needs to be connected before the first
                                run.
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="btn b1" style={{ height: 36, padding: "0 14px" }}>
                                    Create workflow
                                </span>
                                <span className="btn b3" style={{ height: 36, padding: "0 14px" }}>
                                    Run once first
                                </span>
                            </div>
                        </div>

                        <p className="alt">
                            Build it as a <b>workflow</b>, an <u>agent</u> or a <u>persona</u>.
                        </p>
                        <p style={{ fontSize: 14, color: "#9b9ba3" }}>
                            Want it to also label the PR by risk
                            <span className="cursor" />
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "16px 0 24px" }}>
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
                        Reply, or refine the plan…
                    </span>
                    <span className="btn b1" style={{ width: 34, height: 34, padding: 0 }}>
                        <IconSend color="#0b0b0d" strokeWidth={2.5} />
                    </span>
                </div>
            </div>
        </main>
    </div>
);
