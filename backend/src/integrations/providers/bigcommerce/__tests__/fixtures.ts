/**
 * BigCommerce Test Fixtures
 *
 * Provides sandbox test data for BigCommerce integration operations.
 */

import type { TestFixture } from "../../../sandbox/types";
import type {
    BigCommerceOrder,
    BigCommerceProduct,
    BigCommerceCustomer,
    BigCommerceWebhook,
    BigCommerceProductVariant
} from "../operations/types";

// ==========================================
// Sample Data
// ==========================================

const sampleOrders: BigCommerceOrder[] = [
    {
        id: 100,
        customer_id: 1,
        date_created: "Tue, 15 Jan 2024 10:30:00 +0000",
        date_modified: "Tue, 15 Jan 2024 10:35:00 +0000",
        date_shipped: "",
        status_id: 11,
        status: "Awaiting Fulfillment",
        subtotal_ex_tax: "49.99",
        subtotal_inc_tax: "54.99",
        subtotal_tax: "5.00",
        base_shipping_cost: "10.00",
        shipping_cost_ex_tax: "10.00",
        shipping_cost_inc_tax: "10.00",
        shipping_cost_tax: "0.00",
        shipping_cost_tax_class_id: 0,
        base_handling_cost: "0.00",
        handling_cost_ex_tax: "0.00",
        handling_cost_inc_tax: "0.00",
        handling_cost_tax: "0.00",
        handling_cost_tax_class_id: 0,
        base_wrapping_cost: "0.00",
        wrapping_cost_ex_tax: "0.00",
        wrapping_cost_inc_tax: "0.00",
        wrapping_cost_tax: "0.00",
        wrapping_cost_tax_class_id: 0,
        total_ex_tax: "59.99",
        total_inc_tax: "64.99",
        total_tax: "5.00",
        items_total: 1,
        items_shipped: 0,
        payment_method: "Credit Card",
        payment_provider_id: "stripe",
        payment_status: "captured",
        refunded_amount: "0.00",
        order_is_digital: false,
        store_credit_amount: "0.00",
        gift_certificate_amount: "0.00",
        ip_address: "192.168.1.1",
        ip_address_v6: "",
        geoip_country: "United States",
        geoip_country_iso2: "US",
        currency_id: 1,
        currency_code: "USD",
        currency_exchange_rate: "1.0000000000",
        default_currency_id: 1,
        default_currency_code: "USD",
        staff_notes: "",
        customer_message: "",
        discount_amount: "0.00",
        coupon_discount: "0.00",
        shipping_address_count: 1,
        is_deleted: false,
        ebay_order_id: "",
        cart_id: "abc123",
        billing_address: {
            first_name: "John",
            last_name: "Doe",
            company: "",
            street_1: "123 Main St",
            street_2: "",
            city: "New York",
            state: "New York",
            zip: "10001",
            country: "United States",
            country_iso2: "US",
            phone: "555-123-4567",
            email: "john.doe@example.com"
        },
        is_email_opt_in: true,
        credit_card_type: "VISA",
        order_source: "www",
        channel_id: 1,
        external_source: null,
        products: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/100/products",
            resource: "/orders/100/products"
        },
        shipping_addresses: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/100/shipping_addresses",
            resource: "/orders/100/shipping_addresses"
        },
        coupons: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/100/coupons",
            resource: "/orders/100/coupons"
        },
        external_id: null,
        external_merchant_id: null,
        tax_provider_id: "BasicTaxProvider",
        store_default_currency_code: "USD",
        store_default_to_transactional_exchange_rate: "1.0000000000",
        custom_status: "Awaiting Fulfillment"
    },
    {
        id: 101,
        customer_id: 2,
        date_created: "Mon, 14 Jan 2024 14:20:00 +0000",
        date_modified: "Mon, 14 Jan 2024 16:00:00 +0000",
        date_shipped: "Mon, 14 Jan 2024 16:00:00 +0000",
        status_id: 10,
        status: "Completed",
        subtotal_ex_tax: "149.99",
        subtotal_inc_tax: "164.99",
        subtotal_tax: "15.00",
        base_shipping_cost: "15.00",
        shipping_cost_ex_tax: "15.00",
        shipping_cost_inc_tax: "15.00",
        shipping_cost_tax: "0.00",
        shipping_cost_tax_class_id: 0,
        base_handling_cost: "0.00",
        handling_cost_ex_tax: "0.00",
        handling_cost_inc_tax: "0.00",
        handling_cost_tax: "0.00",
        handling_cost_tax_class_id: 0,
        base_wrapping_cost: "0.00",
        wrapping_cost_ex_tax: "0.00",
        wrapping_cost_inc_tax: "0.00",
        wrapping_cost_tax: "0.00",
        wrapping_cost_tax_class_id: 0,
        total_ex_tax: "164.99",
        total_inc_tax: "179.99",
        total_tax: "15.00",
        items_total: 2,
        items_shipped: 2,
        payment_method: "PayPal",
        payment_provider_id: "paypal",
        payment_status: "captured",
        refunded_amount: "0.00",
        order_is_digital: false,
        store_credit_amount: "0.00",
        gift_certificate_amount: "0.00",
        ip_address: "192.168.1.2",
        ip_address_v6: "",
        geoip_country: "United States",
        geoip_country_iso2: "US",
        currency_id: 1,
        currency_code: "USD",
        currency_exchange_rate: "1.0000000000",
        default_currency_id: 1,
        default_currency_code: "USD",
        staff_notes: "VIP customer",
        customer_message: "Please gift wrap",
        discount_amount: "10.00",
        coupon_discount: "10.00",
        shipping_address_count: 1,
        is_deleted: false,
        ebay_order_id: "",
        cart_id: "def456",
        billing_address: {
            first_name: "Jane",
            last_name: "Smith",
            company: "Acme Corp",
            street_1: "456 Oak Ave",
            street_2: "Suite 100",
            city: "Los Angeles",
            state: "California",
            zip: "90001",
            country: "United States",
            country_iso2: "US",
            phone: "555-987-6543",
            email: "jane.smith@acme.com"
        },
        is_email_opt_in: true,
        credit_card_type: null,
        order_source: "www",
        channel_id: 1,
        external_source: null,
        products: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/101/products",
            resource: "/orders/101/products"
        },
        shipping_addresses: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/101/shipping_addresses",
            resource: "/orders/101/shipping_addresses"
        },
        coupons: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/101/coupons",
            resource: "/orders/101/coupons"
        },
        external_id: null,
        external_merchant_id: null,
        tax_provider_id: "BasicTaxProvider",
        store_default_currency_code: "USD",
        store_default_to_transactional_exchange_rate: "1.0000000000",
        custom_status: "Completed"
    },
    {
        id: 102,
        customer_id: 0,
        date_created: "Wed, 16 Jan 2024 09:00:00 +0000",
        date_modified: "Wed, 16 Jan 2024 09:00:00 +0000",
        date_shipped: "",
        status_id: 7,
        status: "Awaiting Payment",
        subtotal_ex_tax: "299.99",
        subtotal_inc_tax: "329.99",
        subtotal_tax: "30.00",
        base_shipping_cost: "0.00",
        shipping_cost_ex_tax: "0.00",
        shipping_cost_inc_tax: "0.00",
        shipping_cost_tax: "0.00",
        shipping_cost_tax_class_id: 0,
        base_handling_cost: "0.00",
        handling_cost_ex_tax: "0.00",
        handling_cost_inc_tax: "0.00",
        handling_cost_tax: "0.00",
        handling_cost_tax_class_id: 0,
        base_wrapping_cost: "0.00",
        wrapping_cost_ex_tax: "0.00",
        wrapping_cost_inc_tax: "0.00",
        wrapping_cost_tax: "0.00",
        wrapping_cost_tax_class_id: 0,
        total_ex_tax: "299.99",
        total_inc_tax: "329.99",
        total_tax: "30.00",
        items_total: 1,
        items_shipped: 0,
        payment_method: "Bank Transfer",
        payment_provider_id: null,
        payment_status: "pending",
        refunded_amount: "0.00",
        order_is_digital: false,
        store_credit_amount: "0.00",
        gift_certificate_amount: "0.00",
        ip_address: "192.168.1.3",
        ip_address_v6: "",
        geoip_country: "United States",
        geoip_country_iso2: "US",
        currency_id: 1,
        currency_code: "USD",
        currency_exchange_rate: "1.0000000000",
        default_currency_id: 1,
        default_currency_code: "USD",
        staff_notes: "",
        customer_message: "",
        discount_amount: "0.00",
        coupon_discount: "0.00",
        shipping_address_count: 1,
        is_deleted: false,
        ebay_order_id: "",
        cart_id: "ghi789",
        billing_address: {
            first_name: "Bob",
            last_name: "Wilson",
            company: "",
            street_1: "789 Pine Rd",
            street_2: "",
            city: "Chicago",
            state: "Illinois",
            zip: "60601",
            country: "United States",
            country_iso2: "US",
            phone: "555-456-7890",
            email: "bob.wilson@example.com"
        },
        is_email_opt_in: false,
        credit_card_type: null,
        order_source: "www",
        channel_id: 1,
        external_source: null,
        products: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/102/products",
            resource: "/orders/102/products"
        },
        shipping_addresses: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/102/shipping_addresses",
            resource: "/orders/102/shipping_addresses"
        },
        coupons: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/102/coupons",
            resource: "/orders/102/coupons"
        },
        external_id: null,
        external_merchant_id: null,
        tax_provider_id: "BasicTaxProvider",
        store_default_currency_code: "USD",
        store_default_to_transactional_exchange_rate: "1.0000000000",
        custom_status: "Awaiting Payment"
    },
    {
        id: 103,
        customer_id: 3,
        date_created: "Thu, 10 Jan 2024 08:00:00 +0000",
        date_modified: "Fri, 11 Jan 2024 10:00:00 +0000",
        date_shipped: "",
        status_id: 5,
        status: "Cancelled",
        subtotal_ex_tax: "24.99",
        subtotal_inc_tax: "27.49",
        subtotal_tax: "2.50",
        base_shipping_cost: "5.00",
        shipping_cost_ex_tax: "5.00",
        shipping_cost_inc_tax: "5.00",
        shipping_cost_tax: "0.00",
        shipping_cost_tax_class_id: 0,
        base_handling_cost: "0.00",
        handling_cost_ex_tax: "0.00",
        handling_cost_inc_tax: "0.00",
        handling_cost_tax: "0.00",
        handling_cost_tax_class_id: 0,
        base_wrapping_cost: "0.00",
        wrapping_cost_ex_tax: "0.00",
        wrapping_cost_inc_tax: "0.00",
        wrapping_cost_tax: "0.00",
        wrapping_cost_tax_class_id: 0,
        total_ex_tax: "29.99",
        total_inc_tax: "32.49",
        total_tax: "2.50",
        items_total: 1,
        items_shipped: 0,
        payment_method: "Credit Card",
        payment_provider_id: "stripe",
        payment_status: "refunded",
        refunded_amount: "32.49",
        order_is_digital: false,
        store_credit_amount: "0.00",
        gift_certificate_amount: "0.00",
        ip_address: "192.168.1.4",
        ip_address_v6: "",
        geoip_country: "United States",
        geoip_country_iso2: "US",
        currency_id: 1,
        currency_code: "USD",
        currency_exchange_rate: "1.0000000000",
        default_currency_id: 1,
        default_currency_code: "USD",
        staff_notes: "Customer requested cancellation",
        customer_message: "",
        discount_amount: "0.00",
        coupon_discount: "0.00",
        shipping_address_count: 1,
        is_deleted: false,
        ebay_order_id: "",
        cart_id: "jkl012",
        billing_address: {
            first_name: "Alice",
            last_name: "Brown",
            company: "",
            street_1: "321 Elm St",
            street_2: "",
            city: "Seattle",
            state: "Washington",
            zip: "98101",
            country: "United States",
            country_iso2: "US",
            phone: "555-321-9876",
            email: "alice.brown@example.com"
        },
        is_email_opt_in: true,
        credit_card_type: "VISA",
        order_source: "www",
        channel_id: 1,
        external_source: null,
        products: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/103/products",
            resource: "/orders/103/products"
        },
        shipping_addresses: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/103/shipping_addresses",
            resource: "/orders/103/shipping_addresses"
        },
        coupons: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/103/coupons",
            resource: "/orders/103/coupons"
        },
        external_id: null,
        external_merchant_id: null,
        tax_provider_id: "BasicTaxProvider",
        store_default_currency_code: "USD",
        store_default_to_transactional_exchange_rate: "1.0000000000",
        custom_status: "Cancelled"
    },
    {
        id: 104,
        customer_id: 4,
        date_created: "Wed, 16 Jan 2024 11:00:00 +0000",
        date_modified: "Wed, 16 Jan 2024 11:05:00 +0000",
        date_shipped: "",
        status_id: 2,
        status: "Shipped",
        subtotal_ex_tax: "74.99",
        subtotal_inc_tax: "82.49",
        subtotal_tax: "7.50",
        base_shipping_cost: "15.00",
        shipping_cost_ex_tax: "15.00",
        shipping_cost_inc_tax: "15.00",
        shipping_cost_tax: "0.00",
        shipping_cost_tax_class_id: 0,
        base_handling_cost: "0.00",
        handling_cost_ex_tax: "0.00",
        handling_cost_inc_tax: "0.00",
        handling_cost_tax: "0.00",
        handling_cost_tax_class_id: 0,
        base_wrapping_cost: "0.00",
        wrapping_cost_ex_tax: "0.00",
        wrapping_cost_inc_tax: "0.00",
        wrapping_cost_tax: "0.00",
        wrapping_cost_tax_class_id: 0,
        total_ex_tax: "89.99",
        total_inc_tax: "97.49",
        total_tax: "7.50",
        items_total: 1,
        items_shipped: 1,
        payment_method: "Credit Card",
        payment_provider_id: "stripe",
        payment_status: "captured",
        refunded_amount: "0.00",
        order_is_digital: false,
        store_credit_amount: "0.00",
        gift_certificate_amount: "0.00",
        ip_address: "192.168.1.5",
        ip_address_v6: "",
        geoip_country: "United States",
        geoip_country_iso2: "US",
        currency_id: 1,
        currency_code: "USD",
        currency_exchange_rate: "1.0000000000",
        default_currency_id: 1,
        default_currency_code: "USD",
        staff_notes: "",
        customer_message: "",
        discount_amount: "0.00",
        coupon_discount: "0.00",
        shipping_address_count: 1,
        is_deleted: false,
        ebay_order_id: "",
        cart_id: "mno345",
        billing_address: {
            first_name: "Charlie",
            last_name: "Davis",
            company: "",
            street_1: "555 Cedar Ln",
            street_2: "",
            city: "Miami",
            state: "Florida",
            zip: "33101",
            country: "United States",
            country_iso2: "US",
            phone: "555-654-3210",
            email: "charlie.davis@example.com"
        },
        is_email_opt_in: true,
        credit_card_type: "Mastercard",
        order_source: "www",
        channel_id: 1,
        external_source: null,
        products: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/104/products",
            resource: "/orders/104/products"
        },
        shipping_addresses: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/104/shipping_addresses",
            resource: "/orders/104/shipping_addresses"
        },
        coupons: {
            url: "https://api.bigcommerce.com/stores/abc123/v2/orders/104/coupons",
            resource: "/orders/104/coupons"
        },
        external_id: null,
        external_merchant_id: null,
        tax_provider_id: "BasicTaxProvider",
        store_default_currency_code: "USD",
        store_default_to_transactional_exchange_rate: "1.0000000000",
        custom_status: "Shipped"
    }
];

