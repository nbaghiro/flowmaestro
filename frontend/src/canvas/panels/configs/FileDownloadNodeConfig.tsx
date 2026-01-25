/**
 * File Download Node Configuration Panel
 */

import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface FileDownloadNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

export function FileDownloadNodeConfig({
    data,
    onUpdate,
    errors = []
}: FileDownloadNodeConfigProps) {
    const isInitialMount = useRef(true);
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;
    const [url, setUrl] = useState<string>((data.url as string) || "");
    const [filename, setFilename] = useState<string>((data.filename as string) || "");
    const [maxSize, setMaxSize] = useState<number>((data.maxSize as number) || 52428800);
    const [timeout, setTimeout] = useState<number>((data.timeout as number) || 60000);
    const [followRedirects, setFollowRedirects] = useState<boolean>(
        (data.followRedirects as boolean) ?? true
    );
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            url,
            filename: filename || undefined,
            maxSize,
            timeout,
            followRedirects,
            outputVariable
        });
    }, [url, filename, maxSize, timeout, followRedirects, outputVariable]);

    const maxSizeMB = Math.round(maxSize / 1024 / 1024);

    return (
        <>
            <FormSection title="Download URL">
                <FormField
                    label="URL"
                    description="File URL to download. Use {{variableName}} for dynamic URLs."
                    error={getError("url")}
                >
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/file.pdf or {{fileUrl}}"
                    />
                </FormField>
            </FormSection>
            <FormSection title="Options">
                <FormField label="Filename" description="Custom filename (optional)">
                    <Input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="Auto-detect from URL"
                    />
                </FormField>
                <FormField label="Max File Size (MB)">
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={maxSizeMB}
                            onChange={(e) => setMaxSize(parseInt(e.target.value) * 1024 * 1024)}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">{maxSizeMB} MB</span>
                    </div>
                </FormField>
                <FormField label="Timeout (seconds)">
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="5"
                            max="300"
                            step="5"
                            value={Math.round(timeout / 1000)}
                            onChange={(e) => setTimeout(parseInt(e.target.value) * 1000)}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                            {Math.round(timeout / 1000)}s
                        </span>
                    </div>
                </FormField>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={followRedirects}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFollowRedirects(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Follow Redirects</span>
                </label>
            </FormSection>
            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Downloaded File"}
                    nodeType="fileDownload"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
