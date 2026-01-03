import { Calendar, FileText, Link2, MessageSquare, FileOutput } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/Spinner";
import { getInterfaceSubmissions } from "@/lib/api";

interface InterfaceSubmission {
    id: string;
    createdAt: string;
    inputText?: string;
    files?: Array<{
        fileName: string;
        fileSize: number;
        mimeType: string;
        gcsUri: string;
    }>;
    urls?: Array<{
        url: string;
        title?: string;
    }>;
    output?: string;
}

export function InterfaceSubmissionsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<InterfaceSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const interfaceId = id;

        async function load() {
            try {
                const res = await getInterfaceSubmissions(interfaceId);
                setSubmissions(res.data);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id]);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <PageHeader
                title="Submissions"
                description={`${submissions.length} ${
                    submissions.length === 1 ? "submission" : "submissions"
                }`}
                action={
                    <Button variant="secondary" onClick={() => navigate("/interfaces")}>
                        Back to interfaces
                    </Button>
                }
            />

            {loading ? (
                <LoadingState message="Loading submissions..." />
            ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No submissions yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Submissions will appear here once users fill out your public interface.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {submissions.map((submission) => (
                        <div
                            key={submission.id}
                            className="rounded-lg border border-border bg-card p-5"
                        >
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatDate(submission.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>
                                        {submission.inputText?.trim()
                                            ? "Message provided"
                                            : "No message"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Input
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                                        {submission.inputText?.trim() || "—"}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        <FileText className="w-3.5 h-3.5" />
                                        Files
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                                        {submission.files && submission.files.length > 0 ? (
                                            <ul className="space-y-1">
                                                {submission.files.map((file) => (
                                                    <li key={file.gcsUri}>{file.fileName}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            "—"
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        <Link2 className="w-3.5 h-3.5" />
                                        URLs
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                                        {submission.urls && submission.urls.length > 0 ? (
                                            <ul className="space-y-1 break-all">
                                                {submission.urls.map((urlItem) => (
                                                    <li key={urlItem.url}>{urlItem.url}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            "—"
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    <FileOutput className="w-3.5 h-3.5" />
                                    Output
                                </div>
                                <div className="rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground min-h-[100px] whitespace-pre-wrap">
                                    {submission.output?.trim() || (
                                        <span className="text-muted-foreground">
                                            No output yet. Output will appear here once processing
                                            is complete.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
