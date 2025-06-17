import { ORMessage } from "./openRouterTypes";

export type Chat = {
  chatId: string;
  messages: ORMessage[];
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  messageMetadata: {
    model: string;
    timestamp: number;
  }[];
  timestampCreated: number;
  timestampUpdated: number;
  finalized?: boolean;
};

export type ChatState = {
  chat: Chat;
  chatKey?: string;
  pendingMessages?: ORMessage[];
  currentModel: string;
};

export type ChatAction =
  | {
      type: "reset_chat";
    }
  | {
    type: "load_chat";
    chat: Chat;
    chatKey?: string;
  }
  | {
    type: "set_chat_key";
    chatKey: string;
    chatId: string;
  }
  | {
      type: "add_message";
      message: ORMessage;
      metadata: {
        model: string;
        timestamp: number;
      };
    }
  | {
      type: "add_messages";
      messages: ORMessage[];
      metadata: {
        model: string;
        timestamp: number;
      };
    }
  | {
      type: "increment_tokens";
      promptTokens: number;
      completionTokens: number;
      estimatedCost: number;
    }
  | {
      type: "delete_message";
      messageIndex: number;
    }
  | {
      type: "set_pending_messages";
      pendingMessages: ORMessage[] | undefined;
    }
  | {
      type: "set_current_model";
      model: string;
    }
  | {
      type: "set_finalized";
      finalized: boolean;
    };

const sha1 = async (s: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(s);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => ("0" + b.toString(16)).slice(-2))
    .join("");
  return hashHex;
};

export const createChatId = async () => {
    const chatKey = crypto.randomUUID();
    const chatId = await sha1(chatKey);
    return { chatId, chatKey };
}

export const initialChatState = (): ChatState => {
  return {
    chat: {
        chatId: "",
        messages: [],
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0,
        messageMetadata: [],
        timestampCreated: Date.now(),
        timestampUpdated: Date.now(),
        finalized: false
    },
    pendingMessages: undefined,
    currentModel: "openai/gpt-4.1-mini",
    chatKey: undefined
  };
};

export const chatReducer = (
  state: ChatState,
  action: ChatAction
): ChatState => {
  switch (action.type) {
    case "reset_chat": {
      return initialChatState()
    }
    case "load_chat": {
      return {
        chat: {
            ...action.chat
        },
        pendingMessages: undefined,
        currentModel: modelFromChat(action.chat) || "openai/gpt-4.1-mini",
        chatKey: action.chatKey
      };
    }
    case "set_chat_key": {
      return {
        ...state,
        chatKey: action.chatKey,
        chat: {
          ...state.chat,
          chatId: action.chatId,
        },
      };
    }
    case "add_message": {
      const newState = {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, action.message],
          timestampUpdated: Date.now(),
          messageMetadata: [
            ...state.chat.messageMetadata,
            {
              model: action.metadata.model,
              timestamp: action.metadata.timestamp,
            },
          ],
        },
        pendingMessages: undefined,
      };
      return newState;
    }
    case "add_messages": {
      const newState = {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, ...action.messages],
          timestampUpdated: Date.now(),
          messageMetadata: [
            ...state.chat.messageMetadata,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ...action.messages.map((_m) => ({
              model: action.metadata.model,
              timestamp: action.metadata.timestamp,
            })),
          ],
        },
        pendingMessages: undefined,
      };
      return newState;
    }
    case "increment_tokens": {
      const newState = {
        ...state,
        chat: {
          ...state.chat,
          promptTokens: state.chat.promptTokens + action.promptTokens,
          completionTokens:
            state.chat.completionTokens + action.completionTokens,
          estimatedCost: state.chat.estimatedCost + action.estimatedCost,
        },
      };
      return newState;
    }
    case "delete_message": {
      const newState = {
        ...state,
        chat: {
          ...state.chat,
          messages: state.chat.messages.filter(
            (_, index) => index < action.messageIndex
          ),
          timestampUpdated: Date.now(),
          messageMetadata: state.chat.messageMetadata.filter(
            (_, index) => index < action.messageIndex
          ),
        },
        pendingMessages: undefined,
      };
      return newState;
    }
    case "set_pending_messages": {
      return {
        ...state,
        pendingMessages: action.pendingMessages,
      };
    }
    case "set_current_model": {
      return {
        ...state,
        currentModel: action.model,
      };
    }
    case "set_finalized": {
      return {
        ...state,
        chat: {
          ...state.chat,
          finalized: action.finalized,
        },
      };
    }
    default:
      return state;
  }
};

