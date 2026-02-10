/**
 * Bill.com API types and interfaces
 *
 * Based on official Bill.com API documentation:
 * https://developer.bill.com/docs/home
 */

// ============================================
// Vendor Types
// ============================================

export interface BillComVendor {
    id: string;
    entity: "Vendor";
    name: string;
    shortName?: string;
    nameOnCheck?: string;
    companyName?: string;
    accNumber?: string;
    taxId?: string;
    isActive: string;
    is1099: string;
    address1?: string;
    address2?: string;
    address3?: string;
    address4?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    addressCountry?: string;
    email?: string;
    phone?: string;
    fax?: string;
    payBy?: "Check" | "ACH";
    description?: string;
    createdTime: string;
    updatedTime: string;
}

export interface BillComVendorInput {
    name: string;
    shortName?: string;
    nameOnCheck?: string;
    companyName?: string;
    accNumber?: string;
    taxId?: string;
    isActive?: string;
    is1099?: string;
    address1?: string;
    address2?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    addressCountry?: string;
    email?: string;
    phone?: string;
    payBy?: "Check" | "ACH";
    description?: string;
}

// ============================================
// Bill Types
// ============================================

export interface BillComBill {
    id: string;
    entity: "Bill";
    vendorId: string;
    invoiceNumber?: string;
    invoiceDate: string;
    dueDate: string;
    glPostingDate?: string;
    amount: string;
    amountDue: string;
    paymentStatus: "0" | "1" | "2" | "3" | "4"; // 0=Scheduled, 1=Paid, 2=PartialPayment, 3=Canceled, 4=Unpaid
    approvalStatus: "0" | "1" | "2" | "3" | "4"; // 0=Unassigned, 1=Assigned, 2=Approving, 3=Approved, 4=Denied
    description?: string;
    poNumber?: string;
    isActive: string;
    createdTime: string;
    updatedTime: string;
    billLineItems?: BillComBillLineItem[];
}

export interface BillComBillLineItem {
    entity: "BillLineItem";
    id?: string;
    billId: string;
    amount: string;
    chartOfAccountId?: string;
    departmentId?: string;
    locationId?: string;
    description?: string;
    lineType: "1" | "2"; // 1=Expense, 2=Item
}

export interface BillComBillInput {
    vendorId: string;
    invoiceNumber?: string;
    invoiceDate: string;
    dueDate: string;
    amount?: string;
    description?: string;
    poNumber?: string;
    billLineItems?: Array<{
        amount: string;
        chartOfAccountId?: string;
        departmentId?: string;
        description?: string;
    }>;
}

// ============================================
// Payment Types
// ============================================

export interface BillComPayment {
    id: string;
    entity: "SentPay";
    vendorId: string;
    processDate: string;
    amount: string;
    status: "0" | "1" | "2" | "3" | "4" | "5";
    // 0=Scheduled, 1=InTransit, 2=Paid, 3=Canceled, 4=Voided, 5=Returned
    description?: string;
    billPays?: BillComBillPay[];
    createdTime: string;
    updatedTime: string;
}

export interface BillComBillPay {
    entity: "BillPay";
    billId: string;
    amount: string;
}

export interface BillComPaymentInput {
    vendorId: string;
    processDate: string;
    billPays: Array<{
        billId: string;
        amount: string;
    }>;
}

// ============================================
// API Response Types
// ============================================

export interface BillComApiResponse<T> {
    response_status: number;
    response_message: string;
    response_data?: T;
}

export interface BillComListResponse<T> {
    response_status: number;
    response_message: string;
    response_data?: T[];
}

export interface BillComSession {
    sessionId: string;
    organizationId: string;
    userId: string;
    expiresAt?: string;
}
