/**
 * SharePoint Operations Index
 * Export all operations for the SharePoint provider
 */

// Site Operations
export { listSitesOperation, executeListSites } from "./listSites";
export { getSiteOperation, executeGetSite } from "./getSite";

// List Operations
export { listListsOperation, executeListLists } from "./listLists";
export { getListOperation, executeGetList } from "./getList";

// Item Operations
export { listItemsOperation, executeListItems } from "./listItems";
export { createItemOperation, executeCreateItem } from "./createItem";

// File Operations
export { listDriveItemsOperation, executeListDriveItems } from "./listDriveItems";

// Search Operations
export { searchContentOperation, executeSearchContent } from "./searchContent";
