/**
 * Amazon Seller Central Test Fixtures
 *
 * Provides sandbox test data for Amazon Seller Central integration operations.
 */

import type { TestFixture } from "../../../sandbox/types";
import type {
    AmazonOrder,
    AmazonOrderItem,
    AmazonCatalogItem,
    AmazonInventorySummary,
    AmazonCompetitivePrice,
    AmazonOffer
} from "../operations/types";

// ==========================================
// Sample Data
// ==========================================

const sampleOrders: AmazonOrder[] = [
    {
        AmazonOrderId: "114-3941689-8772232",
        SellerOrderId: "114-3941689-8772232",
        PurchaseDate: "2024-01-15T10:30:00Z",
        LastUpdateDate: "2024-01-16T08:00:00Z",
        OrderStatus: "Shipped",
        FulfillmentChannel: "AFN",
        SalesChannel: "Amazon.com",
        ShipServiceLevel: "Standard",
        OrderTotal: { CurrencyCode: "USD", Amount: "49.99" },
        NumberOfItemsShipped: 1,
        NumberOfItemsUnshipped: 0,
        MarketplaceId: "ATVPDKIKX0DER",
        ShipmentServiceLevelCategory: "Standard",
        OrderType: "StandardOrder",
        EarliestShipDate: "2024-01-15T18:00:00Z",
        LatestShipDate: "2024-01-17T18:00:00Z",
        IsBusinessOrder: false,
        IsPrime: true,
        IsGlobalExpressEnabled: false,
        IsPremiumOrder: false,
        IsSoldByAB: false,
        IsISPU: false,
        ShippingAddress: {
            Name: "John Doe",
            AddressLine1: "123 Main St",
            City: "Seattle",
            StateOrRegion: "WA",
            PostalCode: "98101",
            CountryCode: "US"
        }
    },
    {
        AmazonOrderId: "112-7654321-9988776",
        PurchaseDate: "2024-01-14T14:20:00Z",
        LastUpdateDate: "2024-01-14T14:20:00Z",
        OrderStatus: "Pending",
        FulfillmentChannel: "MFN",
        SalesChannel: "Amazon.com",
        OrderTotal: { CurrencyCode: "USD", Amount: "129.99" },
        NumberOfItemsShipped: 0,
        NumberOfItemsUnshipped: 2,
        MarketplaceId: "ATVPDKIKX0DER",
        OrderType: "StandardOrder",
        IsBusinessOrder: false,
        IsPrime: false,
        IsGlobalExpressEnabled: false,
        IsPremiumOrder: false,
        IsSoldByAB: false,
        IsISPU: false,
        ShippingAddress: {
            Name: "Jane Smith",
            AddressLine1: "456 Oak Ave",
            AddressLine2: "Apt 12B",
            City: "Portland",
            StateOrRegion: "OR",
            PostalCode: "97201",
            CountryCode: "US"
        }
    },
    {
        AmazonOrderId: "113-5566778-1122334",
        PurchaseDate: "2024-01-13T09:00:00Z",
        LastUpdateDate: "2024-01-15T11:30:00Z",
        OrderStatus: "Unshipped",
        FulfillmentChannel: "MFN",
        SalesChannel: "Amazon.com",
        OrderTotal: { CurrencyCode: "USD", Amount: "74.50" },
        NumberOfItemsShipped: 0,
        NumberOfItemsUnshipped: 3,
        MarketplaceId: "ATVPDKIKX0DER",
        OrderType: "StandardOrder",
        IsBusinessOrder: true,
        IsPrime: false,
        IsGlobalExpressEnabled: false,
        IsPremiumOrder: false,
        IsSoldByAB: false,
        IsISPU: false,
        BuyerInfo: {
            BuyerName: "Acme Corp",
            BuyerTaxInfo: {
                CompanyLegalName: "Acme Corporation LLC"
            }
        }
    },
    {
        AmazonOrderId: "115-9988776-5544332",
        PurchaseDate: "2024-01-10T16:45:00Z",
        LastUpdateDate: "2024-01-11T08:00:00Z",
        OrderStatus: "Canceled",
        FulfillmentChannel: "AFN",
        SalesChannel: "Amazon.com",
        OrderTotal: { CurrencyCode: "USD", Amount: "24.99" },
        NumberOfItemsShipped: 0,
        NumberOfItemsUnshipped: 0,
        MarketplaceId: "ATVPDKIKX0DER",
        OrderType: "StandardOrder",
        IsBusinessOrder: false,
        IsPrime: true,
        IsGlobalExpressEnabled: false,
        IsPremiumOrder: false,
        IsSoldByAB: false,
        IsISPU: false
    },
    {
        AmazonOrderId: "116-1122334-5566778",
        PurchaseDate: "2024-01-16T07:15:00Z",
        LastUpdateDate: "2024-01-16T12:00:00Z",
        OrderStatus: "PartiallyShipped",
        FulfillmentChannel: "AFN",
        SalesChannel: "Amazon.com",
        OrderTotal: { CurrencyCode: "USD", Amount: "199.97" },
        NumberOfItemsShipped: 1,
        NumberOfItemsUnshipped: 2,
        MarketplaceId: "ATVPDKIKX0DER",
        OrderType: "StandardOrder",
        IsBusinessOrder: false,
        IsPrime: true,
        IsGlobalExpressEnabled: false,
        IsPremiumOrder: false,
        IsSoldByAB: false,
        IsISPU: false,
        ShippingAddress: {
            Name: "Bob Wilson",
            AddressLine1: "789 Pine Rd",
            City: "Austin",
            StateOrRegion: "TX",
            PostalCode: "73301",
            CountryCode: "US"
        }
    }
];