const sampleProducts: BigCommerceProduct[] = [
    {
        id: 100,
        name: "Premium T-Shirt",
        type: "physical",
        sku: "TSHIRT-001",
        description: "A premium quality cotton t-shirt available in multiple colors.",
        weight: 0.3,
        width: 25,
        depth: 2,
        height: 30,
        price: 24.99,
        cost_price: 10.0,
        retail_price: 29.99,
        sale_price: 24.99,
        map_price: 0,
        tax_class_id: 0,
        product_tax_code: "",
        calculated_price: 24.99,
        categories: [10],
        brand_id: 1,
        option_set_id: null,
        option_set_display: "right",
        inventory_level: 250,
        inventory_warning_level: 20,
        inventory_tracking: "product",
        reviews_rating_sum: 225,
        reviews_count: 50,
        total_sold: 150,
        fixed_cost_shipping_price: 0,
        is_free_shipping: false,
        is_visible: true,
        is_featured: false,
        related_products: [101, 102],
        warranty: "",
        bin_picking_number: "",
        layout_file: "",
        upc: "",
        mpn: "",
        gtin: "",
        search_keywords: "t-shirt, cotton, premium",
        availability: "available",
        availability_description: "",
        gift_wrapping_options_type: "any",
        gift_wrapping_options_list: [],
        sort_order: 0,
        condition: "New",
        is_condition_shown: false,
        order_quantity_minimum: 0,
        order_quantity_maximum: 0,
        page_title: "Premium T-Shirt",
        meta_keywords: [],
        meta_description: "",
        date_created: "Mon, 01 Jan 2024 00:00:00 +0000",
        date_modified: "Wed, 10 Jan 2024 00:00:00 +0000",
        view_count: 500,
        preorder_release_date: null,
        preorder_message: "",
        is_preorder_only: false,
        is_price_hidden: false,
        price_hidden_label: "",
        custom_url: { url: "/premium-t-shirt/", is_customized: false },
        base_variant_id: 200,
        open_graph_type: "product",
        open_graph_title: "",
        open_graph_description: "",
        open_graph_use_meta_description: true,
        open_graph_use_product_name: true,
        open_graph_use_image: true,
        variants: [],
        images: [],
        custom_fields: []
    },
    {
        id: 101,
        name: "Wireless Headphones",
        type: "physical",
        sku: "HEADPHONES-001",
        description: "High-quality wireless Bluetooth headphones with noise cancellation.",
        weight: 0.25,
        width: 18,
        depth: 8,
        height: 20,
        price: 49.99,
        cost_price: 25.0,
        retail_price: 59.99,
        sale_price: 0,
        map_price: 0,
        tax_class_id: 0,
        product_tax_code: "",
        calculated_price: 49.99,
        categories: [11],
        brand_id: 2,
        option_set_id: null,
        option_set_display: "right",
        inventory_level: 75,
        inventory_warning_level: 10,
        inventory_tracking: "product",
        reviews_rating_sum: 310,
        reviews_count: 62,
        total_sold: 89,
        fixed_cost_shipping_price: 0,
        is_free_shipping: false,
        is_visible: true,
        is_featured: true,
        related_products: [100, 102],
        warranty: "1 year manufacturer warranty",
        bin_picking_number: "",
        layout_file: "",
        upc: "",
        mpn: "",
        gtin: "",
        search_keywords: "headphones, wireless, bluetooth",
        availability: "available",
        availability_description: "",
        gift_wrapping_options_type: "any",
        gift_wrapping_options_list: [],
        sort_order: 0,
        condition: "New",
        is_condition_shown: false,
        order_quantity_minimum: 0,
        order_quantity_maximum: 0,
        page_title: "Wireless Headphones",
        meta_keywords: [],
        meta_description: "",
        date_created: "Tue, 02 Jan 2024 00:00:00 +0000",
        date_modified: "Fri, 12 Jan 2024 00:00:00 +0000",
        view_count: 800,
        preorder_release_date: null,
        preorder_message: "",
        is_preorder_only: false,
        is_price_hidden: false,
        price_hidden_label: "",
        custom_url: { url: "/wireless-headphones/", is_customized: false },
        base_variant_id: 201,
        open_graph_type: "product",
        open_graph_title: "",
        open_graph_description: "",
        open_graph_use_meta_description: true,
        open_graph_use_product_name: true,
        open_graph_use_image: true,
        variants: [],
        images: [],
        custom_fields: []
    },
    {
        id: 102,
        name: "Smart Watch",
        type: "physical",
        sku: "WATCH-001",
        description: "Feature-rich smart watch with fitness tracking and notifications.",
        weight: 0.1,
        width: 5,
        depth: 2,
        height: 5,
        price: 199.99,
        cost_price: 100.0,
        retail_price: 249.99,
        sale_price: 0,
        map_price: 0,
        tax_class_id: 0,
        product_tax_code: "",
        calculated_price: 199.99,
        categories: [11],
        brand_id: 3,
        option_set_id: null,
        option_set_display: "right",
        inventory_level: 30,
        inventory_warning_level: 5,
        inventory_tracking: "product",
        reviews_rating_sum: 186,
        reviews_count: 38,
        total_sold: 45,
        fixed_cost_shipping_price: 0,
        is_free_shipping: true,
        is_visible: true,
        is_featured: true,
        related_products: [100, 101],
        warranty: "2 year manufacturer warranty",
        bin_picking_number: "",
        layout_file: "",
        upc: "",
        mpn: "",
        gtin: "",
        search_keywords: "watch, smart watch, fitness",
        availability: "available",
        availability_description: "",
        gift_wrapping_options_type: "any",
        gift_wrapping_options_list: [],
        sort_order: 0,
        condition: "New",
        is_condition_shown: false,
        order_quantity_minimum: 0,
        order_quantity_maximum: 0,
        page_title: "Smart Watch",
        meta_keywords: [],
        meta_description: "",
        date_created: "Wed, 03 Jan 2024 00:00:00 +0000",
        date_modified: "Mon, 15 Jan 2024 00:00:00 +0000",
        view_count: 1200,
        preorder_release_date: null,
        preorder_message: "",
        is_preorder_only: false,
        is_price_hidden: false,
        price_hidden_label: "",
        custom_url: { url: "/smart-watch/", is_customized: false },
        base_variant_id: 202,
        open_graph_type: "product",
        open_graph_title: "",
        open_graph_description: "",
        open_graph_use_meta_description: true,
        open_graph_use_product_name: true,
        open_graph_use_image: true,
        variants: [],
        images: [],
        custom_fields: []
    },
    {
        id: 103,
        name: "Running Shoes",
        type: "physical",
        sku: "SHOES-001",
        description: "Lightweight running shoes with cushioned sole.",
        weight: 0.4,
        width: 15,
        depth: 12,
        height: 35,
        price: 74.99,
        cost_price: 35.0,
        retail_price: 89.99,
        sale_price: 0,
        map_price: 0,
        tax_class_id: 0,
        product_tax_code: "",
        calculated_price: 74.99,
        categories: [12],
        brand_id: 4,
        option_set_id: 1,
        option_set_display: "right",
        inventory_level: 0,
        inventory_warning_level: 10,
        inventory_tracking: "variant",
        reviews_rating_sum: 359,
        reviews_count: 78,
        total_sold: 120,
        fixed_cost_shipping_price: 0,
        is_free_shipping: false,
        is_visible: true,
        is_featured: false,
        related_products: [100],
        warranty: "",
        bin_picking_number: "",
        layout_file: "",
        upc: "",
        mpn: "",
        gtin: "",
        search_keywords: "shoes, running, athletic",
        availability: "available",
        availability_description: "",
        gift_wrapping_options_type: "none",
        gift_wrapping_options_list: [],
        sort_order: 0,
        condition: "New",
        is_condition_shown: false,
        order_quantity_minimum: 0,
        order_quantity_maximum: 0,
        page_title: "Running Shoes",
        meta_keywords: [],
        meta_description: "",
        date_created: "Thu, 04 Jan 2024 00:00:00 +0000",
        date_modified: "Sun, 14 Jan 2024 00:00:00 +0000",
        view_count: 950,
        preorder_release_date: null,
        preorder_message: "",
        is_preorder_only: false,
        is_price_hidden: false,
        price_hidden_label: "",
        custom_url: { url: "/running-shoes/", is_customized: false },
        base_variant_id: null,
        open_graph_type: "product",
        open_graph_title: "",
        open_graph_description: "",
        open_graph_use_meta_description: true,
        open_graph_use_product_name: true,
        open_graph_use_image: true,
        variants: [],
        images: [],
        custom_fields: []
    },
    {
        id: 104,
        name: "Phone Case",
        type: "physical",
        sku: "CASE-001",
        description: "Durable protective phone case.",
        weight: 0.05,
        width: 8,
        depth: 1,
        height: 15,
        price: 24.99,
        cost_price: 5.0,
        retail_price: 29.99,
        sale_price: 0,
        map_price: 0,
        tax_class_id: 0,
        product_tax_code: "",
        calculated_price: 24.99,
        categories: [13],
        brand_id: 5,
        option_set_id: null,
        option_set_display: "right",
        inventory_level: 0,
        inventory_warning_level: 10,
        inventory_tracking: "product",
        reviews_rating_sum: 0,
        reviews_count: 0,
        total_sold: 0,
        fixed_cost_shipping_price: 0,
        is_free_shipping: false,
        is_visible: false,
        is_featured: false,
        related_products: [],
        warranty: "",
        bin_picking_number: "",
        layout_file: "",
        upc: "",
        mpn: "",
        gtin: "",
        search_keywords: "phone, case, protective",
        availability: "disabled",
        availability_description: "Out of stock",
        gift_wrapping_options_type: "none",
        gift_wrapping_options_list: [],
        sort_order: 0,
        condition: "New",
        is_condition_shown: false,
        order_quantity_minimum: 0,
        order_quantity_maximum: 0,
        page_title: "Phone Case",
        meta_keywords: [],
        meta_description: "",
        date_created: "Fri, 05 Jan 2024 00:00:00 +0000",
        date_modified: "Sat, 13 Jan 2024 00:00:00 +0000",
        view_count: 100,
        preorder_release_date: null,
        preorder_message: "",
        is_preorder_only: false,
        is_price_hidden: false,
        price_hidden_label: "",
        custom_url: { url: "/phone-case/", is_customized: false },
        base_variant_id: 204,
        open_graph_type: "product",
        open_graph_title: "",
        open_graph_description: "",
        open_graph_use_meta_description: true,
        open_graph_use_product_name: true,
        open_graph_use_image: true,
        variants: [],
        images: [],
        custom_fields: []
    }
];

