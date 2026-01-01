import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
}

export function InterfaceSubmissionsPage() {
    const { id } = useParams<{ id: string }>();
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

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading submissions…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Submissions</h1>

            {submissions.length === 0 ? (
                <div className="rounded-md border p-6 text-sm text-muted-foreground">
                    No submissions yet.
                </div>
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Submitted at</th>
                                <th className="px-3 py-2 text-left font-medium">Input</th>
                                <th className="px-3 py-2 text-left font-medium">Files</th>
                                <th className="px-3 py-2 text-left font-medium">URLs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((submission) => (
                                <tr key={submission.id} className="border-t">
                                    <td className="px-3 py-2">
                                        {new Date(submission.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                        {submission.inputText ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                        {submission.files && submission.files.length > 0 ? (
                                            <div className="space-y-1">
                                                {submission.files.map((file) => (
                                                    <div key={file.gcsUri}>{file.fileName}</div>
                                                ))}
                                            </div>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                        {submission.urls && submission.urls.length > 0 ? (
                                            <div className="space-y-1">
                                                {submission.urls.map((urlItem) => (
                                                    <div key={urlItem.url}>{urlItem.url}</div>
                                                ))}
                                            </div>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