const sampleOrderItems: AmazonOrderItem[] = [
    {
        ASIN: "B09V3KXJPB",
        SellerSKU: "ELEC-HDPH-001",
        OrderItemId: "71394831028372",
        Title: "Wireless Noise Cancelling Headphones",
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: { CurrencyCode: "USD", Amount: "49.99" },
        ShippingPrice: { CurrencyCode: "USD", Amount: "0.00" },
        ItemTax: { CurrencyCode: "USD", Amount: "4.25" },
        ShippingTax: { CurrencyCode: "USD", Amount: "0.00" },
        IsGift: false,
        ConditionId: "New",
        IsTransparency: false,
        SerialNumberRequired: false
    },
    {
        ASIN: "B08N5WRWNW",
        SellerSKU: "BOOK-PROG-042",
        OrderItemId: "71394831028373",
        Title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        QuantityOrdered: 2,
        QuantityShipped: 0,
        ItemPrice: { CurrencyCode: "USD", Amount: "79.98" },
        ShippingPrice: { CurrencyCode: "USD", Amount: "5.99" },
        ItemTax: { CurrencyCode: "USD", Amount: "6.80" },
        ShippingTax: { CurrencyCode: "USD", Amount: "0.51" },
        IsGift: true,
        ConditionId: "New",
        IsTransparency: false,
        SerialNumberRequired: false
    },
    {
        ASIN: "B07ZPKN6YR",
        SellerSKU: "HOME-LAMP-007",
        OrderItemId: "71394831028374",
        Title: "LED Desk Lamp with USB Charging Port",
        QuantityOrdered: 1,
        QuantityShipped: 0,
        ItemPrice: { CurrencyCode: "USD", Amount: "34.99" },
        ShippingPrice: { CurrencyCode: "USD", Amount: "0.00" },
        ItemTax: { CurrencyCode: "USD", Amount: "2.97" },
        ShippingTax: { CurrencyCode: "USD", Amount: "0.00" },
        IsGift: false,
        ConditionId: "New",
        IsTransparency: true,
        SerialNumberRequired: false
    },
    {
        ASIN: "B09JQMJHXY",
        SellerSKU: "ELEC-CHRG-015",
        OrderItemId: "71394831028375",
        Title: "USB-C Fast Charger 65W",
        QuantityOrdered: 3,
        QuantityShipped: 3,
        ItemPrice: { CurrencyCode: "USD", Amount: "74.97" },
        ShippingPrice: { CurrencyCode: "USD", Amount: "0.00" },
        ItemTax: { CurrencyCode: "USD", Amount: "6.37" },
        ShippingTax: { CurrencyCode: "USD", Amount: "0.00" },
        IsGift: false,
        ConditionId: "New",
        IsTransparency: false,
        SerialNumberRequired: false
    },
    {
        ASIN: "B0BN1HP2FX",
        SellerSKU: "HOME-TOWL-023",
        OrderItemId: "71394831028376",
        Title: "Premium Bamboo Bath Towel Set",
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: { CurrencyCode: "USD", Amount: "39.99" },
        ShippingPrice: { CurrencyCode: "USD", Amount: "4.99" },
        ItemTax: { CurrencyCode: "USD", Amount: "3.40" },
        ShippingTax: { CurrencyCode: "USD", Amount: "0.42" },
        IsGift: false,
        ConditionId: "New",
        IsTransparency: false,
        SerialNumberRequired: false
    }
];

