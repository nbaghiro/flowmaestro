import React from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { Tile } from "./Tile";

const POINTS = [
    {
        title: "Encrypted at rest and in transit",
        text: "AES-256 at rest, TLS 1.3 in transit, encrypted backups."
    },
    {
        title: "Identity and access",
        text: "Workspace roles, scoped connections, your own LLM keys."
    },
    { title: "Audit logging", text: "Every run, tool call and approval is recorded." },
    { title: "Network security", text: "WAF, DDoS mitigation, private network segmentation." }
];

export const SecuritySection: React.FC = () => (
    <section id="security" className="sec">
        <div className="wrap">
            <Reveal>
                <Tile
                    className="grid gap-6 p-8"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
                >
                    <div className="col-span-full">
                        <p className="font-mono text-[11px] text-dim mb-2">SECURITY</p>
                        <h3 className="text-2xl font-semibold">
                            Your data, your keys, your audit trail.
                        </h3>
                    </div>
                    {POINTS.map((point) => (
                        <div key={point.title}>
                            <p className="font-semibold mb-1">{point.title}</p>
                            <p className="text-sm text-muted-foreground">{point.text}</p>
                        </div>
                    ))}
                    <div className="col-span-full">
                        <Link
                            to="/security"
                            className="text-sm font-semibold underline underline-offset-4 decoration-edge hover:decoration-foreground"
                        >
                            Read the security overview
                        </Link>
                    </div>
                </Tile>
            </Reveal>
        </div>
    </section>
);
