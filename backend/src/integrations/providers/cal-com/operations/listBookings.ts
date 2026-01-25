import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Bookings operation schema
 */
export const listBookingsSchema = z.object({
    take: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    status: z
        .enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"])
        .optional()
        .describe("Filter by booking status"),
    eventTypeId: z.number().optional().describe("Filter by event type ID"),
    afterStart: z.string().optional().describe("Filter bookings starting after this ISO datetime"),
    beforeEnd: z.string().optional().describe("Filter bookings ending before this ISO datetime"),
    sortStart: z.enum(["asc", "desc"]).optional().describe("Sort by start time"),
    sortEnd: z.enum(["asc", "desc"]).optional().describe("Sort by end time"),
    sortCreated: z.enum(["asc", "desc"]).optional().describe("Sort by creation time")
});

export type ListBookingsParams = z.infer<typeof listBookingsSchema>;

/**
 * List Bookings operation definition
 */
export const listBookingsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listBookings",
            name: "List Bookings",
            description:
                "List bookings with optional filters for status, date range, and event type",
            category: "data",
            actionType: "read",
            inputSchema: listBookingsSchema,
            inputSchemaJSON: toJSONSchema(listBookingsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "CalCom", err: error }, "Failed to create listBookingsOperation");
        throw new Error(
            `Failed to create listBookings operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list bookings operation
 */
export async function executeListBookings(
    client: CalComClient,
    params: ListBookingsParams
): Promise<OperationResult> {
    try {
        const response = await client.listBookings({
            take: params.take,
            skip: params.skip,
            status: params.status,
            eventTypeId: params.eventTypeId,
            afterStart: params.afterStart,
            beforeEnd: params.beforeEnd,
            sortStart: params.sortStart,
            sortEnd: params.sortEnd,
            sortCreated: params.sortCreated
        });

        return {
            success: true,
            data: {
                bookings: response.data.map((booking) => ({
                    id: booking.id,
                    uid: booking.uid,
                    title: booking.title,
                    description: booking.description,
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    status: booking.status,
                    location: booking.location,
                    meetingUrl: booking.meetingUrl,
                    cancellationReason: booking.cancellationReason,
                    rejectionReason: booking.rejectionReason,
                    rescheduledFromUid: booking.rescheduledFromUid,
                    eventTypeId: booking.eventTypeId,
                    attendees: booking.attendees.map((a) => ({
                        id: a.id,
                        email: a.email,
                        name: a.name,
                        timeZone: a.timeZone
                    })),
                    guests: booking.guests,
                    createdAt: booking.createdAt,
                    updatedAt: booking.updatedAt,
                    responses: booking.responses
                })),
                pagination: response.pagination
                    ? {
                          totalCount: response.pagination.totalCount,
                          pageCount: response.pagination.pageCount,
                          currentPage: response.pagination.currentPage,
                          perPage: response.pagination.perPage
                      }
                    : null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list bookings",
                retryable: true
            }
        };
    }
}
