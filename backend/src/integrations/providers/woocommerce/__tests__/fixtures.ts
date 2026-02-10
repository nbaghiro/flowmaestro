/**
 * WooCommerce Test Fixtures
 *
 * Provides sandbox test data for WooCommerce integration operations.
 */

import type { TestFixture } from "../../../sandbox/types";
import type {
    WooCommerceOrder,
    WooCommerceProduct,
    WooCommerceCustomer,
    WooCommerceWebhook
} from "../operations/types";

// ==========================================
// Sample Data
// ==========================================

const sampleOrders: WooCommerceOrder[] = [
    {
        id: 727,
        parent_id: 0,
        number: "727",
        order_key: "wc_order_5d2f6a3b7c8e9",
        created_via: "checkout",
        version: "9.0.0",
        status: "processing",
        currency: "USD",
        date_created: "2024-01-15T10:30:00",
        date_created_gmt: "2024-01-15T10:30:00",
        date_modified: "2024-01-15T10:35:00",
        date_modified_gmt: "2024-01-15T10:35:00",
        discount_total: "0.00",
        discount_tax: "0.00",
        shipping_total: "10.00",
        shipping_tax: "0.00",
        cart_tax: "0.00",
        total: "59.99",
        total_tax: "0.00",
        prices_include_tax: false,
        customer_id: 1,
        customer_ip_address: "192.168.1.1",
        customer_user_agent: "Mozilla/5.0",
        customer_note: "",
        billing: {
            first_name: "John",
            last_name: "Doe",
            company: "",
            address_1: "123 Main St",
            address_2: "",
            city: "New York",
            state: "NY",
            postcode: "10001",
            country: "US",
            email: "john.doe@example.com",
            phone: "555-123-4567"
        },
        shipping: {
            first_name: "John",
            last_name: "Doe",
            company: "",
            address_1: "123 Main St",
            address_2: "",
            city: "New York",
            state: "NY",
            postcode: "10001",
            country: "US",
            phone: "555-123-4567"
        },
        payment_method: "stripe",
        payment_method_title: "Credit Card (Stripe)",
        transaction_id: "ch_3abc123def456",
        date_paid: "2024-01-15T10:31:00",
        date_paid_gmt: "2024-01-15T10:31:00",
        date_completed: null,
        date_completed_gmt: null,
        cart_hash: "abc123def456",
        meta_data: [],
        line_items: [
            {
                id: 1,
                name: "Premium T-Shirt",
                product_id: 100,
                variation_id: 0,
                quantity: 2,
                tax_class: "",
                subtotal: "49.98",
                subtotal_tax: "0.00",
                total: "49.98",
                total_tax: "0.00",
                taxes: [],
                meta_data: [],
                sku: "TSHIRT-001",
                price: 24.99
            }
        ],
        tax_lines: [],
        shipping_lines: [
            {
                id: 1,
                method_title: "Flat Rate",
                method_id: "flat_rate",
                total: "10.00",
                total_tax: "0.00"
            }
        ],
        fee_lines: [],
        coupon_lines: [],
        refunds: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/orders/727" }] }
    },
    {
        id: 728,
        parent_id: 0,
        number: "728",
        order_key: "wc_order_5d2f6a3b7c8f0",
        created_via: "checkout",
        version: "9.0.0",
        status: "completed",
        currency: "USD",
        date_created: "2024-01-14T14:20:00",
        date_created_gmt: "2024-01-14T14:20:00",
        date_modified: "2024-01-14T16:00:00",
        date_modified_gmt: "2024-01-14T16:00:00",
        discount_total: "10.00",
        discount_tax: "0.00",
        shipping_total: "5.00",
        shipping_tax: "0.00",
        cart_tax: "0.00",
        total: "44.99",
        total_tax: "0.00",
        prices_include_tax: false,
        customer_id: 2,
        customer_ip_address: "192.168.1.2",
        customer_user_agent: "Mozilla/5.0",
        customer_note: "Please gift wrap",
        billing: {
            first_name: "Jane",
            last_name: "Smith",
            company: "Acme Corp",
            address_1: "456 Oak Ave",
            address_2: "Suite 100",
            city: "Los Angeles",
            state: "CA",
            postcode: "90001",
            country: "US",
            email: "jane.smith@acme.com",
            phone: "555-987-6543"
        },
        shipping: {
            first_name: "Jane",
            last_name: "Smith",
            company: "Acme Corp",
            address_1: "456 Oak Ave",
            address_2: "Suite 100",
            city: "Los Angeles",
            state: "CA",
            postcode: "90001",
            country: "US",
            phone: "555-987-6543"
        },
        payment_method: "paypal",
        payment_method_title: "PayPal",
        transaction_id: "PAY-xyz789",
        date_paid: "2024-01-14T14:21:00",
        date_paid_gmt: "2024-01-14T14:21:00",
        date_completed: "2024-01-14T16:00:00",
        date_completed_gmt: "2024-01-14T16:00:00",
        cart_hash: "def456ghi789",
        meta_data: [],
        line_items: [
            {
                id: 2,
                name: "Wireless Headphones",
                product_id: 101,
                variation_id: 0,
                quantity: 1,
                tax_class: "",
                subtotal: "49.99",
                subtotal_tax: "0.00",
                total: "49.99",
                total_tax: "0.00",
                taxes: [],
                meta_data: [],
                sku: "HEADPHONES-001",
                price: 49.99
            }
        ],
        tax_lines: [],
        shipping_lines: [
            {
                id: 2,
                method_title: "Standard Shipping",
                method_id: "standard",
                total: "5.00",
                total_tax: "0.00"
            }
        ],
        fee_lines: [],
        coupon_lines: [
            {
                id: 1,
                code: "SAVE10",
                discount: "10.00",
                discount_tax: "0.00"
            }
        ],
        refunds: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/orders/728" }] }
    },
    {
        id: 729,
        parent_id: 0,
        number: "729",
        order_key: "wc_order_5d2f6a3b7c8f1",
        created_via: "admin",
        version: "9.0.0",
        status: "pending",
        currency: "USD",
        date_created: "2024-01-16T09:00:00",
        date_created_gmt: "2024-01-16T09:00:00",
        date_modified: "2024-01-16T09:00:00",
        date_modified_gmt: "2024-01-16T09:00:00",
        discount_total: "0.00",
        discount_tax: "0.00",
        shipping_total: "0.00",
        shipping_tax: "0.00",
        cart_tax: "0.00",
        total: "199.99",
        total_tax: "0.00",
        prices_include_tax: false,
        customer_id: 0,
        customer_ip_address: "",
        customer_user_agent: "",
        customer_note: "",
        billing: {
            first_name: "Bob",
            last_name: "Wilson",
            company: "",
            address_1: "789 Pine Rd",
            address_2: "",
            city: "Chicago",
            state: "IL",
            postcode: "60601",
            country: "US",
            email: "bob.wilson@example.com",
            phone: "555-456-7890"
        },
        shipping: {
            first_name: "Bob",
            last_name: "Wilson",
            company: "",
            address_1: "789 Pine Rd",
            address_2: "",
            city: "Chicago",
            state: "IL",
            postcode: "60601",
            country: "US",
            phone: "555-456-7890"
        },
        payment_method: "",
        payment_method_title: "",
        transaction_id: "",
        date_paid: null,
        date_paid_gmt: null,
        date_completed: null,
        date_completed_gmt: null,
        cart_hash: "",
        meta_data: [],
        line_items: [
            {
                id: 3,
                name: "Smart Watch",
                product_id: 102,
                variation_id: 0,
                quantity: 1,
                tax_class: "",
                subtotal: "199.99",
                subtotal_tax: "0.00",
                total: "199.99",
                total_tax: "0.00",
                taxes: [],
                meta_data: [],
                sku: "WATCH-001",
                price: 199.99
            }
        ],
        tax_lines: [],
        shipping_lines: [],
        fee_lines: [],
        coupon_lines: [],
        refunds: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/orders/729" }] }
    },
    {
        id: 730,
        parent_id: 0,
        number: "730",
        order_key: "wc_order_5d2f6a3b7c8f2",
        created_via: "checkout",
        version: "9.0.0",
        status: "on-hold",
        currency: "USD",
        date_created: "2024-01-16T11:00:00",
        date_created_gmt: "2024-01-16T11:00:00",
        date_modified: "2024-01-16T11:05:00",
        date_modified_gmt: "2024-01-16T11:05:00",
        discount_total: "0.00",
        discount_tax: "0.00",
        shipping_total: "15.00",
        shipping_tax: "0.00",
        cart_tax: "0.00",
        total: "89.99",
        total_tax: "0.00",
        prices_include_tax: false,
        customer_id: 3,
        customer_ip_address: "192.168.1.3",
        customer_user_agent: "Mozilla/5.0",
        customer_note: "",
        billing: {
            first_name: "Alice",
            last_name: "Brown",
            company: "",
            address_1: "321 Elm St",
            address_2: "",
            city: "Seattle",
            state: "WA",
            postcode: "98101",
            country: "US",
            email: "alice.brown@example.com",
            phone: "555-321-9876"
        },
        shipping: {
            first_name: "Alice",
            last_name: "Brown",
            company: "",
            address_1: "321 Elm St",
            address_2: "",
            city: "Seattle",
            state: "WA",
            postcode: "98101",
            country: "US",
            phone: "555-321-9876"
        },
        payment_method: "bacs",
        payment_method_title: "Direct Bank Transfer",
        transaction_id: "",
        date_paid: null,
        date_paid_gmt: null,
        date_completed: null,
        date_completed_gmt: null,
        cart_hash: "ghi789jkl012",
        meta_data: [],
        line_items: [
            {
                id: 4,
                name: "Running Shoes",
                product_id: 103,
                variation_id: 201,
                quantity: 1,
                tax_class: "",
                subtotal: "74.99",
                subtotal_tax: "0.00",
                total: "74.99",
                total_tax: "0.00",
                taxes: [],
                meta_data: [{ id: 1, key: "Size", value: "10" }],
                sku: "SHOES-001-10",
                price: 74.99
            }
        ],
        tax_lines: [],
        shipping_lines: [
            {
                id: 3,
                method_title: "Express Shipping",
                method_id: "express",
                total: "15.00",
                total_tax: "0.00"
            }
        ],
        fee_lines: [],
        coupon_lines: [],
        refunds: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/orders/730" }] }
    },
    {
        id: 731,
        parent_id: 0,
        number: "731",
        order_key: "wc_order_5d2f6a3b7c8f3",
        created_via: "checkout",
        version: "9.0.0",
        status: "cancelled",
        currency: "USD",
        date_created: "2024-01-10T08:00:00",
        date_created_gmt: "2024-01-10T08:00:00",
        date_modified: "2024-01-11T10:00:00",
        date_modified_gmt: "2024-01-11T10:00:00",
        discount_total: "0.00",
        discount_tax: "0.00",
        shipping_total: "5.00",
        shipping_tax: "0.00",
        cart_tax: "0.00",
        total: "29.99",
        total_tax: "0.00",
        prices_include_tax: false,
        customer_id: 4,
        customer_ip_address: "192.168.1.4",
        customer_user_agent: "Mozilla/5.0",
        customer_note: "",
        billing: {
            first_name: "Charlie",
            last_name: "Davis",
            company: "",
            address_1: "555 Cedar Ln",
            address_2: "",
            city: "Miami",
            state: "FL",
            postcode: "33101",
            country: "US",
            email: "charlie.davis@example.com",
            phone: "555-654-3210"
        },
        shipping: {
            first_name: "Charlie",
            last_name: "Davis",
            company: "",
            address_1: "555 Cedar Ln",
            address_2: "",
            city: "Miami",
            state: "FL",
            postcode: "33101",
            country: "US",
            phone: "555-654-3210"
        },
        payment_method: "stripe",
        payment_method_title: "Credit Card (Stripe)",
        transaction_id: "",
        date_paid: null,
        date_paid_gmt: null,
        date_completed: null,
        date_completed_gmt: null,
        cart_hash: "jkl012mno345",
        meta_data: [],
        line_items: [
            {
                id: 5,
                name: "Phone Case",
                product_id: 104,
                variation_id: 0,
                quantity: 1,
                tax_class: "",
                subtotal: "24.99",
                subtotal_tax: "0.00",
                total: "24.99",
                total_tax: "0.00",
                taxes: [],
                meta_data: [],
                sku: "CASE-001",
                price: 24.99
            }
        ],
        tax_lines: [],
        shipping_lines: [
            {
                id: 4,
                method_title: "Standard Shipping",
                method_id: "standard",
                total: "5.00",
                total_tax: "0.00"
            }
        ],
        fee_lines: [],
        coupon_lines: [],
        refunds: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/orders/731" }] }
    }
];

