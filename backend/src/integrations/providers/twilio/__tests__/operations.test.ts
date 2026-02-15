/**
 * Twilio Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeDeleteMessage, deleteMessageSchema } from "../operations/deleteMessage";
import { executeGetMessage, getMessageSchema } from "../operations/getMessage";
import { executeGetPhoneNumber, getPhoneNumberSchema } from "../operations/getPhoneNumber";
import { executeListMessages, listMessagesSchema } from "../operations/listMessages";
import { executeListPhoneNumbers, listPhoneNumbersSchema } from "../operations/listPhoneNumbers";
import { executeLookupPhoneNumber, lookupPhoneNumberSchema } from "../operations/lookupPhoneNumber";
import { executeSendSms, sendSmsSchema } from "../operations/sendSms";
import type { TwilioClient } from "../client/TwilioClient";

// Mock TwilioClient factory
function createMockTwilioClient(): jest.Mocked<TwilioClient> {
    return {
        sendMessage: jest.fn(),
        listMessages: jest.fn(),
        getMessage: jest.fn(),
        deleteMessage: jest.fn(),
        listPhoneNumbers: jest.fn(),
        getPhoneNumber: jest.fn(),
        lookupPhoneNumber: jest.fn(),
        postForm: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<TwilioClient>;
}

describe("Twilio Operation Executors", () => {
    let mockClient: jest.Mocked<TwilioClient>;

    beforeEach(() => {
        mockClient = createMockTwilioClient();
    });

    describe("executeSendSms", () => {
        it("calls client with correct params", async () => {
            mockClient.sendMessage.mockResolvedValueOnce({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                messaging_service_sid: null,
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello! This is a test message.",
                status: "queued",
                num_segments: "1",
                num_media: "0",
                direction: "outbound-api",
                api_version: "2010-04-01",
                price: null,
                price_unit: "USD",
                error_code: null,
                error_message: null,
                uri: "/2010-04-01/Accounts/ACxxx/Messages/SMxxx.json",
                date_created: "2024-01-15T10:30:00Z",
                date_updated: "2024-01-15T10:30:00Z",
                date_sent: null
            });

            await executeSendSms(mockClient, {
                to: "+15559876543",
                from: "+15551234567",
                body: "Hello! This is a test message."
            });

            expect(mockClient.sendMessage).toHaveBeenCalledWith({
                to: "+15559876543",
                from: "+15551234567",
                body: "Hello! This is a test message.",
                statusCallback: undefined,
                messagingServiceSid: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.sendMessage.mockResolvedValueOnce({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                messaging_service_sid: null,
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello! This is a test message.",
                status: "queued",
                num_segments: "1",
                num_media: "0",
                direction: "outbound-api",
                api_version: "2010-04-01",
                price: null,
                price_unit: "USD",
                error_code: null,
                error_message: null,
                uri: "/2010-04-01/Accounts/ACxxx/Messages/SMxxx.json",
                date_created: "2024-01-15T10:30:00Z",
                date_updated: "2024-01-15T10:30:00Z",
                date_sent: null
            });

            const result = await executeSendSms(mockClient, {
                to: "+15559876543",
                from: "+15551234567",
                body: "Hello! This is a test message."
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello! This is a test message.",
                status: "queued",
                direction: "outbound-api",
                numSegments: 1,
                price: null,
                priceUnit: "USD",
                errorCode: null,
                errorMessage: null,
                dateCreated: "2024-01-15T10:30:00Z",
                dateSent: null
            });
        });

        it("passes optional params when provided", async () => {
            mockClient.sendMessage.mockResolvedValueOnce({
                sid: "SM3cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                messaging_service_sid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                from: "+15551234567",
                to: "+15559876543",
                body: "Test with options",
                status: "queued",
                num_segments: "1",
                num_media: "0",
                direction: "outbound-api",
                api_version: "2010-04-01",
                price: null,
                price_unit: "USD",
                error_code: null,
                error_message: null,
                uri: "/2010-04-01/Accounts/ACxxx/Messages/SMxxx.json",
                date_created: "2024-01-15T10:30:00Z",
                date_updated: "2024-01-15T10:30:00Z",
                date_sent: null
            });

            await executeSendSms(mockClient, {
                to: "+15559876543",
                from: "+15551234567",
                body: "Test with options",
                statusCallback: "https://example.com/callback",
                messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(mockClient.sendMessage).toHaveBeenCalledWith({
                to: "+15559876543",
                from: "+15551234567",
                body: "Test with options",
                statusCallback: "https://example.com/callback",
                messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.sendMessage.mockRejectedValueOnce(new Error("Invalid 'To' phone number"));

            const result = await executeSendSms(mockClient, {
                to: "not-a-phone-number",
                from: "+15551234567",
                body: "Test message"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid 'To' phone number");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.sendMessage.mockRejectedValueOnce("string error");

            const result = await executeSendSms(mockClient, {
                to: "+15559876543",
                from: "+15551234567",
                body: "Test message"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send SMS");
        });
    });

    describe("executeListMessages", () => {
        it("calls client with default params", async () => {
            mockClient.listMessages.mockResolvedValueOnce({
                messages: [],
                first_page_uri: "/Messages.json?PageSize=50&Page=0",
                end: 0,
                next_page_uri: null,
                previous_page_uri: null,
                page: 0,
                page_size: 50,
                start: 0,
                uri: "/Messages.json?PageSize=50&Page=0"
            });

            // Schema applies defaults when parsing, so we need to parse first
            const params = listMessagesSchema.parse({});
            await executeListMessages(mockClient, params);

            expect(mockClient.listMessages).toHaveBeenCalledWith({
                to: undefined,
                from: undefined,
                dateSent: undefined,
                dateSentBefore: undefined,
                dateSentAfter: undefined,
                pageSize: 50,
                pageToken: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listMessages.mockResolvedValueOnce({
                messages: [],
                first_page_uri: "/Messages.json?PageSize=10&Page=0",
                end: 0,
                next_page_uri: null,
                previous_page_uri: null,
                page: 0,
                page_size: 10,
                start: 0,
                uri: "/Messages.json?PageSize=10&Page=0"
            });

            await executeListMessages(mockClient, {
                from: "+15551234567",
                to: "+15559876543",
                dateSentAfter: "2024-01-01",
                pageSize: 10
            });

            expect(mockClient.listMessages).toHaveBeenCalledWith({
                to: "+15559876543",
                from: "+15551234567",
                dateSent: undefined,
                dateSentBefore: undefined,
                dateSentAfter: "2024-01-01",
                pageSize: 10,
                pageToken: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listMessages.mockResolvedValueOnce({
                messages: [
                    {
                        sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        messaging_service_sid: null,
                        from: "+15551234567",
                        to: "+15559876543",
                        body: "Hello!",
                        status: "delivered",
                        num_segments: "1",
                        num_media: "0",
                        direction: "outbound-api",
                        api_version: "2010-04-01",
                        price: "-0.00750",
                        price_unit: "USD",
                        error_code: null,
                        error_message: null,
                        uri: "/Messages/SMxxx.json",
                        date_created: "2024-01-15T10:30:00Z",
                        date_updated: "2024-01-15T10:30:01Z",
                        date_sent: "2024-01-15T10:30:01Z"
                    }
                ],
                first_page_uri: "/Messages.json?PageSize=50&Page=0",
                end: 0,
                next_page_uri: null,
                previous_page_uri: null,
                page: 0,
                page_size: 50,
                start: 0,
                uri: "/Messages.json?PageSize=50&Page=0"
            });

            const result = await executeListMessages(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.messages).toHaveLength(1);
            expect(result.data?.messages[0]).toEqual({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello!",
                status: "delivered",
                direction: "outbound-api",
                numSegments: 1,
                price: "-0.00750",
                priceUnit: "USD",
                errorCode: null,
                errorMessage: null,
                dateCreated: "2024-01-15T10:30:00Z",
                dateSent: "2024-01-15T10:30:01Z"
            });
            expect(result.data?.hasMore).toBe(false);
            expect(result.data?.page).toBe(0);
            expect(result.data?.pageSize).toBe(50);
        });

        it("extracts nextPageToken from next_page_uri", async () => {
            mockClient.listMessages.mockResolvedValueOnce({
                messages: [
                    {
                        sid: "SM1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        messaging_service_sid: null,
                        from: "+15551234567",
                        to: "+15559876543",
                        body: "Message 1",
                        status: "delivered",
                        num_segments: "1",
                        num_media: "0",
                        direction: "outbound-api",
                        api_version: "2010-04-01",
                        price: null,
                        price_unit: "USD",
                        error_code: null,
                        error_message: null,
                        uri: "/Messages/SMxxx.json",
                        date_created: "2024-01-15T10:30:00Z",
                        date_updated: "2024-01-15T10:30:00Z",
                        date_sent: null
                    }
                ],
                first_page_uri: "/Messages.json?PageSize=1&Page=0",
                end: 0,
                next_page_uri: "/Messages.json?PageSize=1&Page=1&PageToken=PAxxxxxxxxx",
                previous_page_uri: null,
                page: 0,
                page_size: 1,
                start: 0,
                uri: "/Messages.json?PageSize=1&Page=0"
            });

            const result = await executeListMessages(mockClient, { pageSize: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
            expect(result.data?.nextPageToken).toBe("PAxxxxxxxxx");
        });

        it("returns error on client failure", async () => {
            mockClient.listMessages.mockRejectedValueOnce(
                new Error("Twilio rate limit exceeded. Please try again later.")
            );

            const result = await executeListMessages(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Twilio rate limit exceeded. Please try again later."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetMessage", () => {
        it("calls client with correct params", async () => {
            mockClient.getMessage.mockResolvedValueOnce({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                messaging_service_sid: null,
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello!",
                status: "delivered",
                num_segments: "1",
                num_media: "0",
                direction: "outbound-api",
                api_version: "2010-04-01",
                price: "-0.00750",
                price_unit: "USD",
                error_code: null,
                error_message: null,
                uri: "/Messages/SMxxx.json",
                date_created: "2024-01-15T10:30:00Z",
                date_updated: "2024-01-15T10:30:01Z",
                date_sent: "2024-01-15T10:30:01Z"
            });

            await executeGetMessage(mockClient, {
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(mockClient.getMessage).toHaveBeenCalledWith(
                "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getMessage.mockResolvedValueOnce({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                messaging_service_sid: null,
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello! This is a test message.",
                status: "delivered",
                num_segments: "1",
                num_media: "0",
                direction: "outbound-api",
                api_version: "2010-04-01",
                price: "-0.00750",
                price_unit: "USD",
                error_code: null,
                error_message: null,
                uri: "/Messages/SMxxx.json",
                date_created: "2024-01-15T10:30:00Z",
                date_updated: "2024-01-15T10:30:01Z",
                date_sent: "2024-01-15T10:30:01Z"
            });

            const result = await executeGetMessage(mockClient, {
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                from: "+15551234567",
                to: "+15559876543",
                body: "Hello! This is a test message.",
                status: "delivered",
                direction: "outbound-api",
                numSegments: 1,
                price: "-0.00750",
                priceUnit: "USD",
                errorCode: null,
                errorMessage: null,
                dateCreated: "2024-01-15T10:30:00Z",
                dateSent: "2024-01-15T10:30:01Z"
            });
        });

        it("returns message with error details", async () => {
            mockClient.getMessage.mockResolvedValueOnce({
                sid: "SM4cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                messaging_service_sid: null,
                from: "+15551234567",
                to: "+15555555555",
                body: "Your verification code is 123456",
                status: "failed",
                num_segments: "1",
                num_media: "0",
                direction: "outbound-api",
                api_version: "2010-04-01",
                price: null,
                price_unit: "USD",
                error_code: "30003",
                error_message: "Unreachable destination handset",
                uri: "/Messages/SMxxx.json",
                date_created: "2024-01-15T12:00:00Z",
                date_updated: "2024-01-15T12:00:01Z",
                date_sent: null
            });

            const result = await executeGetMessage(mockClient, {
                messageSid: "SM4cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(true);
            expect(result.data?.status).toBe("failed");
            expect(result.data?.errorCode).toBe("30003");
            expect(result.data?.errorMessage).toBe("Unreachable destination handset");
        });

        it("returns not_found error when message does not exist", async () => {
            mockClient.getMessage.mockRejectedValueOnce(new Error("Resource not found in Twilio."));

            const result = await executeGetMessage(mockClient, {
                messageSid: "SM_nonexistent_xxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Message not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.getMessage.mockRejectedValueOnce(new Error("Twilio authentication failed."));

            const result = await executeGetMessage(mockClient, {
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Twilio authentication failed.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeDeleteMessage", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteMessage.mockResolvedValueOnce(undefined);

            await executeDeleteMessage(mockClient, {
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(mockClient.deleteMessage).toHaveBeenCalledWith(
                "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteMessage.mockResolvedValueOnce(undefined);

            const result = await executeDeleteMessage(mockClient, {
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });
        });

        it("returns not_found error when message does not exist", async () => {
            mockClient.deleteMessage.mockRejectedValueOnce(
                new Error("Resource not found in Twilio.")
            );

            const result = await executeDeleteMessage(mockClient, {
                messageSid: "SM_nonexistent_xxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Message not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.deleteMessage.mockRejectedValueOnce(new Error("Twilio permission denied."));

            const result = await executeDeleteMessage(mockClient, {
                messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Twilio permission denied.");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListPhoneNumbers", () => {
        it("calls client with default params", async () => {
            mockClient.listPhoneNumbers.mockResolvedValueOnce({
                incoming_phone_numbers: [],
                first_page_uri: "/IncomingPhoneNumbers.json?PageSize=50&Page=0",
                end: 0,
                next_page_uri: null,
                previous_page_uri: null,
                page: 0,
                page_size: 50,
                start: 0,
                uri: "/IncomingPhoneNumbers.json?PageSize=50&Page=0"
            });

            // Schema applies defaults when parsing, so we need to parse first
            const params = listPhoneNumbersSchema.parse({});
            await executeListPhoneNumbers(mockClient, params);

            expect(mockClient.listPhoneNumbers).toHaveBeenCalledWith({
                friendlyName: undefined,
                phoneNumber: undefined,
                pageSize: 50,
                pageToken: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listPhoneNumbers.mockResolvedValueOnce({
                incoming_phone_numbers: [],
                first_page_uri: "/IncomingPhoneNumbers.json?PageSize=10&Page=0",
                end: 0,
                next_page_uri: null,
                previous_page_uri: null,
                page: 0,
                page_size: 10,
                start: 0,
                uri: "/IncomingPhoneNumbers.json?PageSize=10&Page=0"
            });

            await executeListPhoneNumbers(mockClient, {
                friendlyName: "Main Line",
                phoneNumber: "+15551234567",
                pageSize: 10
            });

            expect(mockClient.listPhoneNumbers).toHaveBeenCalledWith({
                friendlyName: "Main Line",
                phoneNumber: "+15551234567",
                pageSize: 10,
                pageToken: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listPhoneNumbers.mockResolvedValueOnce({
                incoming_phone_numbers: [
                    {
                        sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        friendly_name: "Main Business Line",
                        phone_number: "+15551234567",
                        capabilities: {
                            voice: true,
                            SMS: true,
                            MMS: true,
                            fax: false
                        },
                        status: "in-use",
                        api_version: "2010-04-01",
                        voice_url: "https://example.com/voice",
                        voice_method: "POST",
                        voice_fallback_url: null,
                        voice_fallback_method: "POST",
                        sms_url: "https://example.com/sms",
                        sms_method: "POST",
                        sms_fallback_url: null,
                        sms_fallback_method: "POST",
                        address_requirements: "none",
                        beta: false,
                        uri: "/IncomingPhoneNumbers/PNxxx.json",
                        date_created: "2023-06-15T08:00:00Z",
                        date_updated: "2023-06-15T08:00:00Z"
                    }
                ],
                first_page_uri: "/IncomingPhoneNumbers.json?PageSize=50&Page=0",
                end: 0,
                next_page_uri: null,
                previous_page_uri: null,
                page: 0,
                page_size: 50,
                start: 0,
                uri: "/IncomingPhoneNumbers.json?PageSize=50&Page=0"
            });

            const result = await executeListPhoneNumbers(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.phoneNumbers).toHaveLength(1);
            expect(result.data?.phoneNumbers[0]).toEqual({
                sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                friendlyName: "Main Business Line",
                phoneNumber: "+15551234567",
                capabilities: {
                    voice: true,
                    sms: true,
                    mms: true,
                    fax: false
                },
                status: "in-use",
                voiceUrl: "https://example.com/voice",
                smsUrl: "https://example.com/sms",
                addressRequirements: "none",
                beta: false,
                dateCreated: "2023-06-15T08:00:00Z"
            });
            expect(result.data?.hasMore).toBe(false);
        });

        it("extracts nextPageToken from next_page_uri", async () => {
            mockClient.listPhoneNumbers.mockResolvedValueOnce({
                incoming_phone_numbers: [
                    {
                        sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        friendly_name: "Line 1",
                        phone_number: "+15551234567",
                        capabilities: { voice: true, SMS: true, MMS: false, fax: false },
                        status: "in-use",
                        api_version: "2010-04-01",
                        voice_url: null,
                        voice_method: "POST",
                        voice_fallback_url: null,
                        voice_fallback_method: "POST",
                        sms_url: null,
                        sms_method: "POST",
                        sms_fallback_url: null,
                        sms_fallback_method: "POST",
                        address_requirements: "none",
                        beta: false,
                        uri: "/IncomingPhoneNumbers/PNxxx.json",
                        date_created: "2023-06-15T08:00:00Z",
                        date_updated: "2023-06-15T08:00:00Z"
                    }
                ],
                first_page_uri: "/IncomingPhoneNumbers.json?PageSize=1&Page=0",
                end: 0,
                next_page_uri: "/IncomingPhoneNumbers.json?PageSize=1&Page=1&PageToken=PAxxxxxxxxx",
                previous_page_uri: null,
                page: 0,
                page_size: 1,
                start: 0,
                uri: "/IncomingPhoneNumbers.json?PageSize=1&Page=0"
            });

            const result = await executeListPhoneNumbers(mockClient, { pageSize: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
            expect(result.data?.nextPageToken).toBe("PAxxxxxxxxx");
        });

        it("returns error on client failure", async () => {
            mockClient.listPhoneNumbers.mockRejectedValueOnce(
                new Error(
                    "Twilio authentication failed. Please check your Account SID and Auth Token."
                )
            );

            const result = await executeListPhoneNumbers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Twilio authentication failed. Please check your Account SID and Auth Token."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetPhoneNumber", () => {
        it("calls client with correct params", async () => {
            mockClient.getPhoneNumber.mockResolvedValueOnce({
                sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                friendly_name: "Main Business Line",
                phone_number: "+15551234567",
                capabilities: { voice: true, SMS: true, MMS: true, fax: false },
                status: "in-use",
                api_version: "2010-04-01",
                voice_url: "https://example.com/voice",
                voice_method: "POST",
                voice_fallback_url: null,
                voice_fallback_method: "POST",
                sms_url: "https://example.com/sms",
                sms_method: "POST",
                sms_fallback_url: null,
                sms_fallback_method: "POST",
                address_requirements: "none",
                beta: false,
                uri: "/IncomingPhoneNumbers/PNxxx.json",
                date_created: "2023-06-15T08:00:00Z",
                date_updated: "2023-06-15T08:00:00Z"
            });

            await executeGetPhoneNumber(mockClient, {
                phoneNumberSid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(mockClient.getPhoneNumber).toHaveBeenCalledWith(
                "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getPhoneNumber.mockResolvedValueOnce({
                sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                friendly_name: "Main Business Line",
                phone_number: "+15551234567",
                capabilities: { voice: true, SMS: true, MMS: true, fax: false },
                status: "in-use",
                api_version: "2010-04-01",
                voice_url: "https://example.com/voice",
                voice_method: "POST",
                voice_fallback_url: null,
                voice_fallback_method: "POST",
                sms_url: "https://example.com/sms",
                sms_method: "POST",
                sms_fallback_url: null,
                sms_fallback_method: "POST",
                address_requirements: "none",
                beta: false,
                uri: "/IncomingPhoneNumbers/PNxxx.json",
                date_created: "2023-06-15T08:00:00Z",
                date_updated: "2023-06-15T08:00:00Z"
            });

            const result = await executeGetPhoneNumber(mockClient, {
                phoneNumberSid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                friendlyName: "Main Business Line",
                phoneNumber: "+15551234567",
                capabilities: {
                    voice: true,
                    sms: true,
                    mms: true,
                    fax: false
                },
                status: "in-use",
                voiceUrl: "https://example.com/voice",
                smsUrl: "https://example.com/sms",
                addressRequirements: "none",
                beta: false,
                dateCreated: "2023-06-15T08:00:00Z"
            });
        });

        it("returns not_found error when phone number does not exist", async () => {
            mockClient.getPhoneNumber.mockRejectedValueOnce(
                new Error("Resource not found in Twilio.")
            );

            const result = await executeGetPhoneNumber(mockClient, {
                phoneNumberSid: "PN_nonexistent_xxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Phone number not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.getPhoneNumber.mockRejectedValueOnce(
                new Error("Twilio rate limit exceeded. Please try again later.")
            );

            const result = await executeGetPhoneNumber(mockClient, {
                phoneNumberSid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Twilio rate limit exceeded. Please try again later."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeLookupPhoneNumber", () => {
        it("calls client with phone number only", async () => {
            mockClient.lookupPhoneNumber.mockResolvedValueOnce({
                calling_country_code: "1",
                country_code: "US",
                phone_number: "+15551234567",
                national_format: "(555) 123-4567",
                valid: true,
                validation_errors: null,
                caller_name: null,
                carrier: null,
                line_type_intelligence: null,
                url: "https://lookups.twilio.com/v2/PhoneNumbers/+15551234567"
            });

            await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567"
            });

            expect(mockClient.lookupPhoneNumber).toHaveBeenCalledWith("+15551234567", undefined);
        });

        it("calls client with fields parameter", async () => {
            mockClient.lookupPhoneNumber.mockResolvedValueOnce({
                calling_country_code: "1",
                country_code: "US",
                phone_number: "+15551234567",
                national_format: "(555) 123-4567",
                valid: true,
                validation_errors: null,
                caller_name: null,
                carrier: {
                    mobile_country_code: "311",
                    mobile_network_code: "480",
                    name: "Verizon Wireless",
                    type: "mobile",
                    error_code: null
                },
                line_type_intelligence: null,
                url: "https://lookups.twilio.com/v2/PhoneNumbers/+15551234567"
            });

            await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567",
                fields: ["carrier"]
            });

            expect(mockClient.lookupPhoneNumber).toHaveBeenCalledWith("+15551234567", ["carrier"]);
        });

        it("returns normalized output with basic lookup", async () => {
            mockClient.lookupPhoneNumber.mockResolvedValueOnce({
                calling_country_code: "1",
                country_code: "US",
                phone_number: "+15551234567",
                national_format: "(555) 123-4567",
                valid: true,
                validation_errors: null,
                caller_name: null,
                carrier: null,
                line_type_intelligence: null,
                url: "https://lookups.twilio.com/v2/PhoneNumbers/+15551234567"
            });

            const result = await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                phoneNumber: "+15551234567",
                nationalFormat: "(555) 123-4567",
                countryCode: "US",
                callingCountryCode: "1",
                valid: true,
                validationErrors: null,
                carrier: null,
                callerName: null,
                lineType: null
            });
        });

        it("returns normalized output with carrier info", async () => {
            mockClient.lookupPhoneNumber.mockResolvedValueOnce({
                calling_country_code: "1",
                country_code: "US",
                phone_number: "+15551234567",
                national_format: "(555) 123-4567",
                valid: true,
                validation_errors: null,
                caller_name: null,
                carrier: {
                    mobile_country_code: "311",
                    mobile_network_code: "480",
                    name: "Verizon Wireless",
                    type: "mobile",
                    error_code: null
                },
                line_type_intelligence: null,
                url: "https://lookups.twilio.com/v2/PhoneNumbers/+15551234567"
            });

            const result = await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567",
                fields: ["carrier"]
            });

            expect(result.success).toBe(true);
            expect(result.data?.carrier).toEqual({
                name: "Verizon Wireless",
                type: "mobile",
                mobileCountryCode: "311",
                mobileNetworkCode: "480"
            });
        });

        it("returns normalized output with caller name", async () => {
            mockClient.lookupPhoneNumber.mockResolvedValueOnce({
                calling_country_code: "1",
                country_code: "US",
                phone_number: "+15551234567",
                national_format: "(555) 123-4567",
                valid: true,
                validation_errors: null,
                caller_name: {
                    caller_name: "ACME CORP",
                    caller_type: "BUSINESS",
                    error_code: null
                },
                carrier: null,
                line_type_intelligence: null,
                url: "https://lookups.twilio.com/v2/PhoneNumbers/+15551234567"
            });

            const result = await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567",
                fields: ["caller_name"]
            });

            expect(result.success).toBe(true);
            expect(result.data?.callerName).toEqual({
                name: "ACME CORP",
                type: "BUSINESS"
            });
        });

        it("returns normalized output with all fields", async () => {
            mockClient.lookupPhoneNumber.mockResolvedValueOnce({
                calling_country_code: "1",
                country_code: "US",
                phone_number: "+15551234567",
                national_format: "(555) 123-4567",
                valid: true,
                validation_errors: null,
                caller_name: {
                    caller_name: "ACME CORP",
                    caller_type: "BUSINESS",
                    error_code: null
                },
                carrier: {
                    mobile_country_code: "311",
                    mobile_network_code: "480",
                    name: "Verizon Wireless",
                    type: "mobile",
                    error_code: null
                },
                line_type_intelligence: {
                    carrier_name: "Verizon Wireless",
                    error_code: null,
                    mobile_country_code: "311",
                    mobile_network_code: "480",
                    type: "mobile"
                },
                url: "https://lookups.twilio.com/v2/PhoneNumbers/+15551234567"
            });

            const result = await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567",
                fields: ["carrier", "caller_name", "line_type_intelligence"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                phoneNumber: "+15551234567",
                nationalFormat: "(555) 123-4567",
                countryCode: "US",
                callingCountryCode: "1",
                valid: true,
                validationErrors: null,
                carrier: {
                    name: "Verizon Wireless",
                    type: "mobile",
                    mobileCountryCode: "311",
                    mobileNetworkCode: "480"
                },
                callerName: {
                    name: "ACME CORP",
                    type: "BUSINESS"
                },
                lineType: {
                    carrierName: "Verizon Wireless",
                    type: "mobile"
                }
            });
        });

        it("returns validation error for invalid phone number", async () => {
            mockClient.lookupPhoneNumber.mockRejectedValueOnce(
                new Error("Invalid phone number format")
            );

            const result = await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "not-a-phone-number"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("Invalid phone number format");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.lookupPhoneNumber.mockRejectedValueOnce(
                new Error("Twilio rate limit exceeded. Please try again later.")
            );

            const result = await executeLookupPhoneNumber(mockClient, {
                phoneNumber: "+15551234567"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Twilio rate limit exceeded. Please try again later."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("schema validation", () => {
        describe("sendSmsSchema", () => {
            it("validates minimal input", () => {
                const result = sendSmsSchema.safeParse({
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Hello!"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = sendSmsSchema.safeParse({
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Hello!",
                    statusCallback: "https://example.com/callback",
                    messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing to", () => {
                const result = sendSmsSchema.safeParse({
                    from: "+15551234567",
                    body: "Hello!"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing from", () => {
                const result = sendSmsSchema.safeParse({
                    to: "+15559876543",
                    body: "Hello!"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing body", () => {
                const result = sendSmsSchema.safeParse({
                    to: "+15559876543",
                    from: "+15551234567"
                });
                expect(result.success).toBe(false);
            });

            it("rejects body exceeding 1600 characters", () => {
                const result = sendSmsSchema.safeParse({
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "x".repeat(1601)
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid statusCallback URL", () => {
                const result = sendSmsSchema.safeParse({
                    to: "+15559876543",
                    from: "+15551234567",
                    body: "Hello!",
                    statusCallback: "not-a-url"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listMessagesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listMessagesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listMessagesSchema.safeParse({
                    from: "+15551234567",
                    to: "+15559876543",
                    dateSentAfter: "2024-01-01"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listMessagesSchema.safeParse({
                    pageSize: 100,
                    pageToken: "PAxxxxxxxxx"
                });
                expect(result.success).toBe(true);
            });

            it("rejects pageSize exceeding 1000", () => {
                const result = listMessagesSchema.safeParse({
                    pageSize: 2000
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative pageSize", () => {
                const result = listMessagesSchema.safeParse({
                    pageSize: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies default pageSize", () => {
                const result = listMessagesSchema.parse({});
                expect(result.pageSize).toBe(50);
            });
        });

        describe("getMessageSchema", () => {
            it("validates with messageSid", () => {
                const result = getMessageSchema.safeParse({
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing messageSid", () => {
                const result = getMessageSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty messageSid", () => {
                const result = getMessageSchema.safeParse({
                    messageSid: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteMessageSchema", () => {
            it("validates with messageSid", () => {
                const result = deleteMessageSchema.safeParse({
                    messageSid: "SM2cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing messageSid", () => {
                const result = deleteMessageSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty messageSid", () => {
                const result = deleteMessageSchema.safeParse({
                    messageSid: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listPhoneNumbersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listPhoneNumbersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listPhoneNumbersSchema.safeParse({
                    friendlyName: "Main Line",
                    phoneNumber: "+15551234567"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listPhoneNumbersSchema.safeParse({
                    pageSize: 100,
                    pageToken: "PAxxxxxxxxx"
                });
                expect(result.success).toBe(true);
            });

            it("rejects pageSize exceeding 1000", () => {
                const result = listPhoneNumbersSchema.safeParse({
                    pageSize: 2000
                });
                expect(result.success).toBe(false);
            });

            it("applies default pageSize", () => {
                const result = listPhoneNumbersSchema.parse({});
                expect(result.pageSize).toBe(50);
            });
        });

        describe("getPhoneNumberSchema", () => {
            it("validates with phoneNumberSid", () => {
                const result = getPhoneNumberSchema.safeParse({
                    phoneNumberSid: "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing phoneNumberSid", () => {
                const result = getPhoneNumberSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty phoneNumberSid", () => {
                const result = getPhoneNumberSchema.safeParse({
                    phoneNumberSid: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("lookupPhoneNumberSchema", () => {
            it("validates with phone number only", () => {
                const result = lookupPhoneNumberSchema.safeParse({
                    phoneNumber: "+15551234567"
                });
                expect(result.success).toBe(true);
            });

            it("validates with fields", () => {
                const result = lookupPhoneNumberSchema.safeParse({
                    phoneNumber: "+15551234567",
                    fields: ["carrier", "caller_name", "line_type_intelligence"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing phoneNumber", () => {
                const result = lookupPhoneNumberSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty phoneNumber", () => {
                const result = lookupPhoneNumberSchema.safeParse({
                    phoneNumber: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid field values", () => {
                const result = lookupPhoneNumberSchema.safeParse({
                    phoneNumber: "+15551234567",
                    fields: ["invalid_field"]
                });
                expect(result.success).toBe(false);
            });

            it("accepts single field in array", () => {
                const result = lookupPhoneNumberSchema.safeParse({
                    phoneNumber: "+15551234567",
                    fields: ["carrier"]
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
