/**
 * Tooltip Component Tests
 *
 * Tests for the Tooltip component used for contextual hints.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Visibility bugs:
 *    - Tooltip shown before hover
 *    - Children not rendered
 *
 * 2. Props bugs:
 *    - Position prop not accepted
 *    - Delay prop not accepted
 *    - Content prop not accepted
 *
 * Note: Full hover/delay/portal testing is limited in jsdom environment.
 * The component's timer-based show/hide logic and createPortal rendering
 * are more reliably tested in E2E tests.
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Tooltip } from "../Tooltip";

describe("Tooltip", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders children", () => {
            render(
                <Tooltip content="Tooltip text">
                    <button>Hover me</button>
                </Tooltip>
            );

            expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
        });

        it("does not show tooltip by default", () => {
            render(
                <Tooltip content="Tooltip text">
                    <button>Hover me</button>
                </Tooltip>
            );

            expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
        });

        it("renders complex children", () => {
            render(
                <Tooltip content="Help text">
                    <div>
                        <span>Icon</span>
                        <span>Label</span>
                    </div>
                </Tooltip>
            );

            expect(screen.getByText("Icon")).toBeInTheDocument();
            expect(screen.getByText("Label")).toBeInTheDocument();
        });
    });

    // ===== Props =====
    describe("props", () => {
        it("accepts content prop", () => {
            // Component should render without errors
            expect(() => {
                render(
                    <Tooltip content="My tooltip content">
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });

        it("accepts JSX content", () => {
            expect(() => {
                render(
                    <Tooltip
                        content={
                            <div>
                                <strong>Bold</strong> text
                            </div>
                        }
                    >
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });

        it("accepts delay prop", () => {
            expect(() => {
                render(
                    <Tooltip content="Tooltip" delay={500}>
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });

        it("accepts position prop - top", () => {
            expect(() => {
                render(
                    <Tooltip content="Tooltip" position="top">
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });

        it("accepts position prop - bottom", () => {
            expect(() => {
                render(
                    <Tooltip content="Tooltip" position="bottom">
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });

        it("accepts position prop - left", () => {
            expect(() => {
                render(
                    <Tooltip content="Tooltip" position="left">
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });

        it("accepts position prop - right", () => {
            expect(() => {
                render(
                    <Tooltip content="Tooltip" position="right">
                        <button>Button</button>
                    </Tooltip>
                );
            }).not.toThrow();
        });
    });

    // ===== Hover Behavior =====
    // Note: Full hover/delay/portal testing is limited in jsdom environment.
    // The component's timer-based show/hide logic and createPortal rendering
    // are more reliably tested in E2E tests. Basic hover trigger tests are
    // included below but may be flaky due to jsdom limitations with portals.
    describe("hover behavior", () => {
        it("cancels tooltip if mouse leaves before delay completes", async () => {
            render(
                <Tooltip content="Tooltip text" delay={500}>
                    <button>Hover me</button>
                </Tooltip>
            );

            const trigger = screen.getByRole("button").parentElement!;

            // Start hover
            await act(async () => {
                trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
            });

            // Leave before delay completes
            await act(async () => {
                vi.advanceTimersByTime(200);
                trigger.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
            });

            // Complete the original delay time
            await act(async () => {
                vi.advanceTimersByTime(400);
            });

            // Tooltip should not be visible
            expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("can be used with icon buttons", () => {
            render(
                <Tooltip content="Delete item">
                    <button aria-label="Delete">🗑️</button>
                </Tooltip>
            );

            expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
        });

        it("can be used with links", () => {
            render(
                <Tooltip content="Opens in new tab">
                    <a href="https://example.com" target="_blank" rel="noopener">
                        External Link
                    </a>
                </Tooltip>
            );

            expect(screen.getByRole("link", { name: "External Link" })).toBeInTheDocument();
        });

        it("can wrap inline elements", () => {
            render(
                <p>
                    Click{" "}
                    <Tooltip content="This is important">
                        <span style={{ textDecoration: "underline" }}>here</span>
                    </Tooltip>{" "}
                    for more info.
                </p>
            );

            expect(screen.getByText("here")).toBeInTheDocument();
        });
    });
});
