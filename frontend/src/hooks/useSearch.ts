import { useState, useMemo } from "react";

interface UseSearchOptions<T> {
    items: T[];
    searchFields: (keyof T)[];
}

interface UseSearchResult<T> {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredItems: T[];
    clearSearch: () => void;
    isSearchActive: boolean;
}

export function useSearch<T>({ items, searchFields }: UseSearchOptions<T>): UseSearchResult<T> {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) {
            return items;
        }

        const query = searchQuery.toLowerCase().trim();

        return items.filter((item) => {
            return searchFields.some((field) => {
                const value = item[field];
                if (typeof value === "string") {
                    return value.toLowerCase().includes(query);
                }
                return false;
            });
        });
    }, [items, searchQuery, searchFields]);

    const clearSearch = () => setSearchQuery("");

    return {
        searchQuery,
        setSearchQuery,
        filteredItems,
        clearSearch,
        isSearchActive: searchQuery.length > 0
    };
}
