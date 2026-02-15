/**
 * Zoom Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateMeeting, createMeetingSchema } from "../operations/createMeeting";
import { executeDeleteMeeting, deleteMeetingSchema } from "../operations/deleteMeeting";
import { executeGetMeeting, getMeetingSchema } from "../operations/getMeeting";
import {
    executeGetMeetingRecordings,
    getMeetingRecordingsSchema
} from "../operations/getMeetingRecordings";
import { executeGetUser, getUserSchema } from "../operations/getUser";
import { executeListMeetings, listMeetingsSchema } from "../operations/listMeetings";
import { executeListRecordings, listRecordingsSchema } from "../operations/listRecordings";
import { executeUpdateMeeting, updateMeetingSchema } from "../operations/updateMeeting";
import type { ZoomClient } from "../client/ZoomClient";

// Mock ZoomClient factory
function createMockZoomClient(): jest.Mocked<ZoomClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<ZoomClient>;
}

// Helper type for extracting data shape from result
interface MeetingOutput {
    id: number;
    uuid: string;
    hostId: string;
    topic: string;
    type: number;
    status?: string;
    startTime?: string;
    duration?: number;
    timezone?: string;
    agenda?: string;
    createdAt: string;
    joinUrl: string;
    startUrl?: string;
    password?: string;
    settings?: Record<string, unknown>;
}

interface ListMeetingsOutput {
    meetings: MeetingOutput[];
    pageCount: number;
    pageSize: number;
    totalRecords: number;
    nextPageToken?: string;
}

interface RecordingFileOutput {
    id: string;
    meetingId: string;
    recordingStart: string;
    recordingEnd: string;
    fileType: string;
    fileExtension: string;
    fileSize: number;
    downloadUrl: string;
    playUrl?: string;
    status: string;
    recordingType: string;
}

interface RecordingOutput {
    uuid: string;
    id: number;
    hostId: string;
    topic: string;
    type: number;
    startTime: string;
    timezone: string;
    duration: number;
    totalSize: number;
    recordingCount: number;
    shareUrl?: string;
    password?: string;
    recordingFiles: RecordingFileOutput[];
}

interface ListRecordingsOutput {
    recordings: RecordingOutput[];
    from?: string;
    to?: string;
    pageCount: number;
    pageSize: number;
    totalRecords: number;
    nextPageToken?: string;
}

describe("Zoom Operation Executors", () => {
    let mockClient: jest.Mocked<ZoomClient>;

    beforeEach(() => {
        mockClient = createMockZoomClient();
    });

    describe("executeCreateMeeting", () => {
        it("calls client with correct params for basic meeting", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                created_at: "2024-06-15T14:30:00Z",
                join_url: "https://zoom.us/j/85746529345"
            });

            // Parse input through schema to apply defaults
            const input = createMeetingSchema.parse({
                topic: "Weekly Team Standup"
            });

            await executeCreateMeeting(mockClient, input);

            expect(mockClient.post).toHaveBeenCalledWith("/users/me/meetings", {
                topic: "Weekly Team Standup",
                type: 2
            });
        });

        it("calls client with all optional params", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss progress",
                created_at: "2024-06-15T14:30:00Z",
                join_url: "https://zoom.us/j/85746529345",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    waiting_room: true
                }
            });

            const input = createMeetingSchema.parse({
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss progress",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    waiting_room: true
                }
            });

            await executeCreateMeeting(mockClient, input);

            expect(mockClient.post).toHaveBeenCalledWith("/users/me/meetings", {
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss progress",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    waiting_room: true
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                status: "waiting",
                start_time: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss progress",
                created_at: "2024-06-15T14:30:00Z",
                join_url: "https://zoom.us/j/85746529345",
                start_url: "https://zoom.us/s/85746529345?zak=abc123",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    waiting_room: true
                }
            });

            const input = createMeetingSchema.parse({
                topic: "Weekly Team Standup"
            });

            const result = await executeCreateMeeting(mockClient, input);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                status: "waiting",
                startTime: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss progress",
                createdAt: "2024-06-15T14:30:00Z",
                joinUrl: "https://zoom.us/j/85746529345",
                startUrl: "https://zoom.us/s/85746529345?zak=abc123",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    waiting_room: true
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Zoom API error (300): Invalid date time for the start_time field")
            );

            const input = createMeetingSchema.parse({
                topic: "Test Meeting",
                start_time: "2020-01-01T00:00:00Z"
            });

            const result = await executeCreateMeeting(mockClient, input);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Zoom API error (300): Invalid date time for the start_time field"
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce("string error");

            const input = createMeetingSchema.parse({
                topic: "Test Meeting"
            });

            const result = await executeCreateMeeting(mockClient, input);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create meeting");
        });
    });

    describe("executeDeleteMeeting", () => {
        it("calls client with string meeting ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteMeeting(mockClient, {
                meetingId: "85746529345"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/meetings/85746529345");
        });

        it("calls client with numeric meeting ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteMeeting(mockClient, {
                meetingId: 91234567890
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/meetings/91234567890");
        });

        it("returns normalized output on success", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteMeeting(mockClient, {
                meetingId: "85746529345"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                meetingId: "85746529345",
                deleted: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(
                new Error("Zoom API error: Meeting not found: 99999999999")
            );

            const result = await executeDeleteMeeting(mockClient, {
                meetingId: "99999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Zoom API error: Meeting not found: 99999999999");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.delete.mockRejectedValueOnce("string error");

            const result = await executeDeleteMeeting(mockClient, {
                meetingId: "12345"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete meeting");
        });
    });

    describe("executeGetMeeting", () => {
        it("calls client with correct meeting ID", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                created_at: "2024-06-15T14:30:00Z",
                join_url: "https://zoom.us/j/85746529345"
            });

            await executeGetMeeting(mockClient, {
                meetingId: "85746529345"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/meetings/85746529345");
        });

        it("calls client with numeric meeting ID", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: 91234567890,
                uuid: "hLMNOp3rStUV4W5XyZabCD==",
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Client Demo Session",
                type: 2,
                created_at: "2024-06-15T15:00:00Z",
                join_url: "https://zoom.us/j/91234567890"
            });

            await executeGetMeeting(mockClient, {
                meetingId: 91234567890
            });

            expect(mockClient.get).toHaveBeenCalledWith("/meetings/91234567890");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                status: "waiting",
                start_time: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss weekly progress",
                created_at: "2024-06-15T14:30:00Z",
                join_url: "https://zoom.us/j/85746529345",
                start_url: "https://zoom.us/s/85746529345?zak=abc123",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    participant_video: true,
                    mute_upon_entry: true
                }
            });

            const result = await executeGetMeeting(mockClient, {
                meetingId: "85746529345"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 85746529345,
                uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                status: "waiting",
                startTime: "2024-06-20T09:00:00Z",
                duration: 30,
                timezone: "America/New_York",
                agenda: "Discuss weekly progress",
                createdAt: "2024-06-15T14:30:00Z",
                joinUrl: "https://zoom.us/j/85746529345",
                startUrl: "https://zoom.us/s/85746529345?zak=abc123",
                password: "Xy7k9L",
                settings: {
                    host_video: true,
                    participant_video: true,
                    mute_upon_entry: true
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Zoom API error: Meeting not found: 99999999999")
            );

            const result = await executeGetMeeting(mockClient, {
                meetingId: "99999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Zoom API error: Meeting not found: 99999999999");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeGetMeeting(mockClient, {
                meetingId: "12345"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get meeting");
        });
    });

    describe("executeGetMeetingRecordings", () => {
        it("calls client with correct meeting ID", async () => {
            mockClient.get.mockResolvedValueOnce({
                uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                id: 85746529345,
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-13T09:00:00Z",
                timezone: "America/New_York",
                duration: 28,
                total_size: 52428800,
                recording_count: 2,
                recording_files: []
            });

            await executeGetMeetingRecordings(mockClient, {
                meetingId: "85746529345"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/meetings/85746529345/recordings");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                id: 85746529345,
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-13T09:00:00Z",
                timezone: "America/New_York",
                duration: 28,
                total_size: 52428800,
                recording_count: 2,
                share_url: "https://zoom.us/rec/share/abc123",
                password: "abc123",
                recording_files: [
                    {
                        id: "rec-abc123",
                        meeting_id: "85746529345",
                        recording_start: "2024-06-13T09:00:00Z",
                        recording_end: "2024-06-13T09:28:00Z",
                        file_type: "MP4",
                        file_extension: "MP4",
                        file_size: 41943040,
                        download_url: "https://zoom.us/rec/download/abc123",
                        play_url: "https://zoom.us/rec/play/abc123",
                        status: "completed",
                        recording_type: "shared_screen_with_speaker_view"
                    },
                    {
                        id: "rec-def456",
                        meeting_id: "85746529345",
                        recording_start: "2024-06-13T09:00:00Z",
                        recording_end: "2024-06-13T09:28:00Z",
                        file_type: "M4A",
                        file_extension: "M4A",
                        file_size: 10485760,
                        download_url: "https://zoom.us/rec/download/def456",
                        status: "completed",
                        recording_type: "audio_only"
                    }
                ]
            });

            const result = await executeGetMeetingRecordings(mockClient, {
                meetingId: "85746529345"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                id: 85746529345,
                hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                startTime: "2024-06-13T09:00:00Z",
                timezone: "America/New_York",
                duration: 28,
                totalSize: 52428800,
                recordingCount: 2,
                shareUrl: "https://zoom.us/rec/share/abc123",
                password: "abc123",
                recordingFiles: [
                    {
                        id: "rec-abc123",
                        meetingId: "85746529345",
                        recordingStart: "2024-06-13T09:00:00Z",
                        recordingEnd: "2024-06-13T09:28:00Z",
                        fileType: "MP4",
                        fileExtension: "MP4",
                        fileSize: 41943040,
                        downloadUrl: "https://zoom.us/rec/download/abc123",
                        playUrl: "https://zoom.us/rec/play/abc123",
                        status: "completed",
                        recordingType: "shared_screen_with_speaker_view"
                    },
                    {
                        id: "rec-def456",
                        meetingId: "85746529345",
                        recordingStart: "2024-06-13T09:00:00Z",
                        recordingEnd: "2024-06-13T09:28:00Z",
                        fileType: "M4A",
                        fileExtension: "M4A",
                        fileSize: 10485760,
                        downloadUrl: "https://zoom.us/rec/download/def456",
                        playUrl: undefined,
                        status: "completed",
                        recordingType: "audio_only"
                    }
                ]
            });
        });

        it("handles empty recording files array", async () => {
            mockClient.get.mockResolvedValueOnce({
                uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                id: 85746529345,
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-13T09:00:00Z",
                timezone: "America/New_York",
                duration: 28,
                total_size: 0,
                recording_count: 0,
                recording_files: []
            });

            const result = await executeGetMeetingRecordings(mockClient, {
                meetingId: "85746529345"
            });

            expect(result.success).toBe(true);
            const data = result.data as RecordingOutput;
            expect(data.recordingFiles).toEqual([]);
        });

        it("handles missing recording files", async () => {
            mockClient.get.mockResolvedValueOnce({
                uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                id: 85746529345,
                host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                topic: "Weekly Team Standup",
                type: 2,
                start_time: "2024-06-13T09:00:00Z",
                timezone: "America/New_York",
                duration: 28,
                total_size: 0,
                recording_count: 0
                // recording_files is undefined
            });

            const result = await executeGetMeetingRecordings(mockClient, {
                meetingId: "85746529345"
            });

            expect(result.success).toBe(true);
            const data = result.data as RecordingOutput;
            expect(data.recordingFiles).toEqual([]);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Zoom API error: Recording not found for meeting 99999999999")
            );

            const result = await executeGetMeetingRecordings(mockClient, {
                meetingId: "99999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Zoom API error: Recording not found for meeting 99999999999"
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeGetMeetingRecordings(mockClient, {
                meetingId: "12345"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get meeting recordings");
        });
    });

    describe("executeGetUser", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "KDcuGIm1QgePTO8WbOqwIQ",
                first_name: "Jane",
                last_name: "Smith",
                email: "jane.smith@example.com",
                type: 2,
                status: "active",
                pmi: 4567891230,
                timezone: "America/New_York",
                dept: "Engineering",
                created_at: "2023-01-15T08:00:00Z",
                last_login_time: "2024-06-15T09:30:00Z",
                pic_url: "https://zoom.us/p/KDcuGIm1QgePTO8WbOqwIQ",
                language: "en-US",
                account_id: "ACC_aBcDeFgHiJkLmN"
            });

            await executeGetUser(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/users/me");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "KDcuGIm1QgePTO8WbOqwIQ",
                first_name: "Jane",
                last_name: "Smith",
                email: "jane.smith@example.com",
                type: 2,
                status: "active",
                pmi: 4567891230,
                timezone: "America/New_York",
                dept: "Engineering",
                created_at: "2023-01-15T08:00:00Z",
                last_login_time: "2024-06-15T09:30:00Z",
                pic_url: "https://zoom.us/p/KDcuGIm1QgePTO8WbOqwIQ",
                language: "en-US",
                account_id: "ACC_aBcDeFgHiJkLmN"
            });

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "KDcuGIm1QgePTO8WbOqwIQ",
                firstName: "Jane",
                lastName: "Smith",
                email: "jane.smith@example.com",
                type: 2,
                status: "active",
                pmi: 4567891230,
                timezone: "America/New_York",
                dept: "Engineering",
                createdAt: "2023-01-15T08:00:00Z",
                lastLoginTime: "2024-06-15T09:30:00Z",
                picUrl: "https://zoom.us/p/KDcuGIm1QgePTO8WbOqwIQ",
                language: "en-US",
                accountId: "ACC_aBcDeFgHiJkLmN"
            });
        });

        it("handles user without optional fields", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "PLmnOpQrStUv5W6XyZaBcD",
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                type: 1,
                status: "active",
                pmi: 1234567890,
                timezone: "Europe/London",
                created_at: "2024-03-10T12:00:00Z",
                account_id: "ACC_xYzAbCdEfGhIjK"
            });

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "PLmnOpQrStUv5W6XyZaBcD",
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                type: 1,
                status: "active",
                pmi: 1234567890,
                timezone: "Europe/London",
                dept: undefined,
                createdAt: "2024-03-10T12:00:00Z",
                lastLoginTime: undefined,
                picUrl: undefined,
                language: undefined,
                accountId: "ACC_xYzAbCdEfGhIjK"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Zoom access token is invalid. Please reconnect.")
            );

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Zoom access token is invalid. Please reconnect.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get user");
        });
    });

    describe("executeListMeetings", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 1,
                page_number: 1,
                page_size: 30,
                total_records: 0,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listMeetingsSchema.parse({});

            await executeListMeetings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/meetings", {
                page_size: 30
            });
        });

        it("calls client with type filter", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 1,
                page_number: 1,
                page_size: 30,
                total_records: 0,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listMeetingsSchema.parse({
                type: "scheduled"
            });

            await executeListMeetings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/meetings", {
                page_size: 30,
                type: "scheduled"
            });
        });

        it("calls client with custom page size", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 1,
                page_number: 1,
                page_size: 50,
                total_records: 0,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listMeetingsSchema.parse({
                page_size: 50
            });

            await executeListMeetings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/meetings", {
                page_size: 50
            });
        });

        it("calls client with pagination token", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 2,
                page_number: 2,
                page_size: 30,
                total_records: 45,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listMeetingsSchema.parse({
                next_page_token: "abc123token"
            });

            await executeListMeetings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/meetings", {
                page_size: 30,
                next_page_token: "abc123token"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 1,
                page_number: 1,
                page_size: 30,
                total_records: 2,
                meetings: [
                    {
                        id: 85746529345,
                        uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                        host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Weekly Team Standup",
                        type: 2,
                        status: "waiting",
                        start_time: "2024-06-20T09:00:00Z",
                        duration: 30,
                        timezone: "America/New_York",
                        created_at: "2024-06-15T14:30:00Z",
                        join_url: "https://zoom.us/j/85746529345"
                    },
                    {
                        id: 91234567890,
                        uuid: "hLMNOp3rStUV4W5XyZabCD==",
                        host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Client Demo Session",
                        type: 2,
                        start_time: "2024-06-25T15:00:00Z",
                        duration: 60,
                        timezone: "Europe/London",
                        created_at: "2024-06-15T15:00:00Z",
                        join_url: "https://zoom.us/j/91234567890"
                    }
                ]
            });

            const input = listMeetingsSchema.parse({});

            const result = await executeListMeetings(mockClient, input);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                meetings: [
                    {
                        id: 85746529345,
                        uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                        hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Weekly Team Standup",
                        type: 2,
                        status: "waiting",
                        startTime: "2024-06-20T09:00:00Z",
                        duration: 30,
                        timezone: "America/New_York",
                        createdAt: "2024-06-15T14:30:00Z",
                        joinUrl: "https://zoom.us/j/85746529345"
                    },
                    {
                        id: 91234567890,
                        uuid: "hLMNOp3rStUV4W5XyZabCD==",
                        hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Client Demo Session",
                        type: 2,
                        status: undefined,
                        startTime: "2024-06-25T15:00:00Z",
                        duration: 60,
                        timezone: "Europe/London",
                        createdAt: "2024-06-15T15:00:00Z",
                        joinUrl: "https://zoom.us/j/91234567890"
                    }
                ],
                pageCount: 1,
                pageSize: 30,
                totalRecords: 2,
                nextPageToken: undefined
            });
        });

        it("returns nextPageToken when pagination available", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 2,
                page_number: 1,
                page_size: 10,
                total_records: 15,
                next_page_token: "nextPageToken123",
                meetings: [
                    {
                        id: 85746529345,
                        uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                        host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Meeting 1",
                        type: 2,
                        created_at: "2024-06-15T14:30:00Z",
                        join_url: "https://zoom.us/j/85746529345"
                    }
                ]
            });

            const input = listMeetingsSchema.parse({ page_size: 10 });

            const result = await executeListMeetings(mockClient, input);

            expect(result.success).toBe(true);
            const data = result.data as ListMeetingsOutput;
            expect(data.nextPageToken).toBe("nextPageToken123");
        });

        it("handles empty meetings array", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 0,
                page_number: 1,
                page_size: 30,
                total_records: 0,
                meetings: []
            });

            const input = listMeetingsSchema.parse({});

            const result = await executeListMeetings(mockClient, input);

            expect(result.success).toBe(true);
            const data = result.data as ListMeetingsOutput;
            expect(data.meetings).toEqual([]);
            expect(data.totalRecords).toBe(0);
        });

        it("handles missing meetings array", async () => {
            mockClient.get.mockResolvedValueOnce({
                page_count: 0,
                page_number: 1,
                page_size: 30,
                total_records: 0
                // meetings is undefined
            });

            const input = listMeetingsSchema.parse({});

            const result = await executeListMeetings(mockClient, input);

            expect(result.success).toBe(true);
            const data = result.data as ListMeetingsOutput;
            expect(data.meetings).toEqual([]);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Zoom access token is invalid. Please reconnect.")
            );

            const input = listMeetingsSchema.parse({});

            const result = await executeListMeetings(mockClient, input);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Zoom access token is invalid. Please reconnect.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const input = listMeetingsSchema.parse({});

            const result = await executeListMeetings(mockClient, input);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list meetings");
        });
    });

    describe("executeListRecordings", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 1,
                page_size: 30,
                total_records: 0,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listRecordingsSchema.parse({});

            await executeListRecordings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/recordings", {
                page_size: 30
            });
        });

        it("calls client with date range", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 1,
                page_size: 30,
                total_records: 0,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listRecordingsSchema.parse({
                from: "2024-06-01",
                to: "2024-06-30"
            });

            await executeListRecordings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/recordings", {
                page_size: 30,
                from: "2024-06-01",
                to: "2024-06-30"
            });
        });

        it("calls client with pagination token", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 2,
                page_size: 30,
                total_records: 45,
                meetings: []
            });

            // Parse input through schema to apply defaults
            const input = listRecordingsSchema.parse({
                next_page_token: "token123"
            });

            await executeListRecordings(mockClient, input);

            expect(mockClient.get).toHaveBeenCalledWith("/users/me/recordings", {
                page_size: 30,
                next_page_token: "token123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 1,
                page_size: 30,
                total_records: 1,
                meetings: [
                    {
                        uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                        id: 85746529345,
                        host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Weekly Team Standup",
                        type: 2,
                        start_time: "2024-06-13T09:00:00Z",
                        timezone: "America/New_York",
                        duration: 28,
                        total_size: 52428800,
                        recording_count: 2,
                        share_url: "https://zoom.us/rec/share/abc123",
                        recording_files: [
                            {
                                id: "rec-abc123",
                                meeting_id: "85746529345",
                                recording_start: "2024-06-13T09:00:00Z",
                                recording_end: "2024-06-13T09:28:00Z",
                                file_type: "MP4",
                                file_extension: "MP4",
                                file_size: 41943040,
                                download_url: "https://zoom.us/rec/download/abc123",
                                play_url: "https://zoom.us/rec/play/abc123",
                                status: "completed",
                                recording_type: "shared_screen_with_speaker_view"
                            }
                        ]
                    }
                ]
            });

            const input = listRecordingsSchema.parse({});

            const result = await executeListRecordings(mockClient, input);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                recordings: [
                    {
                        uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                        id: 85746529345,
                        hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Weekly Team Standup",
                        type: 2,
                        startTime: "2024-06-13T09:00:00Z",
                        timezone: "America/New_York",
                        duration: 28,
                        totalSize: 52428800,
                        recordingCount: 2,
                        shareUrl: "https://zoom.us/rec/share/abc123",
                        recordingFiles: [
                            {
                                id: "rec-abc123",
                                meetingId: "85746529345",
                                recordingStart: "2024-06-13T09:00:00Z",
                                recordingEnd: "2024-06-13T09:28:00Z",
                                fileType: "MP4",
                                fileExtension: "MP4",
                                fileSize: 41943040,
                                downloadUrl: "https://zoom.us/rec/download/abc123",
                                playUrl: "https://zoom.us/rec/play/abc123",
                                status: "completed",
                                recordingType: "shared_screen_with_speaker_view"
                            }
                        ]
                    }
                ],
                from: "2024-06-01",
                to: "2024-06-30",
                pageCount: 1,
                pageSize: 30,
                totalRecords: 1,
                nextPageToken: undefined
            });
        });

        it("handles empty recordings array", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 0,
                page_size: 30,
                total_records: 0,
                meetings: []
            });

            const input = listRecordingsSchema.parse({});

            const result = await executeListRecordings(mockClient, input);

            expect(result.success).toBe(true);
            const data = result.data as ListRecordingsOutput;
            expect(data.recordings).toEqual([]);
        });

        it("handles missing meetings array", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 0,
                page_size: 30,
                total_records: 0
                // meetings is undefined
            });

            const input = listRecordingsSchema.parse({});

            const result = await executeListRecordings(mockClient, input);

            expect(result.success).toBe(true);
            const data = result.data as ListRecordingsOutput;
            expect(data.recordings).toEqual([]);
        });

        it("handles missing recording_files in recording", async () => {
            mockClient.get.mockResolvedValueOnce({
                from: "2024-06-01",
                to: "2024-06-30",
                page_count: 1,
                page_size: 30,
                total_records: 1,
                meetings: [
                    {
                        uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                        id: 85746529345,
                        host_id: "KDcuGIm1QgePTO8WbOqwIQ",
                        topic: "Weekly Team Standup",
                        type: 2,
                        start_time: "2024-06-13T09:00:00Z",
                        timezone: "America/New_York",
                        duration: 28,
                        total_size: 0,
                        recording_count: 0
                        // recording_files is undefined
                    }
                ]
            });

            const input = listRecordingsSchema.parse({});

            const result = await executeListRecordings(mockClient, input);

            expect(result.success).toBe(true);
            const data = result.data as ListRecordingsOutput;
            expect(data.recordings[0].recordingFiles).toEqual([]);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Zoom access token is invalid. Please reconnect.")
            );

            const input = listRecordingsSchema.parse({});

            const result = await executeListRecordings(mockClient, input);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Zoom access token is invalid. Please reconnect.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const input = listRecordingsSchema.parse({});

            const result = await executeListRecordings(mockClient, input);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list recordings");
        });
    });

    describe("executeUpdateMeeting", () => {
        it("calls client with meeting ID only", async () => {
            mockClient.patch.mockResolvedValueOnce(undefined);

            await executeUpdateMeeting(mockClient, {
                meetingId: "85746529345"
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/meetings/85746529345", {});
        });

        it("calls client with topic update", async () => {
            mockClient.patch.mockResolvedValueOnce(undefined);

            await executeUpdateMeeting(mockClient, {
                meetingId: "85746529345",
                topic: "Updated Team Standup"
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/meetings/85746529345", {
                topic: "Updated Team Standup"
            });
        });

        it("calls client with all params", async () => {
            mockClient.patch.mockResolvedValueOnce(undefined);

            await executeUpdateMeeting(mockClient, {
                meetingId: 91234567890,
                topic: "Updated Meeting",
                type: 2,
                start_time: "2024-06-21T10:00:00Z",
                duration: 45,
                timezone: "America/Los_Angeles",
                agenda: "Updated agenda",
                password: "newpass",
                settings: {
                    waiting_room: true,
                    mute_upon_entry: false,
                    auto_recording: "local"
                }
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/meetings/91234567890", {
                topic: "Updated Meeting",
                type: 2,
                start_time: "2024-06-21T10:00:00Z",
                duration: 45,
                timezone: "America/Los_Angeles",
                agenda: "Updated agenda",
                password: "newpass",
                settings: {
                    waiting_room: true,
                    mute_upon_entry: false,
                    auto_recording: "local"
                }
            });
        });

        it("returns normalized output on success with string ID", async () => {
            mockClient.patch.mockResolvedValueOnce(undefined);

            const result = await executeUpdateMeeting(mockClient, {
                meetingId: "85746529345",
                topic: "Updated Topic"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                meetingId: "85746529345",
                updated: true
            });
        });

        it("returns normalized output on success with numeric ID", async () => {
            mockClient.patch.mockResolvedValueOnce(undefined);

            const result = await executeUpdateMeeting(mockClient, {
                meetingId: 91234567890,
                topic: "Updated Topic"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                meetingId: 91234567890,
                updated: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.patch.mockRejectedValueOnce(
                new Error("Zoom API error: Meeting not found: 99999999999")
            );

            const result = await executeUpdateMeeting(mockClient, {
                meetingId: "99999999999",
                topic: "Update Nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Zoom API error: Meeting not found: 99999999999");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.patch.mockRejectedValueOnce("string error");

            const result = await executeUpdateMeeting(mockClient, {
                meetingId: "12345",
                topic: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update meeting");
        });
    });

    describe("schema validation", () => {
        describe("createMeetingSchema", () => {
            it("validates minimal input", () => {
                const result = createMeetingSchema.safeParse({
                    topic: "Test Meeting"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createMeetingSchema.safeParse({
                    topic: "Test Meeting",
                    type: 2,
                    start_time: "2024-06-20T09:00:00Z",
                    duration: 60,
                    timezone: "America/New_York",
                    agenda: "Meeting agenda",
                    password: "pass123",
                    settings: {
                        host_video: true,
                        participant_video: false,
                        join_before_host: true,
                        mute_upon_entry: true,
                        auto_recording: "cloud",
                        waiting_room: false
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing topic", () => {
                const result = createMeetingSchema.safeParse({
                    type: 2,
                    start_time: "2024-06-20T09:00:00Z"
                });
                expect(result.success).toBe(false);
            });

            it("applies default type value", () => {
                const result = createMeetingSchema.parse({
                    topic: "Test Meeting"
                });
                expect(result.type).toBe(2);
            });

            it("validates auto_recording enum", () => {
                const validResult = createMeetingSchema.safeParse({
                    topic: "Test Meeting",
                    settings: {
                        auto_recording: "cloud"
                    }
                });
                expect(validResult.success).toBe(true);

                const invalidResult = createMeetingSchema.safeParse({
                    topic: "Test Meeting",
                    settings: {
                        auto_recording: "invalid"
                    }
                });
                expect(invalidResult.success).toBe(false);
            });
        });

        describe("deleteMeetingSchema", () => {
            it("validates string meeting ID", () => {
                const result = deleteMeetingSchema.safeParse({
                    meetingId: "85746529345"
                });
                expect(result.success).toBe(true);
            });

            it("validates numeric meeting ID", () => {
                const result = deleteMeetingSchema.safeParse({
                    meetingId: 85746529345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing meetingId", () => {
                const result = deleteMeetingSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getMeetingSchema", () => {
            it("validates string meeting ID", () => {
                const result = getMeetingSchema.safeParse({
                    meetingId: "85746529345"
                });
                expect(result.success).toBe(true);
            });

            it("validates numeric meeting ID", () => {
                const result = getMeetingSchema.safeParse({
                    meetingId: 85746529345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing meetingId", () => {
                const result = getMeetingSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getMeetingRecordingsSchema", () => {
            it("validates string meeting ID", () => {
                const result = getMeetingRecordingsSchema.safeParse({
                    meetingId: "85746529345"
                });
                expect(result.success).toBe(true);
            });

            it("validates numeric meeting ID", () => {
                const result = getMeetingRecordingsSchema.safeParse({
                    meetingId: 85746529345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing meetingId", () => {
                const result = getMeetingRecordingsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getUserSchema", () => {
            it("validates empty input", () => {
                const result = getUserSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("listMeetingsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listMeetingsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with type filter", () => {
                const result = listMeetingsSchema.safeParse({
                    type: "scheduled"
                });
                expect(result.success).toBe(true);
            });

            it("validates with upcoming type", () => {
                const result = listMeetingsSchema.safeParse({
                    type: "upcoming"
                });
                expect(result.success).toBe(true);
            });

            it("validates with live type", () => {
                const result = listMeetingsSchema.safeParse({
                    type: "live"
                });
                expect(result.success).toBe(true);
            });

            it("validates with previous_meetings type", () => {
                const result = listMeetingsSchema.safeParse({
                    type: "previous_meetings"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid type", () => {
                const result = listMeetingsSchema.safeParse({
                    type: "invalid_type"
                });
                expect(result.success).toBe(false);
            });

            it("validates with page_size", () => {
                const result = listMeetingsSchema.safeParse({
                    page_size: 100
                });
                expect(result.success).toBe(true);
            });

            it("rejects page_size above max", () => {
                const result = listMeetingsSchema.safeParse({
                    page_size: 301
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative page_size", () => {
                const result = listMeetingsSchema.safeParse({
                    page_size: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects zero page_size", () => {
                const result = listMeetingsSchema.safeParse({
                    page_size: 0
                });
                expect(result.success).toBe(false);
            });

            it("applies default page_size", () => {
                const result = listMeetingsSchema.parse({});
                expect(result.page_size).toBe(30);
            });

            it("validates with next_page_token", () => {
                const result = listMeetingsSchema.safeParse({
                    next_page_token: "token123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listRecordingsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listRecordingsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with date range", () => {
                const result = listRecordingsSchema.safeParse({
                    from: "2024-06-01",
                    to: "2024-06-30"
                });
                expect(result.success).toBe(true);
            });

            it("validates with page_size", () => {
                const result = listRecordingsSchema.safeParse({
                    page_size: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects page_size above max", () => {
                const result = listRecordingsSchema.safeParse({
                    page_size: 301
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative page_size", () => {
                const result = listRecordingsSchema.safeParse({
                    page_size: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies default page_size", () => {
                const result = listRecordingsSchema.parse({});
                expect(result.page_size).toBe(30);
            });

            it("validates with next_page_token", () => {
                const result = listRecordingsSchema.safeParse({
                    next_page_token: "token123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("updateMeetingSchema", () => {
            it("validates minimal input", () => {
                const result = updateMeetingSchema.safeParse({
                    meetingId: "85746529345"
                });
                expect(result.success).toBe(true);
            });

            it("validates with string meeting ID", () => {
                const result = updateMeetingSchema.safeParse({
                    meetingId: "85746529345",
                    topic: "Updated Topic"
                });
                expect(result.success).toBe(true);
            });

            it("validates with numeric meeting ID", () => {
                const result = updateMeetingSchema.safeParse({
                    meetingId: 85746529345,
                    topic: "Updated Topic"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateMeetingSchema.safeParse({
                    meetingId: "85746529345",
                    topic: "Updated Meeting",
                    type: 2,
                    start_time: "2024-06-21T10:00:00Z",
                    duration: 45,
                    timezone: "America/Los_Angeles",
                    agenda: "Updated agenda",
                    password: "newpass",
                    settings: {
                        host_video: true,
                        participant_video: false,
                        join_before_host: true,
                        mute_upon_entry: false,
                        auto_recording: "local",
                        waiting_room: true
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing meetingId", () => {
                const result = updateMeetingSchema.safeParse({
                    topic: "Updated Topic"
                });
                expect(result.success).toBe(false);
            });

            it("validates auto_recording enum", () => {
                const validResult = updateMeetingSchema.safeParse({
                    meetingId: "85746529345",
                    settings: {
                        auto_recording: "none"
                    }
                });
                expect(validResult.success).toBe(true);

                const invalidResult = updateMeetingSchema.safeParse({
                    meetingId: "85746529345",
                    settings: {
                        auto_recording: "invalid"
                    }
                });
                expect(invalidResult.success).toBe(false);
            });
        });
    });
});
