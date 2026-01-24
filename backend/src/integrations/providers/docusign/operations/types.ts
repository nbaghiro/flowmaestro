/**
 * DocuSign API response types
 */

export interface DocuSignRecipient {
    recipientId: string;
    recipientIdGuid: string;
    email: string;
    name: string;
    status: string;
    signedDateTime?: string;
    deliveredDateTime?: string;
    declinedDateTime?: string;
    declinedReason?: string;
    routingOrder: string;
    clientUserId?: string;
}

export interface DocuSignSigner extends DocuSignRecipient {
    tabs?: {
        signHereTabs?: Array<{
            tabId: string;
            tabLabel: string;
            documentId: string;
            pageNumber: string;
            xPosition: string;
            yPosition: string;
        }>;
    };
}

export interface DocuSignEnvelope {
    envelopeId: string;
    status: string;
    emailSubject?: string;
    emailBlurb?: string;
    createdDateTime: string;
    sentDateTime?: string;
    completedDateTime?: string;
    voidedDateTime?: string;
    voidedReason?: string;
    statusChangedDateTime?: string;
    documentsUri?: string;
    recipientsUri?: string;
    envelopeUri?: string;
    signerViewUrl?: string;
    purgeState?: string;
}

export interface DocuSignEnvelopeWithDetails extends DocuSignEnvelope {
    recipients?: {
        signers?: DocuSignSigner[];
        carbonCopies?: DocuSignRecipient[];
        agents?: DocuSignRecipient[];
        editors?: DocuSignRecipient[];
        intermediaries?: DocuSignRecipient[];
        certifiedDeliveries?: DocuSignRecipient[];
        inPersonSigners?: DocuSignRecipient[];
        recipientCount?: string;
    };
    documents?: Array<{
        documentId: string;
        name: string;
        uri: string;
        order: string;
        pages?: string;
        type?: string;
    }>;
}

export interface DocuSignTemplate {
    templateId: string;
    name: string;
    description?: string;
    shared: string;
    created: string;
    lastModified: string;
    uri?: string;
    folderName?: string;
    folderId?: string;
    owner?: {
        userName: string;
        email: string;
        userId: string;
    };
    recipients?: {
        signers?: Array<{
            roleName: string;
            recipientId: string;
            routingOrder: string;
        }>;
        carbonCopies?: Array<{
            roleName: string;
            recipientId: string;
            routingOrder: string;
        }>;
    };
}

export interface DocuSignListEnvelopesResponse {
    envelopes?: DocuSignEnvelope[];
    resultSetSize: string;
    totalSetSize: string;
    startPosition: string;
    endPosition?: string;
    nextUri?: string;
    previousUri?: string;
}

export interface DocuSignListTemplatesResponse {
    envelopeTemplates?: DocuSignTemplate[];
    resultSetSize: string;
    totalSetSize: string;
    startPosition: string;
    endPosition?: string;
    nextUri?: string;
}

export interface DocuSignCreateEnvelopeResponse {
    envelopeId: string;
    status: string;
    statusDateTime: string;
    uri: string;
}

export interface DocuSignRecipientsResponse {
    signers?: DocuSignSigner[];
    carbonCopies?: DocuSignRecipient[];
    agents?: DocuSignRecipient[];
    editors?: DocuSignRecipient[];
    intermediaries?: DocuSignRecipient[];
    certifiedDeliveries?: DocuSignRecipient[];
    inPersonSigners?: DocuSignRecipient[];
    recipientCount?: string;
}

export interface DocuSignUserInfo {
    sub: string;
    name: string;
    email: string;
    accounts: Array<{
        account_id: string;
        account_name: string;
        is_default: boolean;
        base_uri: string;
    }>;
}
