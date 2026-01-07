/**
 * @flowmaestro/widget/react
 *
 * React integration for the FlowMaestro chat widget.
 *
 * @example Using the Component
 * ```tsx
 * import { FlowMaestroWidget } from "@flowmaestro/widget/react";
 *
 * function App() {
 *     return (
 *         <FlowMaestroWidget
 *             slug="my-chat-slug"
 *             baseUrl="https://flowmaestro.ai"
 *             position="bottom-right"
 *             initialState="collapsed"
 *             onOpen={() => console.log("opened")}
 *             onClose={() => console.log("closed")}
 *         />
 *     );
 * }
 * ```
 *
 * @example Using the Hook
 * ```tsx
 * import { useFlowMaestroWidget } from "@flowmaestro/widget/react";
 *
 * function App() {
 *     const { open, close, toggle, isOpen, isReady, error } = useFlowMaestroWidget({
 *         slug: "my-chat-slug",
 *         baseUrl: "https://flowmaestro.ai"
 *     });
 *
 *     return (
 *         <button onClick={toggle}>
 *             {isOpen ? "Close" : "Open"} Chat
 *         </button>
 *     );
 * }
 * ```
 *
 * @packageDocumentation
 */

export { FlowMaestroWidget } from "./Widget";
export { useFlowMaestroWidget } from "./useWidget";

// Re-export types that are useful for React users
export type {
    WidgetOptions,
    WidgetCallbacks,
    WidgetComponentProps,
    UseWidgetReturn
} from "../types";
