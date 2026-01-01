import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PublicFormInterface } from "@flowmaestro/shared";
import { FileUploader } from "../components/public-interface/FileUploader";
import { InterfaceHeader } from "../components/public-interface/InterfaceHeader";
import { MessageInput } from "../components/public-interface/MessageInput";
import { SubmitButton } from "../components/public-interface/SubmitButton";
import { UrlInput } from "../components/public-interface/UrlInput";
import { getPublicFormInterface, submitPublicFormInterface } from "@/lib/api";

export function PublicInterfacePage() {
    const { slug } = useParams<{ slug: string }>();
    const [iface, setIface] = useState<PublicFormInterface | null>(null);
    const [message, setMessage] = useState("");
    const [urls, setUrls] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        const interfaceSlug = slug;

        async function load() {
            try {
                const res = await getPublicFormInterface(interfaceSlug);
                setIface(res.data);
            } catch (error) {
                setLoadError(error instanceof Error ? error.message : "Failed to load interface");
            }
        }

        load();
    }, [slug]);

    const canSubmit = iface && !isSubmitting;

    async function handleSubmit() {
        if (!iface || !slug) return;
        const interfaceSlug = slug;

        setIsSubmitting(true);
        setStatusMessage(null);
        setSubmitError(null);
        try {
            const urlList = urls
                .split(/[\n,]/)
                .map((value) => value.trim())
                .filter(Boolean);

            await submitPublicFormInterface(interfaceSlug, {
                message,
                urls: urlList,
                files
            });

            setMessage("");
            setUrls("");
            setFiles([]);
            setStatusMessage("Submission received.");
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Submission failed.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loadError) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
                {loadError}
            </div>
        );
    }

    if (!iface) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
                Loading…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <InterfaceHeader
                title={iface.title}
                description={iface.description}
                iconUrl={iface.iconUrl}
                coverType={iface.coverType}
                coverValue={iface.coverValue}
            />

            <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
                <MessageInput
                    label={iface.inputLabel}
                    placeholder={iface.inputPlaceholder}
                    value={message}
                    onChange={setMessage}
                    disabled={!canSubmit}
                />

                {iface.allowFileUpload && (
                    <FileUploader
                        files={files}
                        onChange={setFiles}
                        maxFiles={iface.maxFiles}
                        accept={iface.allowedFileTypes?.join(",")}
                        disabled={!canSubmit}
                    />
                )}

                {iface.allowUrlInput && (
                    <UrlInput value={urls} onChange={setUrls} disabled={!canSubmit} />
                )}

                <SubmitButton
                    text={iface.submitButtonText}
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={!canSubmit}
                />

                {statusMessage && <div className="text-sm text-green-600">{statusMessage}</div>}
                {submitError && <div className="text-sm text-red-600">{submitError}</div>}
            </div>
        </div>
    );
}
