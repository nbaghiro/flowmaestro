import React from "react";
import { cn } from "../../lib/utils";
import {
    FmMark,
    IconAgents,
    IconChat,
    IconChevronDown,
    IconIntegrations,
    IconKnowledge,
    IconPlus,
    IconSettings,
    IconWorkflows
} from "./icons";

type RailKey = "chat" | "workflows" | "agents" | "knowledge";

interface PreviewRailProps {
    active: RailKey;
    counts?: Partial<Record<Exclude<RailKey, "chat">, number>>;
    credits: string;
    recent?: string[];
    chevron?: boolean;
    settings?: boolean;
}

interface RailItemProps {
    on: boolean;
    icon: React.ReactNode;
    label: string;
    count?: number;
}

const RailItem: React.FC<RailItemProps> = ({ on, icon, label, count }) => (
    <div className={cn("ri", on && "on")}>
        {icon}
        {label}
        {count !== undefined && <span className="n">{count}</span>}
    </div>
);

/** The 232 px navigation rail shared by the preview screens. */
export const PreviewRail: React.FC<PreviewRailProps> = ({
    active,
    counts = {},
    credits,
    recent,
    chevron,
    settings
}) => (
    <nav className="rail">
        <div className="ws">
            <FmMark size={24} />
            Personal Workspace
            {chevron && (
                <IconChevronDown size={12} color="#6f6f78" strokeWidth={2.5} className="ml-auto" />
            )}
        </div>
        <RailItem on={active === "chat"} icon={<IconChat />} label="Chat" />
        {counts.workflows !== undefined && (
            <RailItem
                on={active === "workflows"}
                icon={<IconWorkflows />}
                label="Workflows"
                count={counts.workflows}
            />
        )}
        {counts.agents !== undefined && (
            <RailItem
                on={active === "agents"}
                icon={<IconAgents />}
                label="Agents"
                count={counts.agents}
            />
        )}
        {counts.knowledge !== undefined && (
            <RailItem
                on={active === "knowledge"}
                icon={<IconKnowledge />}
                label="Knowledge"
                count={counts.knowledge}
            />
        )}
        <div className="ri add">
            <IconPlus />
            Add a building block
        </div>
        {recent && recent.length > 0 && (
            <>
                <p
                    className="mono"
                    style={{
                        marginTop: 18,
                        padding: "0 10px",
                        fontSize: 11,
                        color: "#6f6f78",
                        letterSpacing: ".08em"
                    }}
                >
                    RECENT
                </p>
                {recent.map((title) => (
                    <div key={title} className="ri" style={{ fontSize: 13 }}>
                        {title}
                    </div>
                ))}
            </>
        )}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="ri">
                <IconIntegrations />
                Integrations
            </div>
            {settings && (
                <div className="ri">
                    <IconSettings />
                    Settings
                </div>
            )}
            <div className="credits">
                <span>credits</span>
                <span>{credits}</span>
            </div>
        </div>
    </nav>
);
