/**
 * Type declarations for canvas module (optional dependency)
 *
 * Canvas is used for server-side chart rendering. It's dynamically imported
 * only when chart generation is needed.
 */
declare module "canvas" {
    export interface Canvas {
        width: number;
        height: number;
        getContext(contextId: "2d"): CanvasRenderingContext2D;
        toBuffer(mimeType?: "image/png" | "image/jpeg"): Buffer;
    }

    export function createCanvas(width: number, height: number): Canvas;
}