const sampleProducts: WooCommerceProduct[] = [
    {
        id: 100,
        name: "Premium T-Shirt",
        slug: "premium-t-shirt",
        permalink: "https://example.com/product/premium-t-shirt",
        date_created: "2024-01-01T00:00:00",
        date_created_gmt: "2024-01-01T00:00:00",
        date_modified: "2024-01-10T00:00:00",
        date_modified_gmt: "2024-01-10T00:00:00",
        type: "simple",
        status: "publish",
        featured: false,
        catalog_visibility: "visible",
        description: "A premium quality cotton t-shirt available in multiple colors.",
        short_description: "Premium cotton t-shirt",
        sku: "TSHIRT-001",
        price: "24.99",
        regular_price: "29.99",
        sale_price: "24.99",
        date_on_sale_from: null,
        date_on_sale_from_gmt: null,
        date_on_sale_to: null,
        date_on_sale_to_gmt: null,
        price_html: "<del>$29.99</del> <ins>$24.99</ins>",
        on_sale: true,
        purchasable: true,
        total_sales: 150,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: "",
        button_text: "",
        tax_status: "taxable",
        tax_class: "",
        manage_stock: true,
        stock_quantity: 250,
        stock_status: "instock",
        backorders: "no",
        backorders_allowed: false,
        backordered: false,
        sold_individually: false,
        weight: "0.3",
        dimensions: { length: "30", width: "25", height: "2" },
        shipping_required: true,
        shipping_taxable: true,
        shipping_class: "",
        shipping_class_id: 0,
        reviews_allowed: true,
        average_rating: "4.50",
        rating_count: 45,
        related_ids: [101, 102],
        upsell_ids: [101],
        cross_sell_ids: [],
        parent_id: 0,
        purchase_note: "",
        categories: [{ id: 10, name: "Clothing", slug: "clothing" }],
        tags: [{ id: 20, name: "Cotton", slug: "cotton" }],
        images: [
            {
                id: 200,
                date_created: "2024-01-01T00:00:00",
                date_created_gmt: "2024-01-01T00:00:00",
                date_modified: "2024-01-01T00:00:00",
                date_modified_gmt: "2024-01-01T00:00:00",
                src: "https://example.com/wp-content/uploads/tshirt.jpg",
                name: "Premium T-Shirt",
                alt: "Premium cotton t-shirt"
            }
        ],
        attributes: [
            {
                id: 1,
                name: "Color",
                position: 0,
                visible: true,
                variation: false,
                options: ["Black", "White", "Navy", "Gray"]
            }
        ],
        default_attributes: [],
        variations: [],
        grouped_products: [],
        menu_order: 0,
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/products/100" }] }
    },
    {
        id: 101,
        name: "Wireless Headphones",
        slug: "wireless-headphones",
        permalink: "https://example.com/product/wireless-headphones",
        date_created: "2024-01-02T00:00:00",
        date_created_gmt: "2024-01-02T00:00:00",
        date_modified: "2024-01-12T00:00:00",
        date_modified_gmt: "2024-01-12T00:00:00",
        type: "simple",
        status: "publish",
        featured: true,
        catalog_visibility: "visible",
        description: "High-quality wireless Bluetooth headphones with noise cancellation.",
        short_description: "Wireless Bluetooth headphones",
        sku: "HEADPHONES-001",
        price: "49.99",
        regular_price: "49.99",
        sale_price: "",
        date_on_sale_from: null,
        date_on_sale_from_gmt: null,
        date_on_sale_to: null,
        date_on_sale_to_gmt: null,
        price_html: "$49.99",
        on_sale: false,
        purchasable: true,
        total_sales: 89,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: "",
        button_text: "",
        tax_status: "taxable",
        tax_class: "",
        manage_stock: true,
        stock_quantity: 75,
        stock_status: "instock",
        backorders: "no",
        backorders_allowed: false,
        backordered: false,
        sold_individually: false,
        weight: "0.25",
        dimensions: { length: "20", width: "18", height: "8" },
        shipping_required: true,
        shipping_taxable: true,
        shipping_class: "",
        shipping_class_id: 0,
        reviews_allowed: true,
        average_rating: "4.80",
        rating_count: 62,
        related_ids: [100, 102],
        upsell_ids: [],
        cross_sell_ids: [100],
        parent_id: 0,
        purchase_note: "",
        categories: [{ id: 11, name: "Electronics", slug: "electronics" }],
        tags: [{ id: 21, name: "Wireless", slug: "wireless" }],
        images: [
            {
                id: 201,
                date_created: "2024-01-02T00:00:00",
                date_created_gmt: "2024-01-02T00:00:00",
                date_modified: "2024-01-02T00:00:00",
                date_modified_gmt: "2024-01-02T00:00:00",
                src: "https://example.com/wp-content/uploads/headphones.jpg",
                name: "Wireless Headphones",
                alt: "Wireless Bluetooth headphones"
            }
        ],
        attributes: [],
        default_attributes: [],
        variations: [],
        grouped_products: [],
        menu_order: 0,
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/products/101" }] }
    },
    {
        id: 102,
        name: "Smart Watch",
        slug: "smart-watch",
        permalink: "https://example.com/product/smart-watch",
        date_created: "2024-01-03T00:00:00",
        date_created_gmt: "2024-01-03T00:00:00",
        date_modified: "2024-01-15T00:00:00",
        date_modified_gmt: "2024-01-15T00:00:00",
        type: "simple",
        status: "publish",
        featured: true,
        catalog_visibility: "visible",
        description: "Feature-rich smart watch with fitness tracking and notifications.",
        short_description: "Smart watch with fitness tracking",
        sku: "WATCH-001",
        price: "199.99",
        regular_price: "199.99",
        sale_price: "",
        date_on_sale_from: null,
        date_on_sale_from_gmt: null,
        date_on_sale_to: null,
        date_on_sale_to_gmt: null,
        price_html: "$199.99",
        on_sale: false,
        purchasable: true,
        total_sales: 45,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: "",
        button_text: "",
        tax_status: "taxable",
        tax_class: "",
        manage_stock: true,
        stock_quantity: 30,
        stock_status: "instock",
        backorders: "notify",
        backorders_allowed: true,
        backordered: false,
        sold_individually: false,
        weight: "0.1",
        dimensions: { length: "5", width: "5", height: "2" },
        shipping_required: true,
        shipping_taxable: true,
        shipping_class: "",
        shipping_class_id: 0,
        reviews_allowed: true,
        average_rating: "4.90",
        rating_count: 38,
        related_ids: [100, 101],
        upsell_ids: [],
        cross_sell_ids: [],
        parent_id: 0,
        purchase_note: "",
        categories: [{ id: 11, name: "Electronics", slug: "electronics" }],
        tags: [
            { id: 22, name: "Smart", slug: "smart" },
            { id: 23, name: "Fitness", slug: "fitness" }
        ],
        images: [
            {
                id: 202,
                date_created: "2024-01-03T00:00:00",
                date_created_gmt: "2024-01-03T00:00:00",
                date_modified: "2024-01-03T00:00:00",
                date_modified_gmt: "2024-01-03T00:00:00",
                src: "https://example.com/wp-content/uploads/smartwatch.jpg",
                name: "Smart Watch",
                alt: "Smart watch with fitness tracking"
            }
        ],
        attributes: [],
        default_attributes: [],
        variations: [],
        grouped_products: [],
        menu_order: 0,
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/products/102" }] }
    },
    {
        id: 103,
        name: "Running Shoes",
        slug: "running-shoes",
        permalink: "https://example.com/product/running-shoes",
        date_created: "2024-01-04T00:00:00",
        date_created_gmt: "2024-01-04T00:00:00",
        date_modified: "2024-01-14T00:00:00",
        date_modified_gmt: "2024-01-14T00:00:00",
        type: "variable",
        status: "publish",
        featured: false,
        catalog_visibility: "visible",
        description: "Lightweight running shoes with cushioned sole.",
        short_description: "Lightweight running shoes",
        sku: "SHOES-001",
        price: "74.99",
        regular_price: "",
        sale_price: "",
        date_on_sale_from: null,
        date_on_sale_from_gmt: null,
        date_on_sale_to: null,
        date_on_sale_to_gmt: null,
        price_html: "$74.99",
        on_sale: false,
        purchasable: true,
        total_sales: 120,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: "",
        button_text: "",
        tax_status: "taxable",
        tax_class: "",
        manage_stock: false,
        stock_quantity: null,
        stock_status: "instock",
        backorders: "no",
        backorders_allowed: false,
        backordered: false,
        sold_individually: false,
        weight: "0.4",
        dimensions: { length: "35", width: "15", height: "12" },
        shipping_required: true,
        shipping_taxable: true,
        shipping_class: "",
        shipping_class_id: 0,
        reviews_allowed: true,
        average_rating: "4.60",
        rating_count: 78,
        related_ids: [100],
        upsell_ids: [],
        cross_sell_ids: [],
        parent_id: 0,
        purchase_note: "",
        categories: [{ id: 12, name: "Footwear", slug: "footwear" }],
        tags: [{ id: 24, name: "Running", slug: "running" }],
        images: [
            {
                id: 203,
                date_created: "2024-01-04T00:00:00",
                date_created_gmt: "2024-01-04T00:00:00",
                date_modified: "2024-01-04T00:00:00",
                date_modified_gmt: "2024-01-04T00:00:00",
                src: "https://example.com/wp-content/uploads/shoes.jpg",
                name: "Running Shoes",
                alt: "Lightweight running shoes"
            }
        ],
        attributes: [
            {
                id: 2,
                name: "Size",
                position: 0,
                visible: true,
                variation: true,
                options: ["8", "9", "10", "11", "12"]
            }
        ],
        default_attributes: [],
        variations: [201, 202, 203, 204, 205],
        grouped_products: [],
        menu_order: 0,
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/products/103" }] }
    },
    {
        id: 104,
        name: "Phone Case",
        slug: "phone-case",
        permalink: "https://example.com/product/phone-case",
        date_created: "2024-01-05T00:00:00",
        date_created_gmt: "2024-01-05T00:00:00",
        date_modified: "2024-01-13T00:00:00",
        date_modified_gmt: "2024-01-13T00:00:00",
        type: "simple",
        status: "draft",
        featured: false,
        catalog_visibility: "visible",
        description: "Durable protective phone case.",
        short_description: "Protective phone case",
        sku: "CASE-001",
        price: "24.99",
        regular_price: "24.99",
        sale_price: "",
        date_on_sale_from: null,
        date_on_sale_from_gmt: null,
        date_on_sale_to: null,
        date_on_sale_to_gmt: null,
        price_html: "$24.99",
        on_sale: false,
        purchasable: false,
        total_sales: 0,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: "",
        button_text: "",
        tax_status: "taxable",
        tax_class: "",
        manage_stock: true,
        stock_quantity: 0,
        stock_status: "outofstock",
        backorders: "no",
        backorders_allowed: false,
        backordered: false,
        sold_individually: false,
        weight: "0.05",
        dimensions: { length: "15", width: "8", height: "1" },
        shipping_required: true,
        shipping_taxable: true,
        shipping_class: "",
        shipping_class_id: 0,
        reviews_allowed: true,
        average_rating: "0.00",
        rating_count: 0,
        related_ids: [],
        upsell_ids: [],
        cross_sell_ids: [],
        parent_id: 0,
        purchase_note: "",
        categories: [{ id: 13, name: "Accessories", slug: "accessories" }],
        tags: [],
        images: [],
        attributes: [],
        default_attributes: [],
        variations: [],
        grouped_products: [],
        menu_order: 0,
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/products/104" }] }
    }
];

