/**
 * Files Node Configuration Panel
 *
 * Configuration panel for the Files node.
 * Includes default file upload and chunking settings in collapsible sections.
 */

import { ChevronDown, ChevronUp, FileText, HelpCircle, Settings, Upload } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { Select } from "../../../components/common/Select";
import { Tooltip } from "../../../components/common/Tooltip";

interface FilesNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

// Toggle Switch component
function Toggle({
    checked,
    onChange,
    disabled = false
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                border-2 border-transparent transition-colors duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${checked ? "bg-primary" : "bg-muted"}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${checked ? "translate-x-5" : "translate-x-0"}
                `}
            />
        </button>
    );
}

// Collapsible Section component
function CollapsibleSection({
    title,
    icon: Icon,
    defaultOpen = false,
    tooltip,
    children
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultOpen?: boolean;
    tooltip?: string;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-border">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{title}</span>
                    {tooltip && (
                        <Tooltip content={tooltip}>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </Tooltip>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>
            {isOpen && <div className="px-4 pb-4">{children}</div>}
        </div>
    );
}

// Setting Row component for toggle settings
function SettingRow({
    label,
    tooltip,
    children
}: {
    label: string;
    tooltip?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1.5">
                <span className="text-sm text-foreground">{label}</span>
                {tooltip && (
                    <Tooltip content={tooltip}>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </Tooltip>
                )}
            </div>
            {children}
        </div>
    );
}

// Slider with just value display
function SliderWithValue({
    label,
    value,
    onChange,
    min,
    max,
    step
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
}) {
    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">{label}</span>
                <span className="text-sm font-mono text-muted-foreground">{value}</span>
            </div>
            <input
                type="range"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                min={min}
                max={max}
                step={step}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
        </div>
    );
}

interface UploadedFileInfo {
    name: string;
    type: string;
}

export function FilesNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors: _errors = []
}: FilesNodeConfigProps) {
    const isInitialMount = useRef(true);

    // State
    const [chunkingAlgorithm, setChunkingAlgorithm] = useState(
        (data.chunkingAlgorithm as string) || "sentence"
    );
    const [chunkOverlap, setChunkOverlap] = useState((data.chunkOverlap as number) || 1000);
    const [chunkSize, setChunkSize] = useState((data.chunkSize as number) || 2500);
    const [advancedExtraction, setAdvancedExtraction] = useState(
        (data.advancedExtraction as boolean) ?? false
    );
    const [ocrEnabled, setOcrEnabled] = useState((data.ocrEnabled as boolean) ?? false);
    // Track uploaded files - initialize from data if available
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>(
        (data.uploadedFiles as UploadedFileInfo[]) || []
    );
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to get file extension
    const getFileExtension = (filename: string): string => {
        const ext = filename.split(".").pop()?.toLowerCase() || "";
        return ext;
    };

    // Sync state to parent
    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            chunkingAlgorithm,
            chunkOverlap,
            chunkSize,
            advancedExtraction,
            ocrEnabled,
            uploadedFiles,
            // Keep these defaults for backend compatibility
            inputName: "files",
            outputVariable: "processedFiles",
            required: true
        });
    }, [chunkingAlgorithm, chunkOverlap, chunkSize, advancedExtraction, ocrEnabled, uploadedFiles]);

    // File upload handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const newFiles = files.map((f) => ({
                name: f.name,
                type: getFileExtension(f.name)
            }));
            setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const newFiles = files.map((f) => ({
                name: f.name,
                type: getFileExtension(f.name)
            }));
            setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
    }, []);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const chunkingOptions = [
        { value: "sentence", label: "Sentence" },
        { value: "paragraph", label: "Paragraph" },
        { value: "fixed", label: "Fixed Size" },
        { value: "semantic", label: "Semantic" }
    ];

    return (
        <div>
            {/* Default Files Section */}
            <CollapsibleSection
                title="Default Files"
                icon={FileText}
                defaultOpen={true}
                tooltip="These files will be used when running the workflow. You can also trigger the workflow via API with custom files instead."
            >
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        border-2 border-dashed rounded-lg p-6 text-center transition-colors
                        ${isDragging ? "border-primary bg-primary/5" : "border-border"}
                    `}
                >
                    <div className="space-y-3">
                        <p className="text-sm font-medium">Upload files</p>
                        <p className="text-xs text-muted-foreground">
                            Upload files to your knowledge base
                        </p>
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Upload files
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.docx,.doc,.txt,.md,.html,.json,.csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </div>

                {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-1">
                        {uploadedFiles.map((file, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
                            >
                                <span className="truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-3 text-xs text-muted-foreground">
                    How to manage documents via API?{" "}
                    <a href="#" className="text-foreground underline">
                        Learn more
                    </a>
                </p>
            </CollapsibleSection>

            {/* Settings Section */}
            <CollapsibleSection title="Settings" icon={Settings} defaultOpen={false}>
                <div className="space-y-1">
                    <SettingRow label="Chunking Algorithm">
                        <div className="w-32">
                            <Select
                                value={chunkingAlgorithm}
                                onChange={setChunkingAlgorithm}
                                options={chunkingOptions}
                            />
                        </div>
                    </SettingRow>

                    <SliderWithValue
                        label="Chunk Overlap"
                        value={chunkOverlap}
                        onChange={setChunkOverlap}
                        min={0}
                        max={2000}
                        step={100}
                    />

                    <SliderWithValue
                        label="Chunk Length"
                        value={chunkSize}
                        onChange={setChunkSize}
                        min={500}
                        max={5000}
                        step={100}
                    />

                    <SettingRow
                        label="Advanced Data Extraction"
                        tooltip="Extract structured data like tables, lists, and metadata from documents for more accurate processing."
                    >
                        <Toggle checked={advancedExtraction} onChange={setAdvancedExtraction} />
                    </SettingRow>

                    <SettingRow
                        label="Text in images (OCR)"
                        tooltip="Use optical character recognition to extract text from images embedded in documents."
                    >
                        <Toggle checked={ocrEnabled} onChange={setOcrEnabled} />
                    </SettingRow>
                </div>
            </CollapsibleSection>
        </div>
    );
}
