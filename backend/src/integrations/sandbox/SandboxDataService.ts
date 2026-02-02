/**
 * Sandbox Data Service
 *
 * Service for managing and retrieving sandbox responses for integration operations.
 * Used by ExecutionRouter to return test data instead of hitting real APIs when
 * the connection is marked as a test connection (isTestConnection: true).
 */

import { fixtureRegistry } from "./FixtureRegistry";
import { isSimpleFilterConfig } from "./types";
import type { FilterableDataConfig, SandboxScenario, TestFixture } from "./types";
import type { OperationResult } from "../core/types";

export class SandboxDataService {
    private scenarios: Map<string, SandboxScenario[]> = new Map();

    /**
     * Get a sandbox response for an operation
     */
    async getSandboxResponse(
        provider: string,
        operation: string,
        params: Record<string, unknown>
    ): Promise<OperationResult | null> {
        const key = `${provider}:${operation}`;

        // First check for registered scenarios (custom test scenarios)
        const scenarios = this.scenarios.get(key) || [];
        for (const scenario of scenarios) {
            if (this.matchesParams(scenario.paramMatchers, params)) {
                if (scenario.delay) {
                    await this.sleep(scenario.delay);
                }
                return this.interpolateResponse(scenario.response, params);
            }
        }

        // Fall back to fixture data from registry
        const fixture = fixtureRegistry.get(provider, operation);
        if (fixture && fixture.validCases.length > 0) {
            // Check if this fixture supports dynamic filtering
            if (fixture.filterableData) {
                return this.getFilteredResponse(fixture, params);
            }

            // Find the best matching test case (most specific match wins)
            // Sort by number of matching parameters (more specific matches first)
            const matchedCases = fixture.validCases
                .map((testCase) => ({
                    testCase,
                    input: testCase.input as Record<string, unknown>,
                    specificity: Object.keys(testCase.input as Record<string, unknown>).length
                }))
                .filter(({ input }) => this.matchesParams(input, params))
                .sort((a, b) => b.specificity - a.specificity);

            if (matchedCases.length > 0) {
                return {
                    success: true,
                    data: matchedCases[0].testCase.expectedOutput
                };
            }
            // Default to first valid case
            return {
                success: true,
                data: fixture.validCases[0].expectedOutput
            };
        }

        return null;
    }

    /**
     * Register a custom scenario for testing
     */
    registerScenario(scenario: SandboxScenario): void {
        const key = `${scenario.provider}:${scenario.operation}`;
        if (!this.scenarios.has(key)) {
            this.scenarios.set(key, []);
        }
        // Add to front so custom scenarios take precedence
        this.scenarios.get(key)!.unshift(scenario);
    }

    /**
     * Clear all custom scenarios
     */
    clearScenarios(): void {
        this.scenarios.clear();
    }

    /**
     * Remove a specific scenario by ID
     */
    removeScenario(scenarioId: string): void {
        for (const [key, scenarios] of this.scenarios) {
            const filtered = scenarios.filter((s) => s.id !== scenarioId);
            if (filtered.length !== scenarios.length) {
                this.scenarios.set(key, filtered);
            }
        }
    }

    /**
     * Check if sandbox data exists for an operation
     */
    hasSandboxData(provider: string, operation: string): boolean {
        const key = `${provider}:${operation}`;
        // Check scenarios
        if (this.scenarios.has(key) && this.scenarios.get(key)!.length > 0) {
            return true;
        }
        // Check fixtures
        return fixtureRegistry.has(provider, operation);
    }

    /**
     * Get a filtered response from filterable data
     */
    private getFilteredResponse(
        fixture: TestFixture,
        params: Record<string, unknown>
    ): OperationResult {
        const config = fixture.filterableData!;
        let records = [...config.records];

        // Apply filters based on provider type
        records = this.applyFilters(records, params, config, fixture.provider);

        // Apply pagination
        const { paginatedRecords, offset } = this.applyPagination(records, params, config);

        // Strip internal metadata fields (prefixed with _) from records
        const cleanedRecords = paginatedRecords.map((record) => this.stripInternalFields(record));

        // Build the response
        const response: Record<string, unknown> = {
            [config.recordsField]: cleanedRecords
        };

        // Add offset if there are more records
        if (offset !== null && config.offsetField) {
            response[config.offsetField] = offset;
        }

        return {
            success: true,
            data: response
        };
    }