const sampleCustomers: WooCommerceCustomer[] = [
    {
        id: 1,
        date_created: "2023-06-15T10:00:00",
        date_created_gmt: "2023-06-15T10:00:00",
        date_modified: "2024-01-15T10:30:00",
        date_modified_gmt: "2024-01-15T10:30:00",
        email: "john.doe@example.com",
        first_name: "John",
        last_name: "Doe",
        role: "customer",
        username: "johndoe",
        billing: {
            first_name: "John",
            last_name: "Doe",
            company: "",
            address_1: "123 Main St",
            address_2: "",
            city: "New York",
            state: "NY",
            postcode: "10001",
            country: "US",
            email: "john.doe@example.com",
            phone: "555-123-4567"
        },
        shipping: {
            first_name: "John",
            last_name: "Doe",
            company: "",
            address_1: "123 Main St",
            address_2: "",
            city: "New York",
            state: "NY",
            postcode: "10001",
            country: "US",
            phone: "555-123-4567"
        },
        is_paying_customer: true,
        avatar_url: "https://secure.gravatar.com/avatar/abc123",
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/customers/1" }] }
    },
    {
        id: 2,
        date_created: "2023-07-20T14:00:00",
        date_created_gmt: "2023-07-20T14:00:00",
        date_modified: "2024-01-14T14:20:00",
        date_modified_gmt: "2024-01-14T14:20:00",
        email: "jane.smith@acme.com",
        first_name: "Jane",
        last_name: "Smith",
        role: "customer",
        username: "janesmith",
        billing: {
            first_name: "Jane",
            last_name: "Smith",
            company: "Acme Corp",
            address_1: "456 Oak Ave",
            address_2: "Suite 100",
            city: "Los Angeles",
            state: "CA",
            postcode: "90001",
            country: "US",
            email: "jane.smith@acme.com",
            phone: "555-987-6543"
        },
        shipping: {
            first_name: "Jane",
            last_name: "Smith",
            company: "Acme Corp",
            address_1: "456 Oak Ave",
            address_2: "Suite 100",
            city: "Los Angeles",
            state: "CA",
            postcode: "90001",
            country: "US",
            phone: "555-987-6543"
        },
        is_paying_customer: true,
        avatar_url: "https://secure.gravatar.com/avatar/def456",
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/customers/2" }] }
    },
    {
        id: 3,
        date_created: "2023-09-10T09:00:00",
        date_created_gmt: "2023-09-10T09:00:00",
        date_modified: "2024-01-16T11:00:00",
        date_modified_gmt: "2024-01-16T11:00:00",
        email: "alice.brown@example.com",
        first_name: "Alice",
        last_name: "Brown",
        role: "customer",
        username: "alicebrown",
        billing: {
            first_name: "Alice",
            last_name: "Brown",
            company: "",
            address_1: "321 Elm St",
            address_2: "",
            city: "Seattle",
            state: "WA",
            postcode: "98101",
            country: "US",
            email: "alice.brown@example.com",
            phone: "555-321-9876"
        },
        shipping: {
            first_name: "Alice",
            last_name: "Brown",
            company: "",
            address_1: "321 Elm St",
            address_2: "",
            city: "Seattle",
            state: "WA",
            postcode: "98101",
            country: "US",
            phone: "555-321-9876"
        },
        is_paying_customer: true,
        avatar_url: "https://secure.gravatar.com/avatar/ghi789",
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/customers/3" }] }
    },
    {
        id: 4,
        date_created: "2023-11-05T12:00:00",
        date_created_gmt: "2023-11-05T12:00:00",
        date_modified: "2024-01-10T08:00:00",
        date_modified_gmt: "2024-01-10T08:00:00",
        email: "charlie.davis@example.com",
        first_name: "Charlie",
        last_name: "Davis",
        role: "customer",
        username: "charliedavis",
        billing: {
            first_name: "Charlie",
            last_name: "Davis",
            company: "",
            address_1: "555 Cedar Ln",
            address_2: "",
            city: "Miami",
            state: "FL",
            postcode: "33101",
            country: "US",
            email: "charlie.davis@example.com",
            phone: "555-654-3210"
        },
        shipping: {
            first_name: "Charlie",
            last_name: "Davis",
            company: "",
            address_1: "555 Cedar Ln",
            address_2: "",
            city: "Miami",
            state: "FL",
            postcode: "33101",
            country: "US",
            phone: "555-654-3210"
        },
        is_paying_customer: false,
        avatar_url: "https://secure.gravatar.com/avatar/jkl012",
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/customers/4" }] }
    },
    {
        id: 5,
        date_created: "2024-01-01T00:00:00",
        date_created_gmt: "2024-01-01T00:00:00",
        date_modified: "2024-01-01T00:00:00",
        date_modified_gmt: "2024-01-01T00:00:00",
        email: "newcustomer@example.com",
        first_name: "New",
        last_name: "Customer",
        role: "customer",
        username: "newcustomer",
        billing: {
            first_name: "",
            last_name: "",
            company: "",
            address_1: "",
            address_2: "",
            city: "",
            state: "",
            postcode: "",
            country: "",
            email: "",
            phone: ""
        },
        shipping: {
            first_name: "",
            last_name: "",
            company: "",
            address_1: "",
            address_2: "",
            city: "",
            state: "",
            postcode: "",
            country: "",
            phone: ""
        },
        is_paying_customer: false,
        avatar_url: "https://secure.gravatar.com/avatar/mno345",
        meta_data: [],
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/customers/5" }] }
    }
];

