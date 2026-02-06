/**
 * GitBook Operations Index
 *
 * Re-exports all operations for the GitBook integration
 */

// Organization operations
export {
    listOrganizationsOperation,
    listOrganizationsSchema,
    executeListOrganizations,
    type ListOrganizationsParams,
    getOrganizationOperation,
    getOrganizationSchema,
    executeGetOrganization,
    type GetOrganizationParams
} from "./organizations";

// Space operations
export {
    listSpacesOperation,
    listSpacesSchema,
    executeListSpaces,
    type ListSpacesParams,
    getSpaceOperation,
    getSpaceSchema,
    executeGetSpace,
    type GetSpaceParams,
    searchSpaceContentOperation,
    searchSpaceContentSchema,
    executeSearchSpaceContent,
    type SearchSpaceContentParams
} from "./spaces";

// Page operations
export {
    listPagesOperation,
    listPagesSchema,
    executeListPages,
    type ListPagesParams,
    getPageOperation,
    getPageSchema,
    executeGetPage,
    type GetPageParams
} from "./pages";
