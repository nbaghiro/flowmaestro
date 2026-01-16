/**
 * Asana Task Operations Index
 */

export { createTaskOperation, executeCreateTask } from "./createTask";
export { getTaskOperation, executeGetTask } from "./getTask";
export { updateTaskOperation, executeUpdateTask } from "./updateTask";
export { deleteTaskOperation, executeDeleteTask } from "./deleteTask";
export { listTasksOperation, executeListTasks } from "./listTasks";
export { searchTasksOperation, executeSearchTasks } from "./searchTasks";
export { addTaskToProjectOperation, executeAddTaskToProject } from "./addTaskToProject";
export {
    removeTaskFromProjectOperation,
    executeRemoveTaskFromProject
} from "./removeTaskFromProject";
export { createSubtaskOperation, executeCreateSubtask } from "./createSubtask";
export { getSubtasksOperation, executeGetSubtasks } from "./getSubtasks";
export { addCommentToTaskOperation, executeAddCommentToTask } from "./addCommentToTask";
export { getTaskCommentsOperation, executeGetTaskComments } from "./getTaskComments";
export { addTagToTaskOperation, executeAddTagToTask } from "./addTagToTask";
export { removeTagFromTaskOperation, executeRemoveTagFromTask } from "./removeTagFromTask";