const sampleCustomers: BigCommerceCustomer[] = [
    {
        id: 1,
        company: "",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "555-123-4567",
        date_created: "Thu, 15 Jun 2023 10:00:00 +0000",
        date_modified: "Tue, 15 Jan 2024 10:30:00 +0000",
        store_credit_amounts: [{ amount: 25.0 }],
        registration_ip_address: "192.168.1.1",
        customer_group_id: 0,
        notes: "",
        tax_exempt_category: "",
        accepts_product_review_abandoned_cart_emails: true,
        channel_ids: [1],
        addresses: [
            {
                id: 1,
                customer_id: 1,
                first_name: "John",
                last_name: "Doe",
                company: "",
                address1: "123 Main St",
                address2: "",
                city: "New York",
                state_or_province: "New York",
                postal_code: "10001",
                country_code: "US",
                phone: "555-123-4567",
                address_type: "residential"
            }
        ]
    },
    {
        id: 2,
        company: "Acme Corp",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane.smith@acme.com",
        phone: "555-987-6543",
        date_created: "Thu, 20 Jul 2023 14:00:00 +0000",
        date_modified: "Mon, 14 Jan 2024 14:20:00 +0000",
        store_credit_amounts: [{ amount: 100.0 }],
        registration_ip_address: "192.168.1.2",
        customer_group_id: 1,
        notes: "VIP customer",
        tax_exempt_category: "",
        accepts_product_review_abandoned_cart_emails: true,
        channel_ids: [1],
        addresses: [
            {
                id: 2,
                customer_id: 2,
                first_name: "Jane",
                last_name: "Smith",
                company: "Acme Corp",
                address1: "456 Oak Ave",
                address2: "Suite 100",
                city: "Los Angeles",
                state_or_province: "California",
                postal_code: "90001",
                country_code: "US",
                phone: "555-987-6543",
                address_type: "commercial"
            }
        ]
    },
    {
        id: 3,
        company: "",
        first_name: "Alice",
        last_name: "Brown",
        email: "alice.brown@example.com",
        phone: "555-321-9876",
        date_created: "Sun, 10 Sep 2023 09:00:00 +0000",
        date_modified: "Wed, 16 Jan 2024 11:00:00 +0000",
        store_credit_amounts: [],
        registration_ip_address: "192.168.1.3",
        customer_group_id: 0,
        notes: "",
        tax_exempt_category: "",
        accepts_product_review_abandoned_cart_emails: true,
        channel_ids: [1]
    },
    {
        id: 4,
        company: "",
        first_name: "Charlie",
        last_name: "Davis",
        email: "charlie.davis@example.com",
        phone: "555-654-3210",
        date_created: "Sun, 05 Nov 2023 12:00:00 +0000",
        date_modified: "Wed, 10 Jan 2024 08:00:00 +0000",
        store_credit_amounts: [],
        registration_ip_address: "192.168.1.4",
        customer_group_id: 0,
        notes: "",
        tax_exempt_category: "",
        accepts_product_review_abandoned_cart_emails: false,
        channel_ids: [1]
    },
    {
        id: 5,
        company: "",
        first_name: "New",
        last_name: "Customer",
        email: "newcustomer@example.com",
        phone: "",
        date_created: "Mon, 01 Jan 2024 00:00:00 +0000",
        date_modified: "Mon, 01 Jan 2024 00:00:00 +0000",
        store_credit_amounts: [],
        registration_ip_address: "192.168.1.5",
        customer_group_id: 0,
        notes: "",
        tax_exempt_category: "",
        accepts_product_review_abandoned_cart_emails: true,
        channel_ids: [1]
    }
];

