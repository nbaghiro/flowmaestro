import React, { useMemo } from "react";
import { ALL_PROVIDERS, getProviderLogoUrl } from "@flowmaestro/shared";
import {
    IconBolt,
    IconBranch,
    IconChat,
    IconIntegrations,
    IconOut,
    IconSparkle,
    IconTools
} from "../previews/icons";

interface RawNode {
    id?: string;
    type: string;
    data?: { label?: string; provider?: string; integrationProvider?: string };
}

export interface RecipeDefinition {
    nodes?: Record<string, RawNode> | RawNode[];
    edges?: Array<{ source: string; target: string }>;
}

interface Step {
    id: string;
    kind: string;
    title: string;
    icon: React.ReactNode;
    logo?: string;
}

interface TemplateRecipeProps {
    definition: RecipeDefinition;
    /** Seconds to offset the run so neighbouring tiles do not light up together. */
    delay?: number;
    /** How many steps to show before counting the rest. */
    limit?: number;
}

const KIND: Record<string, string> = {
    input: "input",
    trigger: "trigger",
    files: "files",
    url: "url",
    audioInput: "audio",
    llm: "llm",
    vision: "vision",
    embeddings: "embeddings",
    knowledgeBaseQuery: "knowledge",
    imageGeneration: "image",
    videoGeneration: "video",
    router: "router",
    conditional: "condition",
    switch: "switch",
    loop: "loop",
    code: "code",
    wait: "wait",
    humanReview: "review",
    transform: "transform",
    http: "http",
    chartGeneration: "chart",
    spreadsheetGeneration: "spreadsheet",
    audioTranscription: "transcribe",
    ocrExtraction: "ocr",
    pdfGeneration: "pdf",
    pdfExtract: "pdf",
    screenshotCapture: "screenshot",
    webSearch: "web search",
    webBrowse: "browse",
    fileDownload: "download",
    fileRead: "read",
    fileWrite: "write",
    "shared-memory": "memory",
    database: "database",
    output: "output",
    templateOutput: "output",
    audioOutput: "audio",
    integration: "integration"
};

const PROVIDER_LOGOS = new Map(
    ALL_PROVIDERS.map((provider) => [provider.provider, provider.logoUrl] as const)
);

function iconFor(type: string): React.ReactNode {
    const size = 13;
    switch (type) {
        case "input":
        case "trigger":
        case "files":
        case "url":
        case "audioInput":
            return <IconBolt size={size} strokeWidth={2.2} />;
        case "router":
        case "conditional":
        case "switch":
        case "loop":
            return <IconBranch size={size} strokeWidth={2.2} />;
        case "integration":
            return <IconIntegrations size={size} strokeWidth={2.2} />;
        case "output":
        case "templateOutput":
        case "audioOutput":
            return <IconOut size={size} strokeWidth={2.2} />;
        case "humanReview":
            return <IconChat size={size} strokeWidth={2.2} />;
        case "code":
        case "http":
        case "transform":
        case "database":
        case "wait":
            return <IconTools size={size} strokeWidth={2.2} />;
        default:
            return <IconSparkle size={size} strokeWidth={2.2} />;
    }
}

/** Walks the template's main path from its entry node and describes each step. */
function recipe(definition: RecipeDefinition, limit: number): { steps: Step[]; hidden: number } {
    const raw: RawNode[] = Array.isArray(definition.nodes)
        ? definition.nodes
        : Object.entries(definition.nodes ?? {}).map(([key, node]) => ({ id: key, ...node }));
    const usable = raw.filter((node) => node.type !== "comment" && node.id);
    if (usable.length === 0) return { steps: [], hidden: 0 };
    const byId = new Map(usable.map((node) => [node.id as string, node]));
    const edges = (definition.edges ?? []).filter(
        (edge) => byId.has(edge.source) && byId.has(edge.target)
    );
    const hasIncoming = new Set(edges.map((edge) => edge.target));
    const entry =
        usable.find(
            (node) =>
                !hasIncoming.has(node.id as string) &&
                (node.type === "input" || node.type === "trigger")
        ) ??
        usable.find((node) => !hasIncoming.has(node.id as string)) ??
        usable[0];

    const ordered: RawNode[] = [];
    const seen = new Set<string>();
    let current: RawNode | undefined = entry;
    while (current && !seen.has(current.id as string)) {
        seen.add(current.id as string);
        ordered.push(current);
        const next = edges.find((edge) => edge.source === current?.id);
        current = next ? byId.get(next.target) : undefined;
    }
    // Pad with the remaining nodes so short paths still fill the list
    usable.forEach((node) => {
        if (!seen.has(node.id as string)) ordered.push(node);
    });

    const steps = ordered.slice(0, limit).map((node) => {
        const provider = node.data?.integrationProvider ?? node.data?.provider;
        const isIntegration = node.type === "integration" && provider;
        return {
            id: node.id as string,
            kind: isIntegration ? provider.replace(/[-_]/g, " ") : (KIND[node.type] ?? node.type),
            title: node.data?.label?.trim() || KIND[node.type] || node.type,
            icon: iconFor(node.type),
            logo: isIntegration ? PROVIDER_LOGOS.get(provider) : undefined
        };
    });
    return { steps, hidden: Math.max(0, usable.length - steps.length) };
}

/** The template as a short recipe: its first steps down a rail, lit up one by one. */
export const TemplateRecipe: React.FC<TemplateRecipeProps> = ({
    definition,
    delay = 0,
    limit = 4
}) => {
    const { steps, hidden } = useMemo(() => recipe(definition, limit), [definition, limit]);
    if (steps.length === 0) return null;
    return (
        <div className="recipe">
            {steps.map((step, index) => (
                <div key={step.id} className="rstep">
                    <i
                        className="rdot hit"
                        style={{ animationDelay: `${delay + 1.4 + index * 0.75}s` }}
                    />
                    <span className="ric">
                        {step.logo ? <img src={step.logo} alt="" loading="lazy" /> : step.icon}
                    </span>
                    <span className="rtxt">
                        <span className="k">{step.kind}</span>
                        <span className="t">{step.title}</span>
                    </span>
                </div>
            ))}
            {hidden > 0 && (
                <p className="rmore">
                    +{hidden} more {hidden === 1 ? "step" : "steps"}
                </p>
            )}
        </div>
    );
};

/** A logo chip for a provider domain, used by the team tiles. */
export const ProviderLogo: React.FC<{ domain: string; name: string }> = ({ domain, name }) => (
    <span className="plogo" title={name}>
        <img src={getProviderLogoUrl(domain)} alt={name} loading="lazy" />
    </span>
);
