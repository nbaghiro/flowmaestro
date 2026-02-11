import { Send, Paperclip, Link, X, Loader2, Copy, Download, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import type { PublicFormInterface } from "@flowmaestro/shared";
import { MediaOutput, hasMediaContent } from "../components/common/MediaOutput";
import {
    getPublicFormInterface,
    submitPublicFormInterface,
    uploadPublicFormFile,
    subscribeToFormExecutionStream
} from "../lib/api";
import { logger } from "../lib/logger";

interface UploadedFile {
    id: string; // Unique ID to track uploads (handles duplicate file names)
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsUri: string;
    downloadUrl: string;
    isUploading?: boolean;
    error?: string;
}

export function PublicFormInterfacePage() {
    const { slug } = useParams();

    const [formInterface, setFormInterface] = useState<PublicFormInterface | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [message, setMessage] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [urls, setUrls] = useState<Array<{ url: string; title?: string }>>([]);
    const [urlInput, setUrlInput] = useState("");

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [streamingOutput, setStreamingOutput] = useState("");
    const [output, setOutput] = useState<string | null>(null);
    const [outputData, setOutputData] = useState<unknown>(null);
    const [isOutputEditable, setIsOutputEditable] = useState(false);
    const [editedOutput, setEditedOutput] = useState("");
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamCleanupRef = useRef<(() => void) | null>(null);
    // Session ID for grouping file uploads in GCS (generated once per form session)
    const uploadSessionIdRef = useRef<string>(crypto.randomUUID());
    // Ref to track latest streaming output (avoids stale closure in onComplete callback)
    const streamingOutputRef = useRef<string>("");

    // Keep ref in sync with streaming output state (for use in callbacks)
    useEffect(() => {
        streamingOutputRef.current = streamingOutput;
    }, [streamingOutput]);

    useEffect(() => {
        if (slug) {
            loadFormInterface();
        }

        // Cleanup SSE on unmount
        return () => {
            if (streamCleanupRef.current) {
                streamCleanupRef.current();
            }
        };
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !formInterface || !slug) return;

        const newFiles = Array.from(e.target.files);
        const maxFiles = formInterface.maxFiles || 5;
        const maxSizeMb = formInterface.maxFileSizeMb || 25;

        // Check file count
        if (uploadedFiles.length + newFiles.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed`);
            return;
        }

        // Validate and upload each file
        for (const file of newFiles) {
            // Check file size
            if (file.size > maxSizeMb * 1024 * 1024) {
                setError(`File ${file.name} exceeds ${maxSizeMb}MB limit`);
                continue;
            }

            // Generate unique ID to track this upload (handles duplicate file names)
            const uploadId = crypto.randomUUID();

            // Add placeholder while uploading
            const placeholderFile: UploadedFile = {
                id: uploadId,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                gcsUri: "",
                downloadUrl: "",
                isUploading: true
            };
            setUploadedFiles((prev) => [...prev, placeholderFile]);

            try {
                // Upload the file immediately (pass session ID to group files in GCS)
                const response = await uploadPublicFormFile(slug, file, uploadSessionIdRef.current);

                if (response.success && response.data) {
                    // Update with actual data
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadId
                                ? {
                                      id: uploadId,
                                      fileName: response.data.fileName,
                                      fileSize: response.data.fileSize,
                                      mimeType: response.data.mimeType,
                                      gcsUri: response.data.gcsUri,
                                      downloadUrl: response.data.downloadUrl,
                                      isUploading: false
                                  }
                                : f
                        )
                    );
                } else {
                    // Mark as error
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadId
                                ? { ...f, isUploading: false, error: "Upload failed" }
                                : f
                        )
                    );
                }
            } catch (uploadError) {
                logger.error("Failed to upload file", uploadError);
                setUploadedFiles((prev) =>
                    prev.map((f) =>
                        f.id === uploadId
                            ? {
                                  ...f,
                                  isUploading: false,
                                  error:
                                      uploadError instanceof Error
                                          ? uploadError.message
                                          : "Upload failed"
                              }
                            : f
                    )
                );
            }
        }

        e.target.value = "";
    };

    const removeFile = (index: number) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const addUrl = () => {
        if (!urlInput.trim()) return;

        try {
            new URL(urlInput);
            setUrls((prev) => [...prev, { url: urlInput.trim() }]);
            setUrlInput("");
        } catch {
            setError("Please enter a valid URL");
        }
    };

    const removeUrl = (index: number) => {
        setUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formInterface || isSubmitting || !slug) return;

        // Check if any files are still uploading
        const filesStillUploading = uploadedFiles.some((f) => f.isUploading);
        if (filesStillUploading) {
            setError("Please wait for files to finish uploading");
            return;
        }

        // Filter out failed uploads
        const validFiles = uploadedFiles.filter((f) => !f.error && f.gcsUri);

        setIsSubmitting(true);
        setOutput(null);
        setStreamingOutput("");
        setError(null);

        try {
            // Submit the form
            const response = await submitPublicFormInterface(slug, {
                message: message.trim() || "",
                files:
                    validFiles.length > 0
                        ? validFiles.map((f) => ({
                              fileName: f.fileName,
                              fileSize: f.fileSize,
                              mimeType: f.mimeType,
                              gcsUri: f.gcsUri,
                              downloadUrl: f.downloadUrl
                          }))
                        : undefined,
                urls: urls.length > 0 ? urls : undefined
            });

            if (response.success && response.data) {
                const { submissionId, executionId } = response.data;

                // Subscribe to execution stream
                streamCleanupRef.current = subscribeToFormExecutionStream(
                    slug,
                    submissionId,
                    executionId,
                    {
                        onMessage: (content) => {
                            setStreamingOutput((prev) => prev + content);
                        },
                        onComplete: (finalOutput) => {
                            // Use ref to get latest streaming output (avoids stale closure)
                            const displayOutput = finalOutput || streamingOutputRef.current;
                            setOutput(displayOutput);
                            setEditedOutput(displayOutput);
                            setStreamingOutput("");
                            setIsSubmitting(false);

                            // Try to parse as JSON for media detection
                            try {
                                const parsed = JSON.parse(displayOutput);
                                setOutputData(parsed);
                            } catch {
                                setOutputData(null);
                            }

                            // Clear form on success
                            setMessage("");
                            setUploadedFiles([]);
                            setUrls([]);
                        },
                        onError: (errorMsg) => {
                            setError(errorMsg);
                            setIsSubmitting(false);
                        }
                    }
                );
            } else {
                setError(response.error || "Failed to submit");
                setIsSubmitting(false);
            }
        } catch (err) {
            logger.error("Failed to submit form", err);
            setError(err instanceof Error ? err.message : "Failed to submit form");
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

    if (!formInterface) {
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

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-2 text-destructive/60 hover:text-destructive"
                        >
                            <X className="w-4 h-4 inline" />
                        </button>
                    </div>
                )}

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
                            disabled={isSubmitting}
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
                                disabled={isSubmitting}
                            />

                            {uploadedFiles.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {uploadedFiles.map((file, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-center justify-between p-3 rounded-lg ${
                                                file.error
                                                    ? "bg-destructive/10 border border-destructive/20"
                                                    : "bg-muted"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 text-sm">
                                                {file.isUploading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                                                )}
                                                <span
                                                    className={`truncate max-w-[200px] ${
                                                        file.error
                                                            ? "text-destructive"
                                                            : "text-foreground"
                                                    }`}
                                                >
                                                    {file.fileName}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    ({(file.fileSize / 1024).toFixed(1)} KB)
                                                </span>
                                                {file.isUploading && (
                                                    <span className="text-muted-foreground">
                                                        Uploading...
                                                    </span>
                                                )}
                                                {file.error && (
                                                    <span className="text-destructive text-xs">
                                                        {file.error}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="p-1 hover:bg-background rounded"
                                                disabled={isSubmitting}
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
                                className="w-full flex flex-col items-center gap-2 p-8 bg-card border border-border rounded-lg hover:border-muted-foreground/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting}
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
                                    {urls.map((urlItem, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-muted rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 text-sm">
                                                <Link className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-foreground truncate max-w-[300px]">
                                                    {urlItem.url}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeUrl(index)}
                                                className="p-1 hover:bg-background rounded"
                                                disabled={isSubmitting}
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
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={addUrl}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                                    disabled={isSubmitting}
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
                        disabled={isSubmitting || uploadedFiles.some((f) => f.isUploading)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {formInterface.submitLoadingText || "Processing..."}
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {formInterface.submitButtonText || "Submit"}
                            </>
                        )}
                    </button>
                </form>

                {/* Streaming Output */}
                {(streamingOutput || isSubmitting) && !output && (
                    <div className="mt-8 mb-12">
                        {formInterface.outputLabel && (
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {formInterface.outputLabel}
                            </label>
                        )}
                        <div className="bg-card border border-border rounded-lg p-4">
                            {streamingOutput ? (
                                <div className="text-foreground whitespace-pre-wrap">
                                    {streamingOutput}
                                    <span className="animate-pulse">|</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Generating response...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Final Output */}
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
                                    {/* Check for media content in output data */}
                                    {outputData && hasMediaContent(outputData) ? (
                                        <MediaOutput
                                            data={outputData}
                                            showJson={false}
                                            className="mb-4"
                                        />
                                    ) : null}
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
