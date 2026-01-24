/**
 * Screenshot Capture Node Configuration Panel
 *
 * Configuration for capturing screenshots of web pages.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface ScreenshotCaptureNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const FORMAT_OPTIONS = [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "webp", label: "WebP" }
];

export function ScreenshotCaptureNodeConfig({
    data,
    onUpdate,
    errors = []
}: ScreenshotCaptureNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // URL
    const [url, setUrl] = useState<string>((data.url as string) || "");

    // Viewport settings
    const [width, setWidth] = useState<number>((data.width as number) || 1280);
    const [height, setHeight] = useState<number>((data.height as number) || 720);
    const [deviceScale, setDeviceScale] = useState<number>((data.deviceScale as number) || 1);
    const [fullPage, setFullPage] = useState<boolean>((data.fullPage as boolean) ?? false);

    // Image settings
    const [format, setFormat] = useState<string>((data.format as string) || "png");
    const [quality, setQuality] = useState<number>((data.quality as number) || 80);

    // Capture settings
    const [delay, setDelay] = useState<number>((data.delay as number) || 0);
    const [selector, setSelector] = useState<string>((data.selector as string) || "");
    const [darkMode, setDarkMode] = useState<boolean>((data.darkMode as boolean) ?? false);
    const [timeout, setTimeout] = useState<number>((data.timeout as number) || 30000);

    // Output
    const [filename, setFilename] = useState<string>((data.filename as string) || "");
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            url,
            width,
            height,
            deviceScale,
            fullPage,
            format,
            quality,
            delay,
            selector,
            darkMode,
            timeout,
            filename,
            outputVariable
        });
    }, [
        url,
        width,
        height,
        deviceScale,
        fullPage,
        format,
        quality,
        delay,
        selector,
        darkMode,
        timeout,
        filename,
        outputVariable
    ]);

    return (
        <>
            <FormSection title="URL">
                <FormField
                    label="URL"
                    description="Web page URL to capture. Use {{variableName}} for dynamic URLs."
                    error={getError("url")}
                >
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com or {{pageUrl}}"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Viewport">
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Width (px)">
                        <Input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(parseInt(e.target.value) || 1280)}
                            min={320}
                            max={3840}
                        />
                    </FormField>

                    <FormField label="Height (px)">
                        <Input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(parseInt(e.target.value) || 720)}
                            min={240}
                            max={2160}
                        />
                    </FormField>
                </div>

                <FormField label="Device Scale" description="Pixel density (1-3)">
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.5"
                            value={deviceScale}
                            onChange={(e) => setDeviceScale(parseFloat(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-8">{deviceScale}x</span>
                    </div>
                </FormField>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={fullPage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFullPage(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Capture Full Page</span>
                </label>
            </FormSection>

            <FormSection title="Image Settings">
                <FormField label="Format">
                    <Select value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
                </FormField>

                {format !== "png" && (
                    <FormField label="Quality" description="Image quality (1-100)">
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={quality}
                                onChange={(e) => setQuality(parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm font-mono w-10">{quality}%</span>
                        </div>
                    </FormField>
                )}
            </FormSection>

            <FormSection title="Capture Options">
                <FormField label="Delay (ms)" description="Wait before capturing (0-30000)">
                    <Input
                        type="number"
                        value={delay}
                        onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
                        min={0}
                        max={30000}
                    />
                </FormField>

                <FormField label="CSS Selector" description="Capture specific element (optional)">
                    <Input
                        value={selector}
                        onChange={(e) => setSelector(e.target.value)}
                        placeholder="#main-content or .article"
                    />
                </FormField>

                <FormField label="Timeout (ms)" description="Maximum wait time">
                    <Input
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(parseInt(e.target.value) || 30000)}
                        min={5000}
                        max={120000}
                    />
                </FormField>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={darkMode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDarkMode(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Dark Mode</span>
                </label>
            </FormSection>

            <FormSection title="Output">
                <FormField label="Filename" description="Optional custom filename">
                    <Input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="screenshot (auto-generated if empty)"
                    />
                </FormField>

                <OutputSettingsSection
                    nodeName={(data.label as string) || "Screenshot"}
                    nodeType="screenshotCapture"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
