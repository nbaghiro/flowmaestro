/**
 * Spreadsheet Generation Node Configuration Panel
 *
 * Configuration for generating Excel/CSV files from data.
 */

import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface SpreadsheetGenerationNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const FORMAT_OPTIONS = [
    { value: "xlsx", label: "Excel (.xlsx)" },
    { value: "csv", label: "CSV (.csv)" }
];

export function SpreadsheetGenerationNodeConfig({
    data,
    onUpdate,
    errors = []
}: SpreadsheetGenerationNodeConfigProps) {
    const isInitialMount = useRef(true);
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Core settings
    const [format, setFormat] = useState<string>((data.format as string) || "xlsx");
    const [filename, setFilename] = useState<string>((data.filename as string) || "spreadsheet");

    // Data source
    const [dataSource, setDataSource] = useState<string>((data.dataSource as string) || "");
    const [sheetName, setSheetName] = useState<string>((data.sheetName as string) || "Sheet1");

    // Styling (xlsx only)
    const [headerBold, setHeaderBold] = useState<boolean>((data.headerBold as boolean) ?? true);
    const [headerBackgroundColor, setHeaderBackgroundColor] = useState<string>(
        (data.headerBackgroundColor as string) || "#4F46E5"
    );
    const [headerFontColor, setHeaderFontColor] = useState<string>(
        (data.headerFontColor as string) || "#FFFFFF"
    );
    const [alternateRows, setAlternateRows] = useState<boolean>(
        (data.alternateRows as boolean) ?? false
    );
    const [freezeHeader, setFreezeHeader] = useState<boolean>(
        (data.freezeHeader as boolean) ?? true
    );

    // Output
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            format,
            filename,
            dataSource,
            sheetName,
            headerBold,
            headerBackgroundColor,
            headerFontColor,
            alternateRows,
            freezeHeader,
            outputVariable
        });
    }, [
        format,
        filename,
        dataSource,
        sheetName,
        headerBold,
        headerBackgroundColor,
        headerFontColor,
        alternateRows,
        freezeHeader,
        outputVariable
    ]);

    const isXlsx = format === "xlsx";

    return (
        <>
            <FormSection title="Format">
                <FormField label="Output Format" error={getError("format")}>
                    <Select value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
                </FormField>

                <FormField label="Filename" description="Output filename without extension">
                    <Input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="spreadsheet"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Data Source">
                <FormField
                    label="Data"
                    description="Variable containing array of row objects. Use {{variableName}} syntax."
                    error={getError("dataSource")}
                >
                    <Textarea
                        value={dataSource}
                        onChange={(e) => setDataSource(e.target.value)}
                        placeholder='{{rows}} or [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]'
                        rows={4}
                    />
                </FormField>

                {isXlsx && (
                    <FormField
                        label="Sheet Name"
                        description="Name of the worksheet (max 31 characters)"
                    >
                        <Input
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value.slice(0, 31))}
                            placeholder="Sheet1"
                            maxLength={31}
                        />
                    </FormField>
                )}
            </FormSection>

            {isXlsx && (
                <FormSection title="Styling">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={headerBold}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setHeaderBold(e.target.checked)
                            }
                            className="w-4 h-4"
                        />
                        <span className="text-sm">Bold Header Row</span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Header Background">
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={headerBackgroundColor}
                                    onChange={(e) => setHeaderBackgroundColor(e.target.value)}
                                    className="w-8 h-8 rounded border border-border cursor-pointer"
                                />
                                <Input
                                    value={headerBackgroundColor}
                                    onChange={(e) => setHeaderBackgroundColor(e.target.value)}
                                    placeholder="#4F46E5"
                                    className="font-mono text-xs"
                                />
                            </div>
                        </FormField>

                        <FormField label="Header Text">
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={headerFontColor}
                                    onChange={(e) => setHeaderFontColor(e.target.value)}
                                    className="w-8 h-8 rounded border border-border cursor-pointer"
                                />
                                <Input
                                    value={headerFontColor}
                                    onChange={(e) => setHeaderFontColor(e.target.value)}
                                    placeholder="#FFFFFF"
                                    className="font-mono text-xs"
                                />
                            </div>
                        </FormField>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={alternateRows}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setAlternateRows(e.target.checked)
                            }
                            className="w-4 h-4"
                        />
                        <span className="text-sm">Alternate Row Colors</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={freezeHeader}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFreezeHeader(e.target.checked)
                            }
                            className="w-4 h-4"
                        />
                        <span className="text-sm">Freeze Header Row</span>
                    </label>
                </FormSection>
            )}

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Spreadsheet"}
                    nodeType="spreadsheetGeneration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