const sampleCatalogItems: AmazonCatalogItem[] = [
    {
        asin: "B09V3KXJPB",
        summaries: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                brandName: "SoundPro",
                itemName: "Wireless Noise Cancelling Headphones",
                manufacturer: "SoundPro Electronics",
                modelNumber: "SP-NC500",
                itemClassification: "BASE_PRODUCT",
                colorName: "Midnight Black"
            }
        ],
        images: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                images: [
                    {
                        variant: "MAIN",
                        link: "https://images-na.ssl-images-amazon.com/images/I/headphones-main.jpg",
                        height: 1500,
                        width: 1500
                    }
                ]
            }
        ],
        identifiers: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                identifiers: [{ identifierType: "EAN", identifier: "0123456789012" }]
            }
        ]
    },
    {
        asin: "B08N5WRWNW",
        summaries: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                brandName: "Prentice Hall",
                itemName: "Clean Code: A Handbook of Agile Software Craftsmanship",
                manufacturer: "Pearson Education",
                itemClassification: "BASE_PRODUCT"
            }
        ],
        images: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                images: [
                    {
                        variant: "MAIN",
                        link: "https://images-na.ssl-images-amazon.com/images/I/clean-code.jpg",
                        height: 1000,
                        width: 750
                    }
                ]
            }
        ]
    },
    {
        asin: "B07ZPKN6YR",
        summaries: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                brandName: "LumiDesk",
                itemName: "LED Desk Lamp with USB Charging Port",
                manufacturer: "LumiDesk Inc.",
                modelNumber: "LD-200",
                itemClassification: "BASE_PRODUCT",
                colorName: "White"
            }
        ],
        dimensions: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                item: {
                    height: { value: 17.5, unit: "inches" },
                    weight: { value: 1.8, unit: "pounds" },
                    width: { value: 6.0, unit: "inches" }
                }
            }
        ]
    },
    {
        asin: "B09JQMJHXY",
        summaries: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                brandName: "ChargeTech",
                itemName: "USB-C Fast Charger 65W",
                manufacturer: "ChargeTech Global",
                modelNumber: "CT-65W",
                itemClassification: "BASE_PRODUCT",
                colorName: "Black"
            }
        ]
    },
    {
        asin: "B0BN1HP2FX",
        summaries: [
            {
                marketplaceId: "ATVPDKIKX0DER",
                brandName: "BambooLux",
                itemName: "Premium Bamboo Bath Towel Set",
                manufacturer: "BambooLux Home",
                itemClassification: "BASE_PRODUCT",
                colorName: "Ocean Blue",
                sizeName: "Set of 4"
            }
        ]
    }
];

