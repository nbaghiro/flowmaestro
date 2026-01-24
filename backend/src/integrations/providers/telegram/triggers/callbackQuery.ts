import type { TriggerDefinition } from "../../../core/types";

/**
 * Callback Query trigger definition
 *
 * Triggered when an inline button is pressed.
 */
export const callbackQueryTrigger: TriggerDefinition = {
    id: "callback_query",
    name: "Callback Query",
    description: "Triggered when an inline keyboard button is pressed",
    configFields: [
        {
            name: "data_prefix",
            label: "Data Prefix",
            type: "text",
            required: false,
            description: "Filter callbacks with data starting with this prefix",
            placeholder: "action_"
        }
    ],
    tags: ["buttons", "interactive"]
};
