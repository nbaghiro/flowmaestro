/**
 * Shopify Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Order operations
import { executeAdjustInventory } from "../operations/adjustInventory";
import { executeCancelOrder } from "../operations/cancelOrder";
import { executeCloseOrder } from "../operations/closeOrder";
import { executeCreateProduct } from "../operations/createProduct";
import { executeCreateWebhook } from "../operations/createWebhook";
import { executeDeleteWebhook } from "../operations/deleteWebhook";
import { executeGetOrder } from "../operations/getOrder";
import { executeGetProduct } from "../operations/getProduct";
import { executeListInventoryLevels } from "../operations/listInventoryLevels";
import { executeListOrders } from "../operations/listOrders";
import { executeListProducts } from "../operations/listProducts";
import { executeUpdateOrder } from "../operations/updateOrder";

// Product operations
import { executeUpdateProduct } from "../operations/updateProduct";

// Inventory operations
import { executeSetInventory } from "../operations/setInventory";

// Webhook operations
import { executeListWebhooks } from "../operations/listWebhooks";

// Schemas
import {
    ListOrdersSchema,
    GetOrderSchema,
    UpdateOrderSchema,
    CloseOrderSchema,
    CancelOrderSchema,
    ListProductsSchema,
    GetProductSchema,
    CreateProductSchema,
    UpdateProductSchema,
    ListInventoryLevelsSchema,
    AdjustInventorySchema,
    SetInventorySchema,
    ListWebhooksSchema,
    CreateWebhookSchema,
    DeleteWebhookSchema
} from "../schemas";

import type { ShopifyClient } from "../client/ShopifyClient";

// Sample test data
const sampleOrder = {
    id: 5847392847,
    admin_graphql_api_id: "gid://shopify/Order/5847392847",
    order_number: 1042,
    name: "#1042",
    email: "john.smith@example.com",
    phone: "+1-555-123-4567",
    created_at: "2024-01-15T10:30:00-05:00",
    updated_at: "2024-01-15T14:45:00-05:00",
    closed_at: null,
    cancelled_at: null,
    cancel_reason: null,
    note: "Please gift wrap",
    tags: "VIP, repeat-customer",
    currency: "USD",
    total_price: "249.99",
    subtotal_price: "229.99",
    total_tax: "20.00",
    total_discounts: "10.00",
    total_line_items_price: "239.99",
    financial_status: "paid",
    fulfillment_status: "unfulfilled",
    processing_method: "direct",
    gateway: "shopify_payments",
    test: false,
    confirmed: true,
    buyer_accepts_marketing: true,
    line_items: [
        {
            id: 12847392847,
            variant_id: 44829384756,
            product_id: 8847392847,
            title: "Premium Wireless Headphones",
            variant_title: "Black / Large",
            sku: "WH-PRO-BLK-L",
            vendor: "TechAudio",
            quantity: 1,
            price: "199.99",
            total_discount: "10.00",
            fulfillment_status: null,
            gift_card: false,
            taxable: true,
            name: "Premium Wireless Headphones - Black / Large"
        }
    ]
};

const sampleProduct = {
    id: 8847392847,
    admin_graphql_api_id: "gid://shopify/Product/8847392847",
    title: "Premium Wireless Headphones",
    body_html: "<p>Experience crystal-clear audio with our premium wireless headphones.</p>",
    vendor: "TechAudio",
    product_type: "Electronics",
    created_at: "2023-09-01T10:00:00-05:00",
    updated_at: "2024-01-10T14:30:00-05:00",
    published_at: "2023-09-01T12:00:00-05:00",
    template_suffix: null,
    status: "active" as const,
    published_scope: "web",
    tags: "wireless, audio, premium, headphones",
    handle: "premium-wireless-headphones",
    variants: [
        {
            id: 44829384756,
            product_id: 8847392847,
            title: "Black / Large",
            price: "199.99",
            compare_at_price: "249.99",
            sku: "WH-PRO-BLK-L",
            position: 1,
            inventory_item_id: 47382947583,
            inventory_quantity: 150,
            option1: "Black",
            option2: "Large",
            created_at: "2023-09-01T10:00:00-05:00",
            updated_at: "2024-01-10T14:30:00-05:00",
            taxable: true,
            barcode: "123456789012",
            grams: 350,
            weight: 0.77,
            weight_unit: "lb",
            requires_shipping: true
        }
    ],
    options: [
        {
            id: 11847392847,
            product_id: 8847392847,
            name: "Color",
            position: 1,
            values: ["Black", "Silver"]
        }
    ],
    images: [
        {
            id: 38472947583,
            product_id: 8847392847,
            position: 1,
            created_at: "2023-09-01T10:00:00-05:00",
            updated_at: "2023-09-01T10:00:00-05:00",
            alt: "Premium Wireless Headphones - Front View",
            width: 1200,
            height: 1200,
            src: "https://cdn.shopify.com/s/files/1/0001/0001/products/headphones-front.jpg"
        }
    ]
};

const sampleInventoryLevel = {
    inventory_item_id: 47382947583,
    location_id: 78493847584,
    available: 150,
    updated_at: "2024-01-15T10:00:00-05:00"
};

const sampleWebhook = {
    id: 98473829475,
    address: "https://api.myapp.com/webhooks/shopify/orders",
    topic: "orders/create",
    created_at: "2024-01-01T00:00:00-05:00",
    updated_at: "2024-01-01T00:00:00-05:00",
    format: "json" as const,
    fields: [],
    metafield_namespaces: [],
    api_version: "2025-01"
};

// Mock ShopifyClient factory
function createMockShopifyClient(): jest.Mocked<ShopifyClient> {
    return {
        // Order operations
        listOrders: jest.fn(),
        getOrder: jest.fn(),
        updateOrder: jest.fn(),
        closeOrder: jest.fn(),
        cancelOrder: jest.fn(),
        // Product operations
        listProducts: jest.fn(),
        getProduct: jest.fn(),
        createProduct: jest.fn(),
        updateProduct: jest.fn(),
        deleteProduct: jest.fn(),
        // Inventory operations
        listInventoryLevels: jest.fn(),
        adjustInventory: jest.fn(),
        setInventory: jest.fn(),
        listLocations: jest.fn(),
        // Customer operations
        listCustomers: jest.fn(),
        getCustomer: jest.fn(),
        searchCustomers: jest.fn(),
        createCustomer: jest.fn(),
        updateCustomer: jest.fn(),
        // Webhook operations
        listWebhooks: jest.fn(),
        createWebhook: jest.fn(),
        getWebhook: jest.fn(),
        deleteWebhook: jest.fn(),
        // Shop operations
        getShopInfo: jest.fn(),
        // Utility methods
        getShop: jest.fn(),
        getApiVersion: jest.fn(),
        getRateLimitInfo: jest.fn(),
        // Base methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<ShopifyClient>;
}

describe("Shopify Operation Executors", () => {
    let mockClient: jest.Mocked<ShopifyClient>;

    beforeEach(() => {
        mockClient = createMockShopifyClient();
    });

    // ==========================================
    // Order Operations
    // ==========================================

    describe("executeListOrders", () => {
        it("calls client with correct params", async () => {
            mockClient.listOrders.mockResolvedValueOnce({
                orders: [sampleOrder]
            });

            await executeListOrders(mockClient, {
                status: "open",
                financial_status: "paid",
                limit: 25
            });

            expect(mockClient.listOrders).toHaveBeenCalledWith({
                status: "open",
                financial_status: "paid",
                fulfillment_status: undefined,
                created_at_min: undefined,
                created_at_max: undefined,
                updated_at_min: undefined,
                updated_at_max: undefined,
                limit: 25,
                since_id: undefined,
                fields: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listOrders.mockResolvedValueOnce({
                orders: [sampleOrder]
            });

            const result = await executeListOrders(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                orders: [sampleOrder],
                count: 1
            });
        });

        it("returns empty array when no orders", async () => {
            mockClient.listOrders.mockResolvedValueOnce({
                orders: []
            });

            const result = await executeListOrders(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                orders: [],
                count: 0
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listOrders.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListOrders(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listOrders.mockRejectedValueOnce("unknown error");

            const result = await executeListOrders(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list orders");
        });
    });

    describe("executeGetOrder", () => {
        it("calls client with correct params", async () => {
            mockClient.getOrder.mockResolvedValueOnce({
                order: sampleOrder
            });

            await executeGetOrder(mockClient, {
                order_id: "5847392847"
            });

            expect(mockClient.getOrder).toHaveBeenCalledWith("5847392847", undefined);
        });

        it("calls client with fields param", async () => {
            mockClient.getOrder.mockResolvedValueOnce({
                order: sampleOrder
            });

            await executeGetOrder(mockClient, {
                order_id: "5847392847",
                fields: "id,name,total_price"
            });

            expect(mockClient.getOrder).toHaveBeenCalledWith("5847392847", "id,name,total_price");
        });

        it("returns normalized output on success", async () => {
            mockClient.getOrder.mockResolvedValueOnce({
                order: sampleOrder
            });

            const result = await executeGetOrder(mockClient, {
                order_id: "5847392847"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                order: sampleOrder
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getOrder.mockRejectedValueOnce(new Error("Order not found"));

            const result = await executeGetOrder(mockClient, {
                order_id: "9999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Order not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateOrder", () => {
        it("calls client with correct params", async () => {
            const updatedOrder = { ...sampleOrder, note: "Updated note" };
            mockClient.updateOrder.mockResolvedValueOnce({
                order: updatedOrder
            });

            await executeUpdateOrder(mockClient, {
                order_id: "5847392847",
                note: "Updated note",
                tags: "VIP, priority"
            });

            expect(mockClient.updateOrder).toHaveBeenCalledWith("5847392847", {
                note: "Updated note",
                tags: "VIP, priority",
                email: undefined,
                phone: undefined,
                buyer_accepts_marketing: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const updatedOrder = { ...sampleOrder, note: "Updated note" };
            mockClient.updateOrder.mockResolvedValueOnce({
                order: updatedOrder
            });

            const result = await executeUpdateOrder(mockClient, {
                order_id: "5847392847",
                note: "Updated note"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                order: updatedOrder
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateOrder.mockRejectedValueOnce(new Error("Order not found"));

            const result = await executeUpdateOrder(mockClient, {
                order_id: "9999999999",
                note: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Order not found");
        });
    });

    describe("executeCloseOrder", () => {
        it("calls client with correct params", async () => {
            const closedOrder = { ...sampleOrder, closed_at: "2024-01-16T10:00:00-05:00" };
            mockClient.closeOrder.mockResolvedValueOnce({
                order: closedOrder
            });

            await executeCloseOrder(mockClient, {
                order_id: "5847392847"
            });

            expect(mockClient.closeOrder).toHaveBeenCalledWith("5847392847");
        });

        it("returns normalized output on success", async () => {
            const closedOrder = { ...sampleOrder, closed_at: "2024-01-16T10:00:00-05:00" };
            mockClient.closeOrder.mockResolvedValueOnce({
                order: closedOrder
            });

            const result = await executeCloseOrder(mockClient, {
                order_id: "5847392847"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                order: closedOrder,
                message: "Order closed successfully"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.closeOrder.mockRejectedValueOnce(new Error("Order not found"));

            const result = await executeCloseOrder(mockClient, {
                order_id: "9999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Order not found");
        });
    });

    describe("executeCancelOrder", () => {
        it("calls client with correct params", async () => {
            const cancelledOrder = {
                ...sampleOrder,
                cancelled_at: "2024-01-16T10:00:00-05:00",
                cancel_reason: "customer"
            };
            mockClient.cancelOrder.mockResolvedValueOnce({
                order: cancelledOrder
            });

            await executeCancelOrder(mockClient, {
                order_id: "5847392847",
                reason: "customer",
                email: true,
                restock: true
            });

            expect(mockClient.cancelOrder).toHaveBeenCalledWith("5847392847", {
                reason: "customer",
                email: true,
                restock: true
            });
        });

        it("returns normalized output on success", async () => {
            const cancelledOrder = {
                ...sampleOrder,
                cancelled_at: "2024-01-16T10:00:00-05:00",
                cancel_reason: "customer"
            };
            mockClient.cancelOrder.mockResolvedValueOnce({
                order: cancelledOrder
            });

            const result = await executeCancelOrder(mockClient, {
                order_id: "5847392847",
                reason: "customer"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                order: cancelledOrder,
                message: "Order cancelled successfully"
            });
        });

        it("returns error on client failure with retryable false", async () => {
            mockClient.cancelOrder.mockRejectedValueOnce(new Error("Order already cancelled"));

            const result = await executeCancelOrder(mockClient, {
                order_id: "5847392847"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Order already cancelled");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ==========================================
    // Product Operations
    // ==========================================

    describe("executeListProducts", () => {
        it("calls client with correct params", async () => {
            mockClient.listProducts.mockResolvedValueOnce({
                products: [sampleProduct]
            });

            await executeListProducts(mockClient, {
                vendor: "TechAudio",
                status: "active",
                limit: 50
            });

            expect(mockClient.listProducts).toHaveBeenCalledWith({
                ids: undefined,
                limit: 50,
                since_id: undefined,
                title: undefined,
                vendor: "TechAudio",
                product_type: undefined,
                status: "active",
                created_at_min: undefined,
                created_at_max: undefined,
                updated_at_min: undefined,
                updated_at_max: undefined,
                fields: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listProducts.mockResolvedValueOnce({
                products: [sampleProduct]
            });

            const result = await executeListProducts(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                products: [sampleProduct],
                count: 1
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listProducts.mockRejectedValueOnce(new Error("API error"));

            const result = await executeListProducts(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("API error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetProduct", () => {
        it("calls client with correct params", async () => {
            mockClient.getProduct.mockResolvedValueOnce({
                product: sampleProduct
            });

            await executeGetProduct(mockClient, {
                product_id: "8847392847"
            });

            expect(mockClient.getProduct).toHaveBeenCalledWith("8847392847", undefined);
        });

        it("calls client with fields param", async () => {
            mockClient.getProduct.mockResolvedValueOnce({
                product: sampleProduct
            });

            await executeGetProduct(mockClient, {
                product_id: "8847392847",
                fields: "id,title,variants"
            });

            expect(mockClient.getProduct).toHaveBeenCalledWith("8847392847", "id,title,variants");
        });

        it("returns normalized output on success", async () => {
            mockClient.getProduct.mockResolvedValueOnce({
                product: sampleProduct
            });

            const result = await executeGetProduct(mockClient, {
                product_id: "8847392847"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                product: sampleProduct
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getProduct.mockRejectedValueOnce(new Error("Product not found"));

            const result = await executeGetProduct(mockClient, {
                product_id: "9999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Product not found");
        });
    });

    describe("executeCreateProduct", () => {
        it("calls client with correct params", async () => {
            const newProduct = { ...sampleProduct, id: 8847392850 };
            mockClient.createProduct.mockResolvedValueOnce({
                product: newProduct
            });

            await executeCreateProduct(mockClient, {
                title: "New Product",
                body_html: "<p>Description</p>",
                vendor: "TestVendor",
                product_type: "Electronics",
                tags: "new, test",
                status: "draft"
            });

            expect(mockClient.createProduct).toHaveBeenCalledWith({
                title: "New Product",
                body_html: "<p>Description</p>",
                vendor: "TestVendor",
                product_type: "Electronics",
                tags: "new, test",
                status: "draft",
                variants: undefined,
                images: undefined
            });
        });

        it("calls client with variants", async () => {
            const newProduct = { ...sampleProduct, id: 8847392850 };
            mockClient.createProduct.mockResolvedValueOnce({
                product: newProduct
            });

            await executeCreateProduct(mockClient, {
                title: "New Product",
                status: "active",
                variants: [
                    { option1: "Small", price: "19.99", sku: "TEST-SM", inventory_quantity: 100 },
                    { option1: "Large", price: "24.99", sku: "TEST-LG", inventory_quantity: 50 }
                ]
            });

            expect(mockClient.createProduct).toHaveBeenCalledWith({
                title: "New Product",
                body_html: undefined,
                vendor: undefined,
                product_type: undefined,
                tags: undefined,
                status: "active",
                variants: [
                    { option1: "Small", price: "19.99", sku: "TEST-SM", inventory_quantity: 100 },
                    { option1: "Large", price: "24.99", sku: "TEST-LG", inventory_quantity: 50 }
                ],
                images: undefined
            });
        });

        it("calls client with images", async () => {
            const newProduct = { ...sampleProduct, id: 8847392850 };
            mockClient.createProduct.mockResolvedValueOnce({
                product: newProduct
            });

            await executeCreateProduct(mockClient, {
                title: "New Product",
                status: "active",
                images: [
                    { src: "https://example.com/image1.jpg", alt: "Image 1" },
                    { src: "https://example.com/image2.jpg", alt: "Image 2" }
                ]
            });

            expect(mockClient.createProduct).toHaveBeenCalledWith({
                title: "New Product",
                body_html: undefined,
                vendor: undefined,
                product_type: undefined,
                tags: undefined,
                status: "active",
                variants: undefined,
                images: [
                    { src: "https://example.com/image1.jpg", alt: "Image 1" },
                    { src: "https://example.com/image2.jpg", alt: "Image 2" }
                ]
            });
        });

        it("returns normalized output on success", async () => {
            const newProduct = { ...sampleProduct, id: 8847392850 };
            mockClient.createProduct.mockResolvedValueOnce({
                product: newProduct
            });

            const result = await executeCreateProduct(mockClient, {
                title: "New Product",
                status: "active"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                product: newProduct,
                productId: "8847392850",
                message: "Product created successfully"
            });
        });

        it("returns error on client failure with retryable false", async () => {
            mockClient.createProduct.mockRejectedValueOnce(new Error("Validation error"));

            const result = await executeCreateProduct(mockClient, {
                title: "New Product",
                status: "active"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Validation error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateProduct", () => {
        it("calls client with correct params", async () => {
            const updatedProduct = { ...sampleProduct, title: "Updated Title" };
            mockClient.updateProduct.mockResolvedValueOnce({
                product: updatedProduct
            });

            await executeUpdateProduct(mockClient, {
                product_id: "8847392847",
                title: "Updated Title",
                status: "archived"
            });

            expect(mockClient.updateProduct).toHaveBeenCalledWith("8847392847", {
                title: "Updated Title",
                body_html: undefined,
                vendor: undefined,
                product_type: undefined,
                tags: undefined,
                status: "archived"
            });
        });

        it("returns normalized output on success", async () => {
            const updatedProduct = { ...sampleProduct, title: "Updated Title" };
            mockClient.updateProduct.mockResolvedValueOnce({
                product: updatedProduct
            });

            const result = await executeUpdateProduct(mockClient, {
                product_id: "8847392847",
                title: "Updated Title"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                product: updatedProduct
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateProduct.mockRejectedValueOnce(new Error("Product not found"));

            const result = await executeUpdateProduct(mockClient, {
                product_id: "9999999999",
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Product not found");
        });
    });

    // ==========================================
    // Inventory Operations
    // ==========================================

    describe("executeListInventoryLevels", () => {
        it("calls client with correct params", async () => {
            mockClient.listInventoryLevels.mockResolvedValueOnce({
                inventory_levels: [sampleInventoryLevel]
            });

            await executeListInventoryLevels(mockClient, {
                inventory_item_ids: "47382947583,47382947584",
                location_ids: "78493847584",
                limit: 100
            });

            expect(mockClient.listInventoryLevels).toHaveBeenCalledWith({
                inventory_item_ids: "47382947583,47382947584",
                location_ids: "78493847584",
                limit: 100,
                updated_at_min: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listInventoryLevels.mockResolvedValueOnce({
                inventory_levels: [sampleInventoryLevel]
            });

            const result = await executeListInventoryLevels(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                inventory_levels: [sampleInventoryLevel],
                count: 1
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listInventoryLevels.mockRejectedValueOnce(new Error("API error"));

            const result = await executeListInventoryLevels(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("API error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeAdjustInventory", () => {
        it("calls client with correct params for positive adjustment", async () => {
            const adjustedLevel = { ...sampleInventoryLevel, available: 200 };
            mockClient.adjustInventory.mockResolvedValueOnce({
                inventory_level: adjustedLevel
            });

            await executeAdjustInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available_adjustment: 50
            });

            expect(mockClient.adjustInventory).toHaveBeenCalledWith({
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available_adjustment: 50
            });
        });

        it("calls client with correct params for negative adjustment", async () => {
            const adjustedLevel = { ...sampleInventoryLevel, available: 100 };
            mockClient.adjustInventory.mockResolvedValueOnce({
                inventory_level: adjustedLevel
            });

            await executeAdjustInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available_adjustment: -50
            });

            expect(mockClient.adjustInventory).toHaveBeenCalledWith({
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available_adjustment: -50
            });
        });

        it("returns normalized output on success", async () => {
            const adjustedLevel = { ...sampleInventoryLevel, available: 200 };
            mockClient.adjustInventory.mockResolvedValueOnce({
                inventory_level: adjustedLevel
            });

            const result = await executeAdjustInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available_adjustment: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                inventory_level: adjustedLevel,
                adjustment: 50,
                message: "Inventory adjusted by 50"
            });
        });

        it("returns error on client failure with retryable false", async () => {
            mockClient.adjustInventory.mockRejectedValueOnce(new Error("Inventory item not found"));

            const result = await executeAdjustInventory(mockClient, {
                inventory_item_id: "9999999999",
                location_id: "78493847584",
                available_adjustment: 10
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Inventory item not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeSetInventory", () => {
        it("calls client with correct params", async () => {
            const newLevel = { ...sampleInventoryLevel, available: 100 };
            mockClient.setInventory.mockResolvedValueOnce({
                inventory_level: newLevel
            });

            await executeSetInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available: 100
            });

            expect(mockClient.setInventory).toHaveBeenCalledWith({
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available: 100
            });
        });

        it("handles setting inventory to zero", async () => {
            const newLevel = { ...sampleInventoryLevel, available: 0 };
            mockClient.setInventory.mockResolvedValueOnce({
                inventory_level: newLevel
            });

            const result = await executeSetInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                inventory_level: newLevel,
                message: "Inventory set to 0"
            });
        });

        it("returns normalized output on success", async () => {
            const newLevel = { ...sampleInventoryLevel, available: 100 };
            mockClient.setInventory.mockResolvedValueOnce({
                inventory_level: newLevel
            });

            const result = await executeSetInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "78493847584",
                available: 100
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                inventory_level: newLevel,
                message: "Inventory set to 100"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.setInventory.mockRejectedValueOnce(new Error("Location not found"));

            const result = await executeSetInventory(mockClient, {
                inventory_item_id: "47382947583",
                location_id: "9999999999",
                available: 100
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Location not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ==========================================
    // Webhook Operations
    // ==========================================

    describe("executeListWebhooks", () => {
        it("calls client with correct params", async () => {
            mockClient.listWebhooks.mockResolvedValueOnce({
                webhooks: [sampleWebhook]
            });

            await executeListWebhooks(mockClient, {
                topic: "orders/create",
                limit: 25
            });

            expect(mockClient.listWebhooks).toHaveBeenCalledWith({
                address: undefined,
                topic: "orders/create",
                limit: 25,
                since_id: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listWebhooks.mockResolvedValueOnce({
                webhooks: [sampleWebhook]
            });

            const result = await executeListWebhooks(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                webhooks: [sampleWebhook],
                count: 1
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listWebhooks.mockRejectedValueOnce(new Error("API error"));

            const result = await executeListWebhooks(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("API error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateWebhook", () => {
        it("calls client with correct params", async () => {
            const newWebhook = { ...sampleWebhook, id: 98473829480 };
            mockClient.createWebhook.mockResolvedValueOnce({
                webhook: newWebhook
            });

            await executeCreateWebhook(mockClient, {
                topic: "orders/create",
                address: "https://api.myapp.com/webhooks/orders",
                format: "json"
            });

            expect(mockClient.createWebhook).toHaveBeenCalledWith({
                topic: "orders/create",
                address: "https://api.myapp.com/webhooks/orders",
                format: "json"
            });
        });

        it("returns normalized output on success", async () => {
            const newWebhook = { ...sampleWebhook, id: 98473829480 };
            mockClient.createWebhook.mockResolvedValueOnce({
                webhook: newWebhook
            });

            const result = await executeCreateWebhook(mockClient, {
                topic: "orders/create",
                address: "https://api.myapp.com/webhooks/orders",
                format: "json"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                webhook: newWebhook,
                webhookId: "98473829480",
                message: "Webhook created for topic: orders/create"
            });
        });

        it("returns error on client failure with retryable false", async () => {
            mockClient.createWebhook.mockRejectedValueOnce(new Error("Webhook already exists"));

            const result = await executeCreateWebhook(mockClient, {
                topic: "orders/create",
                address: "https://api.myapp.com/webhooks/orders",
                format: "json"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Webhook already exists");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteWebhook", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteWebhook.mockResolvedValueOnce({});

            await executeDeleteWebhook(mockClient, {
                webhook_id: "98473829475"
            });

            expect(mockClient.deleteWebhook).toHaveBeenCalledWith("98473829475");
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteWebhook.mockResolvedValueOnce({});

            const result = await executeDeleteWebhook(mockClient, {
                webhook_id: "98473829475"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                webhookId: "98473829475",
                message: "Webhook deleted successfully"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteWebhook.mockRejectedValueOnce(new Error("Webhook not found"));

            const result = await executeDeleteWebhook(mockClient, {
                webhook_id: "9999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Webhook not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ==========================================
    // Schema Validation
    // ==========================================

    describe("schema validation", () => {
        describe("ListOrdersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = ListOrdersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with status filter", () => {
                const result = ListOrdersSchema.safeParse({
                    status: "open",
                    financial_status: "paid",
                    limit: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with date range", () => {
                const result = ListOrdersSchema.safeParse({
                    created_at_min: "2024-01-01T00:00:00Z",
                    created_at_max: "2024-01-31T23:59:59Z"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = ListOrdersSchema.safeParse({
                    status: "invalid_status"
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit above max", () => {
                const result = ListOrdersSchema.safeParse({
                    limit: 500
                });
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = ListOrdersSchema.parse({});
                expect(result.limit).toBe(50);
            });
        });

        describe("GetOrderSchema", () => {
            it("validates minimal input", () => {
                const result = GetOrderSchema.safeParse({
                    order_id: "5847392847"
                });
                expect(result.success).toBe(true);
            });

            it("validates with fields", () => {
                const result = GetOrderSchema.safeParse({
                    order_id: "5847392847",
                    fields: "id,name,total_price"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing order_id", () => {
                const result = GetOrderSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("UpdateOrderSchema", () => {
            it("validates minimal input", () => {
                const result = UpdateOrderSchema.safeParse({
                    order_id: "5847392847"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = UpdateOrderSchema.safeParse({
                    order_id: "5847392847",
                    note: "Test note",
                    tags: "vip, priority",
                    email: "test@example.com",
                    phone: "+1-555-123-4567",
                    buyer_accepts_marketing: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = UpdateOrderSchema.safeParse({
                    order_id: "5847392847",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("CloseOrderSchema", () => {
            it("validates with order_id", () => {
                const result = CloseOrderSchema.safeParse({
                    order_id: "5847392847"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing order_id", () => {
                const result = CloseOrderSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("CancelOrderSchema", () => {
            it("validates minimal input", () => {
                const result = CancelOrderSchema.safeParse({
                    order_id: "5847392847"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all options", () => {
                const result = CancelOrderSchema.safeParse({
                    order_id: "5847392847",
                    reason: "customer",
                    email: true,
                    restock: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid reason", () => {
                const result = CancelOrderSchema.safeParse({
                    order_id: "5847392847",
                    reason: "invalid_reason"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("ListProductsSchema", () => {
            it("validates empty input", () => {
                const result = ListProductsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = ListProductsSchema.safeParse({
                    vendor: "TechAudio",
                    status: "active",
                    limit: 25
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = ListProductsSchema.safeParse({
                    status: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("GetProductSchema", () => {
            it("validates minimal input", () => {
                const result = GetProductSchema.safeParse({
                    product_id: "8847392847"
                });
                expect(result.success).toBe(true);
            });

            it("validates with fields", () => {
                const result = GetProductSchema.safeParse({
                    product_id: "8847392847",
                    fields: "id,title,variants"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("CreateProductSchema", () => {
            it("validates minimal input", () => {
                const result = CreateProductSchema.safeParse({
                    title: "New Product"
                });
                expect(result.success).toBe(true);
            });

            it("validates with variants", () => {
                const result = CreateProductSchema.safeParse({
                    title: "New Product",
                    variants: [
                        { option1: "Small", price: "19.99", sku: "SM-001" },
                        { option1: "Large", price: "24.99", sku: "LG-001" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates with images", () => {
                const result = CreateProductSchema.safeParse({
                    title: "New Product",
                    images: [{ src: "https://example.com/image.jpg", alt: "Product image" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing title", () => {
                const result = CreateProductSchema.safeParse({
                    body_html: "<p>Description</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty title", () => {
                const result = CreateProductSchema.safeParse({
                    title: ""
                });
                expect(result.success).toBe(false);
            });

            it("applies default status", () => {
                const result = CreateProductSchema.parse({
                    title: "New Product"
                });
                expect(result.status).toBe("active");
            });
        });

        describe("UpdateProductSchema", () => {
            it("validates minimal input", () => {
                const result = UpdateProductSchema.safeParse({
                    product_id: "8847392847"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = UpdateProductSchema.safeParse({
                    product_id: "8847392847",
                    title: "Updated Title",
                    body_html: "<p>Updated description</p>",
                    vendor: "NewVendor",
                    product_type: "NewType",
                    tags: "new, updated",
                    status: "archived"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("ListInventoryLevelsSchema", () => {
            it("validates empty input", () => {
                const result = ListInventoryLevelsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with item IDs", () => {
                const result = ListInventoryLevelsSchema.safeParse({
                    inventory_item_ids: "123,456,789"
                });
                expect(result.success).toBe(true);
            });

            it("validates with location IDs", () => {
                const result = ListInventoryLevelsSchema.safeParse({
                    location_ids: "111,222"
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = ListInventoryLevelsSchema.parse({});
                expect(result.limit).toBe(50);
            });
        });

        describe("AdjustInventorySchema", () => {
            it("validates positive adjustment", () => {
                const result = AdjustInventorySchema.safeParse({
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available_adjustment: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates negative adjustment", () => {
                const result = AdjustInventorySchema.safeParse({
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available_adjustment: -25
                });
                expect(result.success).toBe(true);
            });

            it("validates zero adjustment", () => {
                const result = AdjustInventorySchema.safeParse({
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available_adjustment: 0
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = AdjustInventorySchema.safeParse({
                    inventory_item_id: "47382947583"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("SetInventorySchema", () => {
            it("validates with all fields", () => {
                const result = SetInventorySchema.safeParse({
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available: 100
                });
                expect(result.success).toBe(true);
            });

            it("validates zero inventory", () => {
                const result = SetInventorySchema.safeParse({
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available: 0
                });
                expect(result.success).toBe(true);
            });

            it("rejects negative inventory", () => {
                const result = SetInventorySchema.safeParse({
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available: -10
                });
                expect(result.success).toBe(false);
            });
        });

        describe("ListWebhooksSchema", () => {
            it("validates empty input", () => {
                const result = ListWebhooksSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with topic filter", () => {
                const result = ListWebhooksSchema.safeParse({
                    topic: "orders/create"
                });
                expect(result.success).toBe(true);
            });

            it("validates with address filter", () => {
                const result = ListWebhooksSchema.safeParse({
                    address: "https://api.myapp.com/webhooks"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid topic", () => {
                const result = ListWebhooksSchema.safeParse({
                    topic: "invalid/topic"
                });
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = ListWebhooksSchema.parse({});
                expect(result.limit).toBe(50);
            });
        });

        describe("CreateWebhookSchema", () => {
            it("validates minimal input", () => {
                const result = CreateWebhookSchema.safeParse({
                    topic: "orders/create",
                    address: "https://api.myapp.com/webhooks"
                });
                expect(result.success).toBe(true);
            });

            it("validates with format", () => {
                const result = CreateWebhookSchema.safeParse({
                    topic: "products/update",
                    address: "https://api.myapp.com/webhooks",
                    format: "json"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid topic", () => {
                const result = CreateWebhookSchema.safeParse({
                    topic: "invalid/topic",
                    address: "https://api.myapp.com/webhooks"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid URL", () => {
                const result = CreateWebhookSchema.safeParse({
                    topic: "orders/create",
                    address: "not-a-url"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing address", () => {
                const result = CreateWebhookSchema.safeParse({
                    topic: "orders/create"
                });
                expect(result.success).toBe(false);
            });

            it("applies default format", () => {
                const result = CreateWebhookSchema.parse({
                    topic: "orders/create",
                    address: "https://api.myapp.com/webhooks"
                });
                expect(result.format).toBe("json");
            });
        });

        describe("DeleteWebhookSchema", () => {
            it("validates with webhook_id", () => {
                const result = DeleteWebhookSchema.safeParse({
                    webhook_id: "98473829475"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing webhook_id", () => {
                const result = DeleteWebhookSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });
    });
});
