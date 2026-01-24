/**
 * OCR Extraction Node Configuration Panel
 *
 * Configuration for extracting text from images using Tesseract OCR.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface OCRExtractionNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const LANGUAGE_OPTIONS = [
    { value: "eng", label: "English" },
    { value: "spa", label: "Spanish" },
    { value: "fra", label: "French" },
    { value: "deu", label: "German" },
    { value: "ita", label: "Italian" },
    { value: "por", label: "Portuguese" },
    { value: "nld", label: "Dutch" },
    { value: "rus", label: "Russian" },
    { value: "chi_sim", label: "Chinese (Simplified)" },
    { value: "chi_tra", label: "Chinese (Traditional)" },
    { value: "jpn", label: "Japanese" },
    { value: "kor", label: "Korean" },
    { value: "ara", label: "Arabic" },
    { value: "hin", label: "Hindi" },
    { value: "pol", label: "Polish" },
    { value: "ukr", label: "Ukrainian" }
];

const OUTPUT_FORMAT_OPTIONS = [
    { value: "text", label: "Plain Text" },
    { value: "json", label: "JSON (with bounding boxes)" },
    { value: "tsv", label: "TSV (Tab-separated)" },
    { value: "hocr", label: "hOCR (HTML format)" }
];

const PSM_OPTIONS = [
    { value: "3", label: "Automatic (Default)" },
    { value: "1", label: "Automatic + OSD" },
    { value: "4", label: "Single Column" },
    { value: "6", label: "Single Block of Text" },
    { value: "7", label: "Single Line" },
    { value: "8", label: "Single Word" },
    { value: "10", label: "Single Character" },
    { value: "11", label: "Sparse Text" },
    { value: "13", label: "Raw Line" }
];

export function OCRExtractionNodeConfig({
    data,
    onUpdate,
    errors = []
}: OCRExtractionNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Image source
    const [imageSource, setImageSource] = useState<string>((data.imageSource as string) || "");

    // OCR settings
    const [languages, setLanguages] = useState<string[]>((data.languages as string[]) || ["eng"]);
    const [outputFormat, setOutputFormat] = useState<string>(
        (data.outputFormat as string) || "text"
    );
    const [psm, setPsm] = useState<string>((data.psm as string) || "3");
    const [confidenceThreshold, setConfidenceThreshold] = useState<number>(
        (data.confidenceThreshold as number) ?? 0
    );

    // Preprocessing
    const [grayscale, setGrayscale] = useState<boolean>((data.grayscale as boolean) ?? true);
    const [denoise, setDenoise] = useState<boolean>((data.denoise as boolean) ?? false);
    const [deskew, setDeskew] = useState<boolean>((data.deskew as boolean) ?? false);
    const [threshold, setThreshold] = useState<boolean>((data.threshold as boolean) ?? false);

    // Output variable
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            imageSource,
            languages,
            outputFormat,
            psm: parseInt(psm),
            confidenceThreshold,
            preprocessing: {
                grayscale,
                denoise,
                deskew,
                threshold
            },
            outputVariable
        });
    }, [
        imageSource,
        languages,
        outputFormat,
        psm,
        confidenceThreshold,
        grayscale,
        denoise,
        deskew,
        threshold,
        outputVariable
    ]);

    // Handle language selection (multi-select simulation)
    const handleLanguageChange = (value: string) => {
        if (languages.includes(value)) {
            // Remove if already selected (keep at least one)
            if (languages.length > 1) {
                setLanguages(languages.filter((l) => l !== value));
            }
        } else {
            // Add to selection
            setLanguages([...languages, value]);
        }
    };

    return (
        <>
            <FormSection title="Image Source">
                <FormField
                    label="Image File"
                    description="Path or variable containing the image file. Supports PNG, JPG, TIFF, BMP."
                    error={getError("imageSource")}
                >
                    <Input
                        value={imageSource}
                        onChange={(e) => setImageSource(e.target.value)}
                        placeholder="{{imageFilePath}} or /path/to/image.png"
                    />
                </FormField>
            </FormSection>

            <FormSection title="OCR Settings">
                <FormField
                    label="Languages"
                    description="Select one or more languages for better accuracy"
                >
                    <div className="flex flex-wrap gap-2">
                        {LANGUAGE_OPTIONS.map((lang) => (
                            <button
                                key={lang.value}
                                type="button"
                                onClick={() => handleLanguageChange(lang.value)}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    languages.includes(lang.value)
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                                }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Selected: {languages.join(", ")}
                    </p>
                </FormField>

                <FormField
                    label="Page Segmentation Mode"
                    description="How Tesseract analyzes the page"
                >
                    <Select value={psm} onChange={setPsm} options={PSM_OPTIONS} />
                </FormField>

                <FormField label="Output Format">
                    <Select
                        value={outputFormat}
                        onChange={setOutputFormat}
                        options={OUTPUT_FORMAT_OPTIONS}
                    />
                </FormField>

                <FormField
                    label="Confidence Threshold"
                    description="Filter out words with confidence below this threshold (0-100)"
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={confidenceThreshold}
                            onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-10">{confidenceThreshold}%</span>
                    </div>
                </FormField>
            </FormSection>

            <FormSection title="Preprocessing" defaultExpanded={false}>
                <p className="text-xs text-muted-foreground mb-3">
                    Image preprocessing can improve OCR accuracy for low-quality images.
                </p>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={grayscale}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setGrayscale(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Convert to Grayscale</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={denoise}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDenoise(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Apply Denoising</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={deskew}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDeskew(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-correct Skew</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={threshold}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setThreshold(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Apply Adaptive Thresholding</span>
                </label>
            </FormSection>

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "OCR"}
                    nodeType="ocrExtraction"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
