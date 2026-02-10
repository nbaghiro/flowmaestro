/**
 * Shared types for Zoho CRM operations
 *
 * Based on Zoho CRM API V8:
 * https://www.zoho.com/crm/developer/docs/api/v8/
 */

/**
 * Zoho data center configurations
 * Zoho requires using the correct data center URL based on where the account is hosted
 */
export type ZohoDataCenter = "us" | "eu" | "au" | "in" | "jp" | "cn" | "ca";

export interface ZohoDataCenterConfig {
    accountsUrl: string;
    apiUrl: string;
}

export const ZOHO_DATA_CENTERS: Record<ZohoDataCenter, ZohoDataCenterConfig> = {
    us: { accountsUrl: "https://accounts.zoho.com", apiUrl: "https://www.zohoapis.com" },
    eu: { accountsUrl: "https://accounts.zoho.eu", apiUrl: "https://www.zohoapis.eu" },
    au: { accountsUrl: "https://accounts.zoho.com.au", apiUrl: "https://www.zohoapis.com.au" },
    in: { accountsUrl: "https://accounts.zoho.in", apiUrl: "https://www.zohoapis.in" },
    jp: { accountsUrl: "https://accounts.zoho.jp", apiUrl: "https://www.zohoapis.jp" },
    cn: { accountsUrl: "https://accounts.zoho.com.cn", apiUrl: "https://www.zohoapis.com.cn" },
    ca: { accountsUrl: "https://accounts.zohocloud.ca", apiUrl: "https://www.zohoapis.ca" }
};

/**
 * Zoho CRM property value
 */
export type ZohoPropertyValue = string | number | boolean | null | undefined;

export interface ZohoProperty {
    [key: string]: ZohoPropertyValue;
}

/**
 * Zoho CRM record (generic CRM object)
 */
export interface ZohoRecord {
    id: string;
    Created_Time?: string;
    Modified_Time?: string;
    Created_By?: ZohoUser;
    Modified_By?: ZohoUser;
    Owner?: ZohoUser;
    $approval_state?: string;
    $approved?: boolean;
    $editable?: boolean;
    $review_process?: unknown;
    [key: string]: unknown;
}

/**
 * Zoho user reference
 */
export interface ZohoUser {
    id: string;
    name: string;
    email?: string;
}

/**
 * Zoho list response (paginated)
 */
export interface ZohoListResponse<T> {
    data: T[];
    info?: {
        per_page: number;
        count: number;
        page: number;
        more_records: boolean;
        page_token_expiry?: string;
        next_page_token?: string;
        previous_page_token?: string;
    };
}

/**
 * Zoho batch/single record response
 */
export interface ZohoRecordResponse<T> {
    data: Array<{
        code: string;
        details: T;
        message: string;
        status: string;
    }>;
}

/**
 * Zoho delete response
 */
export interface ZohoDeleteResponse {
    data: Array<{
        code: string;
        details: {
            id: string;
        };
        message: string;
        status: string;
    }>;
}

/**
 * Zoho search criteria (for COQL)
 */
export interface ZohoSearchCriteria {
    field: string;
    comparator: "equals" | "not_equal" | "like" | "not_like" | "in" | "not_in" | "between";
    value: string | string[] | number | number[];
}

/**
 * Zoho COQL query request
 */
export interface ZohoCOQLRequest {
    select_query: string;
}

/**
 * Zoho COQL response
 */
export interface ZohoCOQLResponse<T> {
    data: T[];
    info?: {
        count: number;
        more_records: boolean;
    };
}

/**
 * Lead-specific types
 */
export interface ZohoLead extends ZohoRecord {
    First_Name?: string;
    Last_Name: string;
    Email?: string;
    Phone?: string;
    Mobile?: string;
    Company?: string;
    Website?: string;
    Lead_Source?: string;
    Lead_Status?: string;
    Industry?: string;
    Annual_Revenue?: number;
    No_of_Employees?: number;
    Description?: string;
    Street?: string;
    City?: string;
    State?: string;
    Zip_Code?: string;
    Country?: string;
}

/**
 * Contact-specific types
 */
export interface ZohoContact extends ZohoRecord {
    First_Name?: string;
    Last_Name: string;
    Email?: string;
    Phone?: string;
    Mobile?: string;
    Account_Name?: { id: string; name: string };
    Title?: string;
    Department?: string;
    Description?: string;
    Mailing_Street?: string;
    Mailing_City?: string;
    Mailing_State?: string;
    Mailing_Zip?: string;
    Mailing_Country?: string;
}

/**
 * Account-specific types
 */
export interface ZohoAccount extends ZohoRecord {
    Account_Name: string;
    Website?: string;
    Phone?: string;
    Account_Type?: string;
    Industry?: string;
    Annual_Revenue?: number;
    Employees?: number;
    Description?: string;
    Billing_Street?: string;
    Billing_City?: string;
    Billing_State?: string;
    Billing_Code?: string;
    Billing_Country?: string;
}

/**
 * Deal-specific types
 */
export interface ZohoDeal extends ZohoRecord {
    Deal_Name: string;
    Account_Name?: { id: string; name: string };
    Contact_Name?: { id: string; name: string };
    Amount?: number;
    Stage?: string;
    Probability?: number;
    Closing_Date?: string;
    Type?: string;
    Lead_Source?: string;
    Description?: string;
}

/**
 * Task-specific types
 */
export interface ZohoTask extends ZohoRecord {
    Subject: string;
    Due_Date?: string;
    Status?: string;
    Priority?: string;
    What_Id?: { id: string; name: string };
    Who_Id?: { id: string; name: string };
    Description?: string;
}

/**
 * Note-specific types
 */
export interface ZohoNote extends ZohoRecord {
    Note_Title?: string;
    Note_Content: string;
    Parent_Id?: { id: string; name: string };
    $se_module?: string;
}

/**
 * Call-specific types
 */
export interface ZohoCall extends ZohoRecord {
    Subject: string;
    Call_Type?: string;
    Call_Start_Time?: string;
    Call_Duration?: string;
    Call_Purpose?: string;
    Call_Result?: string;
    Description?: string;
    What_Id?: { id: string; name: string };
    Who_Id?: { id: string; name: string };
}

/**
 * Lead convert request
 */
export interface ZohoLeadConvertRequest {
    data: Array<{
        overwrite?: boolean;
        notify_lead_owner?: boolean;
        notify_new_entity_owner?: boolean;
        Accounts?: string;
        Contacts?: string;
        Deals?: {
            Deal_Name: string;
            Amount?: number;
            Closing_Date?: string;
            Stage?: string;
            [key: string]: unknown;
        };
        carry_over_tags?: {
            Contacts?: string[];
            Accounts?: string[];
            Deals?: string[];
        };
    }>;
}

/**
 * Lead convert response
 */
export interface ZohoLeadConvertResponse {
    data: Array<{
        Contacts: string;
        Deals?: string;
        Accounts: string;
    }>;
}

/**
 * Module metadata
 */
export interface ZohoModule {
    api_name: string;
    module_name: string;
    plural_label: string;
    singular_label: string;
    editable: boolean;
    deletable: boolean;
    creatable: boolean;
    viewable: boolean;
    convertable?: boolean;
}

/**
 * Modules list response
 */
export interface ZohoModulesResponse {
    modules: ZohoModule[];
}
