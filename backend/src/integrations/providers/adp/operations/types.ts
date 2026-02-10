/**
 * ADP API Response Types
 */

/**
 * ADP Email
 */
export interface ADPEmail {
    emailUri: string;
    nameCode?: { codeValue: string; shortName: string };
}

/**
 * ADP Phone
 */
export interface ADPPhone {
    dialNumber: string;
    nameCode?: { codeValue: string; shortName: string };
}

/**
 * ADP Organizational Unit
 */
export interface ADPOrgUnit {
    nameCode: { codeValue: string; shortName: string };
    typeCode: { codeValue: string; shortName: string };
}

/**
 * ADP Work Location
 */
export interface ADPWorkLocation {
    nameCode: { codeValue: string; shortName: string };
    address?: {
        lineOne?: string;
        cityName?: string;
        countrySubdivisionLevel1?: { codeValue: string };
        postalCode?: string;
        countryCode?: string;
    };
}

/**
 * ADP Work Assignment
 */
export interface ADPWorkAssignment {
    positionTitle: string;
    assignmentStatus: { statusCode: { codeValue: string } };
    homeOrganizationalUnits: ADPOrgUnit[];
    homeWorkLocation: ADPWorkLocation;
    reportsTo: Array<{
        associateOID: string;
        workerName: { formattedName: string };
    }>;
}

/**
 * ADP Worker resource
 */
export interface ADPWorker {
    associateOID: string;
    workerID: { idValue: string };
    person: {
        legalName: {
            givenName: string;
            familyName1: string;
            formattedName: string;
        };
        communication: {
            emails: ADPEmail[];
            phones: ADPPhone[];
        };
    };
    workerStatus: { statusCode: { codeValue: string } };
    workerDates: {
        originalHireDate: string;
        terminationDate: string | null;
    };
    businessCommunication: {
        emails: ADPEmail[];
    };
    workAssignments: ADPWorkAssignment[];
}

/**
 * ADP Department resource
 */
export interface ADPDepartment {
    departmentCode: {
        codeValue: string;
        shortName: string;
        longName: string;
    };
    parentDepartmentCode: { codeValue: string } | null;
}

/**
 * ADP Time Off Request resource
 */
export interface ADPTimeOffRequest {
    timeOffRequestID: string;
    workerAssociateOID: string;
    timeOffPolicyCode: {
        codeValue: string;
        shortName: string;
    };
    requestedTimeOff: {
        startDate: string;
        endDate: string;
        quantity: number;
        unitCode: string;
    };
    requestStatus: { codeValue: string };
    requestSubmissionDateTime: string;
    comments: string | null;
}

/**
 * ADP Time Off Balance resource
 */
export interface ADPTimeOffBalance {
    timeOffPolicyCode: {
        codeValue: string;
        shortName: string;
    };
    balanceAsOfDate: string;
    balanceQuantity: number;
    usedQuantity: number;
    plannedQuantity: number;
    unitCode: string;
}

/**
 * ADP Pay Statement resource
 */
export interface ADPPayStatement {
    payStatementID: string;
    payDate: string;
    payPeriod: {
        startDate: string;
        endDate: string;
    };
    grossPayAmount: {
        amountValue: number;
        currencyCode: string;
    };
    netPayAmount: {
        amountValue: number;
        currencyCode: string;
    };
}

/**
 * ADP API Response wrapper for collections
 */
export interface ADPCollectionResponse<T> {
    workers?: T[];
    organizationDepartments?: T[];
    timeOffRequests?: T[];
    timeOffBalances?: T[];
    payStatements?: T[];
}

/**
 * ADP API Response wrapper for single resource
 */
export interface ADPResourceResponse<T> {
    workers?: T[];
    organizationDepartments?: T[];
}
