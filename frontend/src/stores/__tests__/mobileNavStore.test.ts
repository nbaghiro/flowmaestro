/**
 * Mobile Nav Store Tests
 *
 * Tests for mobile navigation drawer state management.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { useMobileNavStore } from "../mobileNavStore";

// Reset store before each test
function resetStore() {
    useMobileNavStore.setState({
        isDrawerOpen: false
    });
}

describe("mobileNavStore", () => {
    beforeEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("drawer is closed by default", () => {
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);
        });
    });

    // ===== Open Drawer =====
    describe("openDrawer", () => {
        it("opens the drawer", () => {
            useMobileNavStore.getState().openDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);
        });

        it("remains open when called twice", () => {
            useMobileNavStore.getState().openDrawer();
            useMobileNavStore.getState().openDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);
        });
    });

    // ===== Close Drawer =====
    describe("closeDrawer", () => {
        it("closes the drawer", () => {
            useMobileNavStore.setState({ isDrawerOpen: true });

            useMobileNavStore.getState().closeDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);
        });

        it("remains closed when called twice", () => {
            useMobileNavStore.getState().closeDrawer();
            useMobileNavStore.getState().closeDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);
        });
    });

    // ===== Toggle Drawer =====
    describe("toggleDrawer", () => {
        it("opens closed drawer", () => {
            useMobileNavStore.getState().toggleDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);
        });

        it("closes open drawer", () => {
            useMobileNavStore.setState({ isDrawerOpen: true });

            useMobileNavStore.getState().toggleDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);
        });

        it("toggles back and forth", () => {
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);

            useMobileNavStore.getState().toggleDrawer();
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);

            useMobileNavStore.getState().toggleDrawer();
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);

            useMobileNavStore.getState().toggleDrawer();
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);
        });
    });

    // ===== Combined Operations =====
    describe("combined operations", () => {
        it("open then close workflow", () => {
            useMobileNavStore.getState().openDrawer();
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);

            useMobileNavStore.getState().closeDrawer();
            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);
        });

        it("toggle after explicit open", () => {
            useMobileNavStore.getState().openDrawer();
            useMobileNavStore.getState().toggleDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(false);
        });

        it("toggle after explicit close", () => {
            useMobileNavStore.setState({ isDrawerOpen: true });
            useMobileNavStore.getState().closeDrawer();
            useMobileNavStore.getState().toggleDrawer();

            expect(useMobileNavStore.getState().isDrawerOpen).toBe(true);
        });
    });
});
