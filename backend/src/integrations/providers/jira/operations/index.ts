/**
 * Jira Operations Index
 * Export all operations for the Jira provider
 */

// Issue Operations - Phase 2
export { createIssueOperation, executeCreateIssue } from "./issues/createIssue";
export { getIssueOperation, executeGetIssue } from "./issues/getIssue";
export { updateIssueOperation, executeUpdateIssue } from "./issues/updateIssue";
export { searchIssuesOperation, executeSearchIssues } from "./issues/searchIssues";

// Issue Operations - Phase 3
export { deleteIssueOperation, executeDeleteIssue } from "./issues/deleteIssue";
export { transitionIssueOperation, executeTransitionIssue } from "./issues/transitionIssue";
export { assignIssueOperation, executeAssignIssue } from "./issues/assignIssue";
export { addCommentOperation, executeAddComment } from "./issues/addComment";
export { getCommentsOperation, executeGetComments } from "./issues/getComments";
export { addAttachmentOperation, executeAddAttachment } from "./issues/addAttachment";
export { linkIssuesOperation, executeLinkIssues } from "./issues/linkIssues";

// Project Operations
export { listProjectsOperation, executeListProjects } from "./projects/listProjects";
export { getProjectOperation, executeGetProject } from "./projects/getProject";
export { getIssueTypesOperation, executeGetIssueTypes } from "./projects/getIssueTypes";

// Field Operations - Phase 4
export { listFieldsOperation, executeListFields } from "./fields/listFields";
export {
    getCustomFieldConfigsOperation,
    executeGetCustomFieldConfigs
} from "./fields/getCustomFieldConfigs";

// User Operations - Phase 4
export { searchUsersOperation, executeSearchUsers } from "./users/searchUsers";
export { getCurrentUserOperation, executeGetCurrentUser } from "./users/getCurrentUser";
