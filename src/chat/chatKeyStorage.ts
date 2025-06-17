interface StoredChatInfo {
    chatId: string;
    chatKey: string;
}

const STORAGE_KEY = 'spyglass-explorer-chat-keys';

export const saveChatKeyInfo = (info: StoredChatInfo): void => {
    const existingData = getAllStoredChatKeys();
    const updatedData = {
        ...existingData,
        [info.chatId]: info
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
};

export const loadChatKeyInfo = (chatId: string): StoredChatInfo | undefined => {
    const allData = getAllStoredChatKeys();
    return allData[chatId];
};

export const getAllStoredChatKeys = (): Record<string, StoredChatInfo> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
};

export const removeChatKeyInfo = (chatId: string): void => {
    const existingData = getAllStoredChatKeys();
    delete existingData[chatId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
};
