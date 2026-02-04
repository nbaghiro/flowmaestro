/**
 * NetSuite REST API Response Types
 */

import type { OAuth2TokenData } from "../../../../storage/models/Connection";

/**
 * NetSuite connection data extends OAuth2 with accountId
 */
export interface NetsuiteConnectionData extends OAuth2TokenData {
    accountId: string;
}

/**
 * NetSuite Customer
 */
export interface NetsuiteCustomer {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    entityId: string;
    entityStatus: { id: string; refName: string } | null;
    category: { id: string; refName: string } | null;
    subsidiary: { id: string; refName: string } | null;
    currency: { id: string; refName: string } | null;
    dateCreated: string;
    lastModifiedDate: string;
}

/**
 * NetSuite Sales Order
 */
export interface NetsuiteSalesOrder {
    id: string;
    tranId: string;
    entity: { id: string; refName: string };
    tranDate: string;
    status: { id: string; refName: string };
    total: number;
    currency: { id: string; refName: string } | null;
    memo: string | null;
    orderStatus: string | null;
    dateCreated: string;
    lastModifiedDate: string;
}

/**
 * NetSuite Purchase Order
 */
export interface NetsuitePurchaseOrder {
    id: string;
    tranId: string;
    entity: { id: string; refName: string };
    tranDate: string;
    status: { id: string; refName: string };
    total: number;
    currency: { id: string; refName: string } | null;
    memo: string | null;
    dateCreated: string;
    lastModifiedDate: string;
}

/**
 * NetSuite Invoice
 */
export interface NetsuiteInvoice {
    id: string;
    tranId: string;
    entity: { id: string; refName: string };
    tranDate: string;
    status: { id: string; refName: string };
    total: number;
    amountRemaining: number;
    currency: { id: string; refName: string } | null;
    dueDate: string | null;
    memo: string | null;
    dateCreated: string;
    lastModifiedDate: string;
}

/**
 * NetSuite Item (product/service)
 */
export interface NetsuiteItem {
    id: string;
    itemId: string;
    displayName: string | null;
    type: string;
    baseUnit: { id: string; refName: string } | null;
    cost: number | null;
    salesPrice: number | null;
    incomeAccount: { id: string; refName: string } | null;
    isInactive: boolean;
    dateCreated: string;
    lastModifiedDate: string;
}

/**
 * NetSuite REST API collection response
 */
export interface NetsuiteCollectionResponse<T> {
    items: T[];
    totalResults: number;
    count: number;
    offset: number;
    hasMore: boolean;
    links: Array<{ rel: string; href: string }>;
}

/**
 * NetSuite pagination params
 */
export interface NetsuitePaginationParams {
    limit?: number;
    offset?: number;
    q?: string;
}