const sampleWebhooks: BigCommerceWebhook[] = [
    {
        id: 1,
        client_id: "abc123",
        store_hash: "store123",
        scope: "store/order/created",
        destination: "https://myapp.example.com/webhooks/bigcommerce",
        headers: null,
        is_active: true,
        created_at: 1704067200,
        updated_at: 1704067200
    },
    {
        id: 2,
        client_id: "abc123",
        store_hash: "store123",
        scope: "store/product/updated",
        destination: "https://myapp.example.com/webhooks/bigcommerce",
        headers: { "X-Custom-Header": "value" },
        is_active: true,
        created_at: 1704153600,
        updated_at: 1704153600
    },
    {
        id: 3,
        client_id: "abc123",
        store_hash: "store123",
        scope: "store/customer/created",
        destination: "https://myapp.example.com/webhooks/bigcommerce",
        headers: null,
        is_active: false,
        created_at: 1704240000,
        updated_at: 1704412800
    }
];

const sampleVariants: BigCommerceProductVariant[] = [
    {
        id: 300,
        product_id: 103,
        sku: "SHOES-001-8",
        sku_id: null,
        price: null,
        calculated_price: 74.99,
        sale_price: null,
        retail_price: null,
        map_price: null,
        weight: null,
        calculated_weight: 0.4,
        width: null,
        height: null,
        depth: null,
        is_free_shipping: false,
        fixed_cost_shipping_price: null,
        purchasing_disabled: false,
        purchasing_disabled_message: "",
        upc: "",
        mpn: "",
        gtin: "",
        inventory_level: 20,
        inventory_warning_level: 5,
        bin_picking_number: "",
        option_values: [{ id: 1, label: "8", option_id: 1, option_display_name: "Size" }]
    },
    {
        id: 301,
        product_id: 103,
        sku: "SHOES-001-9",
        sku_id: null,
        price: null,
        calculated_price: 74.99,
        sale_price: null,
        retail_price: null,
        map_price: null,
        weight: null,
        calculated_weight: 0.4,
        width: null,
        height: null,
        depth: null,
        is_free_shipping: false,
        fixed_cost_shipping_price: null,
        purchasing_disabled: false,
        purchasing_disabled_message: "",
        upc: "",
        mpn: "",
        gtin: "",
        inventory_level: 25,
        inventory_warning_level: 5,
        bin_picking_number: "",
        option_values: [{ id: 2, label: "9", option_id: 1, option_display_name: "Size" }]
    },
    {
        id: 302,
        product_id: 103,
        sku: "SHOES-001-10",
        sku_id: null,
        price: null,
        calculated_price: 74.99,
        sale_price: null,
        retail_price: null,
        map_price: null,
        weight: null,
        calculated_weight: 0.4,
        width: null,
        height: null,
        depth: null,
        is_free_shipping: false,
        fixed_cost_shipping_price: null,
        purchasing_disabled: false,
        purchasing_disabled_message: "",
        upc: "",
        mpn: "",
        gtin: "",
        inventory_level: 30,
        inventory_warning_level: 5,
        bin_picking_number: "",
        option_values: [{ id: 3, label: "10", option_id: 1, option_display_name: "Size" }]
    }
];

