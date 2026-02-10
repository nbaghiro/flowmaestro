/**
 * Mock for canvas module (optional native dependency)
 * Provides mock canvas implementation for testing chart generation
 */

// Mock 2D rendering context
const mockContext = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    clip: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    transform: jest.fn(),
    setTransform: jest.fn(),
    resetTransform: jest.fn(),
    drawImage: jest.fn(),
    createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createPattern: jest.fn(),
    measureText: jest.fn((text: string) => ({
        width: text.length * 7,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 12,
        fontBoundingBoxDescent: 3
    })),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setLineDash: jest.fn(),
    getLineDash: jest.fn(() => []),
    lineDashOffset: 0
};

// Mock canvas element
export interface Canvas {
    width: number;
    height: number;
    getContext(contextId: "2d"): typeof mockContext;
    toBuffer(mimeType?: "image/png" | "image/jpeg"): Buffer;
}

export function createCanvas(width: number, height: number): Canvas {
    return {
        width,
        height,
        getContext: () => mockContext,
        toBuffer: () => Buffer.from("mock-png-data")
    };
}
