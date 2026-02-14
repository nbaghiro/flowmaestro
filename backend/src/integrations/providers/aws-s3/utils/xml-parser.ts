/**
 * S3 XML Response Parser
 *
 * S3-specific XML parsing utilities for list operations and error responses.
 * Uses simple regex parsing for lightweight XML handling.
 */

/**
 * Parse XML error response from S3
 */
export function parseS3ErrorXML(xml: string): { code: string; message: string } | null {
    try {
        const codeMatch = xml.match(/<Code>([^<]+)<\/Code>/);
        const messageMatch = xml.match(/<Message>([^<]+)<\/Message>/);

        if (codeMatch && messageMatch) {
            return {
                code: codeMatch[1],
                message: messageMatch[1]
            };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Parse XML list buckets response
 */
export function parseListBucketsXML(
    xml: string
): { buckets: Array<{ name: string; creationDate: string }> } | null {
    try {
        const buckets: Array<{ name: string; creationDate: string }> = [];
        const bucketMatches = xml.matchAll(
            /<Bucket>\s*<Name>([^<]+)<\/Name>\s*<CreationDate>([^<]+)<\/CreationDate>\s*<\/Bucket>/g
        );

        for (const match of bucketMatches) {
            buckets.push({
                name: match[1],
                creationDate: match[2]
            });
        }

        return { buckets };
    } catch {
        return null;
    }
}

/**
 * Parse XML list objects response
 */
export function parseListObjectsXML(xml: string): {
    contents: Array<{
        key: string;
        lastModified: string;
        eTag: string;
        size: string;
        storageClass: string;
    }>;
    isTruncated: boolean;
    nextContinuationToken?: string;
    commonPrefixes: string[];
} | null {
    try {
        const contents: Array<{
            key: string;
            lastModified: string;
            eTag: string;
            size: string;
            storageClass: string;
        }> = [];

        const objectMatches = xml.matchAll(
            /<Contents>\s*<Key>([^<]+)<\/Key>\s*<LastModified>([^<]+)<\/LastModified>\s*<ETag>([^<]+)<\/ETag>\s*<Size>([^<]+)<\/Size>\s*<StorageClass>([^<]+)<\/StorageClass>/g
        );

        for (const match of objectMatches) {
            contents.push({
                key: match[1],
                lastModified: match[2],
                eTag: match[3].replace(/"/g, ""),
                size: match[4],
                storageClass: match[5]
            });
        }

        const isTruncatedMatch = xml.match(/<IsTruncated>([^<]+)<\/IsTruncated>/);
        const isTruncated = isTruncatedMatch ? isTruncatedMatch[1] === "true" : false;

        const nextTokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
        const nextContinuationToken = nextTokenMatch ? nextTokenMatch[1] : undefined;

        const commonPrefixes: string[] = [];
        const prefixMatches = xml.matchAll(
            /<CommonPrefixes>\s*<Prefix>([^<]+)<\/Prefix>\s*<\/CommonPrefixes>/g
        );
        for (const match of prefixMatches) {
            commonPrefixes.push(match[1]);
        }

        return { contents, isTruncated, nextContinuationToken, commonPrefixes };
    } catch {
        return null;
    }
}
