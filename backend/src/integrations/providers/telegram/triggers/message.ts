import type { TriggerDefinition } from "../../../core/types";

/**
 * New Message trigger definition
 *
 * Triggered when the bot receives a new message.
 */
export const messageTrigger: TriggerDefinition = {
    id: "message",
    name: "New Message",
    description: "Triggered when the bot receives a new message",
    configFields: [
        {
            name: "chat_type",
            label: "Chat Type",
            type: "select",
            required: false,
            description: "Filter by chat type",
            options: [
                { value: "private", label: "Private" },
                { value: "group", label: "Group" },
                { value: "supergroup", label: "Supergroup" },
                { value: "channel", label: "Channel" }
            ]
        },
        {
            name: "contains_text",
            label: "Contains Text",
            type: "text",
            required: false,
            description: "Filter messages containing specific text",
            placeholder: "keyword"
        }
    ],
    tags: ["messages", "chat"]
};