    /**
     * Strip internal metadata fields (prefixed with _) from a record
     */
    private stripInternalFields(record: Record<string, unknown>): Record<string, unknown> {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
            if (!key.startsWith("_")) {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    /**
     * Apply filters to records based on provider type
     */
    private applyFilters(
        records: Record<string, unknown>[],
        params: Record<string, unknown>,
        config: FilterableDataConfig,
        _provider: string
    ): Record<string, unknown>[] {
        const filterType = config.filterConfig?.type || "generic";

        switch (filterType) {
            case "airtable":
                return this.applyAirtableFilter(records, params);
            case "hubspot":
                return this.applyHubspotFilter(records, params);
            case "generic":
            default:
                return this.applyGenericFilter(records, params, config);
        }
    }

    /**
     * Apply Airtable-style filtering (filterByFormula, view)
     */
    private applyAirtableFilter(
        records: Record<string, unknown>[],
        params: Record<string, unknown>
    ): Record<string, unknown>[] {
        let filtered = records;

        // Handle view filtering
        const view = params.view as string | undefined;
        if (view) {
            // For sandbox, we simulate view filtering by looking for records
            // that have a _views metadata field containing this view name
            filtered = filtered.filter((record) => {
                const recordViews = (record as Record<string, unknown>)._views as
                    | string[]
                    | undefined;
                if (recordViews) {
                    return recordViews.includes(view);
                }
                // If no _views metadata, include all records (simulates default view)
                return true;
            });
        }

        // Handle filterByFormula
        const formula = params.filterByFormula as string | undefined;
        if (formula) {
            filtered = this.parseAndApplyAirtableFormula(filtered, formula);
        }

        return filtered;
    }

    /**
     * Parse and apply Airtable formula filter
     * Supports basic formulas like: {FieldName} = 'Value'
     */
    private parseAndApplyAirtableFormula(
        records: Record<string, unknown>[],
        formula: string
    ): Record<string, unknown>[] {
        // Parse NOT() formula FIRST: NOT({FieldName} = 'Value')
        // Must check before equality since equality regex would match the inner part
        const notMatch = formula.match(/NOT\s*\(\s*\{([^}]+)\}\s*=\s*['"]([^'"]+)['"]\s*\)/);
        if (notMatch) {
            const fieldName = notMatch[1];
            const excludedValue = notMatch[2];

            return records.filter((record) => {
                const fields = (record as Record<string, unknown>).fields as Record<
                    string,
                    unknown
                >;
                if (!fields) return true;
                return String(fields[fieldName]) !== excludedValue;
            });
        }

        // Parse FIND formula: FIND('text', {FieldName}) > 0
        const findMatch = formula.match(
            /FIND\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}\s*\)\s*>\s*0/
        );
        if (findMatch) {
            const searchText = findMatch[1].toLowerCase();
            const fieldName = findMatch[2];

            return records.filter((record) => {
                const fields = (record as Record<string, unknown>).fields as Record<
                    string,
                    unknown
                >;
                if (!fields) return false;
                const fieldValue = String(fields[fieldName] || "").toLowerCase();
                return fieldValue.includes(searchText);
            });
        }