const sampleInventorySummaries: AmazonInventorySummary[] = [
    {
        asin: "B09V3KXJPB",
        fnSku: "X001ABC123",
        sellerSku: "ELEC-HDPH-001",
        condition: "NewItem",
        inventoryDetails: {
            fulfillableQuantity: 150,
            inboundWorkingQuantity: 0,
            inboundShippedQuantity: 50,
            inboundReceivingQuantity: 0,
            reservedQuantity: {
                totalReservedQuantity: 12,
                pendingCustomerOrderQuantity: 8,
                pendingTransshipmentQuantity: 4,
                fcProcessingQuantity: 0
            }
        },
        lastUpdatedTime: "2024-01-16T08:00:00Z",
        productName: "Wireless Noise Cancelling Headphones",
        totalQuantity: 200
    },
    {
        asin: "B08N5WRWNW",
        fnSku: "X002DEF456",
        sellerSku: "BOOK-PROG-042",
        condition: "NewItem",
        inventoryDetails: {
            fulfillableQuantity: 45,
            inboundWorkingQuantity: 0,
            inboundShippedQuantity: 0,
            inboundReceivingQuantity: 0,
            reservedQuantity: {
                totalReservedQuantity: 3,
                pendingCustomerOrderQuantity: 3,
                pendingTransshipmentQuantity: 0,
                fcProcessingQuantity: 0
            }
        },
        lastUpdatedTime: "2024-01-15T14:00:00Z",
        productName: "Clean Code: A Handbook of Agile Software Craftsmanship",
        totalQuantity: 48
    },
    {
        asin: "B07ZPKN6YR",
        fnSku: "X003GHI789",
        sellerSku: "HOME-LAMP-007",
        condition: "NewItem",
        inventoryDetails: {
            fulfillableQuantity: 0,
            inboundWorkingQuantity: 100,
            inboundShippedQuantity: 0,
            inboundReceivingQuantity: 0,
            reservedQuantity: {
                totalReservedQuantity: 0,
                pendingCustomerOrderQuantity: 0,
                pendingTransshipmentQuantity: 0,
                fcProcessingQuantity: 0
            },
            unfulfillableQuantity: {
                totalUnfulfillableQuantity: 2,
                customerDamagedQuantity: 1,
                warehouseDamagedQuantity: 1,
                distributorDamagedQuantity: 0,
                carrierDamagedQuantity: 0,
                defectiveQuantity: 0,
                expiredQuantity: 0
            }
        },
        lastUpdatedTime: "2024-01-16T06:00:00Z",
        productName: "LED Desk Lamp with USB Charging Port",
        totalQuantity: 2
    },
    {
        asin: "B09JQMJHXY",
        fnSku: "X004JKL012",
        sellerSku: "ELEC-CHRG-015",
        condition: "NewItem",
        inventoryDetails: {
            fulfillableQuantity: 320,
            inboundWorkingQuantity: 0,
            inboundShippedQuantity: 0,
            inboundReceivingQuantity: 0,
            reservedQuantity: {
                totalReservedQuantity: 25,
                pendingCustomerOrderQuantity: 20,
                pendingTransshipmentQuantity: 5,
                fcProcessingQuantity: 0
            }
        },
        lastUpdatedTime: "2024-01-16T10:00:00Z",
        productName: "USB-C Fast Charger 65W",
        totalQuantity: 345
    },
    {
        asin: "B0BN1HP2FX",
        fnSku: "X005MNO345",
        sellerSku: "HOME-TOWL-023",
        condition: "NewItem",
        inventoryDetails: {
            fulfillableQuantity: 85,
            inboundWorkingQuantity: 0,
            inboundShippedQuantity: 200,
            inboundReceivingQuantity: 50,
            reservedQuantity: {
                totalReservedQuantity: 5,
                pendingCustomerOrderQuantity: 5,
                pendingTransshipmentQuantity: 0,
                fcProcessingQuantity: 0
            }
        },
        lastUpdatedTime: "2024-01-15T20:00:00Z",
        productName: "Premium Bamboo Bath Towel Set",
        totalQuantity: 340
    }
];