// ==========================================
// Fixtures
// ==========================================

export const listOrdersFixture: TestFixture = {
    operationId: "listOrders",
    provider: "bigcommerce",
    validCases: [
        {
            name: "List all orders",
            input: {},
            expectedOutput: { orders: sampleOrders, count: 5 }
        },
        {
            name: "List orders by status",
            input: { status_id: 11 }
        },
        {
            name: "List orders with pagination",
            input: { page: 1, limit: 2 }
        }
    ],
    errorCases: [
        {
            name: "Invalid status filter",
            input: { status_id: 999 },
            expectedError: { type: "validation", message: "Invalid status" }
        }
    ],
    filterableData: {
        records: sampleOrders as unknown as Record<string, unknown>[],
        recordsField: "orders",
        defaultPageSize: 50,
        maxPageSize: 250,
        pageSizeParam: "limit",
        offsetParam: "page",
        filterConfig: {
            status_id: { type: "number", field: "status_id" },
            customer_id: { type: "number", field: "customer_id" }
        }
    }
};

export const getOrderFixture: TestFixture = {
    operationId: "getOrder",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Get order by ID",
            input: { order_id: 100 },
            expectedOutput: { order: sampleOrders[0] }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { order_id: 99999 },
            expectedError: { type: "not_found", message: "Order not found" }
        }
    ]
};

