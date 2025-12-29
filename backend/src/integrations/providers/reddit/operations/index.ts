/**
 * Reddit Operations - Re-exports
 */

// Types
export * from "./types";

// Get Posts
export { getPostsSchema, getPostsOperation, executeGetPosts } from "./getPosts";
export type { GetPostsParams } from "./getPosts";

// Get Post
export { getPostSchema, getPostOperation, executeGetPost } from "./getPost";
export type { GetPostParams } from "./getPost";

// Submit Post
export {
    submitTextPostSchema,
    submitTextPostOperation,
    executeSubmitTextPost,
    submitLinkPostSchema,
    submitLinkPostOperation,
    executeSubmitLinkPost
} from "./submitPost";
export type { SubmitTextPostParams, SubmitLinkPostParams } from "./submitPost";

// Submit Comment
export { submitCommentSchema, submitCommentOperation, executeSubmitComment } from "./submitComment";
export type { SubmitCommentParams } from "./submitComment";

// Vote
export { voteSchema, voteOperation, executeVote } from "./vote";
export type { VoteParams } from "./vote";

// Save
export {
    saveSchema,
    saveOperation,
    executeSave,
    unsaveSchema,
    unsaveOperation,
    executeUnsave
} from "./save";
export type { SaveParams, UnsaveParams } from "./save";

// Get Me
export { getMeSchema, getMeOperation, executeGetMe } from "./getMe";
export type { GetMeParams } from "./getMe";
