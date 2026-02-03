/**
 * Confluence Operations Index
 * Export all operations for the Confluence provider
 */

// Space Operations
export { listSpacesOperation, executeListSpaces } from "./listSpaces";
export { getSpaceOperation, executeGetSpace } from "./getSpace";

// Page Operations
export { listPagesOperation, executeListPages } from "./listPages";
export { getPageOperation, executeGetPage } from "./getPage";
export { createPageOperation, executeCreatePage } from "./createPage";
export { updatePageOperation, executeUpdatePage } from "./updatePage";
export { getPageChildrenOperation, executeGetPageChildren } from "./getPageChildren";

// Search Operations
export { searchContentOperation, executeSearchContent } from "./searchContent";
