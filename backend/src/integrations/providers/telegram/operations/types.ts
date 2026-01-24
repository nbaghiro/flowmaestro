/**
 * Telegram API response types
 */

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface TelegramChat {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    description?: string;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    date: number;
    chat: TelegramChat;
    text?: string;
    caption?: string;
    photo?: TelegramPhotoSize[];
    document?: TelegramDocument;
}

export interface TelegramPhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}

export interface TelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

// API Response wrappers
export interface TelegramApiResponse<T> {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
}

export interface TelegramSendMessageResponse {
    message_id: number;
    date: number;
    chat: TelegramChat;
    text?: string;
}

export interface TelegramSendPhotoResponse {
    message_id: number;
    date: number;
    chat: TelegramChat;
    photo: TelegramPhotoSize[];
    caption?: string;
}

export interface TelegramSendDocumentResponse {
    message_id: number;
    date: number;
    chat: TelegramChat;
    document: TelegramDocument;
    caption?: string;
}

export interface TelegramForwardMessageResponse {
    message_id: number;
    date: number;
    chat: TelegramChat;
    forward_date?: number;
    forward_from?: TelegramUser;
}

export interface TelegramEditMessageResponse {
    message_id: number;
    date: number;
    edit_date?: number;
    chat: TelegramChat;
    text?: string;
}

export interface TelegramDeleteMessageResponse {
    ok: boolean;
}

export type TelegramGetMeResponse = TelegramUser;

export interface TelegramGetChatResponse extends TelegramChat {
    photo?: {
        small_file_id: string;
        big_file_id: string;
    };
    bio?: string;
    has_private_forwards?: boolean;
    linked_chat_id?: number;
    pinned_message?: TelegramMessage;
}

// Webhook update types
export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    chat_instance: string;
    data?: string;
}
