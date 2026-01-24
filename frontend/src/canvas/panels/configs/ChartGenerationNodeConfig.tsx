/**
 * Chart Generation Node Configuration Panel
 *
 * Configuration for generating charts from data using Chart.js.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface ChartGenerationNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const CHART_TYPE_OPTIONS = [
    { value: "bar", label: "Bar Chart" },
    { value: "line", label: "Line Chart" },
    { value: "pie", label: "Pie Chart" },
    { value: "scatter", label: "Scatter Plot" },
    { value: "area", label: "Area Chart" },
    { value: "donut", label: "Donut Chart" },
    { value: "histogram", label: "Histogram" },
    { value: "heatmap", label: "Heatmap" },
    { value: "horizontal_bar", label: "Horizontal Bar" }
];

const THEME_OPTIONS = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
];

const LEGEND_POSITION_OPTIONS = [
    { value: "top", label: "Top" },
    { value: "bottom", label: "Bottom" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "false", label: "Hidden" }
];

export function ChartGenerationNodeConfig({
    data,
    onUpdate,
    errors = []
}: ChartGenerationNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Chart type
    const [chartType, setChartType] = useState<string>((data.chartType as string) || "bar");

    // Data configuration
    const [dataLabels, setDataLabels] = useState<string>((data.dataLabels as string) || "");
    const [dataSource, setDataSource] = useState<string>((data.dataSource as string) || "");

    // Chart options
    const [title, setTitle] = useState<string>((data.title as string) || "");
    const [subtitle, setSubtitle] = useState<string>((data.subtitle as string) || "");
    const [xAxisLabel, setXAxisLabel] = useState<string>((data.xAxisLabel as string) || "");
    const [yAxisLabel, setYAxisLabel] = useState<string>((data.yAxisLabel as string) || "");
    const [width, setWidth] = useState<number>((data.width as number) || 800);
    const [height, setHeight] = useState<number>((data.height as number) || 600);
    const [theme, setTheme] = useState<string>((data.theme as string) || "light");
    const [legend, setLegend] = useState<string>((data.legend as string) || "top");
    const [showGrid, setShowGrid] = useState<boolean>((data.showGrid as boolean) ?? true);
    const [showValues, setShowValues] = useState<boolean>((data.showValues as boolean) ?? false);

    // Output
    const [filename, setFilename] = useState<string>((data.filename as string) || "chart");
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            chartType,
            dataLabels,
            dataSource,
            title,
            subtitle,
            xAxisLabel,
            yAxisLabel,
            width,
            height,
            theme,
            legend: legend === "false" ? false : legend,
            showGrid,
            showValues,
            filename,
            outputVariable
        });
    }, [
        chartType,
        dataLabels,
        dataSource,
        title,
        subtitle,
        xAxisLabel,
        yAxisLabel,
        width,
        height,
        theme,
        legend,
        showGrid,
        showValues,
        filename,
        outputVariable
    ]);

    const isPieChart = chartType === "pie" || chartType === "donut";

    return (
        <>
            <FormSection title="Chart Type">
                <FormField label="Chart Type" error={getError("chartType")}>
                    <Select
                        value={chartType}
                        onChange={setChartType}
                        options={CHART_TYPE_OPTIONS}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Data Source">
                <FormField
                    label="Data Source"
                    description="Variable containing the datasets array. Use {{variableName}} syntax."
                    error={getError("dataSource")}
                >
                    <Textarea
                        value={dataSource}
                        onChange={(e) => setDataSource(e.target.value)}
                        placeholder='{{datasets}} or [{"label": "Sales", "data": [10, 20, 30]}]'
                        rows={3}
                    />
                </FormField>

                <FormField
                    label="Labels"
                    description="X-axis labels or pie slice labels. Use {{variableName}} or comma-separated values."
                    error={getError("dataLabels")}
                >
                    <Input
                        value={dataLabels}
                        onChange={(e) => setDataLabels(e.target.value)}
                        placeholder="{{labels}} or Jan, Feb, Mar, Apr"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Chart Options">
                <FormField label="Title" error={getError("title")}>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Chart Title"
                    />
                </FormField>

                <FormField label="Subtitle">
                    <Input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Optional subtitle"
                    />
                </FormField>

                {!isPieChart && (
                    <>
                        <FormField label="X-Axis Label">
                            <Input
                                value={xAxisLabel}
                                onChange={(e) => setXAxisLabel(e.target.value)}
                                placeholder="X-Axis"
                            />
                        </FormField>

                        <FormField label="Y-Axis Label">
                            <Input
                                value={yAxisLabel}
                                onChange={(e) => setYAxisLabel(e.target.value)}
                                placeholder="Y-Axis"
                            />
                        </FormField>
                    </>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Width (px)">
                        <Input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(parseInt(e.target.value) || 800)}
                            min={200}
                            max={2000}
                        />
                    </FormField>

                    <FormField label="Height (px)">
                        <Input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(parseInt(e.target.value) || 600)}
                            min={200}
                            max={2000}
                        />
                    </FormField>
                </div>

                <FormField label="Theme">
                    <Select value={theme} onChange={setTheme} options={THEME_OPTIONS} />
                </FormField>

                <FormField label="Legend Position">
                    <Select value={legend} onChange={setLegend} options={LEGEND_POSITION_OPTIONS} />
                </FormField>

                {!isPieChart && (
                    <>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Input
                                type="checkbox"
                                checked={showGrid}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setShowGrid(e.target.checked)
                                }
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Show Grid Lines</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <Input
                                type="checkbox"
                                checked={showValues}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setShowValues(e.target.checked)
                                }
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Show Data Values</span>
                        </label>
                    </>
                )}
            </FormSection>

            <FormSection title="Output">
                <FormField label="Filename" description="Output filename without extension">
                    <Input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="chart"
                    />
                </FormField>

                <OutputSettingsSection
                    nodeName={(data.label as string) || "Chart"}
                    nodeType="chartGeneration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