const squashChat = (chat: Chat): Chat => {
  let messages = [...chat.messages];
  // remove all messages after the last assistant message
  const lastAssistantIndex = messages
    .map((m) => m.role)
    .lastIndexOf("assistant");
  if (lastAssistantIndex !== -1) {
    messages = messages.slice(0, lastAssistantIndex + 1);
  } else {
    messages = [];
  }
  // remove any messages marked as irrelevant.
  // these would be assistant messages where the content includes the <irrelevant> tag
  // in this case we remove the assistant message as well as the user message that preceded it
  const filteredMessages = [];
  for (let i = 0; i < messages.length; i++) {
    // if this is a user message and the next is an assistant message that is marked as irrelevant, skip both
    if (
      messages[i].role === "user" &&
      i + 1 < messages.length &&
      messages[i + 1].role === "assistant" &&
      JSON.stringify(messages[i + 1].content || "").includes("<irrelevant>")
    ) {
      i++;
      continue;
    }
    filteredMessages.push(messages[i]);
  }
  return {
    ...chat,
    messages: filteredMessages,
  };
};

const CHAT_PASSCODE = "default-chat-passcode";

export const saveChat = async (chat: Chat, chatKey: string) => {
  const chatSquashed = squashChat(chat);
  if (chatSquashed.messages.length === 0) {
    return;
  }

  // Prepare metadata without messages for MongoDB
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { messages: _, ...chatMetadata } = chatSquashed;
  // Keep full chat for S3
  const chatSquashedStringified = JSON.stringify(chatSquashed);
  const size = chatSquashedStringified.length;

  const response = await fetch(
    `https://spyglass-explorer-api.vercel.app/api/save_chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat: chatMetadata,
        chatKey,
        size,
        passcode: CHAT_PASSCODE
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to get upload URL:", response.statusText);
    return;
  }

  const { signedUrl } = await response.json();

  // Now upload the chat data to S3
  const uploadResponse = await fetch(signedUrl, {
    method: "PUT",
    body: chatSquashedStringified,
  });

  if (!uploadResponse.ok) {
    console.error("Failed to upload chat data:", uploadResponse.statusText);
    return;
  }

  console.log("Chat saved successfully");
  return { success: true };
};

export const loadChat = async (a: {
  chatId: string;
}): Promise<Chat | null> => {
  const { chatId } = a;
  const response = await fetch(
    `https://spyglass-explorer-api.vercel.app/api/load_chat?chatId=${chatId}&passcode=${CHAT_PASSCODE}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    console.error("Failed to get download URL:", response.statusText);
    return null;
  }

  const { chatUrl } = await response.json();

  // Now download the chat data from S3
  const downloadResponse = await fetch(chatUrl);
  if (!downloadResponse.ok) {
    console.error("Failed to download chat data:", downloadResponse.statusText);
    return null;
  }

  try {
    const chatData = await downloadResponse.json();
    console.log("Chat loaded successfully");
    return chatData;
  } catch (err) {
    console.error("Error parsing chat data:", err);
    return null;
  }
};

const modelFromChat = (chat: Chat): string | undefined => {
  const metadata = chat.messageMetadata;
  if (metadata.length === 0) {
    return undefined;
  }
  const lastMetadata = metadata[metadata.length - 1];
  return lastMetadata.model;
}