        // Parse simple equality: {FieldName} = 'Value' or {FieldName} = "Value"
        const equalityMatch = formula.match(/\{([^}]+)\}\s*=\s*['"]([^'"]+)['"]/);
        if (equalityMatch) {
            const fieldName = equalityMatch[1];
            const expectedValue = equalityMatch[2];

            return records.filter((record) => {
                const fields = (record as Record<string, unknown>).fields as Record<
                    string,
                    unknown
                >;
                if (!fields) return false;
                return String(fields[fieldName]) === expectedValue;
            });
        }

        // If formula can't be parsed, return all records
        // In a real implementation, you might want to throw an error
        return records;
    }

    /**
     * Apply HubSpot-style filtering (filterGroups)
     */
    private applyHubspotFilter(
        records: Record<string, unknown>[],
        params: Record<string, unknown>
    ): Record<string, unknown>[] {
        const filterGroups = params.filterGroups as
            | Array<{
                  filters: Array<{
                      propertyName: string;
                      operator: string;
                      value: unknown;
                  }>;
              }>
            | undefined;

        if (!filterGroups || filterGroups.length === 0) {
            return records;
        }

        // filterGroups are OR'd together, filters within a group are AND'd
        return records.filter((record) => {
            const properties = (record as Record<string, unknown>).properties as Record<
                string,
                unknown
            >;
            if (!properties) return false;

            // Record matches if ANY filter group matches (OR)
            return filterGroups.some((group) => {
                // All filters in the group must match (AND)
                return group.filters.every((filter) => {
                    const fieldValue = properties[filter.propertyName];
                    return this.applyHubspotOperator(fieldValue, filter.operator, filter.value);
                });
            });
        });
    }

    /**
     * Apply HubSpot filter operator
     */
    private applyHubspotOperator(
        fieldValue: unknown,
        operator: string,
        filterValue: unknown
    ): boolean {
        const stringFieldValue = String(fieldValue || "").toLowerCase();
        const stringFilterValue = String(filterValue || "").toLowerCase();

        switch (operator) {
            case "EQ":
                return stringFieldValue === stringFilterValue;
            case "NEQ":
                return stringFieldValue !== stringFilterValue;
            case "CONTAINS_TOKEN":
                return stringFieldValue.includes(stringFilterValue);
            case "NOT_CONTAINS_TOKEN":
                return !stringFieldValue.includes(stringFilterValue);
            case "GT":
                return Number(fieldValue) > Number(filterValue);
            case "GTE":
                return Number(fieldValue) >= Number(filterValue);
            case "LT":
                return Number(fieldValue) < Number(filterValue);
            case "LTE":
                return Number(fieldValue) <= Number(filterValue);
            case "HAS_PROPERTY":
                return fieldValue !== null && fieldValue !== undefined;
            case "NOT_HAS_PROPERTY":
                return fieldValue === null || fieldValue === undefined;
            default:
                return true;
        }
    }

    /**
     * Apply generic filtering based on params
     */
    private applyGenericFilter(
        records: Record<string, unknown>[],
        params: Record<string, unknown>,
        config: FilterableDataConfig
    ): Record<string, unknown>[] {
        const filterConfig = config.filterConfig;

        // If no filter config, return all records
        if (!filterConfig) {
            return records;
        }

        // Handle simple filter config (type + filterableFields)
        if (isSimpleFilterConfig(filterConfig)) {
            const filterableFields = filterConfig.filterableFields || [];
            return records.filter((record) => {
                for (const field of filterableFields) {
                    if (params[field] !== undefined) {
                        const recordValue = (record as Record<string, unknown>)[field];
                        if (recordValue !== params[field]) {
                            return false;
                        }
                    }
                }
                return true;
            });
        }

        // Handle advanced filter config (per-field definitions)
        return records.filter((record) => {
            for (const [paramName, fieldConfig] of Object.entries(filterConfig)) {
                if (params[paramName] !== undefined) {
                    const paramValue = params[paramName];

                    // If field is a function, call it
                    if (typeof fieldConfig.field === "function") {
                        const result = fieldConfig.field(record, paramValue);
                        if (result === false) {
                            return false;
                        }
                        // For computed fields that return a value, compare with param
                        if (typeof result !== "boolean" && result !== paramValue) {
                            return false;
                        }
                    } else {
                        // Field is a string, use as property name
                        const recordValue = (record as Record<string, unknown>)[fieldConfig.field];
                        if (recordValue !== paramValue) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });
    }

    /**
     * Apply pagination to records
     */
    private applyPagination(
        records: Record<string, unknown>[],
        params: Record<string, unknown>,
        config: FilterableDataConfig
    ): { paginatedRecords: Record<string, unknown>[]; offset: string | null } {
        const pageSizeParam = config.pageSizeParam || "pageSize";
        const offsetParam = config.offsetParam || "offset";

        const pageSize = Math.min(
            Number(params[pageSizeParam]) || config.defaultPageSize || 100,
            config.maxPageSize || 1000
        );

        // Parse offset to get start index
        let startIndex = 0;
        const rawOffsetValue = params[offsetParam];
        const offsetValue =
            rawOffsetValue !== undefined && rawOffsetValue !== null
                ? String(rawOffsetValue)
                : undefined;
        if (offsetValue) {
            // For Airtable-style offsets (itrXXX/recXXX), extract the record ID
            const recordIdMatch = offsetValue.match(/\/rec([A-Za-z0-9]+)$/);
            if (recordIdMatch) {
                // Find the index of this record and start after it
                const recordId = `rec${recordIdMatch[1]}`;
                const recordIndex = records.findIndex(
                    (r) => (r as Record<string, unknown>).id === recordId
                );
                if (recordIndex >= 0) {
                    startIndex = recordIndex + 1;
                }
            } else {
                // Try parsing as a numeric index
                const numericOffset = parseInt(offsetValue, 10);
                if (!isNaN(numericOffset)) {
                    startIndex = numericOffset;
                }
            }
        }

        // Slice the records
        const paginatedRecords = records.slice(startIndex, startIndex + pageSize);

        // Determine if there's a next page and generate offset
        let offset: string | null = null;
        if (startIndex + pageSize < records.length) {
            const lastRecord = paginatedRecords[paginatedRecords.length - 1];
            const lastRecordId = (lastRecord as Record<string, unknown>).id as string;

            // Generate Airtable-style offset or numeric offset
            if (lastRecordId && lastRecordId.startsWith("rec")) {
                offset = `itr${this.randomString(16)}/${lastRecordId}`;
            } else {
                offset = String(startIndex + pageSize);
            }
        }

        return { paginatedRecords, offset };
    }

    /**
     * Check if params match the matchers
     */
    private matchesParams(
        matchers: Record<string, unknown> | undefined,
        params: Record<string, unknown>
    ): boolean {
        if (!matchers) return true;

        for (const [key, value] of Object.entries(matchers)) {
            if (params[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Interpolate dynamic values in response
     *
     * Supported patterns:
     * - {{param.name}} - Value from input params (supports nested paths)
     * - {{random:N}} - Random alphanumeric string of length N
     * - {{timestamp}} - Current Unix timestamp
     * - {{iso}} - Current ISO date string
     * - {{uuid}} - Random UUID v4
     */
    private interpolateResponse(
        response: OperationResult,
        params: Record<string, unknown>
    ): OperationResult {
        const interpolatedData = this.interpolateValue(response.data, params);
        return {
            ...response,
            data: interpolatedData
        };
    }

    /**
     * Recursively interpolate values in an object/array/string
     */
    private interpolateValue(value: unknown, params: Record<string, unknown>): unknown {
        if (typeof value === "string") {
            return this.interpolateString(value, params);
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.interpolateValue(item, params));
        }
        if (value !== null && typeof value === "object") {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value)) {
                result[key] = this.interpolateValue(val, params);
            }
            return result;
        }
        return value;
    }

    /**
     * Interpolate template patterns in a string
     */
    private interpolateString(str: string, params: Record<string, unknown>): string {
        return str.replace(/\{\{([^}]+)\}\}/g, (_match, expression: string) => {
            const trimmed = expression.trim();

            // {{random:N}} - Random string of length N
            if (trimmed.startsWith("random:")) {
                const length = parseInt(trimmed.slice(7), 10) || 8;
                return this.randomString(length);
            }

            // {{timestamp}} - Unix timestamp
            if (trimmed === "timestamp") {
                return String(Date.now());
            }

            // {{iso}} - ISO date string
            if (trimmed === "iso") {
                return new Date().toISOString();
            }

            // {{uuid}} - Random UUID
            if (trimmed === "uuid") {
                return this.randomUUID();
            }

            // {{param.path}} or {{path}} - Value from params
            const paramPath = trimmed.startsWith("param.") ? trimmed.slice(6) : trimmed;
            const paramValue = this.getNestedValue(params, paramPath);
            if (paramValue !== undefined) {
                return String(paramValue);
            }

            // Return original if no match
            return `{{${expression}}}`;
        });
    }

    /**
     * Get a nested value from an object using dot notation
     */
    private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
        const parts = path.split(".");
        let current: unknown = obj;
        for (const part of parts) {
            if (current === null || current === undefined || typeof current !== "object") {
                return undefined;
            }
            current = (current as Record<string, unknown>)[part];
        }
        return current;
    }

    /**
     * Generate a random alphanumeric string
     */
    private randomString(length: number): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generate a random UUID v4
     */
    private randomUUID(): string {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export const sandboxDataService = new SandboxDataService();
