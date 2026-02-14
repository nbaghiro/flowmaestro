import type { TestFixture } from "../../../sandbox/types";
import type {
    ListProductsParams,
    GetProductParams,
    CreateProductParams,
    UpdateProductParams,
    ListOrdersParams,
    GetOrderParams,
    UpdateOrderStatusParams,
    ListCustomersParams,
    GetCustomerParams,
    CreateCustomerParams,
    GetInventoryParams,
    UpdateInventoryParams,
    ListCategoriesParams
} from "../schemas";

// ==========================================
// Product Fixtures
// ==========================================

export const listProductsFixture: TestFixture<ListProductsParams, unknown> = {
    provider: "magento",
    operationId: "listProducts",
    validCases: [
        {
            name: "List all products",
            input: { page: 1, pageSize: 20 },
            expectedOutput: {
                products: [
                    {
                        id: 1,
                        sku: "TEST-SKU-001",
                        name: "Test Product",
                        price: 29.99,
                        status: 1,
                        visibility: 4,
                        type_id: "simple"
                    }
                ],
                total_count: 1,
                page: 1,
                page_size: 20
            }
        },
        {
            name: "List enabled products",
            input: { status: "1", page: 1, pageSize: 10 },
            expectedOutput: {
                products: [],
                total_count: 0,
                page: 1,
                page_size: 10
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid API token",
            input: { page: 1, pageSize: 20 },
            expectedError: {
                type: "permission",
                message: "The consumer isn't authorized to access this resource",
                retryable: false
            }
        },
        {
            name: "Rate limit exceeded",
            input: { page: 1, pageSize: 20 },
            expectedError: {
                type: "rate_limit",
                message: "Too many requests. Please try again later.",
                retryable: true
            }
        }
    ]
};

export const getProductFixture: TestFixture<GetProductParams, unknown> = {
    provider: "magento",
    operationId: "getProduct",
    validCases: [
        {
            name: "Get product by SKU",
            input: { sku: "TEST-SKU-001" },
            expectedOutput: {
                product: {
                    id: 1,
                    sku: "TEST-SKU-001",
                    name: "Test Product",
                    price: 29.99,
                    status: 1,
                    visibility: 4,
                    type_id: "simple"
                }
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { sku: "NONEXISTENT-SKU" },
            expectedError: {
                type: "not_found",
                message: "The product that was requested doesn't exist",
                retryable: false
            }
        },
        {
            name: "Invalid SKU format",
            input: { sku: "" },
            expectedError: {
                type: "validation",
                message: "SKU is required",
                retryable: false
            }
        }
    ]
};

export const createProductFixture: TestFixture<CreateProductParams, unknown> = {
    provider: "magento",
    operationId: "createProduct",
    validCases: [
        {
            name: "Create simple product",
            input: {
                sku: "NEW-SKU-001",
                name: "New Product",
                price: 19.99,
                attribute_set_id: 4,
                type_id: "simple",
                status: "1",
                visibility: "4"
            },
            expectedOutput: {
                product: {
                    id: 2,
                    sku: "NEW-SKU-001",
                    name: "New Product"
                },
                sku: "NEW-SKU-001",
                id: 2,
                message: "Product created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Duplicate SKU",
            input: {
                sku: "EXISTING-SKU",
                name: "Duplicate Product",
                price: 19.99,
                attribute_set_id: 4,
                type_id: "simple",
                status: "1",
                visibility: "4"
            },
            expectedError: {
                type: "validation",
                message: "A product with SKU 'EXISTING-SKU' already exists",
                retryable: false
            }
        },
        {
            name: "Invalid attribute set",
            input: {
                sku: "NEW-SKU-002",
                name: "New Product",
                price: 19.99,
                attribute_set_id: 9999,
                type_id: "simple",
                status: "1",
                visibility: "4"
            },
            expectedError: {
                type: "validation",
                message: "Invalid attribute set ID",
                retryable: false
            }
        }
    ]
};

export const updateProductFixture: TestFixture<UpdateProductParams, unknown> = {
    provider: "magento",
    operationId: "updateProduct",
    validCases: [
        {
            name: "Update product price",
            input: { sku: "TEST-SKU-001", price: 24.99 },
            expectedOutput: {
                product: {
                    id: 1,
                    sku: "TEST-SKU-001",
                    price: 24.99
                },
                sku: "TEST-SKU-001",
                message: "Product updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found for update",
            input: { sku: "NONEXISTENT-SKU", price: 24.99 },
            expectedError: {
                type: "not_found",
                message: "The product that was requested doesn't exist",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Order Fixtures
// ==========================================

export const listOrdersFixture: TestFixture<ListOrdersParams, unknown> = {
    provider: "magento",
    operationId: "listOrders",
    validCases: [
        {
            name: "List all orders",
            input: { page: 1, pageSize: 20 },
            expectedOutput: {
                orders: [
                    {
                        entity_id: 100,
                        increment_id: "000000100",
                        status: "processing",
                        grand_total: 99.99,
                        customer_email: "test@example.com"
                    }
                ],
                total_count: 1,
                page: 1,
                page_size: 20
            }
        }
    ],
    errorCases: [
        {
            name: "Server error",
            input: { page: 1, pageSize: 20 },
            expectedError: {
                type: "server_error",
                message: "Internal server error",
                retryable: true
            }
        }
    ]
};

export const getOrderFixture: TestFixture<GetOrderParams, unknown> = {
    provider: "magento",
    operationId: "getOrder",
    validCases: [
        {
            name: "Get order by ID",
            input: { order_id: "100" },
            expectedOutput: {
                order: {
                    entity_id: 100,
                    increment_id: "000000100",
                    status: "processing",
                    grand_total: 99.99,
                    customer_email: "test@example.com",
                    items: []
                }
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { order_id: "999999" },
            expectedError: {
                type: "not_found",
                message: "Requested entity doesn't exist",
                retryable: false
            }
        }
    ]
};

export const updateOrderStatusFixture: TestFixture<UpdateOrderStatusParams, unknown> = {
    provider: "magento",
    operationId: "updateOrderStatus",
    validCases: [
        {
            name: "Update order to complete",
            input: {
                order_id: "100",
                status: "complete",
                comment: "Order completed",
                notify_customer: true
            },
            expectedOutput: {
                order_id: "100",
                new_status: "complete",
                comment_id: 1,
                message: "Order status updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid status transition",
            input: {
                order_id: "100",
                status: "pending",
                notify_customer: false
            },
            expectedError: {
                type: "validation",
                message: "The order cannot be transitioned to the requested status",
                retryable: false
            }
        },
        {
            name: "Order not found",
            input: {
                order_id: "999999",
                status: "complete",
                notify_customer: false
            },
            expectedError: {
                type: "not_found",
                message: "Requested entity doesn't exist",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Customer Fixtures
// ==========================================

export const listCustomersFixture: TestFixture<ListCustomersParams, unknown> = {
    provider: "magento",
    operationId: "listCustomers",
    validCases: [
        {
            name: "List all customers",
            input: { page: 1, pageSize: 20 },
            expectedOutput: {
                customers: [
                    {
                        id: 1,
                        email: "customer@example.com",
                        firstname: "John",
                        lastname: "Doe"
                    }
                ],
                total_count: 1,
                page: 1,
                page_size: 20
            }
        }
    ],
    errorCases: [
        {
            name: "Permission denied",
            input: { page: 1, pageSize: 20 },
            expectedError: {
                type: "permission",
                message: "The consumer isn't authorized to access this resource",
                retryable: false
            }
        }
    ]
};

export const getCustomerFixture: TestFixture<GetCustomerParams, unknown> = {
    provider: "magento",
    operationId: "getCustomer",
    validCases: [
        {
            name: "Get customer by ID",
            input: { customer_id: "1" },
            expectedOutput: {
                customer: {
                    id: 1,
                    email: "customer@example.com",
                    firstname: "John",
                    lastname: "Doe"
                }
            }
        }
    ],
    errorCases: [
        {
            name: "Customer not found",
            input: { customer_id: "999999" },
            expectedError: {
                type: "not_found",
                message: "No such entity with customerId = 999999",
                retryable: false
            }
        }
    ]
};

export const createCustomerFixture: TestFixture<CreateCustomerParams, unknown> = {
    provider: "magento",
    operationId: "createCustomer",
    validCases: [
        {
            name: "Create new customer",
            input: {
                email: "new@example.com",
                firstname: "Jane",
                lastname: "Smith",
                group_id: 1,
                website_id: 1,
                store_id: 1
            },
            expectedOutput: {
                customer: {
                    id: 2,
                    email: "new@example.com",
                    firstname: "Jane",
                    lastname: "Smith"
                },
                customer_id: 2,
                email: "new@example.com",
                message: "Customer created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Duplicate email",
            input: {
                email: "existing@example.com",
                firstname: "Jane",
                lastname: "Smith",
                group_id: 1,
                website_id: 1,
                store_id: 1
            },
            expectedError: {
                type: "validation",
                message: "A customer with the same email address already exists",
                retryable: false
            }
        },
        {
            name: "Invalid email format",
            input: {
                email: "invalid-email",
                firstname: "Jane",
                lastname: "Smith",
                group_id: 1,
                website_id: 1,
                store_id: 1
            },
            expectedError: {
                type: "validation",
                message: "Invalid email format",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Inventory Fixtures
// ==========================================

export const getInventoryFixture: TestFixture<GetInventoryParams, unknown> = {
    provider: "magento",
    operationId: "getInventory",
    validCases: [
        {
            name: "Get inventory for product",
            input: { sku: "TEST-SKU-001" },
            expectedOutput: {
                sku: "TEST-SKU-001",
                quantity: 100,
                is_in_stock: true,
                stock_item: {
                    qty: 100,
                    is_in_stock: true
                }
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { sku: "NONEXISTENT-SKU" },
            expectedError: {
                type: "not_found",
                message: "The stock item wasn't found. Verify the SKU and try again.",
                retryable: false
            }
        }
    ]
};

export const updateInventoryFixture: TestFixture<UpdateInventoryParams, unknown> = {
    provider: "magento",
    operationId: "updateInventory",
    validCases: [
        {
            name: "Update inventory quantity",
            input: {
                sku: "TEST-SKU-001",
                quantity: 50,
                is_in_stock: true,
                source_code: "default"
            },
            expectedOutput: {
                sku: "TEST-SKU-001",
                source_code: "default",
                quantity: 50,
                is_in_stock: true,
                message: "Inventory updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid source code",
            input: {
                sku: "TEST-SKU-001",
                quantity: 50,
                is_in_stock: true,
                source_code: "invalid_source"
            },
            expectedError: {
                type: "validation",
                message: "Invalid source code",
                retryable: false
            }
        },
        {
            name: "Negative quantity",
            input: {
                sku: "TEST-SKU-001",
                quantity: -10,
                is_in_stock: true,
                source_code: "default"
            },
            expectedError: {
                type: "validation",
                message: "Quantity must be a non-negative number",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Category Fixtures
// ==========================================

export const listCategoriesFixture: TestFixture<ListCategoriesParams, unknown> = {
    provider: "magento",
    operationId: "listCategories",
    validCases: [
        {
            name: "List category tree",
            input: {},
            expectedOutput: {
                categories: [
                    {
                        id: 1,
                        name: "Root Catalog",
                        level: 0,
                        is_active: true
                    }
                ],
                root_category: {
                    id: 1,
                    name: "Root Catalog"
                },
                total_count: 1
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid root category",
            input: { root_category_id: 999999 },
            expectedError: {
                type: "not_found",
                message: "Category with ID 999999 doesn't exist",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Export all fixtures
// ==========================================

export const magentoFixtures = [
    listProductsFixture,
    getProductFixture,
    createProductFixture,
    updateProductFixture,
    listOrdersFixture,
    getOrderFixture,
    updateOrderStatusFixture,
    listCustomersFixture,
    getCustomerFixture,
    createCustomerFixture,
    getInventoryFixture,
    updateInventoryFixture,
    listCategoriesFixture
];