const sampleCompetitivePrices: AmazonCompetitivePrice[] = [
    {
        ASIN: "B09V3KXJPB",
        status: "Success",
        body: {
            Identifier: {
                MarketplaceId: "ATVPDKIKX0DER",
                ItemCondition: "New",
                ASIN: "B09V3KXJPB"
            },
            Product: {
                CompetitivePricing: {
                    CompetitivePrices: [
                        {
                            CompetitivePriceId: "1",
                            Price: {
                                LandedPrice: { CurrencyCode: "USD", Amount: "49.99" },
                                ListingPrice: { CurrencyCode: "USD", Amount: "49.99" },
                                Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                            },
                            condition: "New",
                            belongsToRequester: true
                        }
                    ],
                    NumberOfOfferListings: [
                        { condition: "New", Count: 15 },
                        { condition: "Used", Count: 3 }
                    ]
                },
                SalesRankings: [{ ProductCategoryId: "electronics", Rank: 1234 }]
            }
        }
    },
    {
        ASIN: "B08N5WRWNW",
        status: "Success",
        body: {
            Identifier: {
                MarketplaceId: "ATVPDKIKX0DER",
                ItemCondition: "New",
                ASIN: "B08N5WRWNW"
            },
            Product: {
                CompetitivePricing: {
                    CompetitivePrices: [
                        {
                            CompetitivePriceId: "1",
                            Price: {
                                LandedPrice: { CurrencyCode: "USD", Amount: "39.99" },
                                ListingPrice: { CurrencyCode: "USD", Amount: "39.99" },
                                Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                            },
                            condition: "New",
                            belongsToRequester: true
                        }
                    ],
                    NumberOfOfferListings: [
                        { condition: "New", Count: 8 },
                        { condition: "Used", Count: 22 }
                    ]
                },
                SalesRankings: [{ ProductCategoryId: "books", Rank: 567 }]
            }
        }
    },
    {
        ASIN: "B09JQMJHXY",
        status: "Success",
        body: {
            Identifier: {
                MarketplaceId: "ATVPDKIKX0DER",
                ItemCondition: "New",
                ASIN: "B09JQMJHXY"
            },
            Product: {
                CompetitivePricing: {
                    CompetitivePrices: [
                        {
                            CompetitivePriceId: "1",
                            Price: {
                                LandedPrice: { CurrencyCode: "USD", Amount: "24.99" },
                                ListingPrice: { CurrencyCode: "USD", Amount: "24.99" },
                                Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                            },
                            condition: "New",
                            belongsToRequester: true
                        }
                    ],
                    NumberOfOfferListings: [{ condition: "New", Count: 42 }]
                }
            }
        }
    }
];

