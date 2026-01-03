export function slugify(value: string, maxLength = 100): string {
    const sanitized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!sanitized) return "";
    if (sanitized.length <= maxLength) return sanitized;

    return sanitized.slice(0, maxLength).replace(/-+$/g, "");
}
