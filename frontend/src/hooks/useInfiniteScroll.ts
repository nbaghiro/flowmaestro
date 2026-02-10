import { useEffect, useRef, useCallback } from "react";

export interface UseInfiniteScrollOptions {
    /** Function to call when user scrolls to bottom */
    onLoadMore: () => void;
    /** Whether there are more items to load */
    hasMore: boolean;
    /** Whether currently loading */
    isLoading: boolean;
    /** IntersectionObserver threshold (0-1), defaults to 0.1 */
    threshold?: number;
    /** Root element for intersection (null = viewport) */
    root?: Element | null;
}

/**
 * Custom hook for infinite scroll using IntersectionObserver.
 * Returns a ref to attach to a sentinel element at the bottom of the scroll container.
 *
 * @example
 * const sentinelRef = useInfiniteScroll({
 *     onLoadMore: fetchNextPage,
 *     hasMore: hasNextPage,
 *     isLoading: isFetchingNextPage
 * });
 *
 * return (
 *     <div>
 *         {items.map(item => <Item key={item.id} {...item} />)}
 *         <div ref={sentinelRef} />
 *     </div>
 * );
 */
export function useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    threshold = 0.1,
    root = null
}: UseInfiniteScrollOptions) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    const handleIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                onLoadMore();
            }
        },
        [onLoadMore, hasMore, isLoading]
    );

    useEffect(() => {
        const observer = new IntersectionObserver(handleIntersect, {
            threshold,
            root
        });

        const currentRef = sentinelRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [handleIntersect, threshold, root]);

    return sentinelRef;
}
