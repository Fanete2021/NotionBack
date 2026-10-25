export interface TelegramChat {
  id: number;
  type: string;
  username?: string;
  first_name?: string;
}

export interface TelegramUserInfo {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUserInfo;
  chat: TelegramChat;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}