const sampleOffers: AmazonOffer[] = [
    {
        ASIN: "B09V3KXJPB",
        status: "Success",
        body: {
            Identifier: {
                MarketplaceId: "ATVPDKIKX0DER",
                ItemCondition: "New",
                ASIN: "B09V3KXJPB"
            },
            Summary: {
                LowestPrices: [
                    {
                        condition: "New",
                        fulfillmentChannel: "Amazon",
                        LandedPrice: { CurrencyCode: "USD", Amount: "47.99" },
                        ListingPrice: { CurrencyCode: "USD", Amount: "47.99" },
                        Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                    },
                    {
                        condition: "New",
                        fulfillmentChannel: "Merchant",
                        LandedPrice: { CurrencyCode: "USD", Amount: "49.99" },
                        ListingPrice: { CurrencyCode: "USD", Amount: "44.99" },
                        Shipping: { CurrencyCode: "USD", Amount: "5.00" }
                    }
                ],
                BuyBoxPrices: [
                    {
                        condition: "New",
                        LandedPrice: { CurrencyCode: "USD", Amount: "49.99" },
                        ListingPrice: { CurrencyCode: "USD", Amount: "49.99" },
                        Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                    }
                ],
                NumberOfOffers: [
                    { condition: "New", fulfillmentChannel: "Amazon", OfferCount: 5 },
                    { condition: "New", fulfillmentChannel: "Merchant", OfferCount: 10 }
                ],
                BuyBoxEligibleOffers: [
                    { condition: "New", fulfillmentChannel: "Amazon", OfferCount: 3 },
                    { condition: "New", fulfillmentChannel: "Merchant", OfferCount: 2 }
                ],
                TotalOfferCount: 15
            },
            Offers: [
                {
                    SubCondition: "New",
                    SellerFeedbackRating: {
                        SellerPositiveFeedbackRating: 98,
                        FeedbackCount: 12500
                    },
                    ShippingTime: {
                        minimumHours: 24,
                        maximumHours: 48,
                        availabilityType: "NOW"
                    },
                    ListingPrice: { CurrencyCode: "USD", Amount: "49.99" },
                    Shipping: { CurrencyCode: "USD", Amount: "0.00" },
                    IsFulfilledByAmazon: true,
                    IsBuyBoxWinner: true,
                    IsFeaturedMerchant: true
                },
                {
                    SubCondition: "New",
                    SellerFeedbackRating: {
                        SellerPositiveFeedbackRating: 95,
                        FeedbackCount: 3400
                    },
                    ShippingTime: {
                        minimumHours: 48,
                        maximumHours: 120,
                        availabilityType: "NOW"
                    },
                    ListingPrice: { CurrencyCode: "USD", Amount: "44.99" },
                    Shipping: { CurrencyCode: "USD", Amount: "5.00" },
                    IsFulfilledByAmazon: false,
                    IsBuyBoxWinner: false,
                    IsFeaturedMerchant: true
                }
            ]
        }
    },
    {
        ASIN: "B08N5WRWNW",
        status: "Success",
        body: {
            Identifier: {
                MarketplaceId: "ATVPDKIKX0DER",
                ItemCondition: "New",
                ASIN: "B08N5WRWNW"
            },
            Summary: {
                LowestPrices: [
                    {
                        condition: "New",
                        fulfillmentChannel: "Amazon",
                        LandedPrice: { CurrencyCode: "USD", Amount: "39.99" },
                        ListingPrice: { CurrencyCode: "USD", Amount: "39.99" },
                        Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                    }
                ],
                BuyBoxPrices: [
                    {
                        condition: "New",
                        LandedPrice: { CurrencyCode: "USD", Amount: "39.99" },
                        ListingPrice: { CurrencyCode: "USD", Amount: "39.99" },
                        Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                    }
                ],
                NumberOfOffers: [
                    { condition: "New", fulfillmentChannel: "Amazon", OfferCount: 3 },
                    { condition: "New", fulfillmentChannel: "Merchant", OfferCount: 5 }
                ],
                BuyBoxEligibleOffers: [
                    { condition: "New", fulfillmentChannel: "Amazon", OfferCount: 2 }
                ],
                TotalOfferCount: 8
            },
            Offers: [
                {
                    SubCondition: "New",
                    SellerFeedbackRating: {
                        SellerPositiveFeedbackRating: 99,
                        FeedbackCount: 50000
                    },
                    ShippingTime: {
                        minimumHours: 24,
                        maximumHours: 48,
                        availabilityType: "NOW"
                    },
                    ListingPrice: { CurrencyCode: "USD", Amount: "39.99" },
                    Shipping: { CurrencyCode: "USD", Amount: "0.00" },
                    IsFulfilledByAmazon: true,
                    IsBuyBoxWinner: true,
                    IsFeaturedMerchant: true
                }
            ]
        }
    },
    {
        ASIN: "B09JQMJHXY",
        status: "Success",
        body: {
            Identifier: {
                MarketplaceId: "ATVPDKIKX0DER",
                ItemCondition: "New",
                ASIN: "B09JQMJHXY"
            },
            Summary: {
                LowestPrices: [
                    {
                        condition: "New",
                        fulfillmentChannel: "Amazon",
                        LandedPrice: { CurrencyCode: "USD", Amount: "24.99" },
                        ListingPrice: { CurrencyCode: "USD", Amount: "24.99" },
                        Shipping: { CurrencyCode: "USD", Amount: "0.00" }
                    }
                ],
                NumberOfOffers: [
                    { condition: "New", fulfillmentChannel: "Amazon", OfferCount: 12 },
                    { condition: "New", fulfillmentChannel: "Merchant", OfferCount: 30 }
                ],
                BuyBoxEligibleOffers: [
                    { condition: "New", fulfillmentChannel: "Amazon", OfferCount: 5 }
                ],
                TotalOfferCount: 42
            },
            Offers: [
                {
                    SubCondition: "New",
                    ShippingTime: {
                        minimumHours: 24,
                        maximumHours: 72,
                        availabilityType: "NOW"
                    },
                    ListingPrice: { CurrencyCode: "USD", Amount: "24.99" },
                    Shipping: { CurrencyCode: "USD", Amount: "0.00" },
                    IsFulfilledByAmazon: true,
                    IsBuyBoxWinner: true,
                    IsFeaturedMerchant: true
                }
            ]
        }
    }
];

