/**
 * SAP S/4HANA Cloud API Response Types
 */

import type { OAuth2TokenData } from "../../../../storage/models/Connection";

/**
 * SAP connection data extends OAuth2 with host
 */
export interface SapConnectionData extends OAuth2TokenData {
    host: string;
}

/**
 * SAP Business Partner
 */
export interface SapBusinessPartner {
    BusinessPartner: string;
    BusinessPartnerFullName: string;
    BusinessPartnerName: string;
    BusinessPartnerCategory: string;
    BusinessPartnerGrouping: string;
    FirstName: string | null;
    LastName: string | null;
    OrganizationBPName1: string | null;
    Industry: string | null;
    Language: string;
    CreationDate: string;
    LastChangeDate: string;
    SearchTerm1: string | null;
    SearchTerm2: string | null;
}

/**
 * SAP Sales Order
 */
export interface SapSalesOrder {
    SalesOrder: string;
    SalesOrderType: string;
    SalesOrganization: string;
    DistributionChannel: string;
    OrganizationDivision: string;
    SoldToParty: string;
    PurchaseOrderByCustomer: string | null;
    SalesOrderDate: string;
    TotalNetAmount: string;
    TransactionCurrency: string;
    OverallSDProcessStatus: string;
    CreationDate: string;
    LastChangeDate: string;
}

/**
 * SAP Purchase Order
 */
export interface SapPurchaseOrder {
    PurchaseOrder: string;
    PurchaseOrderType: string;
    PurchasingOrganization: string;
    PurchasingGroup: string;
    Supplier: string;
    DocumentCurrency: string;
    PurchaseOrderDate: string;
    CreationDate: string;
    LastChangeDateTime: string;
    PurchasingProcessingStatus: string;
}

/**
 * SAP Material (Product)
 */
export interface SapMaterial {
    Material: string;
    MaterialType: string;
    MaterialGroup: string;
    BaseUnit: string;
    IndustrySector: string;
    MaterialDescription: string | null;
    GrossWeight: string | null;
    WeightUnit: string | null;
    CreationDate: string;
    LastChangeDate: string;
}

/**
 * SAP Billing Document (Invoice)
 */
export interface SapInvoice {
    BillingDocument: string;
    BillingDocumentType: string;
    SalesOrganization: string;
    BillingDocumentDate: string;
    TotalNetAmount: string;
    TransactionCurrency: string;
    PayerParty: string;
    SoldToParty: string;
    CreationDate: string;
    LastChangeDate: string;
}

/**
 * SAP OData response wrapper
 */
export interface SapODataResponse<T> {
    d: {
        results: T[];
        __count?: string;
        __next?: string;
    };
}

/**
 * SAP OData single entity response
 */
export interface SapODataEntityResponse<T> {
    d: T;
}

/**
 * SAP pagination params
 */
export interface SapPaginationParams {
    top?: number;
    skip?: number;
    filter?: string;
    select?: string;
    expand?: string;
}
