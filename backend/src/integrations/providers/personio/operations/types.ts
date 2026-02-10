/**
 * Personio API Types
 *
 * Based on Personio API documentation: https://developer.personio.de/
 */

// Common wrapper types
export interface PersonioResponse<T> {
    success: boolean;
    data: T;
    metadata?: {
        current_page?: number;
        total_pages?: number;
    };
}

// Employee types
export interface PersonioEmployeeAttribute {
    label: string;
    value: unknown;
    type: string;
    universal_id?: string;
}

export interface PersonioEmployee {
    type: "Employee";
    attributes: {
        id: PersonioEmployeeAttribute;
        first_name: PersonioEmployeeAttribute;
        last_name: PersonioEmployeeAttribute;
        email: PersonioEmployeeAttribute;
        gender?: PersonioEmployeeAttribute;
        status?: PersonioEmployeeAttribute;
        position?: PersonioEmployeeAttribute;
        department?: PersonioEmployeeAttribute;
        office?: PersonioEmployeeAttribute;
        hire_date?: PersonioEmployeeAttribute;
        termination_date?: PersonioEmployeeAttribute;
        employment_type?: PersonioEmployeeAttribute;
        weekly_working_hours?: PersonioEmployeeAttribute;
        supervisor?: PersonioEmployeeAttribute;
        team?: PersonioEmployeeAttribute;
        subcompany?: PersonioEmployeeAttribute;
        cost_center?: PersonioEmployeeAttribute;
        [key: string]: PersonioEmployeeAttribute | undefined;
    };
}

export interface PersonioEmployeesResponse {
    success: boolean;
    data: PersonioEmployee[];
    metadata?: {
        current_page: number;
        total_pages: number;
    };
}

// Absence types
export interface PersonioAbsence {
    type: "TimeOffPeriod";
    attributes: {
        id: number;
        status: "approved" | "pending" | "rejected" | "cancelled";
        start_date: string;
        end_date: string;
        days_count: number;
        half_day_start: boolean;
        half_day_end: boolean;
        comment?: string;
        time_off_type: {
            type: "TimeOffType";
            attributes: {
                id: number;
                name: string;
                category: string;
            };
        };
        employee: {
            type: "Employee";
            attributes: {
                id: { label: string; value: number };
                first_name: { label: string; value: string };
                last_name: { label: string; value: string };
                email: { label: string; value: string };
            };
        };
        created_by?: string;
        created_at: string;
        updated_at?: string;
    };
}

export interface PersonioAbsencesResponse {
    success: boolean;
    data: PersonioAbsence[];
    metadata?: {
        current_page: number;
        total_pages: number;
    };
}

export interface PersonioAbsenceBalance {
    id: number;
    name: string;
    category: string;
    balance: number;
    used: number;
    available: number;
}

export interface PersonioAbsenceBalanceResponse {
    success: boolean;
    data: PersonioAbsenceBalance[];
}

// Attendance types
export interface PersonioAttendance {
    type: "AttendancePeriod";
    attributes: {
        id: number;
        employee_id: number;
        date: string;
        start_time: string;
        end_time: string;
        break: number;
        comment?: string;
        is_holiday: boolean;
        is_on_time_off: boolean;
        status?: "pending" | "approved" | "rejected";
        created_at: string;
        updated_at?: string;
    };
}

export interface PersonioAttendancesResponse {
    success: boolean;
    data: PersonioAttendance[];
    metadata?: {
        current_page: number;
        total_pages: number;
    };
}

// Create types
export interface PersonioCreateEmployeeData {
    first_name: string;
    last_name: string;
    email: string;
    gender?: string;
    position?: string;
    department?: string;
    office?: string;
    hire_date?: string;
    employment_type?: string;
    weekly_working_hours?: number;
    supervisor_id?: number;
    [key: string]: unknown;
}

export interface PersonioCreateAbsenceData {
    employee_id: number;
    time_off_type_id: number;
    start_date: string;
    end_date: string;
    half_day_start?: boolean;
    half_day_end?: boolean;
    comment?: string;
    skip_approval?: boolean;
}

export interface PersonioCreateAttendanceData {
    employee_id: number;
    date: string;
    start_time: string;
    end_time: string;
    break?: number;
    comment?: string;
}

export interface PersonioCreateResponse {
    success: boolean;
    data: {
        id: number;
        message?: string;
    };
}
