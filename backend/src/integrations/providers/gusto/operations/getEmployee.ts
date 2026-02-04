import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Employee operation schema
 */
export const getEmployeeSchema = z.object({
    employeeUuid: z.string().describe("The Gusto employee UUID")
});

export type GetEmployeeParams = z.infer<typeof getEmployeeSchema>;

/**
 * Get Employee operation definition
 */
export const getEmployeeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEmployee",
            name: "Get Employee",
            description: "Get detailed information about a specific employee in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: getEmployeeSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Gusto", err: error }, "Failed to create getEmployeeOperation");
        throw new Error(
            `Failed to create getEmployee operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get employee operation
 */
export async function executeGetEmployee(
    client: GustoClient,
    params: GetEmployeeParams
): Promise<OperationResult> {
    try {
        const employee = await client.getEmployee(params.employeeUuid);

        return {
            success: true,
            data: {
                uuid: employee.uuid,
                firstName: employee.first_name,
                lastName: employee.last_name,
                email: employee.email,
                companyUuid: employee.company_uuid,
                managerUuid: employee.manager_uuid,
                department: employee.department,
                dateOfBirth: employee.date_of_birth,
                onboarded: employee.onboarded,
                terminated: employee.terminated,
                jobs: employee.jobs?.map((job) => ({
                    uuid: job.uuid,
                    title: job.title,
                    rate: job.rate,
                    paymentUnit: job.payment_unit,
                    hireDate: job.hire_date,
                    locationUuid: job.location_uuid
                })),
                homeAddress: employee.home_address
                    ? {
                          street1: employee.home_address.street_1,
                          street2: employee.home_address.street_2,
                          city: employee.home_address.city,
                          state: employee.home_address.state,
                          zip: employee.home_address.zip,
                          country: employee.home_address.country
                      }
                    : null,
                paidTimeOff: employee.eligible_paid_time_off?.map((pto) => ({
                    name: pto.name,
                    accrualUnit: pto.accrual_unit,
                    accrualRate: pto.accrual_rate,
                    accrualBalance: pto.accrual_balance,
                    maximumAccrualBalance: pto.maximum_accrual_balance,
                    paidAtTermination: pto.paid_at_termination
                })),
                terminations: employee.terminations?.map((term) => ({
                    uuid: term.uuid,
                    effectiveDate: term.effective_date,
                    runTerminationPayroll: term.run_termination_payroll
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get employee",
                retryable: true
            }
        };
    }
}
