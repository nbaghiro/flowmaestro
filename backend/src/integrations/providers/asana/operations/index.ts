/**
 * Asana Operations Index
 * Export all operations for the Asana provider
 */

// Task Operations
export {
    createTaskOperation,
    executeCreateTask,
    getTaskOperation,
    executeGetTask,
    updateTaskOperation,
    executeUpdateTask,
    deleteTaskOperation,
    executeDeleteTask,
    listTasksOperation,
    executeListTasks,
    searchTasksOperation,
    executeSearchTasks,
    addTaskToProjectOperation,
    executeAddTaskToProject,
    removeTaskFromProjectOperation,
    executeRemoveTaskFromProject,
    createSubtaskOperation,
    executeCreateSubtask,
    getSubtasksOperation,
    executeGetSubtasks,
    addCommentToTaskOperation,
    executeAddCommentToTask,
    getTaskCommentsOperation,
    executeGetTaskComments,
    addTagToTaskOperation,
    executeAddTagToTask,
    removeTagFromTaskOperation,
    executeRemoveTagFromTask
} from "./tasks";

// Project Operations
export {
    createProjectOperation,
    executeCreateProject,
    getProjectOperation,
    executeGetProject,
    updateProjectOperation,
    executeUpdateProject,
    deleteProjectOperation,
    executeDeleteProject,
    listProjectsOperation,
    executeListProjects
} from "./projects";

// Section Operations
export {
    createSectionOperation,
    executeCreateSection,
    getSectionOperation,
    executeGetSection,
    updateSectionOperation,
    executeUpdateSection,
    deleteSectionOperation,
    executeDeleteSection,
    listSectionsOperation,
    executeListSections,
    addTaskToSectionOperation,
    executeAddTaskToSection
} from "./sections";

// User and Workspace Operations
export {
    getCurrentUserOperation,
    executeGetCurrentUser,
    getUserOperation,
    executeGetUser,
    listUsersOperation,
    executeListUsers,
    listWorkspacesOperation,
    executeListWorkspaces,
    getWorkspaceOperation,
    executeGetWorkspace,
    listTeamsOperation,
    executeListTeams,
    listTagsOperation,
    executeListTags
} from "./users";
