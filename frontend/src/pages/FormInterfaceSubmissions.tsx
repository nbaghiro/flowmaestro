import { ArrowLeft, MessageSquare, Paperclip, Link, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { FormInterface, FormInterfaceSubmission } from "@flowmaestro/shared";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import { getFormInterface, getFormInterfaceSubmissions } from "../lib/api";
import { logger } from "../lib/logger";

export function FormInterfaceSubmissions() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [formInterface, setFormInterface] = useState<FormInterface | null>(null);
    const [submissions, setSubmissions] = useState<FormInterfaceSubmission[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const [fiResponse, subResponse] = await Promise.all([
                getFormInterface(id!),
                getFormInterfaceSubmissions(id!)
            ]);

            if (fiResponse.success && fiResponse.data) {
                setFormInterface(fiResponse.data);
            }

            if (subResponse.success && subResponse.data) {
                setSubmissions(subResponse.data.items);
                setTotal(subResponse.data.total);
            }
        } catch (error) {
            logger.error("Failed to load submissions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const truncateMessage = (message: string | null, maxLength: number = 200) => {
        if (!message) return "";
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + "...";
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <LoadingState message="Loading submissions..." />
            </div>
        );
    }

    if (!formInterface) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Form interface not found</p>
                    <Button
                        variant="primary"
                        onClick={() => navigate("/form-interfaces")}
                        className="mt-4"
                    >
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Back Button */}
            <button
                onClick={() => navigate("/form-interfaces")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Form Interfaces
            </button>

            <PageHeader
                title={`Submissions: ${formInterface.title}`}
                description={`${total} total submissions`}
            />

            {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card mt-6">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No submissions yet
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                        {formInterface.status === "published"
                            ? "Share your form interface URL to start receiving submissions."
                            : "Publish your form interface to start receiving submissions."}
                    </p>
                    {formInterface.status === "draft" && (
                        <Button
                            variant="primary"
                            onClick={() => navigate(`/form-interfaces/${id}/edit`)}
                            className="mt-4"
                        >
                            Edit & Publish
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4 mt-6">
                    {submissions.map((submission) => (
                        <div
                            key={submission.id}
                            className="bg-card border border-border rounded-lg overflow-hidden"
                        >
                            {/* Header */}
                            <button
                                onClick={() =>
                                    setExpandedId(
                                        expandedId === submission.id ? null : submission.id
                                    )
                                }
                                className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground">
                                            {truncateMessage(submission.message)}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(submission.submittedAt)}
                                            </span>
                                            {submission.files.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    {submission.files.length} files
                                                </span>
                                            )}
                                            {submission.urls.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Link className="w-3.5 h-3.5" />
                                                    {submission.urls.length} URLs
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {submission.output && (
                                        <Badge variant="success">Has Output</Badge>
                                    )}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {expandedId === submission.id && (
                                <div className="border-t border-border p-4 bg-muted/20 space-y-4">
                                    {/* Full Message */}
                                    <div>
                                        <h4 className="text-sm font-medium text-foreground mb-2">
                                            Message
                                        </h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {submission.message || "(No message)"}
                                        </p>
                                    </div>

                                    {/* Files */}
                                    {submission.files.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground mb-2">
                                                Attached Files
                                            </h4>
                                            <ul className="space-y-1">
                                                {submission.files.map((file, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="text-sm text-muted-foreground flex items-center gap-2"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        {file.fileName} (
                                                        {(file.fileSize / 1024).toFixed(1)} KB)
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* URLs */}
                                    {submission.urls.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground mb-2">
                                                Referenced URLs
                                            </h4>
                                            <ul className="space-y-1">
                                                {submission.urls.map((url, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="text-sm text-muted-foreground"
                                                    >
                                                        <a
                                                            href={url.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <Link className="w-3.5 h-3.5" />
                                                            {url.url}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Output (Phase 2) */}
                                    {submission.output && (
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground mb-2">
                                                Output
                                            </h4>
                                            <div className="bg-card border border-border rounded-lg p-3">
                                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                                    {submission.output}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                                        <p>ID: {submission.id}</p>
                                        {submission.ipAddress && <p>IP: {submission.ipAddress}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
