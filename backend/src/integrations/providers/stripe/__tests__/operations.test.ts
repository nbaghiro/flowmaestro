/**
 * Stripe Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Payment Intents
import {
    executeCancelPaymentIntent,
    cancelPaymentIntentSchema
} from "../operations/cancelPaymentIntent";
import {
    executeConfirmPaymentIntent,
    confirmPaymentIntentSchema
} from "../operations/confirmPaymentIntent";
import { executeCreateCharge, createChargeSchema } from "../operations/createCharge";
import { executeCreateCustomer, createCustomerSchema } from "../operations/createCustomer";
import {
    executeCreatePaymentIntent,
    createPaymentIntentSchema
} from "../operations/createPaymentIntent";
import { executeCreateRefund, createRefundSchema } from "../operations/createRefund";
import { executeGetCharge, getChargeSchema } from "../operations/getCharge";
import { executeGetCustomer, getCustomerSchema } from "../operations/getCustomer";
import { executeGetPaymentIntent, getPaymentIntentSchema } from "../operations/getPaymentIntent";
import { executeGetRefund, getRefundSchema } from "../operations/getRefund";
import { executeListCharges, listChargesSchema } from "../operations/listCharges";
import { executeListCustomers, listCustomersSchema } from "../operations/listCustomers";
import {
    executeListPaymentIntents,
    listPaymentIntentsSchema
} from "../operations/listPaymentIntents";

// Charges

// Refunds
import { executeListRefunds, listRefundsSchema } from "../operations/listRefunds";

// Customers
import { executeUpdateCustomer, updateCustomerSchema } from "../operations/updateCustomer";

import type { StripeClient } from "../client/StripeClient";

// Mock StripeClient factory
function createMockStripeClient(): jest.Mocked<StripeClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        postForm: jest.fn()
    } as unknown as jest.Mocked<StripeClient>;
}

describe("Stripe Operation Executors", () => {
    let mockClient: jest.Mocked<StripeClient>;

    beforeEach(() => {
        mockClient = createMockStripeClient();
    });

    // ============================================================================
    // PAYMENT INTENTS
    // ============================================================================

    describe("executeCreatePaymentIntent", () => {
        it("calls client with correct params", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 0,
                currency: "usd",
                status: "requires_payment_method",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: null,
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            await executeCreatePaymentIntent(mockClient, {
                amount: 2000,
                currency: "usd"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/payment_intents", {
                amount: 2000,
                currency: "usd"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 0,
                currency: "usd",
                status: "requires_payment_method",
                customer: "cus_abc",
                description: "Test payment",
                metadata: { orderId: "order-123" },
                created: 1234567890,
                payment_method: "pm_card_visa",
                receipt_email: "test@example.com",
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            const result = await executeCreatePaymentIntent(mockClient, {
                amount: 2000,
                currency: "usd",
                customer: "cus_abc",
                description: "Test payment",
                metadata: { orderId: "order-123" },
                payment_method: "pm_card_visa",
                receipt_email: "test@example.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "pi_123",
                amount: 2000,
                currency: "usd",
                status: "requires_payment_method",
                clientSecret: "pi_123_secret_abc",
                customer: "cus_abc",
                description: "Test payment",
                metadata: { orderId: "order-123" },
                paymentMethod: "pm_card_visa",
                receiptEmail: "test@example.com",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Invalid API key"));

            const result = await executeCreatePaymentIntent(mockClient, {
                amount: 2000,
                currency: "usd"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid API key");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.postForm.mockRejectedValueOnce("string error");

            const result = await executeCreatePaymentIntent(mockClient, {
                amount: 2000,
                currency: "usd"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create payment intent");
        });
    });

    describe("executeConfirmPaymentIntent", () => {
        it("calls client with correct params", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 2000,
                currency: "usd",
                status: "succeeded",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: "pm_card_visa",
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            await executeConfirmPaymentIntent(mockClient, {
                payment_intent_id: "pi_123",
                payment_method: "pm_card_visa"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/payment_intents/pi_123/confirm", {
                payment_method: "pm_card_visa"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 2000,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: "pm_card_visa",
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            const result = await executeConfirmPaymentIntent(mockClient, {
                payment_intent_id: "pi_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "pi_123",
                amount: 2000,
                currency: "usd",
                status: "succeeded",
                clientSecret: "pi_123_secret_abc",
                customer: "cus_abc",
                paymentMethod: "pm_card_visa",
                created: 1234567890,
                livemode: false
            });
        });

        it("passes return_url for redirect payment methods", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 0,
                currency: "usd",
                status: "requires_action",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: "pm_card_visa",
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            await executeConfirmPaymentIntent(mockClient, {
                payment_intent_id: "pi_123",
                return_url: "https://example.com/return"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/payment_intents/pi_123/confirm", {
                return_url: "https://example.com/return"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Payment intent not found"));

            const result = await executeConfirmPaymentIntent(mockClient, {
                payment_intent_id: "pi_nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Payment intent not found");
        });
    });

    describe("executeCancelPaymentIntent", () => {
        it("calls client with correct params", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 0,
                currency: "usd",
                status: "canceled",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: null,
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            await executeCancelPaymentIntent(mockClient, {
                payment_intent_id: "pi_123",
                cancellation_reason: "requested_by_customer"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/payment_intents/pi_123/cancel", {
                cancellation_reason: "requested_by_customer"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 0,
                currency: "usd",
                status: "canceled",
                customer: "cus_abc",
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: null,
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            const result = await executeCancelPaymentIntent(mockClient, {
                payment_intent_id: "pi_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "pi_123",
                amount: 2000,
                currency: "usd",
                status: "canceled",
                customer: "cus_abc",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Cannot cancel succeeded payment"));

            const result = await executeCancelPaymentIntent(mockClient, {
                payment_intent_id: "pi_123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Cannot cancel succeeded payment");
        });
    });

    describe("executeGetPaymentIntent", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 2000,
                currency: "usd",
                status: "succeeded",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                payment_method: "pm_card_visa",
                receipt_email: null,
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            await executeGetPaymentIntent(mockClient, {
                payment_intent_id: "pi_123"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/payment_intents/pi_123");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "pi_123",
                object: "payment_intent",
                amount: 2000,
                amount_received: 1500,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test payment",
                metadata: { orderId: "123" },
                created: 1234567890,
                payment_method: "pm_card_visa",
                receipt_email: "test@example.com",
                client_secret: "pi_123_secret_abc",
                livemode: false
            });

            const result = await executeGetPaymentIntent(mockClient, {
                payment_intent_id: "pi_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "pi_123",
                amount: 2000,
                amountReceived: 1500,
                currency: "usd",
                status: "succeeded",
                clientSecret: "pi_123_secret_abc",
                customer: "cus_abc",
                description: "Test payment",
                metadata: { orderId: "123" },
                paymentMethod: "pm_card_visa",
                receiptEmail: "test@example.com",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Payment intent not found"));

            const result = await executeGetPaymentIntent(mockClient, {
                payment_intent_id: "pi_nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Payment intent not found");
        });
    });

    describe("executeListPaymentIntents", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/payment_intents"
            });

            // Note: Schema defaults are not applied by the executor, caller must apply them
            await executeListPaymentIntents(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/payment_intents", {
                limit: 10
            });
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/payment_intents"
            });

            await executeListPaymentIntents(mockClient, {
                customer: "cus_abc",
                created_gte: 1234567890,
                created_lte: 1234567899,
                limit: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/payment_intents", {
                limit: 50,
                customer: "cus_abc",
                "created[gte]": 1234567890,
                "created[lte]": 1234567899
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [
                    {
                        id: "pi_123",
                        object: "payment_intent",
                        amount: 2000,
                        amount_received: 2000,
                        currency: "usd",
                        status: "succeeded",
                        customer: "cus_abc",
                        description: "Test payment",
                        metadata: {},
                        created: 1234567890,
                        payment_method: "pm_card_visa",
                        receipt_email: null,
                        client_secret: "pi_123_secret_abc",
                        livemode: false
                    },
                    {
                        id: "pi_456",
                        object: "payment_intent",
                        amount: 3000,
                        amount_received: 0,
                        currency: "eur",
                        status: "requires_payment_method",
                        customer: null,
                        description: null,
                        metadata: {},
                        created: 1234567891,
                        payment_method: null,
                        receipt_email: null,
                        client_secret: "pi_456_secret_def",
                        livemode: false
                    }
                ],
                has_more: true,
                url: "/v1/payment_intents"
            });

            const result = await executeListPaymentIntents(mockClient, { limit: 2 });

            expect(result.success).toBe(true);
            expect(result.data?.paymentIntents).toHaveLength(2);
            expect(result.data?.paymentIntents[0]).toEqual({
                id: "pi_123",
                amount: 2000,
                amountReceived: 2000,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test payment",
                created: 1234567890,
                livemode: false
            });
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListPaymentIntents(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
        });
    });

    // ============================================================================
    // CHARGES
    // ============================================================================

    describe("executeCreateCharge", () => {
        it("calls client with correct params", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "ch_123",
                object: "charge",
                amount: 2000,
                amount_refunded: 0,
                currency: "usd",
                status: "succeeded",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                refunded: false,
                receipt_email: null,
                receipt_url: "https://pay.stripe.com/receipts/ch_123",
                payment_intent: null,
                livemode: false
            });

            await executeCreateCharge(mockClient, {
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/charges", {
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "ch_123",
                object: "charge",
                amount: 2000,
                amount_refunded: 0,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test charge",
                metadata: { orderId: "123" },
                created: 1234567890,
                refunded: false,
                receipt_email: "test@example.com",
                receipt_url: "https://pay.stripe.com/receipts/ch_123",
                payment_intent: "pi_123",
                livemode: false
            });

            const result = await executeCreateCharge(mockClient, {
                amount: 2000,
                currency: "usd",
                source: "tok_visa",
                customer: "cus_abc",
                description: "Test charge",
                metadata: { orderId: "123" },
                receipt_email: "test@example.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "ch_123",
                amount: 2000,
                amountRefunded: 0,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test charge",
                metadata: { orderId: "123" },
                receiptEmail: "test@example.com",
                receiptUrl: "https://pay.stripe.com/receipts/ch_123",
                refunded: false,
                paymentIntent: "pi_123",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Card declined"));

            const result = await executeCreateCharge(mockClient, {
                amount: 2000,
                currency: "usd",
                source: "tok_declined"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Card declined");
        });
    });

    describe("executeGetCharge", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "ch_123",
                object: "charge",
                amount: 2000,
                amount_refunded: 0,
                currency: "usd",
                status: "succeeded",
                customer: null,
                description: null,
                metadata: {},
                created: 1234567890,
                refunded: false,
                receipt_email: null,
                receipt_url: null,
                payment_intent: null,
                livemode: false
            });

            await executeGetCharge(mockClient, {
                charge_id: "ch_123"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/charges/ch_123");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "ch_123",
                object: "charge",
                amount: 2000,
                amount_refunded: 500,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test charge",
                metadata: { orderId: "123" },
                created: 1234567890,
                refunded: false,
                receipt_email: "test@example.com",
                receipt_url: "https://pay.stripe.com/receipts/ch_123",
                payment_intent: "pi_123",
                livemode: false
            });

            const result = await executeGetCharge(mockClient, {
                charge_id: "ch_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "ch_123",
                amount: 2000,
                amountRefunded: 500,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test charge",
                metadata: { orderId: "123" },
                receiptEmail: "test@example.com",
                receiptUrl: "https://pay.stripe.com/receipts/ch_123",
                refunded: false,
                paymentIntent: "pi_123",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Charge not found"));

            const result = await executeGetCharge(mockClient, {
                charge_id: "ch_nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Charge not found");
        });
    });

    describe("executeListCharges", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/charges"
            });

            // Note: Schema defaults are not applied by the executor, caller must apply them
            await executeListCharges(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/charges", {
                limit: 10
            });
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/charges"
            });

            await executeListCharges(mockClient, {
                customer: "cus_abc",
                payment_intent: "pi_123",
                limit: 25
            });

            expect(mockClient.get).toHaveBeenCalledWith("/charges", {
                limit: 25,
                customer: "cus_abc",
                payment_intent: "pi_123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [
                    {
                        id: "ch_123",
                        object: "charge",
                        amount: 2000,
                        amount_refunded: 0,
                        currency: "usd",
                        status: "succeeded",
                        customer: "cus_abc",
                        description: "Test charge",
                        metadata: {},
                        created: 1234567890,
                        refunded: false,
                        receipt_email: null,
                        receipt_url: null,
                        payment_intent: "pi_123",
                        livemode: false
                    }
                ],
                has_more: false,
                url: "/v1/charges"
            });

            const result = await executeListCharges(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.charges).toHaveLength(1);
            expect(result.data?.charges[0]).toEqual({
                id: "ch_123",
                amount: 2000,
                amountRefunded: 0,
                currency: "usd",
                status: "succeeded",
                customer: "cus_abc",
                description: "Test charge",
                refunded: false,
                paymentIntent: "pi_123",
                created: 1234567890,
                livemode: false
            });
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Invalid API key"));

            const result = await executeListCharges(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid API key");
        });
    });

    // ============================================================================
    // REFUNDS
    // ============================================================================

    describe("executeCreateRefund", () => {
        it("calls client with charge param", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "re_123",
                object: "refund",
                amount: 2000,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                payment_intent: null,
                reason: null,
                created: 1234567890,
                metadata: {}
            });

            await executeCreateRefund(mockClient, {
                charge: "ch_123"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/refunds", {
                charge: "ch_123"
            });
        });

        it("calls client with payment_intent param", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "re_123",
                object: "refund",
                amount: 2000,
                currency: "usd",
                status: "succeeded",
                charge: null,
                payment_intent: "pi_123",
                reason: null,
                created: 1234567890,
                metadata: {}
            });

            await executeCreateRefund(mockClient, {
                payment_intent: "pi_123"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/refunds", {
                payment_intent: "pi_123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "re_123",
                object: "refund",
                amount: 1000,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                payment_intent: "pi_123",
                reason: "requested_by_customer",
                created: 1234567890,
                metadata: { orderId: "123" }
            });

            const result = await executeCreateRefund(mockClient, {
                charge: "ch_123",
                amount: 1000,
                reason: "requested_by_customer",
                metadata: { orderId: "123" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "re_123",
                amount: 1000,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                paymentIntent: "pi_123",
                reason: "requested_by_customer",
                metadata: { orderId: "123" },
                created: 1234567890
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Charge already refunded"));

            const result = await executeCreateRefund(mockClient, {
                charge: "ch_123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Charge already refunded");
        });
    });

    describe("executeGetRefund", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "re_123",
                object: "refund",
                amount: 2000,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                payment_intent: null,
                reason: null,
                created: 1234567890,
                metadata: {}
            });

            await executeGetRefund(mockClient, {
                refund_id: "re_123"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/refunds/re_123");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "re_123",
                object: "refund",
                amount: 1500,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                payment_intent: "pi_123",
                reason: "duplicate",
                created: 1234567890,
                metadata: { refundedBy: "admin" }
            });

            const result = await executeGetRefund(mockClient, {
                refund_id: "re_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "re_123",
                amount: 1500,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                paymentIntent: "pi_123",
                reason: "duplicate",
                metadata: { refundedBy: "admin" },
                created: 1234567890
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Refund not found"));

            const result = await executeGetRefund(mockClient, {
                refund_id: "re_nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Refund not found");
        });
    });

    describe("executeListRefunds", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/refunds"
            });

            // Note: Schema defaults are not applied by the executor, caller must apply them
            await executeListRefunds(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/refunds", {
                limit: 10
            });
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/refunds"
            });

            await executeListRefunds(mockClient, {
                charge: "ch_123",
                payment_intent: "pi_456",
                limit: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/refunds", {
                limit: 50,
                charge: "ch_123",
                payment_intent: "pi_456"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [
                    {
                        id: "re_123",
                        object: "refund",
                        amount: 2000,
                        currency: "usd",
                        status: "succeeded",
                        charge: "ch_123",
                        payment_intent: "pi_123",
                        reason: "requested_by_customer",
                        created: 1234567890,
                        metadata: {}
                    },
                    {
                        id: "re_456",
                        object: "refund",
                        amount: 1000,
                        currency: "eur",
                        status: "pending",
                        charge: "ch_456",
                        payment_intent: null,
                        reason: "duplicate",
                        created: 1234567891,
                        metadata: {}
                    }
                ],
                has_more: true,
                url: "/v1/refunds"
            });

            const result = await executeListRefunds(mockClient, { limit: 2 });

            expect(result.success).toBe(true);
            expect(result.data?.refunds).toHaveLength(2);
            expect(result.data?.refunds[0]).toEqual({
                id: "re_123",
                amount: 2000,
                currency: "usd",
                status: "succeeded",
                charge: "ch_123",
                paymentIntent: "pi_123",
                reason: "requested_by_customer",
                created: 1234567890
            });
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListRefunds(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
        });
    });

    // ============================================================================
    // CUSTOMERS
    // ============================================================================

    describe("executeCreateCustomer", () => {
        it("calls client with correct params", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "cus_123",
                object: "customer",
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "Test customer",
                metadata: {},
                created: 1234567890,
                default_source: null,
                livemode: false
            });

            await executeCreateCustomer(mockClient, {
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "Test customer"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/customers", {
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "Test customer"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "cus_123",
                object: "customer",
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "Test customer",
                metadata: { source: "website" },
                created: 1234567890,
                default_source: "card_123",
                livemode: false
            });

            const result = await executeCreateCustomer(mockClient, {
                email: "test@example.com",
                name: "Test User"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "cus_123",
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "Test customer",
                metadata: { source: "website" },
                defaultSource: "card_123",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Invalid email address"));

            const result = await executeCreateCustomer(mockClient, {
                email: "invalid-email"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid email address");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.postForm.mockRejectedValueOnce({ code: "unknown" });

            const result = await executeCreateCustomer(mockClient, {
                email: "test@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create customer");
        });
    });

    describe("executeGetCustomer", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "cus_123",
                object: "customer",
                email: "test@example.com",
                name: "Test User",
                phone: null,
                description: null,
                metadata: {},
                created: 1234567890,
                default_source: null,
                livemode: false
            });

            await executeGetCustomer(mockClient, {
                customer_id: "cus_123"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/customers/cus_123");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "cus_123",
                object: "customer",
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "VIP customer",
                metadata: { tier: "premium" },
                created: 1234567890,
                default_source: "card_123",
                livemode: false
            });

            const result = await executeGetCustomer(mockClient, {
                customer_id: "cus_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "cus_123",
                email: "test@example.com",
                name: "Test User",
                phone: "+1234567890",
                description: "VIP customer",
                metadata: { tier: "premium" },
                defaultSource: "card_123",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Customer not found"));

            const result = await executeGetCustomer(mockClient, {
                customer_id: "cus_nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Customer not found");
        });
    });

    describe("executeUpdateCustomer", () => {
        it("calls client with correct params", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "cus_123",
                object: "customer",
                email: "updated@example.com",
                name: "Updated User",
                phone: null,
                description: null,
                metadata: {},
                created: 1234567890,
                default_source: null,
                livemode: false
            });

            await executeUpdateCustomer(mockClient, {
                customer_id: "cus_123",
                email: "updated@example.com",
                name: "Updated User"
            });

            expect(mockClient.postForm).toHaveBeenCalledWith("/customers/cus_123", {
                email: "updated@example.com",
                name: "Updated User"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postForm.mockResolvedValueOnce({
                id: "cus_123",
                object: "customer",
                email: "updated@example.com",
                name: "Updated User",
                phone: "+9876543210",
                description: "Updated description",
                metadata: { tier: "gold" },
                created: 1234567890,
                default_source: "card_456",
                livemode: false
            });

            const result = await executeUpdateCustomer(mockClient, {
                customer_id: "cus_123",
                email: "updated@example.com",
                name: "Updated User",
                phone: "+9876543210",
                description: "Updated description",
                metadata: { tier: "gold" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "cus_123",
                email: "updated@example.com",
                name: "Updated User",
                phone: "+9876543210",
                description: "Updated description",
                metadata: { tier: "gold" },
                defaultSource: "card_456",
                created: 1234567890,
                livemode: false
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postForm.mockRejectedValueOnce(new Error("Customer not found"));

            const result = await executeUpdateCustomer(mockClient, {
                customer_id: "cus_nonexistent",
                name: "Updated User"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Customer not found");
        });
    });

    describe("executeListCustomers", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/customers"
            });

            // Note: Schema defaults are not applied by the executor, caller must apply them
            await executeListCustomers(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/customers", {
                limit: 10
            });
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/customers"
            });

            await executeListCustomers(mockClient, {
                email: "test@example.com",
                created_gte: 1234567890,
                created_lte: 1234567899,
                limit: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/customers", {
                limit: 50,
                email: "test@example.com",
                "created[gte]": 1234567890,
                "created[lte]": 1234567899
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                object: "list",
                data: [
                    {
                        id: "cus_123",
                        object: "customer",
                        email: "test1@example.com",
                        name: "User One",
                        phone: null,
                        description: null,
                        metadata: {},
                        created: 1234567890,
                        default_source: null,
                        livemode: false
                    },
                    {
                        id: "cus_456",
                        object: "customer",
                        email: "test2@example.com",
                        name: "User Two",
                        phone: "+1234567890",
                        description: "VIP",
                        metadata: { tier: "premium" },
                        created: 1234567891,
                        default_source: "card_123",
                        livemode: false
                    }
                ],
                has_more: true,
                url: "/v1/customers"
            });

            const result = await executeListCustomers(mockClient, { limit: 2 });

            expect(result.success).toBe(true);
            expect(result.data?.customers).toHaveLength(2);
            expect(result.data?.customers[0]).toEqual({
                id: "cus_123",
                email: "test1@example.com",
                name: "User One",
                phone: null,
                description: null,
                metadata: {},
                defaultSource: null,
                created: 1234567890,
                livemode: false
            });
            expect(result.data?.customers[1]).toEqual({
                id: "cus_456",
                email: "test2@example.com",
                name: "User Two",
                phone: "+1234567890",
                description: "VIP",
                metadata: { tier: "premium" },
                defaultSource: "card_123",
                created: 1234567891,
                livemode: false
            });
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Invalid API key"));

            const result = await executeListCustomers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid API key");
        });
    });

    // ============================================================================
    // SCHEMA VALIDATION
    // ============================================================================

    describe("schema validation", () => {
        describe("createPaymentIntentSchema", () => {
            it("validates minimal input", () => {
                const result = createPaymentIntentSchema.safeParse({
                    amount: 2000,
                    currency: "usd"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createPaymentIntentSchema.safeParse({
                    amount: 2000,
                    currency: "usd",
                    customer: "cus_123",
                    description: "Test payment",
                    metadata: { orderId: "123" },
                    payment_method: "pm_card_visa",
                    confirm: true,
                    receipt_email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects negative amount", () => {
                const result = createPaymentIntentSchema.safeParse({
                    amount: -100,
                    currency: "usd"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid currency length", () => {
                const result = createPaymentIntentSchema.safeParse({
                    amount: 2000,
                    currency: "us"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing amount", () => {
                const result = createPaymentIntentSchema.safeParse({
                    currency: "usd"
                });
                expect(result.success).toBe(false);
            });

            it("applies default for confirm", () => {
                const result = createPaymentIntentSchema.parse({
                    amount: 2000,
                    currency: "usd"
                });
                expect(result.confirm).toBe(false);
            });
        });

        describe("confirmPaymentIntentSchema", () => {
            it("validates minimal input", () => {
                const result = confirmPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with payment_method", () => {
                const result = confirmPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123",
                    payment_method: "pm_card_visa"
                });
                expect(result.success).toBe(true);
            });

            it("validates with return_url", () => {
                const result = confirmPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123",
                    return_url: "https://example.com/return"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid return_url", () => {
                const result = confirmPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123",
                    return_url: "not-a-url"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing payment_intent_id", () => {
                const result = confirmPaymentIntentSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("cancelPaymentIntentSchema", () => {
            it("validates minimal input", () => {
                const result = cancelPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with cancellation_reason", () => {
                const result = cancelPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123",
                    cancellation_reason: "requested_by_customer"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid cancellation_reason", () => {
                const result = cancelPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123",
                    cancellation_reason: "invalid_reason"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getPaymentIntentSchema", () => {
            it("validates input", () => {
                const result = getPaymentIntentSchema.safeParse({
                    payment_intent_id: "pi_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing payment_intent_id", () => {
                const result = getPaymentIntentSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listPaymentIntentsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listPaymentIntentsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with customer filter", () => {
                const result = listPaymentIntentsSchema.safeParse({
                    customer: "cus_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with limit", () => {
                const result = listPaymentIntentsSchema.safeParse({
                    limit: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit > 100", () => {
                const result = listPaymentIntentsSchema.safeParse({
                    limit: 150
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit < 1", () => {
                const result = listPaymentIntentsSchema.safeParse({
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = listPaymentIntentsSchema.parse({});
                expect(result.limit).toBe(10);
            });
        });

        describe("createChargeSchema", () => {
            it("validates minimal input", () => {
                const result = createChargeSchema.safeParse({
                    amount: 2000,
                    currency: "usd",
                    source: "tok_visa"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createChargeSchema.safeParse({
                    amount: 2000,
                    currency: "usd",
                    source: "tok_visa",
                    customer: "cus_123",
                    description: "Test charge",
                    metadata: { orderId: "123" },
                    receipt_email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing source", () => {
                const result = createChargeSchema.safeParse({
                    amount: 2000,
                    currency: "usd"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getChargeSchema", () => {
            it("validates input", () => {
                const result = getChargeSchema.safeParse({
                    charge_id: "ch_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing charge_id", () => {
                const result = getChargeSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listChargesSchema", () => {
            it("validates empty input", () => {
                const result = listChargesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listChargesSchema.safeParse({
                    customer: "cus_123",
                    payment_intent: "pi_456",
                    limit: 25
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = listChargesSchema.parse({});
                expect(result.limit).toBe(10);
            });
        });

        describe("createRefundSchema", () => {
            it("validates with charge", () => {
                const result = createRefundSchema.safeParse({
                    charge: "ch_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with payment_intent", () => {
                const result = createRefundSchema.safeParse({
                    payment_intent: "pi_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with partial refund amount", () => {
                const result = createRefundSchema.safeParse({
                    charge: "ch_123",
                    amount: 1000
                });
                expect(result.success).toBe(true);
            });

            it("validates with reason", () => {
                const result = createRefundSchema.safeParse({
                    charge: "ch_123",
                    reason: "duplicate"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid reason", () => {
                const result = createRefundSchema.safeParse({
                    charge: "ch_123",
                    reason: "invalid_reason"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getRefundSchema", () => {
            it("validates input", () => {
                const result = getRefundSchema.safeParse({
                    refund_id: "re_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing refund_id", () => {
                const result = getRefundSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listRefundsSchema", () => {
            it("validates empty input", () => {
                const result = listRefundsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listRefundsSchema.safeParse({
                    charge: "ch_123",
                    payment_intent: "pi_456",
                    limit: 50
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = listRefundsSchema.parse({});
                expect(result.limit).toBe(10);
            });
        });

        describe("createCustomerSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = createCustomerSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with email", () => {
                const result = createCustomerSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createCustomerSchema.safeParse({
                    email: "test@example.com",
                    name: "Test User",
                    phone: "+1234567890",
                    description: "Test customer",
                    metadata: { source: "website" },
                    payment_method: "pm_card_visa"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = createCustomerSchema.safeParse({
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCustomerSchema", () => {
            it("validates input", () => {
                const result = getCustomerSchema.safeParse({
                    customer_id: "cus_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing customer_id", () => {
                const result = getCustomerSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateCustomerSchema", () => {
            it("validates minimal input", () => {
                const result = updateCustomerSchema.safeParse({
                    customer_id: "cus_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with updates", () => {
                const result = updateCustomerSchema.safeParse({
                    customer_id: "cus_123",
                    email: "new@example.com",
                    name: "New Name",
                    phone: "+9876543210",
                    description: "Updated",
                    metadata: { tier: "gold" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = updateCustomerSchema.safeParse({
                    customer_id: "cus_123",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing customer_id", () => {
                const result = updateCustomerSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listCustomersSchema", () => {
            it("validates empty input", () => {
                const result = listCustomersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with email filter", () => {
                const result = listCustomersSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with date filters", () => {
                const result = listCustomersSchema.safeParse({
                    created_gte: 1234567890,
                    created_lte: 1234567899
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit > 100", () => {
                const result = listCustomersSchema.safeParse({
                    limit: 150
                });
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = listCustomersSchema.parse({});
                expect(result.limit).toBe(10);
            });
        });
    });
});
