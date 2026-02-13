import { GoogleBaseClient } from "../../../core/google";

export interface GoogleSheetsClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Google Sheets API v4 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/sheets/api/reference/rest
 * Base URL: https://sheets.googleapis.com
 */
export class GoogleSheetsClient extends GoogleBaseClient {
    constructor(config: GoogleSheetsClientConfig) {
        super({
            accessToken: config.accessToken,
            baseURL: "https://sheets.googleapis.com",
            serviceName: "Google Sheets"
        });
    }

    /**
     * Override to provide service-specific not found message
     */
    protected getNotFoundMessage(): string {
        return "Spreadsheet or resource not found.";
    }

    // ==================== Spreadsheet Operations ====================

    /**
     * Create a new spreadsheet
     */
    async createSpreadsheet(params: {
        title: string;
        sheets?: Array<{ properties: { title: string } }>;
    }): Promise<unknown> {
        return this.post("/v4/spreadsheets", {
            properties: { title: params.title },
            sheets: params.sheets
        });
    }

    /**
     * Get spreadsheet metadata
     */
    async getSpreadsheet(
        spreadsheetId: string,
        includeGridData: boolean = false
    ): Promise<unknown> {
        return this.get(`/v4/spreadsheets/${spreadsheetId}`, {
            params: { includeGridData: includeGridData.toString() }
        });
    }

    /**
     * Batch update spreadsheet (formatting, properties, etc.)
     */
    async batchUpdateSpreadsheet(spreadsheetId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            requests
        });
    }

    // ==================== Values Operations ====================

    /**
     * Get values from a range
     */
    async getValues(
        spreadsheetId: string,
        range: string,
        valueRenderOption: string = "FORMATTED_VALUE"
    ): Promise<unknown> {
        return this.get(`/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
            params: { valueRenderOption }
        });
    }

    /**
     * Get multiple ranges of values
     */
    async batchGetValues(
        spreadsheetId: string,
        ranges: string[],
        valueRenderOption: string = "FORMATTED_VALUE"
    ): Promise<unknown> {
        return this.get(`/v4/spreadsheets/${spreadsheetId}/values:batchGet`, {
            params: {
                ranges: ranges.join(","),
                valueRenderOption
            }
        });
    }

    /**
     * Append values to a range
     */
    async appendValues(
        spreadsheetId: string,
        range: string,
        values: unknown[][],
        valueInputOption: string = "USER_ENTERED"
    ): Promise<unknown> {
        return this.post(
            `/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=${valueInputOption}`,
            {
                range,
                values
            }
        );
    }

    /**
     * Update values in a range
     */
    async updateValues(
        spreadsheetId: string,
        range: string,
        values: unknown[][],
        valueInputOption: string = "USER_ENTERED"
    ): Promise<unknown> {
        return this.put(
            `/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=${valueInputOption}`,
            {
                range,
                values
            }
        );
    }

    /**
     * Batch update multiple ranges
     */
    async batchUpdateValues(
        spreadsheetId: string,
        data: Array<{ range: string; values: unknown[][] }>,
        valueInputOption: string = "USER_ENTERED"
    ): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
            valueInputOption,
            data
        });
    }

    /**
     * Clear values in a range
     */
    async clearValues(spreadsheetId: string, range: string): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {});
    }

    /**
     * Batch clear multiple ranges
     */
    async batchClearValues(spreadsheetId: string, ranges: string[]): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
            ranges
        });
    }
}