const sampleWebhooks: WooCommerceWebhook[] = [
    {
        id: 1,
        name: "Order Created Webhook",
        status: "active",
        topic: "order.created",
        resource: "order",
        event: "created",
        hooks: ["woocommerce_checkout_order_processed"],
        delivery_url: "https://myapp.example.com/webhooks/woocommerce",
        secret: "webhook_secret_123",
        date_created: "2024-01-01T00:00:00",
        date_created_gmt: "2024-01-01T00:00:00",
        date_modified: "2024-01-01T00:00:00",
        date_modified_gmt: "2024-01-01T00:00:00",
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/webhooks/1" }] }
    },
    {
        id: 2,
        name: "Product Updated Webhook",
        status: "active",
        topic: "product.updated",
        resource: "product",
        event: "updated",
        hooks: ["woocommerce_update_product"],
        delivery_url: "https://myapp.example.com/webhooks/woocommerce",
        secret: "webhook_secret_456",
        date_created: "2024-01-02T00:00:00",
        date_created_gmt: "2024-01-02T00:00:00",
        date_modified: "2024-01-02T00:00:00",
        date_modified_gmt: "2024-01-02T00:00:00",
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/webhooks/2" }] }
    },
    {
        id: 3,
        name: "Customer Created Webhook",
        status: "paused",
        topic: "customer.created",
        resource: "customer",
        event: "created",
        hooks: ["user_register"],
        delivery_url: "https://myapp.example.com/webhooks/woocommerce",
        secret: "webhook_secret_789",
        date_created: "2024-01-03T00:00:00",
        date_created_gmt: "2024-01-03T00:00:00",
        date_modified: "2024-01-05T00:00:00",
        date_modified_gmt: "2024-01-05T00:00:00",
        _links: { self: [{ href: "https://example.com/wp-json/wc/v3/webhooks/3" }] }
    }
];