export const createOrderFixture: TestFixture = {
    operationId: "createOrder",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Create simple order",
            input: {
                customer_id: 1,
                status_id: 11,
                products: [{ product_id: 100, quantity: 1 }]
            },
            expectedOutput: {
                order: { ...sampleOrders[0], id: 105 },
                orderId: "105",
                message: "Order created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid product ID",
            input: { products: [{ product_id: 99999, quantity: 1 }] },
            expectedError: { type: "validation", message: "Invalid product" }
        }
    ]
};

export const updateOrderFixture: TestFixture = {
    operationId: "updateOrder",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Update order status",
            input: { order_id: 100, status_id: 10 },
            expectedOutput: {
                order: { ...sampleOrders[0], status_id: 10, status: "Completed" },
                message: "Order updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { order_id: 99999, status_id: 10 },
            expectedError: { type: "not_found", message: "Order not found" }
        }
    ]
};

export const listProductsFixture: TestFixture = {
    operationId: "listProducts",
    provider: "bigcommerce",
    validCases: [
        {
            name: "List all products",
            input: {},
            expectedOutput: { products: sampleProducts, count: 5 }
        },
        {
            name: "List visible products",
            input: { is_visible: true }
        }
    ],
    errorCases: [],
    filterableData: {
        records: sampleProducts as unknown as Record<string, unknown>[],
        recordsField: "products",
        defaultPageSize: 50,
        maxPageSize: 250,
        pageSizeParam: "limit",
        offsetParam: "page",
        filterConfig: {
            is_visible: { type: "boolean", field: "is_visible" },
            is_featured: { type: "boolean", field: "is_featured" },
            type: { type: "enum", field: "type" }
        }
    }
};

