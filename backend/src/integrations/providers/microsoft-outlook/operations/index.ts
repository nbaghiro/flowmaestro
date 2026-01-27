// Email - Folder operations
export {
    listMailFoldersSchema,
    type ListMailFoldersParams,
    listMailFoldersOperation,
    executeListMailFolders
} from "./listMailFolders";

// Email - Message operations
export {
    listMessagesSchema,
    type ListMessagesParams,
    listMessagesOperation,
    executeListMessages
} from "./listMessages";

export {
    getMessageSchema,
    type GetMessageParams,
    getMessageOperation,
    executeGetMessage
} from "./getMessage";

export {
    sendMailSchema,
    type SendMailParams,
    sendMailOperation,
    executeSendMail
} from "./sendMail";

export {
    replyToMessageSchema,
    type ReplyToMessageParams,
    replyToMessageOperation,
    executeReplyToMessage
} from "./replyToMessage";

export {
    forwardMessageSchema,
    type ForwardMessageParams,
    forwardMessageOperation,
    executeForwardMessage
} from "./forwardMessage";

export {
    moveMessageSchema,
    type MoveMessageParams,
    moveMessageOperation,
    executeMoveMessage
} from "./moveMessage";

export {
    deleteMessageSchema,
    type DeleteMessageParams,
    deleteMessageOperation,
    executeDeleteMessage
} from "./deleteMessage";

export {
    markAsReadSchema,
    type MarkAsReadParams,
    markAsReadOperation,
    executeMarkAsRead
} from "./markAsRead";

// Calendar operations
export {
    listCalendarsSchema,
    type ListCalendarsParams,
    listCalendarsOperation,
    executeListCalendars
} from "./listCalendars";

export {
    listEventsSchema,
    type ListEventsParams,
    listEventsOperation,
    executeListEvents
} from "./listEvents";

export {
    getEventSchema,
    type GetEventParams,
    getEventOperation,
    executeGetEvent
} from "./getEvent";

export {
    createEventSchema,
    type CreateEventParams,
    createEventOperation,
    executeCreateEvent
} from "./createEvent";

export {
    updateEventSchema,
    type UpdateEventParams,
    updateEventOperation,
    executeUpdateEvent
} from "./updateEvent";

export {
    deleteEventSchema,
    type DeleteEventParams,
    deleteEventOperation,
    executeDeleteEvent
} from "./deleteEvent";

export {
    respondToEventSchema,
    type RespondToEventParams,
    respondToEventOperation,
    executeRespondToEvent
} from "./respondToEvent";