// ==========================================
// Fixtures
// ==========================================

export const listOrdersFixture: TestFixture = {
    operationId: "listOrders",
    provider: "woocommerce",
    validCases: [
        {
            name: "List all orders",
            input: {},
            expectedOutput: { orders: sampleOrders, count: 5 }
        },
        {
            name: "List processing orders",
            input: { status: "processing" }
        },
        {
            name: "List orders with pagination",
            input: { page: 1, per_page: 2 }
        }
    ],
    errorCases: [
        {
            name: "Invalid status filter",
            input: { status: "invalid_status" },
            expectedError: { type: "validation", message: "Invalid status" }
        }
    ],
    filterableData: {
        records: sampleOrders as unknown as Record<string, unknown>[],
        recordsField: "orders",
        defaultPageSize: 10,
        maxPageSize: 100,
        pageSizeParam: "per_page",
        offsetParam: "page",
        filterConfig: {
            status: { type: "enum", field: "status" },
            customer: { type: "number", field: "customer_id" }
        }
    }
};

export const getOrderFixture: TestFixture = {
    operationId: "getOrder",
    provider: "woocommerce",
    validCases: [
        {
            name: "Get order by ID",
            input: { order_id: "727" },
            expectedOutput: { order: sampleOrders[0] }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { order_id: "99999" },
            expectedError: { type: "not_found", message: "Order not found" }
        }
    ]
};

