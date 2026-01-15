/**
 * Shared node type registry for React Flow
 *
 * This is the single source of truth for all node types used in workflow canvases.
 * Import from here instead of defining nodeTypes locally to avoid missing node types.
 */

import { ALL_PROVIDERS } from "@flowmaestro/shared";
import ActionNode from "./nodes/ActionNode";
import AudioInputNode from "./nodes/AudioInputNode";
import AudioOutputNode from "./nodes/AudioOutputNode";
import CodeNode from "./nodes/CodeNode";
import CommentNode from "./nodes/CommentNode";
import ConditionalNode from "./nodes/ConditionalNode";
import DatabaseNode from "./nodes/DatabaseNode";
import EmbeddingsNode from "./nodes/EmbeddingsNode";
import FilesNode from "./nodes/FilesNode";
import HTTPNode from "./nodes/HTTPNode";
import HumanReviewNode from "./nodes/HumanReviewNode";
import ImageGenerationNode from "./nodes/ImageGenerationNode";
import InputNode from "./nodes/InputNode";
import IntegrationNode from "./nodes/IntegrationNode";
import KnowledgeBaseQueryNode from "./nodes/KnowledgeBaseQueryNode";
import LLMNode from "./nodes/LLMNode";
import LoopNode from "./nodes/LoopNode";
import OutputNode from "./nodes/OutputNode";
import RouterNode from "./nodes/RouterNode";
import SharedMemoryNode from "./nodes/SharedMemoryNode";
import SwitchNode from "./nodes/SwitchNode";
import TemplateOutputNode from "./nodes/TemplateOutputNode";
import TransformNode from "./nodes/TransformNode";
import TriggerNode from "./nodes/TriggerNode";
import URLNode from "./nodes/URLNode";
import VideoGenerationNode from "./nodes/VideoGenerationNode";
import VisionNode from "./nodes/VisionNode";
import WaitNode from "./nodes/WaitNode";
import type { ComponentType } from "react";
import type { NodeProps } from "reactflow";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeComponent = ComponentType<NodeProps<any>>;

// AI provider IDs (these use the LLM node, not Integration node)
const AI_PROVIDER_IDS = ["openai", "anthropic", "google", "huggingface", "cohere"];

// Generate integration provider node types dynamically
// Each provider type maps to the IntegrationNode component
const integrationProviderNodeTypes: Record<string, typeof IntegrationNode> = {};
ALL_PROVIDERS.filter((p) => !p.comingSoon && !AI_PROVIDER_IDS.includes(p.provider)).forEach(
    (provider) => {
        integrationProviderNodeTypes[provider.provider] = IntegrationNode;
    }
);

/**
 * Complete node type registry for workflow canvases
 * Use this for the main WorkflowCanvas that needs all node types including integrations
 */
export const nodeTypes: Record<string, NodeComponent> = {
    // Core nodes
    comment: CommentNode,
    trigger: TriggerNode,
    llm: LLMNode,
    vision: VisionNode,
    embeddings: EmbeddingsNode,
    router: RouterNode,
    conditional: ConditionalNode,
    switch: SwitchNode,
    loop: LoopNode,
    code: CodeNode,
    wait: WaitNode,
    humanReview: HumanReviewNode,
    input: InputNode,
    transform: TransformNode,
    "shared-memory": SharedMemoryNode,
    output: OutputNode,
    templateOutput: TemplateOutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode,
    // AI generation nodes
    imageGeneration: ImageGenerationNode,
    videoGeneration: VideoGenerationNode,
    // Dedicated input/output nodes
    files: FilesNode,
    url: URLNode,
    audioInput: AudioInputNode,
    audioOutput: AudioOutputNode,
    action: ActionNode,
    // Integration provider nodes (dynamically generated)
    ...integrationProviderNodeTypes
};

/**
 * Check if a type is an integration provider node type
 */
export function isProviderNodeType(type: string): boolean {
    return integrationProviderNodeTypes[type] !== undefined;
}

/**
 * Get provider info by type
 */
export function getProviderInfo(type: string) {
    return ALL_PROVIDERS.find((p) => p.provider === type);
}

/**
 * AI provider IDs - these use the LLM node, not Integration node
 */
export { AI_PROVIDER_IDS };

/**
 * Preview-only node types (excludes dynamic integrations for smaller bundle in previews)
 * Use this for read-only previews like TemplateCard, PatternPicker, etc.
 */
export const previewNodeTypes: Record<string, NodeComponent> = {
    comment: CommentNode,
    trigger: TriggerNode,
    llm: LLMNode,
    vision: VisionNode,
    embeddings: EmbeddingsNode,
    router: RouterNode,
    conditional: ConditionalNode,
    switch: SwitchNode,
    loop: LoopNode,
    code: CodeNode,
    wait: WaitNode,
    humanReview: HumanReviewNode,
    input: InputNode,
    transform: TransformNode,
    "shared-memory": SharedMemoryNode,
    output: OutputNode,
    templateOutput: TemplateOutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode,
    imageGeneration: ImageGenerationNode,
    videoGeneration: VideoGenerationNode,
    files: FilesNode,
    url: URLNode,
    audioInput: AudioInputNode,
    audioOutput: AudioOutputNode,
    action: ActionNode
};
