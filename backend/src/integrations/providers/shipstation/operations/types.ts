/**
 * ShipStation API response types
 */

// ==========================================
// Common Types
// ==========================================

export interface ShipStationAddress {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    street3?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    residential?: boolean;
    addressVerified?: string;
}

export interface ShipStationWeight {
    value: number;
    units: "pounds" | "ounces" | "grams";
    WeightUnits?: number;
}

export interface ShipStationDimensions {
    length: number;
    width: number;
    height: number;
    units: "inches" | "centimeters";
}

export interface ShipStationMoney {
    currencyCode: string;
    amount: number;
}

// ==========================================
// Order Types
// ==========================================

export interface ShipStationOrderItem {
    orderItemId: number;
    lineItemKey?: string;
    sku?: string;
    name: string;
    imageUrl?: string;
    weight?: ShipStationWeight;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    shippingAmount?: number;
    warehouseLocation?: string;
    options?: Array<{ name: string; value: string }>;
    productId?: number;
    fulfillmentSku?: string;
    adjustment: boolean;
    upc?: string;
}

export interface ShipStationOrder {
    orderId: number;
    orderNumber: string;
    orderKey?: string;
    orderDate: string;
    createDate: string;
    modifyDate: string;
    paymentDate?: string;
    shipByDate?: string;
    orderStatus: string;
    customerId?: number;
    customerUsername?: string;
    customerEmail?: string;
    billTo: ShipStationAddress;
    shipTo: ShipStationAddress;
    items: ShipStationOrderItem[];
    orderTotal: number;
    amountPaid: number;
    taxAmount?: number;
    shippingAmount?: number;
    customerNotes?: string;
    internalNotes?: string;
    gift?: boolean;
    giftMessage?: string;
    paymentMethod?: string;
    requestedShippingService?: string;
    carrierCode?: string;
    serviceCode?: string;
    packageCode?: string;
    confirmation?: string;
    shipDate?: string;
    holdUntilDate?: string;
    weight?: ShipStationWeight;
    dimensions?: ShipStationDimensions;
    insuranceOptions?: {
        provider?: string;
        insureShipment: boolean;
        insuredValue: number;
    };
    internationalOptions?: {
        contents?: string;
        customsItems?: Array<{
            customsItemId?: string;
            description: string;
            quantity: number;
            value: number;
            harmonizedTariffCode?: string;
            countryOfOrigin?: string;
        }>;
    };
    advancedOptions?: {
        warehouseId?: number;
        nonMachinable?: boolean;
        saturdayDelivery?: boolean;
        containsAlcohol?: boolean;
        storeId?: number;
        customField1?: string;
        customField2?: string;
        customField3?: string;
        source?: string;
        billToParty?: string;
        billToAccount?: string;
        billToPostalCode?: string;
        billToCountryCode?: string;
    };
    tagIds?: number[];
    userId?: string;
    externallyFulfilled?: boolean;
    externallyFulfilledBy?: string;
}

export interface ShipStationOrdersResponse {
    orders: ShipStationOrder[];
    total: number;
    page: number;
    pages: number;
}

// ==========================================
// Shipment Types
// ==========================================

export interface ShipStationShipment {
    shipmentId: number;
    orderId: number;
    orderKey?: string;
    userId?: string;
    orderNumber: string;
    createDate: string;
    shipDate: string;
    shipmentCost: number;
    insuranceCost: number;
    trackingNumber?: string;
    isReturnLabel: boolean;
    batchNumber?: string;
    carrierCode: string;
    serviceCode: string;
    packageCode?: string;
    confirmation?: string;
    warehouseId?: number;
    voided: boolean;
    voidDate?: string;
    marketplaceNotified: boolean;
    notifyErrorMessage?: string;
    shipTo: ShipStationAddress;
    weight: ShipStationWeight;
    dimensions?: ShipStationDimensions;
    insuranceOptions?: {
        provider?: string;
        insureShipment: boolean;
        insuredValue: number;
    };
    advancedOptions?: Record<string, unknown>;
    shipmentItems?: Array<{
        orderItemId: number;
        lineItemKey?: string;
        sku?: string;
        name: string;
        imageUrl?: string;
        weight?: ShipStationWeight;
        quantity: number;
        unitPrice?: number;
        warehouseLocation?: string;
        productId?: number;
    }>;
    labelData?: string;
    formData?: string;
}

export interface ShipStationCreateLabelResponse {
    shipmentId: number;
    shipmentCost: number;
    insuranceCost: number;
    trackingNumber?: string;
    labelData?: string;
    formData?: string;
}

// ==========================================
// Rate Types
// ==========================================

export interface ShipStationRate {
    serviceName: string;
    serviceCode: string;
    shipmentCost: number;
    otherCost: number;
}

export interface ShipStationRatesResponse {
    rates: ShipStationRate[];
}

// ==========================================
// Carrier Types
// ==========================================

export interface ShipStationCarrier {
    name: string;
    code: string;
    accountNumber?: string;
    requiresFundedAccount: boolean;
    balance: number;
    nickname?: string;
    shippingProviderId?: number;
    primary?: boolean;
}

export interface ShipStationService {
    carrierCode: string;
    code: string;
    name: string;
    domestic: boolean;
    international: boolean;
}

// ==========================================
// Warehouse Types
// ==========================================

export interface ShipStationWarehouse {
    warehouseId: number;
    warehouseName: string;
    originAddress: ShipStationAddress;
    returnAddress?: ShipStationAddress;
    createDate: string;
    isDefault: boolean;
}

// ==========================================
// Store Types
// ==========================================

export interface ShipStationStore {
    storeId: number;
    storeName: string;
    marketplaceId: number;
    marketplaceName: string;
    accountName?: string;
    email?: string;
    integrationUrl?: string;
    active: boolean;
    companyName?: string;
    phone?: string;
    publicEmail?: string;
    website?: string;
    refreshDate?: string;
    lastRefreshAttempt?: string;
    createDate: string;
    modifyDate: string;
    autoRefresh: boolean;
    statusMappings?: Array<{
        orderStatus: string;
        statusKey: string;
    }>;
}
