import { BookOpen, Database, Layers, Hash } from "lucide-react";
import type { KnowledgeBase } from "../../lib/api";

interface KBSettingsSectionProps {
    kb: KnowledgeBase;
}

export function KBSettingsSection({ kb }: KBSettingsSectionProps) {
    return (
        <div className="space-y-6">
            {/* General Information */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">General Information</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-foreground mt-1">{kb.name}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Description
                        </label>
                        <p className="text-foreground mt-1">
                            {kb.description || (
                                <span className="text-muted-foreground italic">No description</span>
                            )}
                        </p>
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

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Provider
                        </label>
                        <p className="text-foreground mt-1">{kb.config.embeddingProvider}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Model</label>
                        <p className="text-foreground mt-1">{kb.config.embeddingModel}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Dimensions
                        </label>
                        <p className="text-foreground mt-1">{kb.config.embeddingDimensions}</p>
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