// ==========================================
// Fixtures
// ==========================================

export const listOrdersFixture: TestFixture = {
    operationId: "listOrders",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "List all orders",
            input: { marketplaceIds: ["ATVPDKIKX0DER"] },
            expectedOutput: { orders: sampleOrders, count: 5 }
        },
        {
            name: "List orders by status",
            input: { marketplaceIds: ["ATVPDKIKX0DER"], orderStatuses: ["Shipped"] }
        },
        {
            name: "List orders with date filter",
            input: {
                marketplaceIds: ["ATVPDKIKX0DER"],
                createdAfter: "2024-01-14T00:00:00Z"
            }
        }
    ],
    errorCases: [
        {
            name: "Missing marketplace IDs",
            input: {},
            expectedError: { type: "validation", message: "Required" }
        }
    ],
    filterableData: {
        records: sampleOrders as unknown as Record<string, unknown>[],
        recordsField: "orders",
        defaultPageSize: 100,
        maxPageSize: 100,
        pageSizeParam: "maxResultsPerPage",
        offsetParam: "nextToken",
        filterConfig: {
            OrderStatus: { type: "enum", field: "OrderStatus" }
        }
    }
};

export const getOrderFixture: TestFixture = {
    operationId: "getOrder",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Get order by ID",
            input: { orderId: "114-3941689-8772232" },
            expectedOutput: { order: sampleOrders[0] }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { orderId: "999-0000000-0000000" },
            expectedError: { type: "not_found", message: "Order not found" }
        }
    ]
};

export const getOrderItemsFixture: TestFixture = {
    operationId: "getOrderItems",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Get order items",
            input: { orderId: "114-3941689-8772232" },
            expectedOutput: {
                orderItems: sampleOrderItems.slice(0, 1),
                amazonOrderId: "114-3941689-8772232",
                count: 1
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { orderId: "999-0000000-0000000" },
            expectedError: { type: "not_found", message: "Order not found" }
        }
    ]
};

export const searchCatalogItemsFixture: TestFixture = {
    operationId: "searchCatalogItems",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Search by keywords",
            input: {
                marketplaceIds: ["ATVPDKIKX0DER"],
                keywords: "wireless headphones"
            },
            expectedOutput: {
                items: [sampleCatalogItems[0]],
                numberOfResults: 1,
                count: 1
            }
        },
        {
            name: "Search by ASIN",
            input: {
                marketplaceIds: ["ATVPDKIKX0DER"],
                identifiers: ["B09V3KXJPB"],
                identifiersType: "ASIN"
            }
        }
    ],
    errorCases: [
        {
            name: "Missing marketplace IDs",
            input: { keywords: "test" },
            expectedError: { type: "validation", message: "Required" }
        }
    ],
    filterableData: {
        records: sampleCatalogItems as unknown as Record<string, unknown>[],
        recordsField: "items",
        defaultPageSize: 10,
        maxPageSize: 20,
        pageSizeParam: "pageSize",
        offsetParam: "pageToken",
        filterConfig: {}
    }
};

