/**
 * OData v2 Query Builder
 *
 * Helper class to construct OData v2 query strings for SAP APIs.
 * Supports $top, $skip, $select, $filter, $expand, and $orderby.
 */

export class ODataQueryBuilder {
    private params: Map<string, string> = new Map();

    /**
     * Limit the number of results returned
     * @param count Maximum number of records to return
     */
    top(count: number): this {
        this.params.set("$top", String(count));
        return this;
    }

    /**
     * Skip a number of results (for pagination)
     * @param count Number of records to skip
     */
    skip(count: number): this {
        this.params.set("$skip", String(count));
        return this;
    }

    /**
     * Select specific fields to return
     * @param fields Array of field names to include in the response
     */
    select(fields: string[]): this {
        if (fields.length > 0) {
            this.params.set("$select", fields.join(","));
        }
        return this;
    }

    /**
     * Filter results based on OData filter expression
     * @param expression OData filter expression (e.g., "status eq 'active'")
     */
    filter(expression: string): this {
        if (expression) {
            this.params.set("$filter", expression);
        }
        return this;
    }

    /**
     * Expand related entities (navigation properties)
     * @param entities Array of entity names to expand
     */
    expand(entities: string[]): this {
        if (entities.length > 0) {
            this.params.set("$expand", entities.join(","));
        }
        return this;
    }

    /**
     * Order results by specific fields
     * @param orderBy Array of field names with optional direction (e.g., ["lastName asc", "firstName desc"])
     */
    orderBy(orderBy: string[]): this {
        if (orderBy.length > 0) {
            this.params.set("$orderby", orderBy.join(","));
        }
        return this;
    }

    /**
     * Request total count in response
     */
    inlineCount(): this {
        this.params.set("$inlinecount", "allpages");
        return this;
    }

    /**
     * Set response format to JSON
     */
    formatJson(): this {
        this.params.set("$format", "json");
        return this;
    }

    /**
     * Add a custom parameter
     * @param key Parameter name (without $ prefix if not OData standard)
     * @param value Parameter value
     */
    custom(key: string, value: string): this {
        this.params.set(key, value);
        return this;
    }

    /**
     * Build the query string
     * @returns URL-encoded query string (without leading ?)
     */
    build(): string {
        const parts: string[] = [];
        for (const [key, value] of this.params) {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
        return parts.join("&");
    }

    /**
     * Build the query string with leading ?
     * @returns URL-encoded query string with leading ?
     */
    buildWithPrefix(): string {
        const query = this.build();
        return query ? `?${query}` : "";
    }

    /**
     * Reset the query builder
     */
    reset(): this {
        this.params.clear();
        return this;
    }

    /**
     * Create a new ODataQueryBuilder instance
     */
    static create(): ODataQueryBuilder {
        return new ODataQueryBuilder();
    }
}

/**
 * Helper functions for building common OData filter expressions
 */
export const ODataFilters = {
    /**
     * Equality filter: field eq 'value'
     */
    eq: (field: string, value: string | number | boolean): string => {
        if (typeof value === "string") {
            return `${field} eq '${value}'`;
        }
        return `${field} eq ${value}`;
    },

    /**
     * Not equal filter: field ne 'value'
     */
    ne: (field: string, value: string | number | boolean): string => {
        if (typeof value === "string") {
            return `${field} ne '${value}'`;
        }
        return `${field} ne ${value}`;
    },

    /**
     * Greater than filter: field gt value
     */
    gt: (field: string, value: number): string => {
        return `${field} gt ${value}`;
    },

    /**
     * Greater than or equal filter: field ge value
     */
    ge: (field: string, value: number): string => {
        return `${field} ge ${value}`;
    },

    /**
     * Less than filter: field lt value
     */
    lt: (field: string, value: number): string => {
        return `${field} lt ${value}`;
    },

    /**
     * Less than or equal filter: field le value
     */
    le: (field: string, value: number): string => {
        return `${field} le ${value}`;
    },

    /**
     * Contains filter: substringof('value', field) eq true
     * Note: OData v2 uses substringof function
     */
    contains: (field: string, value: string): string => {
        return `substringof('${value}', ${field}) eq true`;
    },

    /**
     * Starts with filter: startswith(field, 'value') eq true
     */
    startsWith: (field: string, value: string): string => {
        return `startswith(${field}, '${value}') eq true`;
    },

    /**
     * Ends with filter: endswith(field, 'value') eq true
     */
    endsWith: (field: string, value: string): string => {
        return `endswith(${field}, '${value}') eq true`;
    },

    /**
     * Date filter: field eq datetime'2024-01-01T00:00:00'
     */
    dateEq: (field: string, date: string): string => {
        return `${field} eq datetime'${date}T00:00:00'`;
    },

    /**
     * AND combination
     */
    and: (...filters: string[]): string => {
        return filters
            .filter(Boolean)
            .map((f) => `(${f})`)
            .join(" and ");
    },

    /**
     * OR combination
     */
    or: (...filters: string[]): string => {
        return filters
            .filter(Boolean)
            .map((f) => `(${f})`)
            .join(" or ");
    },

    /**
     * NOT negation
     */
    not: (filter: string): string => {
        return `not (${filter})`;
    }
};
