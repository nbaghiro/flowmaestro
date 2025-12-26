/**
 * AI Generate Dialog Component
 * Modal for generating workflows from natural language prompts
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import {
    getRandomExamplePrompts,
    getModelsForProvider,
    getDefaultModelForProvider
} from "@flowmaestro/shared";
import { logger } from "../lib/logger";
import { useConnectionStore } from "../stores/connectionStore";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Select } from "./common/Select";
import { Textarea } from "./common/Textarea";

interface AIGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (prompt: string, connectionId: string, model: string) => Promise<void>;
}

export function AIGenerateDialog({ open, onOpenChange, onGenerate }: AIGenerateDialogProps) {
    const [prompt, setPrompt] = useState("");
    const [selectedConnectionId, setSelectedConnectionId] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [examplePrompts, setExamplePrompts] = useState<string[]>(() =>
        getRandomExamplePrompts(4)
    );

    const { connections, fetchConnections } = useConnectionStore();

    // Filter connections for LLM providers only (API key or OAuth)
    const llmConnections = connections.filter(
        (conn) =>
            ["openai", "anthropic", "google", "cohere"].includes(conn.provider.toLowerCase()) &&
            conn.status === "active" &&
            (conn.connection_method === "api_key" || conn.connection_method === "oauth2")
    );

    // Get selected connection
    const selectedConnection = llmConnections.find((conn) => conn.id === selectedConnectionId);

    // Get available models for selected connection's provider
    const availableModels = selectedConnection
        ? getModelsForProvider(selectedConnection.provider.toLowerCase())
        : [];

    // Fetch connections when dialog opens
    useEffect(() => {
        if (open) {
            fetchConnections();
        }
    }, [open, fetchConnections]);

    // Auto-select first connection if none selected
    useEffect(() => {
        if (llmConnections.length > 0 && !selectedConnectionId) {
            setSelectedConnectionId(llmConnections[0].id);
        }
    }, [llmConnections, selectedConnectionId]);

    // Auto-select default model when connection changes
    useEffect(() => {
        if (selectedConnection) {
            const defaultModel = getDefaultModelForProvider(
                selectedConnection.provider.toLowerCase()
            );
            setSelectedModel(defaultModel);
        }
    }, [selectedConnection]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!prompt.trim()) {
            setError("Please enter a workflow description");
            return;
        }

        if (prompt.trim().length < 10) {
            setError("Please provide a more detailed description (at least 10 characters)");
            return;
        }

        if (!selectedConnectionId) {
            setError("Please select an LLM connection");
            return;
        }

        if (!selectedModel) {
            setError("Please select a model");
            return;
        }

        setIsGenerating(true);
        setError("");

        try {
            await onGenerate(prompt, selectedConnectionId, selectedModel);

            // Reset and close on success
            setPrompt("");
            setSelectedConnectionId(llmConnections[0]?.id || "");
            setSelectedModel("");
            setError("");
            onOpenChange(false);
        } catch (error) {
            logger.error("Failed to generate workflow", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to generate workflow. Please try again."
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCancel = () => {
        setPrompt("");
        setError("");
        onOpenChange(false);
    };

    const handleRefreshExamples = () => {
        // Get new random examples from the predefined list
        setExamplePrompts(getRandomExamplePrompts(4));
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 z-50">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Generate Workflow with AI
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-1">
                                Describe your workflow in natural language and AI will generate the
                                nodes and connections
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <Button variant="icon" aria-label="Close" disabled={isGenerating}>
                                <X className="w-4 h-4" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Prompt */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Workflow Description
                            </label>
                            <Textarea
                                value={prompt}
                                onChange={(e) => {
                                    setPrompt(e.target.value);
                                    setError("");
                                }}
                                placeholder="Example: Fetch tech news from NewsAPI and summarize each article with GPT-4"
                                rows={4}
                                autoFocus
                                disabled={isGenerating}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Be specific about what you want the workflow to do. Include data
                                sources, transformations, and outputs.
                            </p>
                        </div>

                        {/* LLM Connection Selector */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                LLM Connection
                            </label>
                            {llmConnections.length === 0 ? (
                                <div className="px-3 py-2 border border-border rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">
                                        No LLM connections found. Please add an OpenAI, Anthropic,
                                        Google, or Cohere connection first.
                                    </p>
                                </div>
                            ) : (
                                <Select
                                    value={selectedConnectionId}
                                    onChange={setSelectedConnectionId}
                                    options={llmConnections.map((conn) => ({
                                        value: conn.id,
                                        label: `${conn.name} (${conn.provider})`
                                    }))}
                                    disabled={isGenerating}
                                />
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                This connection will be used to generate the workflow structure
                            </p>
                        </div>

                        {/* Model Selector */}
                        {selectedConnection && availableModels.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Model</label>
                                <Select
                                    value={selectedModel}
                                    onChange={setSelectedModel}
                                    options={availableModels}
                                    disabled={isGenerating}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Select the model to use for generating the workflow
                                </p>
                            </div>
                        )}

                        {/* Examples Section */}
                        <div className="px-3 py-2 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium">Example prompts:</p>
                                <Button
                                    type="button"
                                    variant="icon"
                                    onClick={handleRefreshExamples}
                                    disabled={isGenerating}
                                    title="Shuffle examples"
                                    className="p-1"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                {examplePrompts.map((example, index) => (
                                    <li key={index}>• {example}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Error */}
                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isGenerating}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isGenerating || llmConnections.length === 0}
                                loading={isGenerating}
                            >
                                {!isGenerating && <Sparkles className="w-4 h-4" />}
                                {isGenerating ? "Generating..." : "Generate Workflow"}
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
