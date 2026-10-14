import React from "react";
import { IconUpload } from "./icons";
import { PreviewRail } from "./PreviewRail";

interface DocRowProps {
    name: string;
    source: string;
    chunks: string;
    progress: number;
    added: string;
    selected?: boolean;
    indexing?: boolean;
}

const DocRow: React.FC<DocRowProps> = ({
    name,
    source,
    chunks,
    progress,
    added,
    selected,
    indexing
}) => (
    <tr className={selected ? "sel" : undefined}>
        <td>{name}</td>
        <td>{source}</td>
        <td className="mono" style={indexing ? { color: "#9b9ba3" } : undefined}>
            {chunks}
        </td>
        <td>
            <div className="bar">
                <i
                    style={{ width: `${progress}%`, background: indexing ? "#fafafa" : undefined }}
                />
            </div>
        </td>
        <td>{added}</td>
        <td className="mono" style={{ color: indexing ? "#9b9ba3" : "#6f6f78" }}>
            {indexing ? "indexing" : "…"}
        </td>
    </tr>
);

/** A knowledge base: its documents and a test query with the matched chunks. */
export const AppKnowledgePreview: React.FC = () => (
    <div className="pv" style={{ gridTemplateColumns: "232px 1fr 360px" }}>
        <PreviewRail
            active="knowledge"
            counts={{ workflows: 3, agents: 2, knowledge: 1 }}
            credits="201 / 250"
        />

        <main
            style={{
                display: "flex",
                flexDirection: "column",
                padding: "28px 32px",
                gap: 20,
                overflow: "hidden"
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>
                            Sales playbook
                        </h1>
                        <span className="chip">
                            <span
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: "#34d399"
                                }}
                            />
                            Ready
                        </span>
                    </div>
                    <p style={{ color: "#9b9ba3", fontSize: 13 }}>
                        6 documents · 128 chunks · used by Sales Assistant and 1 workflow
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <span className="btn b2">Test a query</span>
                    <span className="btn b1">Add documents</span>
                </div>
            </div>

            <div
                style={{
                    border: "1px dashed #2a2a30",
                    borderRadius: 14,
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#0e0e12"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: "#161619",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <IconUpload color="#fafafa" />
                    </span>
                    <p style={{ fontSize: 13, color: "#c6c6cc" }}>
                        Drop PDF, DOCX, Markdown or a URL. We chunk, embed and index it; your agents
                        can cite it.
                    </p>
                </div>
                <span className="chip mono">text-embedding-3-small</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>DOCUMENT</th>
                        <th>SOURCE</th>
                        <th>CHUNKS</th>
                        <th>INDEXED</th>
                        <th>ADDED</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    <DocRow
                        name="Discovery call script v4.pdf"
                        source="Upload"
                        chunks="31"
                        progress={100}
                        added="2 d ago"
                        selected
                    />
                    <DocRow
                        name="Pricing and packaging 2026.md"
                        source="Notion"
                        chunks="18"
                        progress={100}
                        added="2 d ago"
                    />
                    <DocRow
                        name="Objection handling.docx"
                        source="Google Drive"
                        chunks="24"
                        progress={100}
                        added="5 d ago"
                    />
                    <DocRow
                        name="Competitive notes, Q3"
                        source="Upload"
                        chunks="40"
                        progress={100}
                        added="1 w ago"
                    />
                    <DocRow
                        name="Security FAQ for buyers"
                        source="flowmaestro.ai/security"
                        chunks="9"
                        progress={100}
                        added="2 w ago"
                    />
                    <DocRow
                        name="Case study, Halden Logistics.pdf"
                        source="Upload"
                        chunks="6 / 11"
                        progress={55}
                        added="just now"
                        indexing
                    />
                </tbody>
            </table>
        </main>

        <aside
            style={{
                borderLeft: "1px solid #18181c",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                overflow: "hidden"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Test a query</span>
                <span className="chip mono">top 3</span>
            </div>
            <div
                className="card"
                style={{ borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "#fafafa" }}
            >
                What do we say when a buyer asks for a discount?
            </div>
            <div className="chunk">
                <b>OBJECTION HANDLING.DOCX · CHUNK 7 · 0.91</b>
                Never lead with a discount. Ask what <mark>budget</mark> the team approved and which
                seats are optional. Offer annual billing (two months free) before any{" "}
                <mark>price</mark> change.
            </div>
            <div className="chunk">
                <b>PRICING AND PACKAGING 2026.MD · CHUNK 3 · 0.84</b>
                Team plan is 99 per month for 25,000 credits. Volume <mark>discounts</mark> start at
                25 seats and require approval from the account lead.
            </div>
            <div className="chunk">
                <b>DISCOVERY CALL SCRIPT V4.PDF · CHUNK 12 · 0.77</b>
                If <mark>pricing</mark> comes up before the walkthrough, note it and return to it
                after the value section.
            </div>
            <p className="mono" style={{ marginTop: "auto", fontSize: 11, color: "#6f6f78" }}>
                hybrid search · 38 ms · 0 credits
            </p>
        </aside>
    </div>
);