export const getProductFixture: TestFixture = {
    operationId: "getProduct",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Get product by ID",
            input: { product_id: 100 },
            expectedOutput: { product: sampleProducts[0] }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: 99999 },
            expectedError: { type: "not_found", message: "Product not found" }
        }
    ]
};

export const createProductFixture: TestFixture = {
    operationId: "createProduct",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Create simple product",
            input: {
                name: "New Product",
                price: 19.99,
                type: "physical",
                weight: 0.5
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
            input: { name: "Test" },
            expectedError: { type: "validation", message: "Price is required" }
        }
    ]
};

export const updateProductFixture: TestFixture = {
    operationId: "updateProduct",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Update product price",
            input: { product_id: 100, price: 34.99 },
            expectedOutput: {
                product: { ...sampleProducts[0], price: 34.99 },
                message: "Product updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: 99999, name: "Updated" },
            expectedError: { type: "not_found", message: "Product not found" }
        }
    ]
};

export const listCustomersFixture: TestFixture = {
    operationId: "listCustomers",
    provider: "bigcommerce",
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
        defaultPageSize: 50,
        maxPageSize: 250,
        pageSizeParam: "limit",
        offsetParam: "page",
        filterConfig: {
            email: { type: "text", field: "email" },
            customer_group_id: { type: "number", field: "customer_group_id" }
        }
    }
};

