/**
 * Microsoft Excel Client
 *
 * REST API client for Microsoft Graph Excel endpoints.
 * Uses Microsoft Graph API v1.0 Excel REST API.
 *
 * Note: Excel REST API works best with OneDrive for Business/SharePoint.
 * Some features may have limited functionality with personal OneDrive accounts.
 */

import { MicrosoftGraphClient } from "../../../core/microsoft";

export interface ExcelClientConfig {
    accessToken: string;
}

export interface WorksheetInfo {
    id: string;
    name: string;
    position: number;
    visibility: string;
}

export interface WorksheetsResponse {
    value: WorksheetInfo[];
}

export interface RangeData {
    address: string;
    addressLocal: string;
    cellCount: number;
    columnCount: number;
    columnIndex: number;
    formulas?: unknown[][];
    formulasLocal?: unknown[][];
    formulasR1C1?: unknown[][];
    numberFormat?: string[][];
    rowCount: number;
    rowIndex: number;
    text?: string[][];
    values?: unknown[][];
    valueTypes?: string[][];
}

export interface TableInfo {
    id: string;
    name: string;
    showHeaders: boolean;
    showTotals: boolean;
    style: string;
}

export interface TablesResponse {
    value: TableInfo[];
}

export interface TableRowsResponse {
    value: Array<{
        index: number;
        values: unknown[][];
    }>;
}

export class MicrosoftExcelClient extends MicrosoftGraphClient {
    constructor(config: ExcelClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Microsoft Excel"
        });
    }

    /**
     * Get workbook path helper
     */
    private getWorkbookPath(itemId: string): string {
        return `/me/drive/items/${itemId}/workbook`;
    }

    /**
     * List worksheets in a workbook
     */
    async getWorksheets(itemId: string): Promise<WorksheetsResponse> {
        return this.get(`${this.getWorkbookPath(itemId)}/worksheets`);
    }

    /**
     * Get a specific worksheet
     */
    async getWorksheet(itemId: string, worksheetIdOrName: string): Promise<WorksheetInfo> {
        return this.get(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}`
        );
    }

    /**
     * Create a new worksheet
     */
    async createWorksheet(itemId: string, name?: string): Promise<WorksheetInfo> {
        const body = name ? { name } : {};
        return this.post(`${this.getWorkbookPath(itemId)}/worksheets/add`, body);
    }

    /**
     * Read a range of cells
     */
    async readRange(
        itemId: string,
        worksheetIdOrName: string,
        address: string
    ): Promise<RangeData> {
        const encodedAddress = encodeURIComponent(address);
        return this.get(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodedAddress}')`
        );
    }

    /**
     * Write to a range of cells
     */
    async writeRange(
        itemId: string,
        worksheetIdOrName: string,
        address: string,
        values: unknown[][]
    ): Promise<RangeData> {
        const encodedAddress = encodeURIComponent(address);
        return this.patch(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodedAddress}')`,
            { values }
        );
    }

    /**
     * Get used range in worksheet
     */
    async getUsedRange(itemId: string, worksheetIdOrName: string): Promise<RangeData> {
        return this.get(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/usedRange`
        );
    }

    /**
     * List tables in a workbook
     */
    async getTables(itemId: string): Promise<TablesResponse> {
        return this.get(`${this.getWorkbookPath(itemId)}/tables`);
    }

    /**
     * Get table rows
     */
    async getTableRows(itemId: string, tableIdOrName: string): Promise<TableRowsResponse> {
        return this.get(
            `${this.getWorkbookPath(itemId)}/tables/${encodeURIComponent(tableIdOrName)}/rows`
        );
    }

    /**
     * Add a row to a table
     */
    async addTableRow(
        itemId: string,
        tableIdOrName: string,
        values: unknown[]
    ): Promise<{ index: number; values: unknown[][] }> {
        return this.post(
            `${this.getWorkbookPath(itemId)}/tables/${encodeURIComponent(tableIdOrName)}/rows`,
            {
                values: [values]
            }
        );
    }

    /**
     * Add multiple rows to a table
     */
    async addTableRows(
        itemId: string,
        tableIdOrName: string,
        values: unknown[][]
    ): Promise<TableRowsResponse> {
        return this.post(
            `${this.getWorkbookPath(itemId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/add`,
            { values }
        );
    }

    /**
     * Get table header row
     */
    async getTableHeaderRow(itemId: string, tableIdOrName: string): Promise<RangeData> {
        return this.get(
            `${this.getWorkbookPath(itemId)}/tables/${encodeURIComponent(tableIdOrName)}/headerRowRange`
        );
    }

    /**
     * Clear a range
     */
    async clearRange(
        itemId: string,
        worksheetIdOrName: string,
        address: string,
        applyTo?: "all" | "formats" | "contents"
    ): Promise<void> {
        const encodedAddress = encodeURIComponent(address);
        await this.post(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodedAddress}')/clear`,
            { applyTo: applyTo || "all" }
        );
    }

    /**
     * Insert cells
     */
    async insertRange(
        itemId: string,
        worksheetIdOrName: string,
        address: string,
        shift: "down" | "right"
    ): Promise<RangeData> {
        const encodedAddress = encodeURIComponent(address);
        return this.post(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodedAddress}')/insert`,
            { shift }
        );
    }

    /**
     * Delete cells
     */
    async deleteRange(
        itemId: string,
        worksheetIdOrName: string,
        address: string,
        shift: "up" | "left"
    ): Promise<void> {
        const encodedAddress = encodeURIComponent(address);
        await this.post(
            `${this.getWorkbookPath(itemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodedAddress}')/delete`,
            { shift }
        );
    }

    /**
     * Create a session for persistent changes
     */
    async createSession(
        itemId: string,
        persistChanges?: boolean
    ): Promise<{ id: string; persistChanges: boolean }> {
        return this.post(`${this.getWorkbookPath(itemId)}/createSession`, {
            persistChanges: persistChanges ?? true
        });
    }

    /**
     * Close a session
     */
    async closeSession(itemId: string, sessionId: string): Promise<void> {
        await this.request(`${this.getWorkbookPath(itemId)}/closeSession`, {
            method: "POST",
            headers: {
                "workbook-session-id": sessionId
            }
        });
    }
}
