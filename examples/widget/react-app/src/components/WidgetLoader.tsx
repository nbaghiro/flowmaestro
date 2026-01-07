/**
 * WidgetLoader - Re-exports the FlowMaestroWidget from npm package
 *
 * This file demonstrates that you can simply import and use the component
 * directly from @flowmaestro/widget/react. The component handles:
 *
 * - Initializing the widget on mount
 * - Cleaning up on unmount
 * - Reinitializing when props change
 *
 * @example Direct usage (recommended)
 * ```tsx
 * import { FlowMaestroWidget } from "@flowmaestro/widget/react";
 *
 * <FlowMaestroWidget
 *   slug="my-chat-slug"
 *   baseUrl="https://api.flowmaestro.ai"
 *   position="bottom-right"
 *   onReady={() => console.log("Ready!")}
 * />
 * ```
 *
 * @example Using the hook for more control
 * ```tsx
 * import { useFlowMaestroWidget } from "@flowmaestro/widget/react";
 *
 * const { open, close, toggle, isOpen, isReady, error } = useFlowMaestroWidget({
 *   slug: "my-chat-slug",
 *   baseUrl: "https://api.flowmaestro.ai"
 * });
 *
 * return (
 *   <button onClick={toggle}>
 *     {isOpen ? "Close" : "Open"} Chat
 *   </button>
 * );
 * ```
 */

export { FlowMaestroWidget as default } from "@flowmaestro/widget/react";
export { FlowMaestroWidget, useFlowMaestroWidget } from "@flowmaestro/widget/react";