export const getCatalogItemFixture: TestFixture = {
    operationId: "getCatalogItem",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Get catalog item by ASIN",
            input: {
                asin: "B09V3KXJPB",
                marketplaceIds: ["ATVPDKIKX0DER"]
            },
            expectedOutput: { item: sampleCatalogItems[0] }
        }
    ],
    errorCases: [
        {
            name: "ASIN not found",
            input: {
                asin: "B000000000",
                marketplaceIds: ["ATVPDKIKX0DER"]
            },
            expectedError: { type: "not_found", message: "Catalog item not found" }
        }
    ]
};

export const getInventorySummariesFixture: TestFixture = {
    operationId: "getInventorySummaries",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Get all inventory summaries",
            input: {
                granularityType: "Marketplace",
                granularityId: "ATVPDKIKX0DER",
                marketplaceIds: ["ATVPDKIKX0DER"]
            },
            expectedOutput: {
                inventorySummaries: sampleInventorySummaries,
                count: 5
            }
        },
        {
            name: "Get inventory by SKU",
            input: {
                granularityType: "Marketplace",
                granularityId: "ATVPDKIKX0DER",
                marketplaceIds: ["ATVPDKIKX0DER"],
                sellerSkus: ["ELEC-HDPH-001"]
            }
        }
    ],
    errorCases: [
        {
            name: "Missing granularity",
            input: { marketplaceIds: ["ATVPDKIKX0DER"] },
            expectedError: { type: "validation", message: "Required" }
        }
    ],
    filterableData: {
        records: sampleInventorySummaries as unknown as Record<string, unknown>[],
        recordsField: "inventorySummaries",
        defaultPageSize: 50,
        maxPageSize: 50,
        pageSizeParam: "pageSize",
        offsetParam: "nextToken",
        filterConfig: {
            condition: { type: "enum", field: "condition" }
        }
    }
};

export const getCompetitivePricingFixture: TestFixture = {
    operationId: "getCompetitivePricing",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Get competitive pricing by ASIN",
            input: {
                marketplaceId: "ATVPDKIKX0DER",
                itemType: "Asin",
                asins: ["B09V3KXJPB"]
            },
            expectedOutput: {
                prices: [sampleCompetitivePrices[0]],
                count: 1
            }
        },
        {
            name: "Get competitive pricing for multiple ASINs",
            input: {
                marketplaceId: "ATVPDKIKX0DER",
                itemType: "Asin",
                asins: ["B09V3KXJPB", "B08N5WRWNW", "B09JQMJHXY"]
            },
            expectedOutput: {
                prices: sampleCompetitivePrices,
                count: 3
            }
        }
    ],
    errorCases: [
        {
            name: "Missing item type",
            input: { marketplaceId: "ATVPDKIKX0DER" },
            expectedError: { type: "validation", message: "Required" }
        }
    ]
};

export const getItemOffersFixture: TestFixture = {
    operationId: "getItemOffers",
    provider: "amazon-seller-central",
    validCases: [
        {
            name: "Get item offers",
            input: {
                marketplaceId: "ATVPDKIKX0DER",
                asin: "B09V3KXJPB",
                itemCondition: "New"
            },
            expectedOutput: { offer: sampleOffers[0] }
        }
    ],
    errorCases: [
        {
            name: "ASIN not found",
            input: {
                marketplaceId: "ATVPDKIKX0DER",
                asin: "B000000000",
                itemCondition: "New"
            },
            expectedError: { type: "not_found", message: "Item not found" }
        }
    ]
};

// Export all fixtures
export const amazonSellerCentralFixtures: TestFixture[] = [
    listOrdersFixture,
    getOrderFixture,
    getOrderItemsFixture,
    searchCatalogItemsFixture,
    getCatalogItemFixture,
    getInventorySummariesFixture,
    getCompetitivePricingFixture,
    getItemOffersFixture
];
