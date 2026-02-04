/**
 * Gusto API Response Types
 */

/**
 * Gusto Address
 */
export interface GustoAddress {
    street_1: string;
    street_2: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
}

/**
 * Gusto Job
 */
export interface GustoJob {
    uuid: string;
    title: string;
    rate: string;
    payment_unit: string;
    hire_date: string;
    location_uuid: string | null;
}

/**
 * Gusto Paid Time Off
 */
export interface GustoPaidTimeOff {
    name: string;
    accrual_unit: string;
    accrual_rate: string;
    accrual_balance: string;
    maximum_accrual_balance: string | null;
    paid_at_termination: boolean;
}

/**
 * Gusto Termination
 */
export interface GustoTermination {
    uuid: string;
    effective_date: string;
    run_termination_payroll: boolean;
}

/**
 * Gusto Employee resource
 */
export interface GustoEmployee {
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
    company_uuid: string;
    manager_uuid: string | null;
    department: string | null;
    date_of_birth: string;
    jobs: GustoJob[];
    home_address: GustoAddress | null;
    eligible_paid_time_off: GustoPaidTimeOff[];
    terminations: GustoTermination[];
    onboarded: boolean;
    terminated: boolean;
}

/**
 * Gusto Location resource
 */
export interface GustoLocation {
    uuid: string;
    company_uuid: string;
    street_1: string;
    street_2: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
    active: boolean;
}

/**
 * Gusto Company resource
 */
export interface GustoCompany {
    uuid: string;
    name: string;
    trade_name: string | null;
    ein: string;
    entity_type: string;
    tier: string;
    is_suspended: boolean;
    locations: GustoLocation[];
    primary_signatory: {
        first_name: string;
        last_name: string;
        email: string;
    } | null;
    primary_payroll_admin: {
        first_name: string;
        last_name: string;
        email: string;
    } | null;
}

/**
 * Gusto Department resource
 */
export interface GustoDepartment {
    uuid: string;
    title: string;
    employees: Array<{ uuid: string; full_name: string }>;
    contractors: Array<{ uuid: string; full_name: string }>;
}

/**
 * Gusto Payroll resource
 */
export interface GustoPayroll {
    uuid: string;
    company_uuid: string;
    pay_period: {
        start_date: string;
        end_date: string;
    };
    check_date: string;
    processed: boolean;
    payroll_deadline: string;
    totals: {
        company_debit: string;
        net_pay: string;
        gross_pay: string;
    };
}

/**
 * Gusto Time Off Activity resource
 */
export interface GustoTimeOffActivity {
    uuid: string;
    employee_uuid: string;
    policy_uuid: string;
    policy_name: string;
    event_type: string;
    hours: string;
    effective_date: string;
}

/**
 * Gusto Benefit resource
 */
export interface GustoBenefit {
    uuid: string;
    name: string;
    description: string;
    benefit_type: number;
    responsible_for_employer_taxes: boolean;
    responsible_for_employee_w2: boolean;
}
