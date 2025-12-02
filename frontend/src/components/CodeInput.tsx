/**
 * CodeInput Component
 * A syntax-highlighted code editor for form inputs
 * Uses @uiw/react-textarea-code-editor for lightweight highlighting
 */

import CodeEditor from "@uiw/react-textarea-code-editor";
import { FC } from "react";
import { useThemeStore } from "../stores/themeStore";

export type CodeLanguage = "js" | "javascript" | "python" | "json" | "sql" | "jsonata";

interface CodeInputProps {
    value: string;
    onChange: (value: string) => void;
    language?: CodeLanguage;
    placeholder?: string;
    rows?: number;
    className?: string;
    disabled?: boolean;
}

export const CodeInput: FC<CodeInputProps> = ({
    value,
    onChange,
    language = "js",
    placeholder = "",
    rows = 6,
    className = "",
    disabled = false
}) => {
    const effectiveTheme = useThemeStore((state) => state.effectiveTheme);

    // Map our language types to the library's supported languages
    const getEditorLanguage = (lang: CodeLanguage): string => {
        switch (lang) {
            case "javascript":
            case "js":
                return "js";
            case "python":
                return "python";
            case "json":
                return "json";
            case "sql":
                return "sql";
            case "jsonata":
                // JSONata uses JavaScript-like syntax
                return "js";
            default:
                return "js";
        }
    };

    const handleChange = (evn: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(evn.target.value);
    };

    return (
        <div className={`relative ${className}`}>
            <CodeEditor
                value={value}
                language={getEditorLanguage(language)}
                placeholder={placeholder}
                onChange={handleChange}
                disabled={disabled}
                padding={12}
                minHeight={rows * 20}
                style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor:
                        effectiveTheme === "dark" && !disabled
                            ? "#000"
                            : disabled
                              ? "hsl(var(--muted))"
                              : "white"
                }}
                data-color-mode={effectiveTheme}
                className={`w-full focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all ${
                    disabled ? "cursor-not-allowed opacity-60" : ""
                }`}
            />
        </div>
    );
};
