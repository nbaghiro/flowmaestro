/**
 * Amazon Seller Central SP-API Response Types
 */

// ==========================================
// Order Types (Orders API v0)
// ==========================================

export interface AmazonMoney {
    CurrencyCode: string;
    Amount: string;
}

export interface AmazonAddress {
    Name: string;
    AddressLine1: string;
    AddressLine2?: string;
    AddressLine3?: string;
    City: string;
    County?: string;
    District?: string;
    StateOrRegion: string;
    PostalCode: string;
    CountryCode: string;
    Phone?: string;
}

export interface AmazonOrder {
    AmazonOrderId: string;
    SellerOrderId?: string;
    PurchaseDate: string;
    LastUpdateDate: string;
    OrderStatus: string;
    FulfillmentChannel: string;
    SalesChannel?: string;
    ShipServiceLevel?: string;
    OrderTotal?: AmazonMoney;
    NumberOfItemsShipped: number;
    NumberOfItemsUnshipped: number;
    PaymentMethod?: string;
    PaymentMethodDetails?: string[];
    MarketplaceId: string;
    ShipmentServiceLevelCategory?: string;
    OrderType: string;
    EarliestShipDate?: string;
    LatestShipDate?: string;
    EarliestDeliveryDate?: string;
    LatestDeliveryDate?: string;
    IsBusinessOrder: boolean;
    IsPrime: boolean;
    IsGlobalExpressEnabled: boolean;
    IsPremiumOrder: boolean;
    IsSoldByAB: boolean;
    IsISPU: boolean;
    ShippingAddress?: AmazonAddress;
    BuyerInfo?: {
        BuyerEmail?: string;
        BuyerName?: string;
        BuyerTaxInfo?: {
            CompanyLegalName?: string;
        };
    };
}

export interface AmazonOrdersResponse {
    Orders: AmazonOrder[];
    NextToken?: string;
}

// ==========================================
// Order Item Types
// ==========================================

export interface AmazonOrderItem {
    ASIN: string;
    SellerSKU: string;
    OrderItemId: string;
    Title: string;
    QuantityOrdered: number;
    QuantityShipped: number;
    ProductInfo?: {
        NumberOfItems?: number;
    };
    ItemPrice?: AmazonMoney;
    ShippingPrice?: AmazonMoney;
    ItemTax?: AmazonMoney;
    ShippingTax?: AmazonMoney;
    ShippingDiscount?: AmazonMoney;
    PromotionDiscount?: AmazonMoney;
    IsGift: boolean;
    ConditionId?: string;
    ConditionSubtypeId?: string;
    ConditionNote?: string;
    IsTransparency: boolean;
    SerialNumberRequired: boolean;
}

export interface AmazonOrderItemsResponse {
    OrderItems: AmazonOrderItem[];
    NextToken?: string;
    AmazonOrderId: string;
}

// ==========================================
// Catalog Item Types (Catalog Items API 2022-04-01)
// ==========================================

export interface AmazonCatalogItemSummary {
    marketplaceId: string;
    brandName?: string;
    browseClassification?: {
        displayName: string;
        classificationId: string;
    };
    colorName?: string;
    itemClassification?: string;
    itemName?: string;
    manufacturer?: string;
    modelNumber?: string;
    packageQuantity?: number;
    partNumber?: string;
    sizeName?: string;
    styleName?: string;
    websiteDisplayGroup?: string;
    websiteDisplayGroupName?: string;
}

export interface AmazonCatalogItemImage {
    marketplaceId: string;
    images: Array<{
        variant: string;
        link: string;
        height: number;
        width: number;
    }>;
}

export interface AmazonCatalogItemIdentifier {
    marketplaceId: string;
    identifiers: Array<{
        identifierType: string;
        identifier: string;
    }>;
}

export interface AmazonCatalogItemDimension {
    marketplaceId: string;
    item?: {
        height?: { value: number; unit: string };
        length?: { value: number; unit: string };
        weight?: { value: number; unit: string };
        width?: { value: number; unit: string };
    };
    package?: {
        height?: { value: number; unit: string };
        length?: { value: number; unit: string };
        weight?: { value: number; unit: string };
        width?: { value: number; unit: string };
    };
}

export interface AmazonCatalogItem {
    asin: string;
    attributes?: Record<string, unknown>;
    dimensions?: AmazonCatalogItemDimension[];
    identifiers?: AmazonCatalogItemIdentifier[];
    images?: AmazonCatalogItemImage[];
    productTypes?: Array<{
        marketplaceId: string;
        productType: string;
    }>;
    summaries?: AmazonCatalogItemSummary[];
}

