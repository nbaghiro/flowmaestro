/**
 * Trello API response types and interfaces
 */

export interface TrelloBoard {
    id: string;
    name: string;
    desc: string;
    descData: unknown;
    closed: boolean;
    idOrganization: string | null;
    idEnterprise: string | null;
    pinned: boolean;
    url: string;
    shortUrl: string;
    prefs: TrelloBoardPrefs;
    labelNames: Record<string, string>;
    starred: boolean;
    memberships?: TrelloMembership[];
    shortLink: string;
    subscribed: boolean;
    dateLastActivity: string | null;
    dateLastView: string | null;
}

export interface TrelloBoardPrefs {
    permissionLevel: string;
    hideVotes: boolean;
    voting: string;
    comments: string;
    invitations: string;
    selfJoin: boolean;
    cardCovers: boolean;
    isTemplate: boolean;
    cardAging: string;
    calendarFeedEnabled: boolean;
    background: string;
    backgroundImage: string | null;
    backgroundImageScaled: unknown[] | null;
    backgroundTile: boolean;
    backgroundBrightness: string;
    backgroundBottomColor: string;
    backgroundTopColor: string;
    canBePublic: boolean;
    canBeEnterprise: boolean;
    canBeOrg: boolean;
    canBePrivate: boolean;
    canInvite: boolean;
}

export interface TrelloMembership {
    id: string;
    idMember: string;
    memberType: string;
    unconfirmed: boolean;
    deactivated: boolean;
}

export interface TrelloList {
    id: string;
    name: string;
    closed: boolean;
    pos: number;
    softLimit: number | null;
    idBoard: string;
    subscribed: boolean;
    limits?: TrelloLimits;
}

export interface TrelloLimits {
    cards: {
        openPerList: {
            status: string;
            disableAt: number;
            warnAt: number;
        };
    };
}

export interface TrelloCard {
    id: string;
    checkItemStates: unknown[] | null;
    closed: boolean;
    dateLastActivity: string;
    desc: string;
    descData: unknown;
    dueReminder: number | null;
    idBoard: string;
    idList: string;
    idMembersVoted: string[];
    idShort: number;
    idAttachmentCover: string | null;
    idLabels: string[];
    manualCoverAttachment: boolean;
    name: string;
    pos: number;
    shortLink: string;
    shortUrl: string;
    start: string | null;
    subscribed: boolean;
    url: string;
    cover: TrelloCardCover;
    isTemplate: boolean;
    cardRole: string | null;
    badges: TrelloCardBadges;
    due: string | null;
    dueComplete: boolean;
    idMembers: string[];
    labels: TrelloLabel[];
    idChecklists: string[];
}

export interface TrelloCardCover {
    idAttachment: string | null;
    color: string | null;
    idUploadedBackground: string | null;
    size: string;
    brightness: string;
    idPlugin: string | null;
}

export interface TrelloCardBadges {
    attachmentsByType: {
        trello: {
            board: number;
            card: number;
        };
    };
    location: boolean;
    votes: number;
    viewingMemberVoted: boolean;
    subscribed: boolean;
    fogbugz: string;
    checkItems: number;
    checkItemsChecked: number;
    checkItemsEarliestDue: string | null;
    comments: number;
    attachments: number;
    description: boolean;
    due: string | null;
    dueComplete: boolean;
    start: string | null;
}

export interface TrelloLabel {
    id: string;
    idBoard: string;
    name: string;
    color: string;
    uses: number;
}

export interface TrelloMember {
    id: string;
    activityBlocked: boolean;
    avatarHash: string;
    avatarUrl: string;
    bio: string;
    bioData: unknown;
    confirmed: boolean;
    fullName: string;
    idEnterprise: string | null;
    idEnterprisesDeactivated: string[];
    idMemberReferrer: string | null;
    idPremOrgsAdmin: string[];
    initials: string;
    memberType: string;
    nonPublic: Record<string, unknown>;
    nonPublicAvailable: boolean;
    products: number[];
    status: string;
    url: string;
    username: string;
    email?: string;
}

export interface TrelloComment {
    id: string;
    idMemberCreator: string;
    data: {
        text: string;
        card: {
            id: string;
            name: string;
            shortLink: string;
            idShort: number;
        };
        board: {
            id: string;
            name: string;
            shortLink: string;
        };
        list?: {
            id: string;
            name: string;
        };
    };
    appCreator: unknown;
    type: string;
    date: string;
    limits?: {
        reactions: {
            perAction: {
                status: string;
                disableAt: number;
                warnAt: number;
            };
            uniquePerAction: {
                status: string;
                disableAt: number;
                warnAt: number;
            };
        };
    };
    memberCreator?: TrelloMember;
}

export interface TrelloBoardMember {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    initials: string;
    memberType?: string;
}
