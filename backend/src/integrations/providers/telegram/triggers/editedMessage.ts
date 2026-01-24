import type { TriggerDefinition } from "../../../core/types";

/**
 * Edited Message trigger definition
 *
 * Triggered when a message is edited.
 */
export const editedMessageTrigger: TriggerDefinition = {
    id: "edited_message",
    name: "Edited Message",
    description: "Triggered when a message is edited",
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
        }
    ],
    tags: ["messages", "edits"]
};