export interface AmazonCatalogItemsResponse {
    numberOfResults: number;
    pagination?: {
        nextToken?: string;
        previousToken?: string;
    };
    items: AmazonCatalogItem[];
}

// ==========================================
// FBA Inventory Types (FBA Inventory API v1)
// ==========================================

export interface AmazonInventorySummary {
    asin: string;
    fnSku: string;
    sellerSku: string;
    condition: string;
    inventoryDetails?: {
        fulfillableQuantity?: number;
        inboundWorkingQuantity?: number;
        inboundShippedQuantity?: number;
        inboundReceivingQuantity?: number;
        reservedQuantity?: {
            totalReservedQuantity?: number;
            pendingCustomerOrderQuantity?: number;
            pendingTransshipmentQuantity?: number;
            fcProcessingQuantity?: number;
        };
        researchingQuantity?: {
            totalResearchingQuantity?: number;
            researchingQuantityBreakdown?: Array<{
                name: string;
                quantity: number;
            }>;
        };
        unfulfillableQuantity?: {
            totalUnfulfillableQuantity?: number;
            customerDamagedQuantity?: number;
            warehouseDamagedQuantity?: number;
            distributorDamagedQuantity?: number;
            carrierDamagedQuantity?: number;
            defectiveQuantity?: number;
            expiredQuantity?: number;
        };
    };
    lastUpdatedTime?: string;
    productName?: string;
    totalQuantity?: number;
}

export interface AmazonInventorySummariesResponse {
    granularity: {
        granularityType: string;
        granularityId: string;
    };
    inventorySummaries: AmazonInventorySummary[];
    nextToken?: string;
}

// ==========================================
// Product Pricing Types (Pricing API v0)
// ==========================================

export interface AmazonCompetitivePriceEntry {
    CompetitivePriceId: string;
    Price: {
        LandedPrice?: AmazonMoney;
        ListingPrice: AmazonMoney;
        Shipping?: AmazonMoney;
    };
    condition?: string;
    subcondition?: string;
    belongsToRequester?: boolean;
}

export interface AmazonCompetitivePrice {
    ASIN: string;
    status: string;
    body?: {
        Identifier: {
            MarketplaceId: string;
            ItemCondition: string;
            ASIN: string;
        };
        Product: {
            CompetitivePricing: {
                CompetitivePrices: AmazonCompetitivePriceEntry[];
                NumberOfOfferListings: Array<{
                    condition: string;
                    Count: number;
                }>;
            };
            SalesRankings?: Array<{
                ProductCategoryId: string;
                Rank: number;
            }>;
        };
    };
}

export interface AmazonCompetitivePricingResponse {
    prices: AmazonCompetitivePrice[];
}

// ==========================================
// Item Offers Types (Pricing API v0)
// ==========================================

export interface AmazonOfferListing {
    SubCondition: string;
    SellerFeedbackRating?: {
        SellerPositiveFeedbackRating?: number;
        FeedbackCount: number;
    };
    ShippingTime: {
        minimumHours?: number;
        maximumHours?: number;
        availabilityType?: string;
    };
    ListingPrice: AmazonMoney;
    Shipping?: AmazonMoney;
    IsFulfilledByAmazon: boolean;
    IsBuyBoxWinner?: boolean;
    IsFeaturedMerchant?: boolean;
}

export interface AmazonOffer {
    ASIN: string;
    status: string;
    body?: {
        Identifier: {
            MarketplaceId: string;
            ItemCondition: string;
            ASIN: string;
        };
        Summary: {
            LowestPrices?: Array<{
                condition: string;
                fulfillmentChannel: string;
                LandedPrice: AmazonMoney;
                ListingPrice: AmazonMoney;
                Shipping: AmazonMoney;
            }>;
            BuyBoxPrices?: Array<{
                condition: string;
                LandedPrice: AmazonMoney;
                ListingPrice: AmazonMoney;
                Shipping: AmazonMoney;
            }>;
            NumberOfOffers: Array<{
                condition: string;
                fulfillmentChannel: string;
                OfferCount: number;
            }>;
            BuyBoxEligibleOffers: Array<{
                condition: string;
                fulfillmentChannel: string;
                OfferCount: number;
            }>;
            TotalOfferCount: number;
        };
        Offers: AmazonOfferListing[];
    };
}

export interface AmazonItemOffersResponse {
    offer: AmazonOffer;
}