export const createOrderFixture: TestFixture = {
    operationId: "createOrder",
    provider: "woocommerce",
    validCases: [
        {
            name: "Create simple order",
            input: {
                customer_id: 1,
                status: "pending",
                line_items: [{ product_id: 100, quantity: 1 }]
            },
            expectedOutput: {
                order: { ...sampleOrders[2], id: 732 },
                orderId: "732",
                message: "Order created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid product ID",
            input: { line_items: [{ product_id: 99999, quantity: 1 }] },
            expectedError: { type: "validation", message: "Invalid product" }
        }
    ]
};

export const updateOrderFixture: TestFixture = {
    operationId: "updateOrder",
    provider: "woocommerce",
    validCases: [
        {
            name: "Update order status",
            input: { order_id: "727", status: "completed" },
            expectedOutput: {
                order: { ...sampleOrders[0], status: "completed" },
                message: "Order updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { order_id: "99999", status: "completed" },
            expectedError: { type: "not_found", message: "Order not found" }
        }
    ]
};

export const listProductsFixture: TestFixture = {
    operationId: "listProducts",
    provider: "woocommerce",
    validCases: [
        {
            name: "List all products",
            input: {},
            expectedOutput: { products: sampleProducts, count: 5 }
        },
        {
            name: "List products on sale",
            input: { on_sale: true }
        }
    ],
    errorCases: [],
    filterableData: {
        records: sampleProducts as unknown as Record<string, unknown>[],
        recordsField: "products",
        defaultPageSize: 10,
        maxPageSize: 100,
        pageSizeParam: "per_page",
        offsetParam: "page",
        filterConfig: {
            status: { type: "enum", field: "status" },
            type: { type: "enum", field: "type" },
            stock_status: { type: "enum", field: "stock_status" },
            on_sale: { type: "boolean", field: "on_sale" }
        }
    }
};

export const getProductFixture: TestFixture = {
    operationId: "getProduct",
    provider: "woocommerce",
    validCases: [
        {
            name: "Get product by ID",
            input: { product_id: "100" },
            expectedOutput: { product: sampleProducts[0] }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: "99999" },
            expectedError: { type: "not_found", message: "Product not found" }
        }
    ]
};

export const createProductFixture: TestFixture = {
    operationId: "createProduct",
    provider: "woocommerce",
    validCases: [
        {
            name: "Create simple product",
            input: {
                name: "New Product",
                regular_price: "19.99",
                status: "publish"
            },
            expectedOutput: {
                product: { ...sampleProducts[0], id: 105, name: "New Product" },
                productId: "105",
                message: "Product created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Missing required field",
            input: { regular_price: "19.99" },
            expectedError: { type: "validation", message: "Name is required" }
        }
    ]
};

export const updateProductFixture: TestFixture = {
    operationId: "updateProduct",
    provider: "woocommerce",
    validCases: [
        {
            name: "Update product price",
            input: { product_id: "100", regular_price: "34.99" },
            expectedOutput: {
                product: { ...sampleProducts[0], regular_price: "34.99" },
                message: "Product updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: "99999", name: "Updated" },
            expectedError: { type: "not_found", message: "Product not found" }
        }
    ]
};

export const listCustomersFixture: TestFixture = {
    operationId: "listCustomers",
    provider: "woocommerce",
    validCases: [
        {
            name: "List all customers",
            input: {},
            expectedOutput: { customers: sampleCustomers, count: 5 }
        },
        {
            name: "Filter by email",
            input: { email: "john.doe@example.com" }
        }
    ],
    errorCases: [],
    filterableData: {
        records: sampleCustomers as unknown as Record<string, unknown>[],
        recordsField: "customers",
        defaultPageSize: 10,
        maxPageSize: 100,
        pageSizeParam: "per_page",
        offsetParam: "page",
        filterConfig: {
            email: { type: "text", field: "email" },
            role: { type: "enum", field: "role" }
        }
    }
};

export const getCustomerFixture: TestFixture = {
    operationId: "getCustomer",
    provider: "woocommerce",
    validCases: [
        {
            name: "Get customer by ID",
            input: { customer_id: "1" },
            expectedOutput: { customer: sampleCustomers[0] }
        }
    ],
    errorCases: [
        {
            name: "Customer not found",
            input: { customer_id: "99999" },
            expectedError: { type: "not_found", message: "Customer not found" }
        }
    ]
};

export const createCustomerFixture: TestFixture = {
    operationId: "createCustomer",
    provider: "woocommerce",
    validCases: [
        {
            name: "Create customer",
            input: {
                email: "test@example.com",
                first_name: "Test",
                last_name: "User"
            },
            expectedOutput: {
                customer: { ...sampleCustomers[4], id: 6, email: "test@example.com" },
                customerId: "6",
                message: "Customer created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Duplicate email",
            input: { email: "john.doe@example.com" },
            expectedError: { type: "validation", message: "Email already exists" }
        }
    ]
};

export const updateCustomerFixture: TestFixture = {
    operationId: "updateCustomer",
    provider: "woocommerce",
    validCases: [
        {
            name: "Update customer name",
            input: { customer_id: "1", first_name: "Jonathan" },
            expectedOutput: {
                customer: { ...sampleCustomers[0], first_name: "Jonathan" },
                message: "Customer updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Customer not found",
            input: { customer_id: "99999", first_name: "Test" },
            expectedError: { type: "not_found", message: "Customer not found" }
        }
    ]
};

export const updateInventoryFixture: TestFixture = {
    operationId: "updateInventory",
    provider: "woocommerce",
    validCases: [
        {
            name: "Update stock quantity",
            input: { product_id: "100", stock_quantity: 300 },
            expectedOutput: {
                product: {
                    id: 100,
                    name: "Premium T-Shirt",
                    stock_quantity: 300,
                    stock_status: "instock",
                    manage_stock: true
                },
                message: "Inventory updated to 300"
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: "99999", stock_quantity: 100 },
            expectedError: { type: "not_found", message: "Product not found" }
        }
    ]
};

export const listWebhooksFixture: TestFixture = {
    operationId: "listWebhooks",
    provider: "woocommerce",
    validCases: [
        {
            name: "List all webhooks",
            input: {},
            expectedOutput: { webhooks: sampleWebhooks, count: 3 }
        },
        {
            name: "List active webhooks",
            input: { status: "active" }
        }
    ],
    errorCases: [],
    filterableData: {
        records: sampleWebhooks as unknown as Record<string, unknown>[],
        recordsField: "webhooks",
        defaultPageSize: 10,
        maxPageSize: 100,
        pageSizeParam: "per_page",
        offsetParam: "page",
        filterConfig: {
            status: { type: "enum", field: "status" }
        }
    }
};

export const createWebhookFixture: TestFixture = {
    operationId: "createWebhook",
    provider: "woocommerce",
    validCases: [
        {
            name: "Create webhook",
            input: {
                topic: "order.created",
                delivery_url: "https://example.com/webhook",
                name: "Test Webhook"
            },
            expectedOutput: {
                webhook: { ...sampleWebhooks[0], id: 4, name: "Test Webhook" },
                webhookId: "4",
                message: "Webhook created for topic: order.created"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid delivery URL",
            input: { topic: "order.created", delivery_url: "not-a-url" },
            expectedError: { type: "validation", message: "Invalid URL" }
        }
    ]
};

export const deleteWebhookFixture: TestFixture = {
    operationId: "deleteWebhook",
    provider: "woocommerce",
    validCases: [
        {
            name: "Delete webhook",
            input: { webhook_id: "1" },
            expectedOutput: { webhookId: "1", message: "Webhook deleted successfully" }
        }
    ],
    errorCases: [
        {
            name: "Webhook not found",
            input: { webhook_id: "99999" },
            expectedError: { type: "not_found", message: "Webhook not found" }
        }
    ]
};

// Export all fixtures
export const woocommerceFixtures: TestFixture[] = [
    listOrdersFixture,
    getOrderFixture,
    createOrderFixture,
    updateOrderFixture,
    listProductsFixture,
    getProductFixture,
    createProductFixture,
    updateProductFixture,
    listCustomersFixture,
    getCustomerFixture,
    createCustomerFixture,
    updateCustomerFixture,
    updateInventoryFixture,
    listWebhooksFixture,
    createWebhookFixture,
    deleteWebhookFixture
];
