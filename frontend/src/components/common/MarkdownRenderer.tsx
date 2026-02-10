/**
 * MarkdownRenderer Component
 * Centralized markdown rendering with enhanced styling for tables, code blocks,
 * and other elements. Used across all chat interfaces.
 */

import { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/utils";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
    content: string;
    className?: string;
    compact?: boolean;
}

export const MarkdownRenderer: FC<MarkdownRendererProps> = ({
    content,
    className,
    compact = false
}) => {
    return (
        <div
            className={cn(
                "text-sm prose prose-sm max-w-none dark:prose-invert",
                compact && "prose-compact",
                className
            )}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Headers
                    h1: ({ children }) => (
                        <h1
                            className={cn(
                                "text-lg font-bold pb-2 border-b border-border",
                                compact ? "mt-2 mb-1" : "mt-4 mb-2"
                            )}
                        >
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2
                            className={cn(
                                "text-base font-bold pb-1 border-b border-border",
                                compact ? "mt-1.5 mb-1" : "mt-3 mb-2"
                            )}
                        >
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3
                            className={cn(
                                "text-sm font-bold",
                                compact ? "mt-1 mb-0.5" : "mt-2 mb-1"
                            )}
                        >
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4
                            className={cn(
                                "text-sm font-semibold",
                                compact ? "mt-1 mb-0.5" : "mt-2 mb-1"
                            )}
                        >
                            {children}
                        </h4>
                    ),

                    // Lists
                    ul: ({ children }) => (
                        <ul
                            className={cn(
                                "list-disc list-inside space-y-1",
                                compact ? "my-1" : "my-2"
                            )}
                        >
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol
                            className={cn(
                                "list-decimal list-inside space-y-1",
                                compact ? "my-1" : "my-2"
                            )}
                        >
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="ml-2 [&>p]:inline [&>p]:my-0">{children}</li>
                    ),

                    // Paragraphs
                    p: ({ children }) => (
                        <p className={cn(compact ? "my-1" : "my-1.5")}>{children}</p>
                    ),

                    // Text formatting
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,

                    // Code - inline and block
                    code: ({ children, className }) => {
                        // Check if this is a code block (has language class) or inline code
                        const match = /language-(\w+)/.exec(className || "");
                        const isBlock = match || (className && className.includes("language-"));

                        if (isBlock) {
                            const language = match ? match[1] : undefined;
                            const codeString = String(children).replace(/\n$/, "");
                            return <CodeBlock code={codeString} language={language} />;
                        }

                        // Inline code
                        return (
                            <code className="px-1.5 py-0.5 rounded bg-muted-foreground/10 text-foreground font-mono text-xs">
                                {children}
                            </code>
                        );
                    },

                    // Pre tag - wrapper for code blocks, handled by code component
                    pre: ({ children }) => <>{children}</>,

                    // Blockquotes
                    blockquote: ({ children }) => (
                        <blockquote
                            className={cn(
                                "border-l-2 border-primary pl-3 italic",
                                compact ? "my-1" : "my-2"
                            )}
                        >
                            {children}
                        </blockquote>
                    ),

                    // Tables
                    table: ({ children }) => (
                        <div className="my-3 overflow-x-auto rounded-lg border border-border">
                            <table className="min-w-full divide-y divide-border">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-border bg-card">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-sm text-foreground whitespace-normal">
                            {children}
                        </td>
                    ),

                    // Horizontal rules
                    hr: () => <hr className="my-4 border-border" />,

                    // Links
                    a: ({ children, href }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 underline underline-offset-2"
                        >
                            {children}
                        </a>
                    ),

                    // Images
                    img: ({ src, alt }) => (
                        <img
                            src={src}
                            alt={alt || ""}
                            className="max-w-full h-auto rounded-lg my-2"
                            loading="lazy"
                        />
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
