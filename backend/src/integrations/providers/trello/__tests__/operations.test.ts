/**
 * Trello Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    // Boards
    executeListBoards,
    listBoardsSchema,
    executeGetBoard,
    getBoardSchema,
    executeCreateBoard,
    createBoardSchema,
    executeUpdateBoard,
    updateBoardSchema,
    // Lists
    executeGetLists,
    getListsSchema,
    executeGetList,
    getListSchema,
    executeCreateList,
    createListSchema,
    executeUpdateList,
    updateListSchema,
    executeArchiveList,
    archiveListSchema,
    // Cards
    executeGetCards,
    getCardsSchema,
    executeGetCard,
    getCardSchema,
    executeCreateCard,
    createCardSchema,
    executeUpdateCard,
    updateCardSchema,
    executeDeleteCard,
    deleteCardSchema,
    executeMoveCard,
    moveCardSchema,
    // Comments
    executeAddComment,
    addCommentSchema,
    // Members
    executeGetMe,
    getMeSchema,
    executeGetBoardMembers,
    getBoardMembersSchema
} from "../operations";
import type { TrelloClient } from "../client/TrelloClient";
import type {
    TrelloBoard,
    TrelloList,
    TrelloCard,
    TrelloMember,
    TrelloBoardMember,
    TrelloComment,
    TrelloBoardPrefs,
    TrelloLabel,
    TrelloCardBadges,
    TrelloCardCover
} from "../operations/types";

// Mock TrelloClient factory
function createMockTrelloClient(): jest.Mocked<TrelloClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<TrelloClient>;
}

// Helper to create mock board
function createMockBoard(overrides: Partial<TrelloBoard> = {}): TrelloBoard {
    const defaultPrefs: TrelloBoardPrefs = {
        permissionLevel: "private",
        hideVotes: false,
        voting: "disabled",
        comments: "members",
        invitations: "members",
        selfJoin: true,
        cardCovers: true,
        isTemplate: false,
        cardAging: "regular",
        calendarFeedEnabled: false,
        background: "blue",
        backgroundImage: null,
        backgroundImageScaled: null,
        backgroundTile: false,
        backgroundBrightness: "dark",
        backgroundBottomColor: "#0079bf",
        backgroundTopColor: "#0079bf",
        canBePublic: true,
        canBeEnterprise: false,
        canBeOrg: true,
        canBePrivate: true,
        canInvite: true
    };

    return {
        id: "5f8d3c2b1a9e8d7c6b5a4321",
        name: "Test Board",
        desc: "Test description",
        descData: null,
        closed: false,
        idOrganization: null,
        idEnterprise: null,
        pinned: false,
        url: "https://trello.com/b/abc123/test-board",
        shortUrl: "https://trello.com/b/abc123",
        prefs: defaultPrefs,
        labelNames: {},
        starred: false,
        shortLink: "abc123",
        subscribed: false,
        dateLastActivity: "2024-06-15T14:30:00.000Z",
        dateLastView: "2024-06-15T16:00:00.000Z",
        ...overrides
    };
}

// Helper to create mock list
function createMockList(overrides: Partial<TrelloList> = {}): TrelloList {
    return {
        id: "5f8d3c2b1a9e8d7c6b5a1001",
        name: "To Do",
        closed: false,
        pos: 16384,
        softLimit: null,
        idBoard: "5f8d3c2b1a9e8d7c6b5a4321",
        subscribed: false,
        ...overrides
    };
}

// Helper to create mock card
function createMockCard(overrides: Partial<TrelloCard> = {}): TrelloCard {
    const defaultBadges: TrelloCardBadges = {
        attachmentsByType: { trello: { board: 0, card: 0 } },
        location: false,
        votes: 0,
        viewingMemberVoted: false,
        subscribed: false,
        fogbugz: "",
        checkItems: 0,
        checkItemsChecked: 0,
        checkItemsEarliestDue: null,
        comments: 0,
        attachments: 0,
        description: false,
        due: null,
        dueComplete: false,
        start: null
    };

    const defaultCover: TrelloCardCover = {
        idAttachment: null,
        color: null,
        idUploadedBackground: null,
        size: "normal",
        brightness: "light",
        idPlugin: null
    };

    return {
        id: "5f8d3c2b1a9e8d7c6b5a3001",
        checkItemStates: null,
        closed: false,
        dateLastActivity: "2024-06-15T14:30:00.000Z",
        desc: "Test card description",
        descData: null,
        dueReminder: null,
        idBoard: "5f8d3c2b1a9e8d7c6b5a4321",
        idList: "5f8d3c2b1a9e8d7c6b5a1001",
        idMembersVoted: [],
        idShort: 1,
        idAttachmentCover: null,
        idLabels: [],
        manualCoverAttachment: false,
        name: "Test Card",
        pos: 16384,
        shortLink: "xyz789",
        shortUrl: "https://trello.com/c/xyz789",
        start: null,
        subscribed: false,
        url: "https://trello.com/c/xyz789/1-test-card",
        cover: defaultCover,
        isTemplate: false,
        cardRole: null,
        badges: defaultBadges,
        due: null,
        dueComplete: false,
        idMembers: [],
        labels: [],
        idChecklists: [],
        ...overrides
    };
}

// Helper to create mock member
function createMockMember(overrides: Partial<TrelloMember> = {}): TrelloMember {
    return {
        id: "5f8d3c2b1a9e8d7c6b5a7001",
        activityBlocked: false,
        avatarHash: "abc123",
        avatarUrl: "https://trello-avatars.s3.amazonaws.com/abc123/170.png",
        bio: "Test bio",
        bioData: null,
        confirmed: true,
        fullName: "John Smith",
        idEnterprise: null,
        idEnterprisesDeactivated: [],
        idMemberReferrer: null,
        idPremOrgsAdmin: [],
        initials: "JS",
        memberType: "normal",
        nonPublic: {},
        nonPublicAvailable: false,
        products: [],
        status: "active",
        url: "https://trello.com/johnsmith",
        username: "johnsmith",
        ...overrides
    };
}

// Helper to create mock board member
function createMockBoardMember(overrides: Partial<TrelloBoardMember> = {}): TrelloBoardMember {
    return {
        id: "5f8d3c2b1a9e8d7c6b5a7001",
        fullName: "John Smith",
        username: "johnsmith",
        avatarUrl: "https://trello-avatars.s3.amazonaws.com/abc123/170.png",
        initials: "JS",
        ...overrides
    };
}

// Helper to create mock comment
function createMockComment(overrides: Partial<TrelloComment> = {}): TrelloComment {
    return {
        id: "5f8d3c2b1a9e8d7c6b5a9001",
        idMemberCreator: "5f8d3c2b1a9e8d7c6b5a7001",
        data: {
            text: "Test comment",
            card: {
                id: "5f8d3c2b1a9e8d7c6b5a3001",
                name: "Test Card",
                shortLink: "xyz789",
                idShort: 1
            },
            board: {
                id: "5f8d3c2b1a9e8d7c6b5a4321",
                name: "Test Board",
                shortLink: "abc123"
            }
        },
        appCreator: null,
        type: "commentCard",
        date: "2024-06-15T09:00:00.000Z",
        ...overrides
    };
}

describe("Trello Operation Executors", () => {
    let mockClient: jest.Mocked<TrelloClient>;

    beforeEach(() => {
        mockClient = createMockTrelloClient();
    });

    // ============================================================================
    // BOARDS
    // ============================================================================
    describe("executeListBoards", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([createMockBoard()]);

            await executeListBoards(mockClient, { filter: "all", limit: 50 });

            expect(mockClient.get).toHaveBeenCalledWith("/members/me/boards", {
                filter: "all",
                fields: "id,name,desc,closed,url,shortUrl,starred,dateLastActivity,prefs"
            });
        });

        it("returns normalized output on success", async () => {
            const mockBoard = createMockBoard({
                starred: true,
                prefs: {
                    permissionLevel: "private",
                    hideVotes: false,
                    voting: "disabled",
                    comments: "members",
                    invitations: "members",
                    selfJoin: true,
                    cardCovers: true,
                    isTemplate: false,
                    cardAging: "regular",
                    calendarFeedEnabled: false,
                    background: "green",
                    backgroundImage: null,
                    backgroundImageScaled: null,
                    backgroundTile: false,
                    backgroundBrightness: "dark",
                    backgroundBottomColor: "#0079bf",
                    backgroundTopColor: "#0079bf",
                    canBePublic: true,
                    canBeEnterprise: false,
                    canBeOrg: true,
                    canBePrivate: true,
                    canInvite: true
                }
            });
            mockClient.get.mockResolvedValueOnce([mockBoard]);

            const result = await executeListBoards(mockClient, { filter: "all", limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data?.boards).toHaveLength(1);
            expect(result.data?.boards[0]).toEqual({
                id: mockBoard.id,
                name: mockBoard.name,
                description: mockBoard.desc,
                closed: mockBoard.closed,
                url: mockBoard.url,
                shortUrl: mockBoard.shortUrl,
                starred: true,
                lastActivity: mockBoard.dateLastActivity,
                backgroundColor: "green"
            });
            expect(result.data?.count).toBe(1);
        });

        it("applies limit to results", async () => {
            const boards = [
                createMockBoard({ id: "1", name: "Board 1" }),
                createMockBoard({ id: "2", name: "Board 2" }),
                createMockBoard({ id: "3", name: "Board 3" })
            ];
            mockClient.get.mockResolvedValueOnce(boards);

            const result = await executeListBoards(mockClient, { filter: "all", limit: 2 });

            expect(result.success).toBe(true);
            expect(result.data?.boards).toHaveLength(2);
            expect(result.data?.count).toBe(2);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListBoards(mockClient, { filter: "all", limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListBoards(mockClient, { filter: "all", limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list boards");
        });
    });

    describe("executeGetBoard", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(createMockBoard());

            await executeGetBoard(mockClient, { boardId: "5f8d3c2b1a9e8d7c6b5a4321" });

            expect(mockClient.get).toHaveBeenCalledWith("/boards/5f8d3c2b1a9e8d7c6b5a4321", {
                fields: "all"
            });
        });

        it("returns normalized output on success", async () => {
            const mockBoard = createMockBoard({
                labelNames: { green: "Low", red: "High" },
                idOrganization: "org123"
            });
            mockClient.get.mockResolvedValueOnce(mockBoard);

            const result = await executeGetBoard(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockBoard.id,
                name: mockBoard.name,
                description: mockBoard.desc,
                closed: mockBoard.closed,
                url: mockBoard.url,
                shortUrl: mockBoard.shortUrl,
                starred: mockBoard.starred,
                lastActivity: mockBoard.dateLastActivity,
                lastViewed: mockBoard.dateLastView,
                backgroundColor: mockBoard.prefs.background,
                backgroundImage: mockBoard.prefs.backgroundImage,
                permissionLevel: mockBoard.prefs.permissionLevel,
                labelNames: { green: "Low", red: "High" },
                organizationId: "org123"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetBoard(mockClient, { boardId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateBoard", () => {
        it("calls client with correct params", async () => {
            mockClient.request.mockResolvedValueOnce(createMockBoard());

            await executeCreateBoard(mockClient, {
                name: "New Board",
                desc: "Board description",
                defaultLists: true,
                defaultLabels: true,
                prefs_permissionLevel: "private",
                prefs_background: "blue"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/boards",
                params: {
                    name: "New Board",
                    desc: "Board description",
                    defaultLists: true,
                    defaultLabels: true,
                    prefs_permissionLevel: "private",
                    prefs_background: "blue"
                }
            });
        });

        it("returns normalized output on success", async () => {
            const mockBoard = createMockBoard({ name: "New Board" });
            mockClient.request.mockResolvedValueOnce(mockBoard);

            const result = await executeCreateBoard(mockClient, {
                name: "New Board",
                defaultLists: true,
                defaultLabels: true,
                prefs_permissionLevel: "private"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockBoard.id,
                name: "New Board",
                description: mockBoard.desc,
                url: mockBoard.url,
                shortUrl: mockBoard.shortUrl,
                closed: mockBoard.closed
            });
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Invalid board name"));

            const result = await executeCreateBoard(mockClient, {
                name: "",
                defaultLists: true,
                defaultLabels: true,
                prefs_permissionLevel: "private"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid board name");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateBoard", () => {
        it("calls client with correct params for name update", async () => {
            mockClient.request.mockResolvedValueOnce(createMockBoard({ name: "Updated Name" }));

            await executeUpdateBoard(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                name: "Updated Name"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/boards/5f8d3c2b1a9e8d7c6b5a4321",
                params: { name: "Updated Name" }
            });
        });

        it("calls client with prefs using slash notation", async () => {
            mockClient.request.mockResolvedValueOnce(createMockBoard());

            await executeUpdateBoard(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                prefs_permissionLevel: "org",
                prefs_background: "green"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/boards/5f8d3c2b1a9e8d7c6b5a4321",
                params: {
                    "prefs/permissionLevel": "org",
                    "prefs/background": "green"
                }
            });
        });

        it("returns normalized output on success", async () => {
            const mockBoard = createMockBoard({ name: "Updated Board", closed: true });
            mockClient.request.mockResolvedValueOnce(mockBoard);

            const result = await executeUpdateBoard(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                closed: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.closed).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Board not found"));

            const result = await executeUpdateBoard(mockClient, {
                boardId: "nonexistent",
                name: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================================
    // LISTS
    // ============================================================================
    describe("executeGetLists", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([createMockList()]);

            await executeGetLists(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                filter: "open"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/boards/5f8d3c2b1a9e8d7c6b5a4321/lists", {
                filter: "open",
                fields: "id,name,closed,pos,idBoard"
            });
        });

        it("returns normalized output on success", async () => {
            const lists = [
                createMockList({ id: "1", name: "To Do", pos: 1000 }),
                createMockList({ id: "2", name: "In Progress", pos: 2000 }),
                createMockList({ id: "3", name: "Done", pos: 3000 })
            ];
            mockClient.get.mockResolvedValueOnce(lists);

            const result = await executeGetLists(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                filter: "open"
            });

            expect(result.success).toBe(true);
            expect(result.data?.lists).toHaveLength(3);
            expect(result.data?.lists[0]).toEqual({
                id: "1",
                name: "To Do",
                closed: false,
                position: 1000,
                boardId: "5f8d3c2b1a9e8d7c6b5a4321"
            });
            expect(result.data?.count).toBe(3);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Board not found"));

            const result = await executeGetLists(mockClient, {
                boardId: "nonexistent",
                filter: "open"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Board not found");
        });
    });

    describe("executeGetList", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(createMockList());

            await executeGetList(mockClient, { listId: "5f8d3c2b1a9e8d7c6b5a1001" });

            expect(mockClient.get).toHaveBeenCalledWith("/lists/5f8d3c2b1a9e8d7c6b5a1001", {
                fields: "all"
            });
        });

        it("returns normalized output on success", async () => {
            const mockList = createMockList({
                subscribed: true,
                softLimit: 10
            });
            mockClient.get.mockResolvedValueOnce(mockList);

            const result = await executeGetList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockList.id,
                name: mockList.name,
                closed: mockList.closed,
                position: mockList.pos,
                boardId: mockList.idBoard,
                subscribed: true,
                softLimit: 10
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeGetList(mockClient, { listId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateList", () => {
        it("calls client with correct params", async () => {
            mockClient.request.mockResolvedValueOnce(createMockList({ name: "Backlog" }));

            await executeCreateList(mockClient, {
                name: "Backlog",
                idBoard: "5f8d3c2b1a9e8d7c6b5a4321",
                pos: "bottom"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/lists",
                params: {
                    name: "Backlog",
                    idBoard: "5f8d3c2b1a9e8d7c6b5a4321",
                    pos: "bottom"
                }
            });
        });

        it("returns normalized output on success", async () => {
            const mockList = createMockList({ name: "New List" });
            mockClient.request.mockResolvedValueOnce(mockList);

            const result = await executeCreateList(mockClient, {
                name: "New List",
                idBoard: "5f8d3c2b1a9e8d7c6b5a4321",
                pos: "bottom"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockList.id,
                name: "New List",
                closed: mockList.closed,
                position: mockList.pos,
                boardId: mockList.idBoard
            });
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Board not found"));

            const result = await executeCreateList(mockClient, {
                name: "New List",
                idBoard: "nonexistent",
                pos: "bottom"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateList", () => {
        it("calls client with correct params for rename", async () => {
            mockClient.request.mockResolvedValueOnce(createMockList({ name: "Updated" }));

            await executeUpdateList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                name: "Updated"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/lists/5f8d3c2b1a9e8d7c6b5a1001",
                params: { name: "Updated" }
            });
        });

        it("calls client with correct params for position change", async () => {
            mockClient.request.mockResolvedValueOnce(createMockList({ pos: 8192 }));

            await executeUpdateList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                pos: "top"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/lists/5f8d3c2b1a9e8d7c6b5a1001",
                params: { pos: "top" }
            });
        });

        it("returns normalized output on success", async () => {
            const mockList = createMockList({ name: "Renamed", closed: false });
            mockClient.request.mockResolvedValueOnce(mockList);

            const result = await executeUpdateList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                name: "Renamed"
            });

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe("Renamed");
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeUpdateList(mockClient, {
                listId: "nonexistent",
                name: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeArchiveList", () => {
        it("calls client with correct params for archiving", async () => {
            mockClient.request.mockResolvedValueOnce(createMockList({ closed: true }));

            await executeArchiveList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                archive: true
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/lists/5f8d3c2b1a9e8d7c6b5a1001/closed",
                params: { value: true }
            });
        });

        it("calls client with correct params for unarchiving", async () => {
            mockClient.request.mockResolvedValueOnce(createMockList({ closed: false }));

            await executeArchiveList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                archive: false
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/lists/5f8d3c2b1a9e8d7c6b5a1001/closed",
                params: { value: false }
            });
        });

        it("returns normalized output on success", async () => {
            const mockList = createMockList({ closed: true });
            mockClient.request.mockResolvedValueOnce(mockList);

            const result = await executeArchiveList(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                archive: true
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockList.id,
                name: mockList.name,
                closed: true,
                archived: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeArchiveList(mockClient, {
                listId: "nonexistent",
                archive: true
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================================
    // CARDS
    // ============================================================================
    describe("executeGetCards", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([createMockCard()]);

            await executeGetCards(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                filter: "open",
                limit: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/lists/5f8d3c2b1a9e8d7c6b5a1001/cards", {
                filter: "open",
                fields: "id,name,desc,closed,due,dueComplete,idList,idBoard,pos,shortUrl,url,labels,idMembers,dateLastActivity"
            });
        });

        it("returns normalized output on success", async () => {
            const label: TrelloLabel = {
                id: "label1",
                idBoard: "board1",
                name: "High Priority",
                color: "red",
                uses: 5
            };
            const cards = [
                createMockCard({
                    id: "1",
                    name: "Card 1",
                    due: "2024-06-30T23:59:59.000Z",
                    labels: [label],
                    idMembers: ["member1", "member2"]
                }),
                createMockCard({ id: "2", name: "Card 2" })
            ];
            mockClient.get.mockResolvedValueOnce(cards);

            const result = await executeGetCards(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                filter: "open",
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data?.cards).toHaveLength(2);
            expect(result.data?.cards[0]).toEqual({
                id: "1",
                name: "Card 1",
                description: "Test card description",
                closed: false,
                due: "2024-06-30T23:59:59.000Z",
                dueComplete: false,
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                position: 16384,
                shortUrl: "https://trello.com/c/xyz789",
                url: "https://trello.com/c/xyz789/1-test-card",
                labels: [{ id: "label1", name: "High Priority", color: "red" }],
                memberIds: ["member1", "member2"],
                lastActivity: "2024-06-15T14:30:00.000Z"
            });
            expect(result.data?.count).toBe(2);
        });

        it("applies limit to results", async () => {
            const cards = [
                createMockCard({ id: "1" }),
                createMockCard({ id: "2" }),
                createMockCard({ id: "3" })
            ];
            mockClient.get.mockResolvedValueOnce(cards);

            const result = await executeGetCards(mockClient, {
                listId: "5f8d3c2b1a9e8d7c6b5a1001",
                filter: "open",
                limit: 2
            });

            expect(result.success).toBe(true);
            expect(result.data?.cards).toHaveLength(2);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeGetCards(mockClient, {
                listId: "nonexistent",
                filter: "open",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCard", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(createMockCard());

            await executeGetCard(mockClient, { cardId: "5f8d3c2b1a9e8d7c6b5a3001" });

            expect(mockClient.get).toHaveBeenCalledWith("/cards/5f8d3c2b1a9e8d7c6b5a3001", {
                fields: "all"
            });
        });

        it("returns normalized output on success", async () => {
            const label: TrelloLabel = {
                id: "label1",
                idBoard: "board1",
                name: "Engineering",
                color: "blue",
                uses: 10
            };
            const badges: TrelloCardBadges = {
                attachmentsByType: { trello: { board: 0, card: 0 } },
                location: false,
                votes: 5,
                viewingMemberVoted: false,
                subscribed: false,
                fogbugz: "",
                checkItems: 4,
                checkItemsChecked: 2,
                checkItemsEarliestDue: null,
                comments: 10,
                attachments: 3,
                description: true,
                due: null,
                dueComplete: false,
                start: null
            };
            const mockCard = createMockCard({
                labels: [label],
                idMembers: ["m1", "m2"],
                idChecklists: ["cl1"],
                start: "2024-06-01T00:00:00.000Z",
                badges
            });
            mockClient.get.mockResolvedValueOnce(mockCard);

            const result = await executeGetCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockCard.id,
                name: mockCard.name,
                description: mockCard.desc,
                closed: mockCard.closed,
                due: mockCard.due,
                dueComplete: mockCard.dueComplete,
                start: "2024-06-01T00:00:00.000Z",
                listId: mockCard.idList,
                boardId: mockCard.idBoard,
                position: mockCard.pos,
                shortUrl: mockCard.shortUrl,
                url: mockCard.url,
                labels: [{ id: "label1", name: "Engineering", color: "blue" }],
                memberIds: ["m1", "m2"],
                checklistIds: ["cl1"],
                lastActivity: mockCard.dateLastActivity,
                badges: {
                    votes: 5,
                    comments: 10,
                    attachments: 3,
                    checkItems: 4,
                    checkItemsChecked: 2,
                    hasDescription: true
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Card not found"));

            const result = await executeGetCard(mockClient, { cardId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateCard", () => {
        it("calls client with minimal params", async () => {
            mockClient.request.mockResolvedValueOnce(createMockCard({ name: "New Card" }));

            await executeCreateCard(mockClient, {
                idList: "5f8d3c2b1a9e8d7c6b5a1001",
                name: "New Card",
                pos: "bottom",
                dueComplete: false
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/cards",
                params: {
                    idList: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "New Card",
                    pos: "bottom",
                    dueComplete: false
                }
            });
        });

        it("calls client with all params", async () => {
            mockClient.request.mockResolvedValueOnce(createMockCard());

            await executeCreateCard(mockClient, {
                idList: "5f8d3c2b1a9e8d7c6b5a1001",
                name: "Full Card",
                desc: "Description",
                pos: "top",
                due: "2024-07-15T23:59:59.000Z",
                dueComplete: false,
                start: "2024-07-01T00:00:00.000Z",
                idMembers: ["m1", "m2"],
                idLabels: ["l1", "l2"]
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/cards",
                params: {
                    idList: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "Full Card",
                    desc: "Description",
                    pos: "top",
                    due: "2024-07-15T23:59:59.000Z",
                    dueComplete: false,
                    start: "2024-07-01T00:00:00.000Z",
                    idMembers: "m1,m2",
                    idLabels: "l1,l2"
                }
            });
        });

        it("returns normalized output on success", async () => {
            const mockCard = createMockCard({
                name: "Created Card",
                due: "2024-07-15T23:59:59.000Z"
            });
            mockClient.request.mockResolvedValueOnce(mockCard);

            const result = await executeCreateCard(mockClient, {
                idList: "5f8d3c2b1a9e8d7c6b5a1001",
                name: "Created Card",
                pos: "bottom",
                dueComplete: false
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockCard.id,
                name: "Created Card",
                description: mockCard.desc,
                listId: mockCard.idList,
                boardId: mockCard.idBoard,
                shortUrl: mockCard.shortUrl,
                url: mockCard.url,
                due: "2024-07-15T23:59:59.000Z",
                position: mockCard.pos
            });
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeCreateCard(mockClient, {
                idList: "nonexistent",
                name: "New Card",
                pos: "bottom",
                dueComplete: false
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateCard", () => {
        it("calls client with name update", async () => {
            mockClient.request.mockResolvedValueOnce(createMockCard({ name: "Updated Name" }));

            await executeUpdateCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                name: "Updated Name"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/cards/5f8d3c2b1a9e8d7c6b5a3001",
                params: { name: "Updated Name" }
            });
        });

        it("calls client with members and labels as comma-separated strings", async () => {
            mockClient.request.mockResolvedValueOnce(createMockCard());

            await executeUpdateCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                idMembers: ["m1", "m2"],
                idLabels: ["l1"]
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/cards/5f8d3c2b1a9e8d7c6b5a3001",
                params: {
                    idMembers: "m1,m2",
                    idLabels: "l1"
                }
            });
        });

        it("handles null due date for removal", async () => {
            mockClient.request.mockResolvedValueOnce(createMockCard({ due: null }));

            await executeUpdateCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                due: null
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/cards/5f8d3c2b1a9e8d7c6b5a3001",
                params: { due: null }
            });
        });

        it("returns normalized output on success", async () => {
            const mockCard = createMockCard({
                name: "Updated Card",
                closed: true
            });
            mockClient.request.mockResolvedValueOnce(mockCard);

            const result = await executeUpdateCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                closed: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.closed).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Card not found"));

            const result = await executeUpdateCard(mockClient, {
                cardId: "nonexistent",
                name: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteCard", () => {
        it("calls client with correct params", async () => {
            mockClient.delete.mockResolvedValueOnce({});

            await executeDeleteCard(mockClient, { cardId: "5f8d3c2b1a9e8d7c6b5a3001" });

            expect(mockClient.delete).toHaveBeenCalledWith("/cards/5f8d3c2b1a9e8d7c6b5a3001");
        });

        it("returns success response", async () => {
            mockClient.delete.mockResolvedValueOnce({});

            const result = await executeDeleteCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                cardId: "5f8d3c2b1a9e8d7c6b5a3001"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("Card not found"));

            const result = await executeDeleteCard(mockClient, { cardId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeMoveCard", () => {
        it("calls client with list move params", async () => {
            mockClient.request.mockResolvedValueOnce(createMockCard({ idList: "newListId" }));

            await executeMoveCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                idList: "newListId",
                pos: "bottom"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/cards/5f8d3c2b1a9e8d7c6b5a3001",
                params: {
                    idList: "newListId",
                    pos: "bottom"
                }
            });
        });

        it("calls client with board and list move params", async () => {
            mockClient.request.mockResolvedValueOnce(
                createMockCard({ idList: "newListId", idBoard: "newBoardId" })
            );

            await executeMoveCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                idList: "newListId",
                idBoard: "newBoardId",
                pos: "top"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: "/cards/5f8d3c2b1a9e8d7c6b5a3001",
                params: {
                    idList: "newListId",
                    idBoard: "newBoardId",
                    pos: "top"
                }
            });
        });

        it("returns normalized output on success", async () => {
            const mockCard = createMockCard({
                idList: "newListId",
                idBoard: "newBoardId",
                pos: 8192
            });
            mockClient.request.mockResolvedValueOnce(mockCard);

            const result = await executeMoveCard(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                idList: "newListId",
                pos: "bottom"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockCard.id,
                name: mockCard.name,
                listId: "newListId",
                boardId: "newBoardId",
                position: 8192,
                moved: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Card not found"));

            const result = await executeMoveCard(mockClient, {
                cardId: "nonexistent",
                idList: "someList",
                pos: "bottom"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================================
    // COMMENTS
    // ============================================================================
    describe("executeAddComment", () => {
        it("calls client with correct params", async () => {
            mockClient.request.mockResolvedValueOnce(createMockComment());

            await executeAddComment(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                text: "This is a comment"
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/cards/5f8d3c2b1a9e8d7c6b5a3001/actions/comments",
                params: { text: "This is a comment" }
            });
        });

        it("returns normalized output on success", async () => {
            const mockComment = createMockComment({
                data: {
                    text: "New comment text",
                    card: {
                        id: "cardId",
                        name: "Card Name",
                        shortLink: "xyz",
                        idShort: 1
                    },
                    board: {
                        id: "boardId",
                        name: "Board Name",
                        shortLink: "abc"
                    }
                }
            });
            mockClient.request.mockResolvedValueOnce(mockComment);

            const result = await executeAddComment(mockClient, {
                cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                text: "New comment text"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockComment.id,
                text: "New comment text",
                cardId: "cardId",
                cardName: "Card Name",
                createdAt: mockComment.date,
                authorId: mockComment.idMemberCreator
            });
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Card not found"));

            const result = await executeAddComment(mockClient, {
                cardId: "nonexistent",
                text: "Comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================================
    // MEMBERS
    // ============================================================================
    describe("executeGetMe", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(createMockMember());

            await executeGetMe(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/members/me", {
                fields: "id,fullName,username,email,avatarUrl,bio,initials,url"
            });
        });

        it("returns normalized output on success", async () => {
            const mockMember = createMockMember({
                email: "john@example.com"
            });
            mockClient.get.mockResolvedValueOnce(mockMember);

            const result = await executeGetMe(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: mockMember.id,
                fullName: mockMember.fullName,
                username: mockMember.username,
                email: "john@example.com",
                avatarUrl: mockMember.avatarUrl,
                bio: mockMember.bio,
                initials: mockMember.initials,
                profileUrl: mockMember.url
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Invalid token"));

            const result = await executeGetMe(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetBoardMembers", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([createMockBoardMember()]);

            await executeGetBoardMembers(mockClient, { boardId: "5f8d3c2b1a9e8d7c6b5a4321" });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/boards/5f8d3c2b1a9e8d7c6b5a4321/members",
                {
                    fields: "id,fullName,username,avatarUrl,initials"
                }
            );
        });

        it("returns normalized output on success", async () => {
            const members = [
                createMockBoardMember({ id: "1", fullName: "John Smith", username: "johnsmith" }),
                createMockBoardMember({
                    id: "2",
                    fullName: "Jane Doe",
                    username: "janedoe",
                    avatarUrl: null
                })
            ];
            mockClient.get.mockResolvedValueOnce(members);

            const result = await executeGetBoardMembers(mockClient, {
                boardId: "5f8d3c2b1a9e8d7c6b5a4321"
            });

            expect(result.success).toBe(true);
            expect(result.data?.members).toHaveLength(2);
            expect(result.data?.members[0]).toEqual({
                id: "1",
                fullName: "John Smith",
                username: "johnsmith",
                avatarUrl: "https://trello-avatars.s3.amazonaws.com/abc123/170.png",
                initials: "JS"
            });
            expect(result.data?.members[1].avatarUrl).toBeNull();
            expect(result.data?.count).toBe(2);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Board not found"));

            const result = await executeGetBoardMembers(mockClient, { boardId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================================================
    // SCHEMA VALIDATION
    // ============================================================================
    describe("schema validation", () => {
        describe("listBoardsSchema", () => {
            it("validates with defaults", () => {
                const result = listBoardsSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.filter).toBe("all");
                    expect(result.data.limit).toBe(50);
                }
            });

            it("validates with custom values", () => {
                const result = listBoardsSchema.safeParse({ filter: "starred", limit: 100 });
                expect(result.success).toBe(true);
            });

            it("rejects invalid filter", () => {
                const result = listBoardsSchema.safeParse({ filter: "invalid" });
                expect(result.success).toBe(false);
            });

            it("rejects limit over max", () => {
                const result = listBoardsSchema.safeParse({ limit: 1001 });
                expect(result.success).toBe(false);
            });

            it("rejects limit under min", () => {
                const result = listBoardsSchema.safeParse({ limit: 0 });
                expect(result.success).toBe(false);
            });
        });

        describe("getBoardSchema", () => {
            it("validates with boardId", () => {
                const result = getBoardSchema.safeParse({ boardId: "abc123" });
                expect(result.success).toBe(true);
            });

            it("rejects missing boardId", () => {
                const result = getBoardSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createBoardSchema", () => {
            it("validates minimal input", () => {
                const result = createBoardSchema.safeParse({ name: "Test Board" });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createBoardSchema.safeParse({
                    name: "Test Board",
                    desc: "Description",
                    defaultLists: false,
                    defaultLabels: false,
                    prefs_permissionLevel: "org",
                    prefs_background: "green"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createBoardSchema.safeParse({ name: "" });
                expect(result.success).toBe(false);
            });

            it("rejects invalid permission level", () => {
                const result = createBoardSchema.safeParse({
                    name: "Test",
                    prefs_permissionLevel: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = createBoardSchema.parse({ name: "Test" });
                expect(result.defaultLists).toBe(true);
                expect(result.defaultLabels).toBe(true);
                expect(result.prefs_permissionLevel).toBe("private");
            });
        });

        describe("updateBoardSchema", () => {
            it("validates with boardId only", () => {
                const result = updateBoardSchema.safeParse({ boardId: "abc123" });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = updateBoardSchema.safeParse({
                    boardId: "abc123",
                    name: "Updated Name",
                    desc: "Updated Desc",
                    closed: true,
                    prefs_permissionLevel: "public",
                    prefs_background: "red"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing boardId", () => {
                const result = updateBoardSchema.safeParse({ name: "Test" });
                expect(result.success).toBe(false);
            });
        });

        describe("getListsSchema", () => {
            it("validates with boardId", () => {
                const result = getListsSchema.safeParse({ boardId: "abc123" });
                expect(result.success).toBe(true);
            });

            it("validates with filter", () => {
                const result = getListsSchema.safeParse({ boardId: "abc123", filter: "closed" });
                expect(result.success).toBe(true);
            });

            it("applies default filter", () => {
                const result = getListsSchema.parse({ boardId: "abc123" });
                expect(result.filter).toBe("open");
            });

            it("rejects invalid filter", () => {
                const result = getListsSchema.safeParse({ boardId: "abc", filter: "invalid" });
                expect(result.success).toBe(false);
            });
        });

        describe("getListSchema", () => {
            it("validates with listId", () => {
                const result = getListSchema.safeParse({ listId: "abc123" });
                expect(result.success).toBe(true);
            });

            it("rejects missing listId", () => {
                const result = getListSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createListSchema", () => {
            it("validates minimal input", () => {
                const result = createListSchema.safeParse({
                    name: "New List",
                    idBoard: "board123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with position", () => {
                const result = createListSchema.safeParse({
                    name: "New List",
                    idBoard: "board123",
                    pos: "top"
                });
                expect(result.success).toBe(true);
            });

            it("validates with numeric position", () => {
                const result = createListSchema.safeParse({
                    name: "New List",
                    idBoard: "board123",
                    pos: 16384
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createListSchema.safeParse({ name: "", idBoard: "board123" });
                expect(result.success).toBe(false);
            });

            it("applies default position", () => {
                const result = createListSchema.parse({ name: "Test", idBoard: "board123" });
                expect(result.pos).toBe("bottom");
            });
        });

        describe("updateListSchema", () => {
            it("validates with listId only", () => {
                const result = updateListSchema.safeParse({ listId: "list123" });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = updateListSchema.safeParse({
                    listId: "list123",
                    name: "Updated",
                    closed: true,
                    pos: "top"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("archiveListSchema", () => {
            it("validates with listId", () => {
                const result = archiveListSchema.safeParse({ listId: "list123" });
                expect(result.success).toBe(true);
            });

            it("validates with explicit archive value", () => {
                const result = archiveListSchema.safeParse({ listId: "list123", archive: false });
                expect(result.success).toBe(true);
            });

            it("applies default archive value", () => {
                const result = archiveListSchema.parse({ listId: "list123" });
                expect(result.archive).toBe(true);
            });
        });

        describe("getCardsSchema", () => {
            it("validates with listId", () => {
                const result = getCardsSchema.safeParse({ listId: "list123" });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = getCardsSchema.safeParse({
                    listId: "list123",
                    filter: "closed",
                    limit: 100
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = getCardsSchema.parse({ listId: "list123" });
                expect(result.filter).toBe("open");
                expect(result.limit).toBe(50);
            });
        });

        describe("getCardSchema", () => {
            it("validates with cardId", () => {
                const result = getCardSchema.safeParse({ cardId: "card123" });
                expect(result.success).toBe(true);
            });

            it("rejects missing cardId", () => {
                const result = getCardSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createCardSchema", () => {
            it("validates minimal input", () => {
                const result = createCardSchema.safeParse({
                    idList: "list123",
                    name: "New Card"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = createCardSchema.safeParse({
                    idList: "list123",
                    name: "Full Card",
                    desc: "Description",
                    pos: "top",
                    due: "2024-07-15T23:59:59.000Z",
                    dueComplete: true,
                    start: "2024-07-01T00:00:00.000Z",
                    idMembers: ["m1", "m2"],
                    idLabels: ["l1"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createCardSchema.safeParse({ idList: "list123", name: "" });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = createCardSchema.parse({ idList: "list123", name: "Test" });
                expect(result.pos).toBe("bottom");
                expect(result.dueComplete).toBe(false);
            });
        });

        describe("updateCardSchema", () => {
            it("validates with cardId only", () => {
                const result = updateCardSchema.safeParse({ cardId: "card123" });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = updateCardSchema.safeParse({
                    cardId: "card123",
                    name: "Updated",
                    desc: "New desc",
                    closed: true,
                    idList: "newList",
                    pos: 16384,
                    due: "2024-08-01T00:00:00.000Z",
                    dueComplete: true,
                    start: null,
                    idMembers: ["m1"],
                    idLabels: []
                });
                expect(result.success).toBe(true);
            });

            it("allows null due date", () => {
                const result = updateCardSchema.safeParse({ cardId: "card123", due: null });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteCardSchema", () => {
            it("validates with cardId", () => {
                const result = deleteCardSchema.safeParse({ cardId: "card123" });
                expect(result.success).toBe(true);
            });

            it("rejects missing cardId", () => {
                const result = deleteCardSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("moveCardSchema", () => {
            it("validates minimal input", () => {
                const result = moveCardSchema.safeParse({
                    cardId: "card123",
                    idList: "list456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with board change", () => {
                const result = moveCardSchema.safeParse({
                    cardId: "card123",
                    idList: "list456",
                    idBoard: "board789",
                    pos: "top"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing idList", () => {
                const result = moveCardSchema.safeParse({ cardId: "card123" });
                expect(result.success).toBe(false);
            });

            it("applies default position", () => {
                const result = moveCardSchema.parse({ cardId: "card", idList: "list" });
                expect(result.pos).toBe("bottom");
            });
        });

        describe("addCommentSchema", () => {
            it("validates with required fields", () => {
                const result = addCommentSchema.safeParse({
                    cardId: "card123",
                    text: "Comment text"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty text", () => {
                const result = addCommentSchema.safeParse({ cardId: "card123", text: "" });
                expect(result.success).toBe(false);
            });

            it("rejects missing cardId", () => {
                const result = addCommentSchema.safeParse({ text: "Comment" });
                expect(result.success).toBe(false);
            });
        });

        describe("getMeSchema", () => {
            it("validates empty input", () => {
                const result = getMeSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getBoardMembersSchema", () => {
            it("validates with boardId", () => {
                const result = getBoardMembersSchema.safeParse({ boardId: "board123" });
                expect(result.success).toBe(true);
            });

            it("rejects missing boardId", () => {
                const result = getBoardMembersSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });
    });
});
