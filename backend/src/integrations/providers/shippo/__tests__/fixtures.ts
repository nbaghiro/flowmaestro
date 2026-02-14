import type { TestFixture } from "../../../sandbox/types";
import type {
    ValidateAddressParams,
    CreateShipmentParams,
    ListShipmentsParams,
    GetShipmentParams,
    GetRatesParams,
    CreateLabelParams,
    GetLabelParams,
    TrackShipmentParams,
    GetTrackingStatusParams,
    CreateManifestParams,
    ListCarrierAccountsParams
} from "../schemas";

// ==========================================
// Address Fixtures
// ==========================================

export const validateAddressFixture: TestFixture<ValidateAddressParams, unknown> = {
    provider: "shippo",
    operationId: "validateAddress",
    validCases: [
        {
            name: "Validate US address",
            input: {
                name: "John Doe",
                street1: "215 Clayton St",
                city: "San Francisco",
                state: "CA",
                zip: "94117",
                country: "US",
                validate: true
            },
            expectedOutput: {
                address_id: "addr_123",
                is_valid: true,
                validation_messages: []
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid address",
            input: {
                name: "John Doe",
                street1: "123 Fake Street",
                city: "Nowhere",
                state: "XX",
                zip: "00000",
                country: "US",
                validate: true
            },
            expectedError: {
                type: "validation",
                message: "Address could not be validated",
                retryable: false
            }
        },
        {
            name: "Invalid country code",
            input: {
                name: "John Doe",
                street1: "123 Main St",
                city: "City",
                state: "ST",
                zip: "12345",
                country: "XX",
                validate: true
            },
            expectedError: {
                type: "validation",
                message: "Invalid country code",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Shipment Fixtures
// ==========================================

export const createShipmentFixture: TestFixture<CreateShipmentParams, unknown> = {
    provider: "shippo",
    operationId: "createShipment",
    validCases: [
        {
            name: "Create domestic shipment",
            input: {
                address_from: {
                    name: "Sender Name",
                    street1: "215 Clayton St",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94117",
                    country: "US"
                },
                address_to: {
                    name: "Recipient Name",
                    street1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    zip: "10001",
                    country: "US"
                },
                parcels: [
                    {
                        length: 10,
                        width: 8,
                        height: 4,
                        weight: 2,
                        distance_unit: "in",
                        mass_unit: "lb"
                    }
                ],
                async: false
            },
            expectedOutput: {
                shipment_id: "shp_123",
                status: "SUCCESS",
                rate_count: 5,
                message: "Shipment created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid parcel dimensions",
            input: {
                address_from: {
                    name: "Sender",
                    street1: "123 Main St",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94107",
                    country: "US"
                },
                address_to: {
                    name: "Recipient",
                    street1: "456 Oak Ave",
                    city: "New York",
                    state: "NY",
                    zip: "10001",
                    country: "US"
                },
                parcels: [
                    {
                        length: 0,
                        width: 0,
                        height: 0,
                        weight: 0,
                        distance_unit: "in",
                        mass_unit: "lb"
                    }
                ],
                async: false
            },
            expectedError: {
                type: "validation",
                message: "Parcel dimensions must be positive values",
                retryable: false
            }
        },
        {
            name: "Invalid API token",
            input: {
                address_from: {
                    name: "Sender",
                    street1: "123 Main St",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94107",
                    country: "US"
                },
                address_to: {
                    name: "Recipient",
                    street1: "456 Oak Ave",
                    city: "New York",
                    state: "NY",
                    zip: "10001",
                    country: "US"
                },
                parcels: [
                    {
                        length: 10,
                        width: 8,
                        height: 4,
                        weight: 2,
                        distance_unit: "in",
                        mass_unit: "lb"
                    }
                ],
                async: false
            },
            expectedError: {
                type: "permission",
                message: "Invalid API token",
                retryable: false
            }
        }
    ]
};

export const listShipmentsFixture: TestFixture<ListShipmentsParams, unknown> = {
    provider: "shippo",
    operationId: "listShipments",
    validCases: [
        {
            name: "List shipments",
            input: { page: 1, results: 25 },
            expectedOutput: {
                shipments: [],
                total_count: 0,
                page: 1,
                has_more: false
            }
        }
    ],
    errorCases: [
        {
            name: "Rate limit exceeded",
            input: { page: 1, results: 25 },
            expectedError: {
                type: "rate_limit",
                message: "Rate limit exceeded. Please retry after some time.",
                retryable: true
            }
        }
    ]
};

export const getShipmentFixture: TestFixture<GetShipmentParams, unknown> = {
    provider: "shippo",
    operationId: "getShipment",
    validCases: [
        {
            name: "Get shipment by ID",
            input: { shipment_id: "shp_123" },
            expectedOutput: {
                shipment: {
                    object_id: "shp_123",
                    status: "SUCCESS"
                }
            }
        }
    ],
    errorCases: [
        {
            name: "Shipment not found",
            input: { shipment_id: "shp_nonexistent" },
            expectedError: {
                type: "not_found",
                message: "Shipment not found",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Rate Fixtures
// ==========================================

export const getRatesFixture: TestFixture<GetRatesParams, unknown> = {
    provider: "shippo",
    operationId: "getRates",
    validCases: [
        {
            name: "Get rates for shipment",
            input: { shipment_id: "shp_123", currency_code: "USD" },
            expectedOutput: {
                rates: [],
                rate_count: 0,
                shipment_id: "shp_123",
                currency: "USD"
            }
        }
    ],
    errorCases: [
        {
            name: "Shipment not found",
            input: { shipment_id: "shp_nonexistent", currency_code: "USD" },
            expectedError: {
                type: "not_found",
                message: "Shipment not found",
                retryable: false
            }
        },
        {
            name: "Invalid currency code",
            input: { shipment_id: "shp_123", currency_code: "XXX" },
            expectedError: {
                type: "validation",
                message: "Invalid currency code",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Label Fixtures
// ==========================================

export const createLabelFixture: TestFixture<CreateLabelParams, unknown> = {
    provider: "shippo",
    operationId: "createLabel",
    validCases: [
        {
            name: "Create label from rate",
            input: { rate: "rate_123", label_file_type: "PDF", async: false },
            expectedOutput: {
                transaction_id: "trans_123",
                tracking_number: "1Z999AA10123456784",
                label_url: "https://example.com/label.pdf",
                status: "SUCCESS",
                message: "Label created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Rate not found",
            input: { rate: "rate_nonexistent", label_file_type: "PDF", async: false },
            expectedError: {
                type: "not_found",
                message: "Rate not found",
                retryable: false
            }
        },
        {
            name: "Rate expired",
            input: { rate: "rate_expired", label_file_type: "PDF", async: false },
            expectedError: {
                type: "validation",
                message: "Rate has expired. Please create a new shipment.",
                retryable: false
            }
        },
        {
            name: "Insufficient funds",
            input: { rate: "rate_123", label_file_type: "PDF", async: false },
            expectedError: {
                type: "validation",
                message: "Insufficient account balance to purchase label",
                retryable: false
            }
        }
    ]
};

export const getLabelFixture: TestFixture<GetLabelParams, unknown> = {
    provider: "shippo",
    operationId: "getLabel",
    validCases: [
        {
            name: "Get label by ID",
            input: { transaction_id: "trans_123" },
            expectedOutput: {
                transaction_id: "trans_123",
                tracking_number: "1Z999AA10123456784",
                label_url: "https://example.com/label.pdf",
                status: "SUCCESS"
            }
        }
    ],
    errorCases: [
        {
            name: "Transaction not found",
            input: { transaction_id: "trans_nonexistent" },
            expectedError: {
                type: "not_found",
                message: "Transaction not found",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Tracking Fixtures
// ==========================================

export const trackShipmentFixture: TestFixture<TrackShipmentParams, unknown> = {
    provider: "shippo",
    operationId: "trackShipment",
    validCases: [
        {
            name: "Register tracking",
            input: { carrier: "usps", tracking_number: "9400111899223456789012" },
            expectedOutput: {
                carrier: "usps",
                tracking_number: "9400111899223456789012",
                status: "TRANSIT",
                message: "Tracking registered successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid carrier",
            input: { carrier: "invalid_carrier", tracking_number: "1234567890" },
            expectedError: {
                type: "validation",
                message: "Invalid carrier code",
                retryable: false
            }
        },
        {
            name: "Invalid tracking number",
            input: { carrier: "usps", tracking_number: "invalid" },
            expectedError: {
                type: "validation",
                message: "Invalid tracking number format for carrier",
                retryable: false
            }
        }
    ]
};

export const getTrackingStatusFixture: TestFixture<GetTrackingStatusParams, unknown> = {
    provider: "shippo",
    operationId: "getTrackingStatus",
    validCases: [
        {
            name: "Get tracking status",
            input: { carrier: "usps", tracking_number: "9400111899223456789012" },
            expectedOutput: {
                carrier: "usps",
                tracking_number: "9400111899223456789012",
                status: "TRANSIT",
                status_details: "In Transit to Next Facility"
            }
        }
    ],
    errorCases: [
        {
            name: "Tracking not found",
            input: { carrier: "usps", tracking_number: "0000000000000000000000" },
            expectedError: {
                type: "not_found",
                message: "Tracking information not found",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Manifest Fixtures
// ==========================================

export const createManifestFixture: TestFixture<CreateManifestParams, unknown> = {
    provider: "shippo",
    operationId: "createManifest",
    validCases: [
        {
            name: "Create manifest",
            input: {
                carrier_account: "carrier_123",
                shipment_date: "2025-01-15",
                address_from: {
                    name: "Warehouse",
                    street1: "100 Industrial Way",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94107",
                    country: "US"
                },
                async: false
            },
            expectedOutput: {
                manifest_id: "manifest_123",
                status: "SUCCESS",
                message: "Manifest created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid carrier account",
            input: {
                carrier_account: "invalid_account",
                shipment_date: "2025-01-15",
                address_from: {
                    name: "Warehouse",
                    street1: "100 Industrial Way",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94107",
                    country: "US"
                },
                async: false
            },
            expectedError: {
                type: "not_found",
                message: "Carrier account not found",
                retryable: false
            }
        },
        {
            name: "No shipments to manifest",
            input: {
                carrier_account: "carrier_123",
                shipment_date: "2025-01-15",
                address_from: {
                    name: "Warehouse",
                    street1: "100 Industrial Way",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94107",
                    country: "US"
                },
                async: false
            },
            expectedError: {
                type: "validation",
                message: "No shipments available for manifest on this date",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Carrier Account Fixtures
// ==========================================

export const listCarrierAccountsFixture: TestFixture<ListCarrierAccountsParams, unknown> = {
    provider: "shippo",
    operationId: "listCarrierAccounts",
    validCases: [
        {
            name: "List carrier accounts",
            input: { page: 1, results: 25 },
            expectedOutput: {
                carrier_accounts: [],
                total_count: 0,
                page: 1,
                has_more: false
            }
        }
    ],
    errorCases: [
        {
            name: "Server error",
            input: { page: 1, results: 25 },
            expectedError: {
                type: "server_error",
                message: "Internal server error",
                retryable: true
            }
        }
    ]
};

// ==========================================
// Export all fixtures
// ==========================================

export const shippoFixtures = [
    validateAddressFixture,
    createShipmentFixture,
    listShipmentsFixture,
    getShipmentFixture,
    getRatesFixture,
    createLabelFixture,
    getLabelFixture,
    trackShipmentFixture,
    getTrackingStatusFixture,
    createManifestFixture,
    listCarrierAccountsFixture
];
