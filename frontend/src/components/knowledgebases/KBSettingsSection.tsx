import { BookOpen, Database, Layers, Hash, Save, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "../common/Button";
import type { KnowledgeBase, UpdateKnowledgeBaseInput } from "../../lib/api";

interface KBSettingsSectionProps {
    kb: KnowledgeBase;
    onUpdate?: (input: UpdateKnowledgeBaseInput) => Promise<void>;
}

const EMBEDDING_PROVIDERS = [
    { value: "openai", label: "OpenAI" },
    { value: "cohere", label: "Cohere" },
    { value: "google", label: "Google" }
] as const;

const EMBEDDING_MODELS: Record<string, { value: string; label: string; dimensions: number }[]> = {
    openai: [
        { value: "text-embedding-3-small", label: "text-embedding-3-small", dimensions: 1536 },
        { value: "text-embedding-3-large", label: "text-embedding-3-large", dimensions: 3072 },
        { value: "text-embedding-ada-002", label: "text-embedding-ada-002", dimensions: 1536 }
    ],
    cohere: [
        { value: "embed-english-v3.0", label: "embed-english-v3.0", dimensions: 1024 },
        { value: "embed-multilingual-v3.0", label: "embed-multilingual-v3.0", dimensions: 1024 },
        { value: "embed-english-light-v3.0", label: "embed-english-light-v3.0", dimensions: 384 }
    ],
    google: [
        { value: "text-embedding-004", label: "text-embedding-004", dimensions: 768 },
        { value: "embedding-001", label: "embedding-001", dimensions: 768 }
    ]
};

export function KBSettingsSection({ kb, onUpdate }: KBSettingsSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: kb.name,
        description: kb.description || "",
        embeddingProvider: kb.config.embeddingProvider,
        embeddingModel: kb.config.embeddingModel
    });

    const handleStartEdit = () => {
        setFormData({
            name: kb.name,
            description: kb.description || "",
            embeddingProvider: kb.config.embeddingProvider,
            embeddingModel: kb.config.embeddingModel
        });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setFormData({
            name: kb.name,
            description: kb.description || "",
            embeddingProvider: kb.config.embeddingProvider,
            embeddingModel: kb.config.embeddingModel
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!onUpdate) return;

        setIsSaving(true);
        try {
            const selectedModel = EMBEDDING_MODELS[formData.embeddingProvider]?.find(
                (m) => m.value === formData.embeddingModel
            );
            const dimensions = selectedModel?.dimensions || 1536;

            await onUpdate({
                name: formData.name,
                description: formData.description || undefined,
                config: {
                    embeddingProvider: formData.embeddingProvider,
                    embeddingModel: formData.embeddingModel,
                    embeddingDimensions: dimensions
                }
            });
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleProviderChange = (provider: string) => {
        const models = EMBEDDING_MODELS[provider];
        const defaultModel = models?.[0]?.value || "";
        setFormData({
            ...formData,
            embeddingProvider: provider,
            embeddingModel: defaultModel
        });
    };

    const embeddingConfigChanged =
        formData.embeddingProvider !== kb.config.embeddingProvider ||
        formData.embeddingModel !== kb.config.embeddingModel;

    return (
        <div className="space-y-6">
            {/* Edit/Save Actions */}
            {onUpdate && (
                <div className="flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                                <X className="w-4 h-4" />
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                loading={isSaving}
                                disabled={!formData.name.trim()}
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" onClick={handleStartEdit}>
                            Edit Settings
                        </Button>
                    )}
                </div>
            )}

            {/* General Information */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">General Information</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground outline-none focus:border-primary"
                                placeholder="Knowledge base name"
                            />
                        ) : (
                            <p className="text-foreground mt-1">{kb.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Description
                        </label>
                        {isEditing ? (
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground outline-none focus:border-primary resize-none"
                                rows={3}
                                placeholder="Optional description"
                            />
                        ) : (
                            <p className="text-foreground mt-1">
                                {kb.description || (
                                    <span className="text-muted-foreground italic">
                                        No description
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Created
                            </label>
                            <p className="text-foreground mt-1">
                                {new Date(kb.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit"
                                })}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </label>
                            <p className="text-foreground mt-1">
                                {new Date(kb.updated_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit"
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embedding Configuration */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Embedding Configuration</h3>
                </div>

                {/* Warning about embedding changes */}
                {isEditing && embeddingConfigChanged && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            Changing the embedding model will only affect new documents. Existing
                            documents will keep their current embeddings and may not be searchable
                            with the new model.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Provider
                        </label>
                        {isEditing ? (
                            <select
                                value={formData.embeddingProvider}
                                onChange={(e) => handleProviderChange(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground outline-none focus:border-primary"
                            >
                                {EMBEDDING_PROVIDERS.map((provider) => (
                                    <option key={provider.value} value={provider.value}>
                                        {provider.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-foreground mt-1">{kb.config.embeddingProvider}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Model</label>
                        {isEditing ? (
                            <select
                                value={formData.embeddingModel}
                                onChange={(e) =>
                                    setFormData({ ...formData, embeddingModel: e.target.value })
                                }
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground outline-none focus:border-primary"
                            >
                                {EMBEDDING_MODELS[formData.embeddingProvider]?.map((model) => (
                                    <option key={model.value} value={model.value}>
                                        {model.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-foreground mt-1">{kb.config.embeddingModel}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Dimensions
                        </label>
                        {isEditing ? (
                            <p className="text-foreground mt-1">
                                {EMBEDDING_MODELS[formData.embeddingProvider]?.find(
                                    (m) => m.value === formData.embeddingModel
                                )?.dimensions || kb.config.embeddingDimensions}
                            </p>
                        ) : (
                            <p className="text-foreground mt-1">{kb.config.embeddingDimensions}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Chunking Configuration */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Chunking Configuration</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Chunk Size
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <p className="text-foreground">{kb.config.chunkSize} characters</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Chunk Overlap
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <p className="text-foreground">{kb.config.chunkOverlap} characters</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Knowledge Base ID */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Hash className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Technical Details</h3>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground">
                        Knowledge Base ID
                    </label>
                    <p className="text-foreground mt-1 font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                        {kb.id}
                    </p>
                </div>
            </div>
        </div>
    );
}
