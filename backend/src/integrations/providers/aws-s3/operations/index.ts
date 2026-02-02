/**
 * AWS S3 Operations
 * All operations for the AWS S3 provider
 */

// Bucket operations
export {
    listBucketsOperation,
    executeListBuckets,
    listBucketsSchema,
    type ListBucketsParams
} from "./listBuckets";

export {
    createBucketOperation,
    executeCreateBucket,
    createBucketSchema,
    type CreateBucketParams
} from "./createBucket";

export {
    deleteBucketOperation,
    executeDeleteBucket,
    deleteBucketSchema,
    type DeleteBucketParams
} from "./deleteBucket";

// Object operations
export {
    listObjectsOperation,
    executeListObjects,
    listObjectsSchema,
    type ListObjectsParams
} from "./listObjects";

export {
    uploadObjectOperation,
    executeUploadObject,
    uploadObjectSchema,
    type UploadObjectParams
} from "./uploadObject";

export {
    downloadObjectOperation,
    executeDownloadObject,
    downloadObjectSchema,
    type DownloadObjectParams
} from "./downloadObject";

export {
    deleteObjectOperation,
    executeDeleteObject,
    deleteObjectSchema,
    type DeleteObjectParams
} from "./deleteObject";

export {
    deleteObjectsOperation,
    executeDeleteObjects,
    deleteObjectsSchema,
    type DeleteObjectsParams
} from "./deleteObjects";

export {
    getObjectMetadataOperation,
    executeGetObjectMetadata,
    getObjectMetadataSchema,
    type GetObjectMetadataParams
} from "./getObjectMetadata";

export {
    copyObjectOperation,
    executeCopyObject,
    copyObjectSchema,
    type CopyObjectParams
} from "./copyObject";

export {
    getPresignedUrlOperation,
    executeGetPresignedUrl,
    getPresignedUrlSchema,
    type GetPresignedUrlParams
} from "./getPresignedUrl";
