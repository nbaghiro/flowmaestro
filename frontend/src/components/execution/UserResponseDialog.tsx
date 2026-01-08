/**
 * User Response Dialog Component
 * Displays a dialog for users to submit responses to paused Human Review nodes
 */

import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../common/Button";
import { Checkbox } from "../common/Checkbox";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import type { ExecutionPauseContext } from "../../lib/api";

interface UserResponseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (response: string | number | boolean | Record<string, unknown>) => Promise<void>;
    pauseContext: ExecutionPauseContext;
    nodeName?: string;
}

export function UserResponseDialog({
    isOpen,
    onClose,
    onSubmit,
    pauseContext,
    nodeName
}: UserResponseDialogProps) {
    const [response, setResponse] = useState<string>("");
    const [booleanResponse, setBooleanResponse] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);

        // Validate required field
        if (pauseContext.required && !response.trim() && pauseContext.inputType !== "boolean") {
            setError("This field is required");
            return;
        }

        setIsSubmitting(true);

        try {
            let finalResponse: string | number | boolean | Record<string, unknown> = response;

            // Convert response based on input type
            switch (pauseContext.inputType) {
                case "number": {
                    const numValue = parseFloat(response);
                    if (isNaN(numValue)) {
                        setError("Please enter a valid number");
                        setIsSubmitting(false);
                        return;
                    }
                    finalResponse = numValue;
                    break;
                }
                case "boolean":
                    finalResponse = booleanResponse;
                    break;
                case "json":
                    try {
                        finalResponse = JSON.parse(response);
                    } catch {
                        setError("Please enter valid JSON");
                        setIsSubmitting(false);
                        return;
                    }
                    break;
                case "text":
                default:
                    finalResponse = response;
                    break;
            }

            await onSubmit(finalResponse);
            setResponse("");
            setBooleanResponse(false);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit response");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && pauseContext.inputType !== "json") {
            e.preventDefault();
            handleSubmit();
        }
    };

    const renderInput = () => {
        switch (pauseContext.inputType) {
            case "number":
                return (
                    <Input
                        type="number"
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pauseContext.placeholder || "Enter a number..."}
                        disabled={isSubmitting}
                        className="w-full"
                    />
                );
            case "boolean":
                return (
                    <div className="flex items-center gap-3 py-2">
                        <Checkbox
                            id="boolean-response"
                            checked={booleanResponse}
                            onCheckedChange={(checked) => setBooleanResponse(checked === true)}
                            disabled={isSubmitting}
                        />
                        <label
                            htmlFor="boolean-response"
                            className="text-sm cursor-pointer select-none"
                        >
                            {pauseContext.placeholder || "Yes / Confirm"}
                        </label>
                    </div>
                );
            case "json":
                return (
                    <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder={pauseContext.placeholder || '{"key": "value"}'}
                        disabled={isSubmitting}
                        className="w-full font-mono text-sm min-h-[120px]"
                    />
                );
            case "text":
            default:
                return (
                    <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pauseContext.placeholder || "Enter your response..."}
                        disabled={isSubmitting}
                        className="w-full min-h-[100px]"
                    />
                );
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="User Response Required"
            description={nodeName ? `Node: ${nodeName}` : undefined}
            size="md"
            closeOnBackdropClick={false}
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Submit Response
                            </>
                        )}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Prompt */}
                {pauseContext.prompt && (
                    <div className="flex gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {pauseContext.prompt}
                            </p>
                            {pauseContext.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {pauseContext.description}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Response Input */}
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Your Response
                        {pauseContext.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    {renderInput()}
                    <p className="text-xs text-muted-foreground mt-1">
                        Response will be stored as:{" "}
                        <code className="text-primary">{pauseContext.variableName}</code>
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
