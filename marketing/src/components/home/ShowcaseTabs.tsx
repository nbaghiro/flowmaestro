import { useInView } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { HomePageEvents } from "../../lib/analytics";
import { cn } from "../../lib/utils";
import { AppAgentPreview } from "../previews/AppAgentPreview";
import { AppChatPreview } from "../previews/AppChatPreview";
import { AppKnowledgePreview } from "../previews/AppKnowledgePreview";
import { AppWorkflowPreview } from "../previews/AppWorkflowPreview";
import { ScaledFrame } from "../previews/ScaledFrame";
import { Reveal } from "./Reveal";

type TabId = "chat" | "workflows" | "agents" | "knowledge";

interface Tab {
    id: TabId;
    label: string;
    text: string;
    frameLabel: string;
    Preview: React.FC;
}

const TABS: Tab[] = [
    {
        id: "chat",
        label: "Chat",
        text: "Describe the work. Chat proposes a workflow, an agent or a persona, and builds it when you say yes.",
        frameLabel:
            "Chat proposing a four-step workflow, PR summaries to Slack, with a Create workflow button",
        Preview: AppChatPreview
    },
    {
        id: "workflows",
        label: "Workflows",
        text: "Deterministic steps on a canvas. Triggers, branches, loops, code and human review, executed durably.",
        frameLabel:
            "The workflow builder with five connected nodes, one running, and the node configuration panel",
        Preview: AppWorkflowPreview
    },
    {
        id: "agents",
        label: "Agents",
        text: "Agents with tools, memory and your model keys. They can call workflows; workflows can call them.",
        frameLabel:
            "An agent thread answering which leads to call first, with its model, tools, knowledge and memory listed",
        Preview: AppAgentPreview
    },
    {
        id: "knowledge",
        label: "Knowledge",
        text: "Documents your agents can cite. Upload, index, test a query.",
        frameLabel:
            "A knowledge base listing six documents with chunk counts, and a test query showing three matched chunks",
        Preview: AppKnowledgePreview
    }
];

/** The product showcase: four tabs, each with a product screen. */
export const ShowcaseTabs: React.FC = () => {
    const [active, setActive] = useState<TabId>("chat");
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    const tracked = useRef(false);

    useEffect(() => {
        if (inView && !tracked.current) {
            HomePageEvents.productShowcaseViewed();
            tracked.current = true;
        }
    }, [inView]);

    const current = TABS.find((tab) => tab.id === active) ?? TABS[0];

    return (
        <section id="product" ref={ref} className="sec scroll-mt-20 overflow-x-clip">
            <div className="wrap flex flex-col items-center gap-7">
                <Reveal>
                    <h2 className="h2" style={{ marginBottom: 0 }}>
                        Start in chat. Keep what it builds.
                    </h2>
                </Reveal>
                <Reveal>
                    <div className="tabs" role="tablist" aria-label="Product areas">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                id={`tab-${tab.id}`}
                                aria-selected={tab.id === active}
                                aria-controls={`panel-${tab.id}`}
                                className={cn("tab", tab.id === active && "on")}
                                onClick={() => setActive(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </Reveal>
                <Reveal className="w-full flex flex-col items-center gap-4">
                    <div
                        role="tabpanel"
                        id={`panel-${current.id}`}
                        aria-labelledby={`tab-${current.id}`}
                        className="w-full flex flex-col items-center gap-4"
                    >
                        <p className="text-muted-foreground text-center max-w-[560px] leading-normal">
                            {current.text}
                        </p>
                        <div className="bleed">
                            <ScaledFrame label={current.frameLabel}>
                                <current.Preview />
                            </ScaledFrame>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
