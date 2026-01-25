/**
 * Cal.com API Response Types
 */

/**
 * Cal.com User resource
 */
export interface CalComUser {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    bio: string | null;
    avatarUrl: string | null;
    timeZone: string;
    weekStart: string;
    createdDate: string;
    timeFormat: number | null;
    defaultScheduleId: number | null;
}

/**
 * Cal.com Event Type resource
 */
export interface CalComEventType {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    length: number;
    locations: CalComLocation[];
    metadata: Record<string, unknown>;
    requiresConfirmation: boolean;
    recurringEvent: CalComRecurringEvent | null;
    disableGuests: boolean;
    hideCalendarNotes: boolean;
    minimumBookingNotice: number;
    beforeEventBuffer: number;
    afterEventBuffer: number;
    schedulingType: string | null;
    price: number;
    currency: string;
    slotInterval: number | null;
    successRedirectUrl: string | null;
    seatsPerTimeSlot: number | null;
    seatsShowAttendees: boolean;
    seatsShowAvailabilityCount: boolean;
    bookingFields: unknown[];
    bookingLimits: Record<string, unknown>;
    durationLimits: Record<string, unknown>;
    hosts: CalComHost[];
}

/**
 * Cal.com Location object
 */
export interface CalComLocation {
    type: string;
    address?: string;
    link?: string;
    hostPhoneNumber?: string;
    displayLocationPublicly?: boolean;
}

/**
 * Cal.com Recurring Event configuration
 */
export interface CalComRecurringEvent {
    interval: number;
    count: number;
    freq: number;
}

/**
 * Cal.com Host object
 */
export interface CalComHost {
    userId: number;
    isFixed: boolean;
}

/**
 * Cal.com Booking resource
 */
export interface CalComBooking {
    id: number;
    uid: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    status: CalComBookingStatus;
    location: string | null;
    meetingUrl: string | null;
    cancellationReason: string | null;
    rejectionReason: string | null;
    rescheduledFromUid: string | null;
    eventTypeId: number;
    attendees: CalComAttendee[];
    guests: string[];
    createdAt: string;
    updatedAt: string | null;
    metadata: Record<string, unknown>;
    responses: Record<string, unknown>;
}

/**
 * Cal.com Booking Status
 */
export type CalComBookingStatus =
    | "accepted"
    | "pending"
    | "cancelled"
    | "rejected"
    | "awaiting_host";

/**
 * Cal.com Attendee resource
 */
export interface CalComAttendee {
    id: number;
    email: string;
    name: string;
    timeZone: string;
    locale: string | null;
    bookingId: number;
}

/**
 * Cal.com Schedule resource
 */
export interface CalComSchedule {
    id: number;
    name: string;
    isDefault: boolean;
    availability: CalComAvailability[];
    timeZone: string;
}

/**
 * Cal.com Availability slot
 */
export interface CalComAvailability {
    id: number;
    days: number[];
    startTime: string;
    endTime: string;
    date: string | null;
    scheduleId: number;
}

/**
 * Cal.com Available Slot
 */
export interface CalComSlot {
    time: string;
}

/**
 * Cal.com API Pagination
 */
export interface CalComPagination {
    totalCount: number;
    pageCount: number;
    currentPage: number;
    perPage: number;
}

/**
 * Cal.com API Response wrapper for single resource
 */
export interface CalComResourceResponse<T> {
    status: "success" | "error";
    data: T;
}

/**
 * Cal.com API Response wrapper for collections
 */
export interface CalComCollectionResponse<T> {
    status: "success" | "error";
    data: T[];
}

/**
 * Cal.com API Paginated Response
 */
export interface CalComPaginatedResponse<T> {
    status: "success" | "error";
    data: T[];
    pagination: CalComPagination;
}

/**
 * Cal.com Slots Response
 */
export interface CalComSlotsResponse {
    status: "success" | "error";
    data: {
        slots: Record<string, CalComSlot[]>;
    };
}

/**
 * Cal.com Create Booking Request
 */
export interface CalComCreateBookingRequest {
    eventTypeId: number;
    start: string;
    end?: string;
    responses: {
        name: string;
        email: string;
        location?: {
            value: string;
            optionValue?: string;
        };
        notes?: string;
        guests?: string[];
    };
    metadata?: Record<string, unknown>;
    timeZone: string;
    language: string;
}