export const getCustomerFixture: TestFixture = {
    operationId: "getCustomer",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Get customer by ID",
            input: { customer_id: 1 },
            expectedOutput: { customer: sampleCustomers[0] }
        }
    ],
    errorCases: [
        {
            name: "Customer not found",
            input: { customer_id: 99999 },
            expectedError: { type: "not_found", message: "Customer not found" }
        }
    ]
};

export const createCustomerFixture: TestFixture = {
    operationId: "createCustomer",
    provider: "bigcommerce",
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
            input: { email: "john.doe@example.com", first_name: "John", last_name: "Doe" },
            expectedError: { type: "validation", message: "Email already exists" }
        }
    ]
};

export const updateCustomerFixture: TestFixture = {
    operationId: "updateCustomer",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Update customer name",
            input: { customer_id: 1, first_name: "Jonathan" },
            expectedOutput: {
                customer: { ...sampleCustomers[0], first_name: "Jonathan" },
                message: "Customer updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Customer not found",
            input: { customer_id: 99999, first_name: "Test" },
            expectedError: { type: "not_found", message: "Customer not found" }
        }
    ]
};

export const getInventoryFixture: TestFixture = {
    operationId: "getInventory",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Get product inventory",
            input: { product_id: 103 },
            expectedOutput: {
                productId: 103,
                variants: sampleVariants.map((v) => ({
                    variantId: v.id,
                    sku: v.sku,
                    inventoryLevel: v.inventory_level,
                    inventoryWarningLevel: v.inventory_warning_level
                })),
                count: 3
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: 99999 },
            expectedError: { type: "not_found", message: "Product not found" }
        }
    ]
};

export const updateInventoryFixture: TestFixture = {
    operationId: "updateInventory",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Update variant inventory",
            input: { product_id: 103, variant_id: 300, inventory_level: 50 },
            expectedOutput: {
                variantId: 300,
                productId: 103,
                inventoryLevel: 50,
                message: "Inventory updated to 50"
            }
        },
        {
            name: "Update product inventory",
            input: { product_id: 100, inventory_level: 300 },
            expectedOutput: {
                productId: 100,
                inventoryLevel: 300,
                message: "Inventory updated to 300"
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { product_id: 99999, inventory_level: 100 },
            expectedError: { type: "not_found", message: "Product or variant not found" }
        }
    ]
};

export const listWebhooksFixture: TestFixture = {
    operationId: "listWebhooks",
    provider: "bigcommerce",
    validCases: [
        {
            name: "List all webhooks",
            input: {},
            expectedOutput: { webhooks: sampleWebhooks, count: 3 }
        },
        {
            name: "List active webhooks",
            input: { is_active: true }
        }
    ],
    errorCases: [],
    filterableData: {
        records: sampleWebhooks as unknown as Record<string, unknown>[],
        recordsField: "webhooks",
        defaultPageSize: 50,
        maxPageSize: 250,
        pageSizeParam: "limit",
        offsetParam: "page",
        filterConfig: {
            is_active: { type: "boolean", field: "is_active" },
            scope: { type: "enum", field: "scope" }
        }
    }
};

export const createWebhookFixture: TestFixture = {
    operationId: "createWebhook",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Create webhook",
            input: {
                scope: "store/order/created",
                destination: "https://example.com/webhook"
            },
            expectedOutput: {
                webhook: { ...sampleWebhooks[0], id: 4 },
                webhookId: "4",
                message: "Webhook created for scope: store/order/created"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid destination URL",
            input: { scope: "store/order/created", destination: "not-a-url" },
            expectedError: { type: "validation", message: "Invalid URL" }
        }
    ]
};

export const deleteWebhookFixture: TestFixture = {
    operationId: "deleteWebhook",
    provider: "bigcommerce",
    validCases: [
        {
            name: "Delete webhook",
            input: { webhook_id: 1 },
            expectedOutput: { webhookId: "1", message: "Webhook deleted successfully" }
        }
    ],
    errorCases: [
        {
            name: "Webhook not found",
            input: { webhook_id: 99999 },
            expectedError: { type: "not_found", message: "Webhook not found" }
        }
    ]
};

// Export all fixtures
export const bigcommerceFixtures: TestFixture[] = [
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
    getInventoryFixture,
    updateInventoryFixture,
    listWebhooksFixture,
    createWebhookFixture,
    deleteWebhookFixture
];
