import { Send, Paperclip, Link, X, Loader2, Copy, Download, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import type { PublicFormInterface, SubmitFormInterfaceInput } from "@flowmaestro/shared";
import { getPublicFormInterface, submitPublicFormInterface } from "../lib/api";
import { logger } from "../lib/logger";

export function PublicFormInterfacePage() {
    const { slug } = useParams();

    const [formInterface, setFormInterface] = useState<PublicFormInterface | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [urls, setUrls] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState("");

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [isOutputEditable, setIsOutputEditable] = useState(false);
    const [editedOutput, setEditedOutput] = useState("");
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (slug) {
            loadFormInterface();
        }
    }, [slug]);

    const loadFormInterface = async () => {
        try {
            const response = await getPublicFormInterface(slug!);
            if (response.success && response.data) {
                setFormInterface(response.data);
            } else {
                setError(response.error || "Form not found");
            }
        } catch (err) {
            logger.error("Failed to load form interface", err);
            setError("Failed to load form");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !formInterface) return;

        const newFiles = Array.from(e.target.files);
        const maxFiles = formInterface.maxFiles || 5;
        const maxSizeMb = formInterface.maxFileSizeMb || 25;

        // Check file count
        if (files.length + newFiles.length > maxFiles) {
            alert(`Maximum ${maxFiles} files allowed`);
            return;
        }

        // Check file sizes
        for (const file of newFiles) {
            if (file.size > maxSizeMb * 1024 * 1024) {
                alert(`File ${file.name} exceeds ${maxSizeMb}MB limit`);
                return;
            }
        }

        setFiles((prev) => [...prev, ...newFiles]);
        e.target.value = "";
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const addUrl = () => {
        if (!urlInput.trim()) return;

        try {
            new URL(urlInput);
            setUrls((prev) => [...prev, urlInput.trim()]);
            setUrlInput("");
        } catch {
            alert("Please enter a valid URL");
        }
    };

    const removeUrl = (index: number) => {
        setUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formInterface || isSubmitting) return;

        setIsSubmitting(true);
        setOutput(null);

        try {
            // Phase 1: File upload not implemented yet, just pass the message
            // In Phase 2, files would be uploaded to GCS first and fileUrls passed
            const submitData: SubmitFormInterfaceInput = {
                message: message.trim() || "",
                // fileUrls would be populated after GCS upload in Phase 2
                urls: urls.length > 0 ? urls : undefined
            };

            const response = await submitPublicFormInterface(slug!, submitData);

            if (response.success && response.data) {
                // Phase 1: Show placeholder output
                setOutput(
                    "Thank you for your submission! Your request has been received and is being processed."
                );
                setEditedOutput(
                    "Thank you for your submission! Your request has been received and is being processed."
                );

                // Clear form
                setMessage("");
                setFiles([]);
                setUrls([]);
            } else {
                setError(response.error || "Failed to submit");
            }
        } catch (err) {
            logger.error("Failed to submit form", err);
            setError("Failed to submit form");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = async () => {
        const textToCopy = isOutputEditable ? editedOutput : output;
        if (!textToCopy) return;

        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const textToDownload = isOutputEditable ? editedOutput : output;
        if (!textToDownload) return;

        const blob = new Blob([textToDownload], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${formInterface?.title || "output"}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    if (error || !formInterface) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Form Not Found</h1>
                    <p className="text-muted-foreground">
                        {error || "This form does not exist or has been unpublished."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Cover */}
            <div
                className="h-48 w-full"
                style={{
                    backgroundColor:
                        formInterface.coverType === "color" ? formInterface.coverValue : undefined,
                    backgroundImage:
                        formInterface.coverType === "image" || formInterface.coverType === "stock"
                            ? `url(${formInterface.coverValue})`
                            : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                }}
            />

            {/* Content */}
            <div className="max-w-2xl mx-auto px-6 -mt-16">
                {/* Icon & Title */}
                <div className="mb-8">
                    {formInterface.iconUrl && (
                        <div className="w-24 h-24 rounded-xl bg-card border-4 border-background overflow-hidden mb-4 flex items-center justify-center">
                            {formInterface.iconUrl.startsWith("http") ||
                            formInterface.iconUrl.startsWith("blob:") ? (
                                <img
                                    src={formInterface.iconUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-5xl">{formInterface.iconUrl}</span>
                            )}
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-foreground">{formInterface.title}</h1>
                    {formInterface.description && (
                        <p className="text-muted-foreground mt-2">{formInterface.description}</p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Message Input */}
                    <div>
                        {formInterface.inputLabel && (
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {formInterface.inputLabel}
                            </label>
                        )}
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={formInterface.inputPlaceholder || "Enter your message..."}
                            className="w-full min-h-[150px] p-4 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                        />
                    </div>

                    {/* File Upload */}
                    {formInterface.allowFileUpload && (
                        <div>
                            {formInterface.fileUploadLabel && (
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {formInterface.fileUploadLabel}
                                </label>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                accept={formInterface.allowedFileTypes?.join(",") || undefined}
                            />

                            {files.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 text-sm">
                                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-foreground truncate max-w-[200px]">
                                                    {file.name}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="p-1 hover:bg-background rounded"
                                            >
                                                <X className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center gap-2 p-8 bg-card border border-border rounded-lg hover:border-muted-foreground/50 transition-colors"
                            >
                                <Paperclip className="w-8 h-8 text-muted-foreground" />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        Click to attach files
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Up to {formInterface.maxFiles} files,{" "}
                                        {formInterface.maxFileSizeMb}MB each
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* URL Input */}
                    {formInterface.allowUrlInput && (
                        <div>
                            {formInterface.urlInputLabel && (
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {formInterface.urlInputLabel}
                                </label>
                            )}
                            {urls.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {urls.map((url, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-muted rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 text-sm">
                                                <Link className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-foreground truncate max-w-[300px]">
                                                    {url}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeUrl(index)}
                                                className="p-1 hover:bg-background rounded"
                                            >
                                                <X className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://example.com"
                                    className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addUrl();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={addUrl}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    <Link className="w-4 h-4" />
                                    Add URL
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {formInterface.submitLoadingText || "Submitting..."}
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {formInterface.submitButtonText || "Submit"}
                            </>
                        )}
                    </button>
                </form>

                {/* Output */}
                {output && (
                    <div className="mt-8 mb-12">
                        {formInterface.outputLabel && (
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {formInterface.outputLabel}
                            </label>
                        )}
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            {/* Output Actions */}
                            <div className="flex items-center justify-end gap-2 p-2 border-b border-border bg-muted/50">
                                {formInterface.showCopyButton && (
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                )}
                                {formInterface.showDownloadButton && (
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                )}
                            </div>

                            {/* Output Content */}
                            {formInterface.allowOutputEdit && isOutputEditable ? (
                                <textarea
                                    value={editedOutput}
                                    onChange={(e) => setEditedOutput(e.target.value)}
                                    className="w-full min-h-[200px] p-4 bg-transparent text-foreground focus:outline-none resize-y"
                                />
                            ) : (
                                <div
                                    className="p-4 text-foreground whitespace-pre-wrap cursor-pointer"
                                    onClick={() => {
                                        if (formInterface.allowOutputEdit) {
                                            setIsOutputEditable(true);
                                        }
                                    }}
                                >
                                    {output}
                                </div>
                            )}
                        </div>
                        {formInterface.allowOutputEdit && !isOutputEditable && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Click the output to edit
                            </p>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="py-8 text-center text-xs text-muted-foreground">
                    Powered by FlowMaestro
                </div>
            </div>
        </div>
    );
}
