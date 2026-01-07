/**
 * @flowmaestro/widget
 *
 * FlowMaestro embeddable chat widget for websites and React applications.
 *
 * @example Script Tag Usage
 * ```html
 * <script src="https://flowmaestro.ai/widget/my-slug.js" async></script>
 * ```
 *
 * @example npm Package Usage
 * ```typescript
 * import { FlowMaestroWidget } from "@flowmaestro/widget";
 *
 * const widget = new FlowMaestroWidget({
 *     slug: "my-chat-slug",
 *     baseUrl: "https://flowmaestro.ai"
 * });
 *
 * await widget.init();
 * ```
 *
 * @example React Usage
 * ```tsx
 * import { FlowMaestroWidget } from "@flowmaestro/widget/react";
 * // or
 * import { useFlowMaestroWidget } from "@flowmaestro/widget/react";
 * ```
 *
 * @packageDocumentation
 */

export { FlowMaestroWidget } from "./widget";

export type {
    WidgetOptions,
    WidgetConfig,
    WidgetState,
    WidgetCallbacks,
    WidgetOptionsWithCallbacks,
    UseWidgetReturn,
    WidgetComponentProps
} from "./types";
