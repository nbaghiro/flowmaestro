/**
 * Builds marketing/src/data/templates.snapshot.json from the seeded workflow and agent
 * templates, so the marketing site can list them without the API.
 *
 * Run from the repo root: npm run snapshot:templates --workspace=@flowmaestro/marketing
 */
import * as fs from "fs";
import { createRequire } from "module";
import * as path from "path";
import { fileURLToPath } from "url";

// The shared package and the seed scripts are CommonJS; require them so their named exports resolve under ESM.
const require = createRequire(import.meta.url);
const { autoLayoutWorkflow } =
    require("@flowmaestro/shared") as typeof import("@flowmaestro/shared");
const { templates } = require("../../backend/scripts/seed-workflow-templates") as {
    templates: import("../../backend/scripts/seed-workflow-templates").TemplateData[];
};
const { agentTemplates } = require("../../backend/scripts/seed-agent-templates") as {
    agentTemplates: import("../../backend/scripts/seed-agent-templates").AgentTemplateData[];
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT = path.resolve(__dirname, "../src/data/templates.snapshot.json");
const seen = new Map<string, number>();
const slug = (name: string): string => {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
};
const trunc = (v: unknown, n: number) =>
    typeof v === "string" && v.length > n ? v.slice(0, n - 1) + "…" : v;
const KEEP = [
    "label",
    "provider",
    "model",
    "prompt",
    "inputType",
    "inputVariable",
    "variableName",
    "format",
    "value",
    "method",
    "url",
    "triggerType",
    "description",
    "action",
    "operationType",
    "integrationProvider",
    "operation"
];

const workflows = templates.map((t, index) => {
    const nodes = t.definition.nodes.map((n) => ({ ...n, position: { ...n.position } }));
    const positions = autoLayoutWorkflow(nodes, t.definition.edges);
    for (const node of nodes) {
        const p = positions.get(node.id);
        if (p) node.position = p;
    }
    return {
        id: `wf-${slug(t.name)}`,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        required_integrations: t.required_integrations,
        featured: Boolean(t.featured),
        order: index,
        definition: {
            name: t.definition.name,
            nodes: nodes.map((n) => {
                const data: Record<string, unknown> = {};
                for (const k of KEEP)
                    if (n.data[k] !== undefined)
                        data[k] = trunc(n.data[k], k === "prompt" || k === "value" ? 160 : 120);
                if (Array.isArray(n.data.routes))
                    data.routes = (n.data.routes as unknown[]).map(() => ({}));
                return {
                    id: n.id,
                    type: n.type,
                    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
                    data
                };
            }),
            edges: t.definition.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle
            }))
        }
    };
});

const agents = agentTemplates.map((a, index) => ({
    id: `ag-${slug(a.name)}`,
    name: a.name,
    description: a.description,
    category: a.category,
    tags: a.tags,
    required_integrations: a.required_integrations,
    featured: Boolean(a.featured),
    order: index,
    model: a.model,
    provider: a.provider,
    temperature: a.temperature,
    max_tokens: a.max_tokens,
    system_prompt: trunc(a.system_prompt, 400),
    available_tools: a.available_tools
}));

const ids = new Set<string>();
for (const t of [...workflows, ...agents]) {
    if (ids.has(t.id)) throw new Error("duplicate id " + t.id);
    ids.add(t.id);
}
fs.writeFileSync(
    OUT,
    JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), workflows, agents })
);
console.log("workflows", workflows.length, "agents", agents.length, "bytes", fs.statSync(OUT).size);
