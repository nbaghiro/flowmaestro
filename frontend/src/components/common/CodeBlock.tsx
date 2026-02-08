/**
 * CodeBlock Component
 * Syntax-highlighted code block with copy button for markdown rendering
 */

import CodeEditor from "@uiw/react-textarea-code-editor";
import { Check, Copy } from "lucide-react";
import { FC, useState } from "react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../stores/themeStore";

interface CodeBlockProps {
    code: string;
    language?: string;
    className?: string;
}

// Normalize language aliases to supported languages
const normalizeLanguage = (lang?: string): string => {
    if (!lang) return "text";

    const normalized = lang.toLowerCase().trim();

    const languageMap: Record<string, string> = {
        js: "js",
        javascript: "js",
        jsx: "jsx",
        ts: "tsx",
        typescript: "tsx",
        tsx: "tsx",
        py: "python",
        python: "python",
        json: "json",
        sql: "sql",
        bash: "bash",
        sh: "bash",
        shell: "bash",
        zsh: "bash",
        css: "css",
        scss: "css",
        sass: "css",
        html: "html",
        xml: "html",
        markdown: "markdown",
        md: "markdown",
        yaml: "yaml",
        yml: "yaml",
        go: "go",
        golang: "go",
        rust: "rust",
        rs: "rust",
        java: "java",
        c: "c",
        cpp: "cpp",
        "c++": "cpp",
        csharp: "csharp",
        "c#": "csharp",
        cs: "csharp",
        php: "php",
        ruby: "ruby",
        rb: "ruby",
        swift: "swift",
        kotlin: "kotlin",
        kt: "kotlin",
        scala: "scala",
        r: "r",
        jsonata: "js"
    };

    return languageMap[normalized] || "text";
};

// Get display name for language badge
const getLanguageDisplay = (lang: string): string => {
    const displayMap: Record<string, string> = {
        js: "JavaScript",
        jsx: "JSX",
        tsx: "TypeScript",
        python: "Python",
        json: "JSON",
        sql: "SQL",
        bash: "Bash",
        css: "CSS",
        html: "HTML",
        markdown: "Markdown",
        yaml: "YAML",
        go: "Go",
        rust: "Rust",
        java: "Java",
        c: "C",
        cpp: "C++",
        csharp: "C#",
        php: "PHP",
        ruby: "Ruby",
        swift: "Swift",
        kotlin: "Kotlin",
        scala: "Scala",
        r: "R",
        text: "Plain Text"
    };

    return displayMap[lang] || lang.toUpperCase();
};

export const CodeBlock: FC<CodeBlockProps> = ({ code, language, className }) => {
    const effectiveTheme = useThemeStore((state) => state.effectiveTheme);
    const [copied, setCopied] = useState(false);

    const normalizedLang = normalizeLanguage(language);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={cn("relative group my-3 rounded-lg overflow-hidden", className)}>
            {/* Header with language badge and copy button */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted-foreground/10 border-b border-border/50">
                <span className="text-xs font-medium text-muted-foreground">
                    {getLanguageDisplay(normalizedLang)}
                </span>
                <button
                    onClick={handleCopy}
                    className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        "text-muted-foreground hover:text-foreground",
                        "hover:bg-muted-foreground/10 transition-colors",
                        "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    )}
                    title={copied ? "Copied!" : "Copy code"}
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-green-500">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code content */}
            <CodeEditor
                value={code}
                language={normalizedLang}
                readOnly
                disabled
                padding={12}
                style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    backgroundColor: effectiveTheme === "dark" ? "#0d0d0d" : "#fafafa",
                    minHeight: "auto"
                }}
                data-color-mode={effectiveTheme}
                className="w-full overflow-x-auto"
            />
        </div>
    );
};
