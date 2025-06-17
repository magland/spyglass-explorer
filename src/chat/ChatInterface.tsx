/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Stack } from "@mui/material";
import { FunctionComponent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import { getAllTools } from "./allTools";
import { chatReducer, createChatId, initialChatState, loadChat, saveChat } from "./Chat";
import { loadChatKeyInfo, saveChatKeyInfo } from "./chatKeyStorage";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import OpenRouterKeyDialog from "./OpenRouterKeyDialog";
import { ORMessage, ORToolCall } from "./openRouterTypes";
import { sendChatMessage } from "./sendChatMessage";
import StatusBar from "./StatusBar";

const MAX_CHAT_COST = 0.75;

const cheapModels = ["google/gemini-2.5-flash-preview", "openai/gpt-4o-mini", "openai/gpt-4.1-mini"];

type ChatInterfaceProps = {
  width: number;
  height: number;
  topBubbleContent: string;
  initialUserPromptChoices?: string[];
  onChatUploaded: (metadata: any) => void;
  chatId?: string;
  setChatId: (chatId: string | undefined) => void;
};

const recommendedModels = [
  "openai/gpt-4.1"
  // "google/gemini-2.5-pro-preview"
]

const ChatInterface: FunctionComponent<ChatInterfaceProps> = ({
  width,
  height,
  topBubbleContent,
  initialUserPromptChoices,
  chatId,
  setChatId,
}) => {
  const [chatState, chatStateDispatch] = useReducer(chatReducer, initialChatState());

  const [isLoading, setIsLoading] = useState(false);
  const [toolCallForPermission, setToolCallForPermission] = useState<
    ORToolCall | undefined
  >(undefined);
  const approvedToolCalls = useRef<
    { toolCall: ORToolCall; approved: boolean }[]
  >([]);

  const [toolCallForCancelState, setToolCallForCancelState] = useState<
    { toolCall: ORToolCall | "completion"; onCancel: (toolCall: ORToolCall | "completion") => void } | undefined
  >(undefined);

  const jupyterConnectivity = useJupyterConnectivity();

  const loadedInitialChat = useRef(false);
  useEffect(() => {
    if (loadedInitialChat.current) {
      return;
    }
    if (chatId !== chatState.chat.chatId) {
      if (chatId) {
        // Check if we have a stored key for this chat
        const storedInfo = loadChatKeyInfo(chatId);

        loadChat({
          chatId
        }).then((chat) => {
          if (chat) {
            const chatKey = storedInfo?.chatKey;
            chatStateDispatch({
              type: "load_chat",
              chat,
              chatKey
            })
          }
        }).catch((error) => {
          console.error("Failed to load chat:", error);
        });
      } else {
        chatStateDispatch({
          type: "reset_chat",
        });
        setChatId(undefined);
      }
    }
    loadedInitialChat.current = true;
  }, [chatId, chatState.chat.chatId, setChatId]);

  // Store chat key when it's set
  useEffect(() => {
    if (chatState.chatKey && chatState.chat.chatId) {
      saveChatKeyInfo({
        chatId: chatState.chat.chatId,
        chatKey: chatState.chatKey
      });
    }
  }, [chatState.chatKey, chatState.chat.chatId]);

  const [openRouterKey, setOpenRouterKey] = useState<string | undefined>(() => {
    return localStorage.getItem("openRouterKey") || undefined;
  });

  const handleSendMessage = useMemo(() => (async (content: string) => {
    const userMessage: ORMessage = {
      role: "user",
      content,
    };

    // as soon as user has submitted something, we enable scrolling to bottom on each new message
    setScrollToBottomEnabled(true);

    chatStateDispatch({
      type: "add_message",
      message: userMessage,
      metadata: {
        model: chatState.currentModel,
        timestamp: Date.now(),
      }
    });
    setIsLoading(true);

    try {
      let newMessages: ORMessage[] = [];
      const response = await sendChatMessage(
        [...chatState.chat.messages, userMessage],
        chatState.currentModel,
        {
          jupyterConnectivity,
          onUpdate: (pm: ORMessage[], nm: ORMessage[]) => {
            newMessages = nm;
            chatStateDispatch({
              type: "set_pending_messages",
              pendingMessages: pm,
            });
          },
          askPermissionToRunTool: async (toolCall: ORToolCall) => {
            const allTools = await getAllTools();
            const tool = allTools.find(
              (t) => t.toolFunction.name === toolCall.function.name
            );
            if (!tool) {
              throw new Error(`Tool not found: ${toolCall.function.name}`);
            }
            if (!tool.requiresPermission) {
              return true;
            }

            // important: while this is set here, it is not going to take effect in this scope
            setToolCallForPermission(toolCall);
            while (true) {
              for (const {
                toolCall: toolCall2,
                approved,
              } of approvedToolCalls.current) {
                if (toolCall2 === toolCall) {
                  setToolCallForPermission(undefined);
                  approvedToolCalls.current = approvedToolCalls.current.filter(
                    (x) => x.toolCall !== toolCallForPermission
                  );
                  return approved;
                }
              }
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          },
          setToolCallForCancel: (toolCall, onCancel) => {
            if (toolCall && onCancel) {
              setToolCallForCancelState({
                toolCall,
                onCancel,
              });
            } else {
              setToolCallForCancelState(undefined);
            }
          },
          openRouterKey,
        }
      );
      chatStateDispatch({
        type: "set_pending_messages",
        pendingMessages: undefined,
      });

      if (response.usage) {
        chatStateDispatch({
          type: "increment_tokens",
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          estimatedCost: response.usage.cost,
        })
      }

      chatStateDispatch({
        type: "add_messages",
        messages: newMessages,
        metadata: {
          model: chatState.currentModel,
          timestamp: Date.now(),
        }
      });
      let chatKey = chatState.chatKey;
      let chatId = chatState.chat.chatId;
      if (!chatKey) {
        const {chatId: chatId0, chatKey: chatKey0} = await createChatId();
        chatKey = chatKey0;
        chatId = chatId0;
        chatStateDispatch({
          type: "set_chat_key",
          chatKey: chatKey,
          chatId: chatId,
        });
        setChatId(chatId);
      }
      saveChat({
        ...chatState.chat,
        chatId: chatId,
        messages: [...chatState.chat.messages, userMessage, ...newMessages],
        messageMetadata: [...chatState.chat.messageMetadata, {
          model: chatState.currentModel,
          timestamp: Date.now(),
        }, ...newMessages.map(() => ({
          model: chatState.currentModel,
          timestamp: Date.now(),
        }))],
      }, chatKey)
    } catch (error) {
      console.error("Failed to send message:", error);
      // Could add error handling UI here
    } finally {
      setIsLoading(false);
    }
  }), [
    chatState,
    chatStateDispatch,
    jupyterConnectivity,
    openRouterKey,
    setChatId,
    toolCallForPermission
  ]);

  const handleFinalize = useCallback(async () => {
    if (!chatState.chat.chatId || !chatState.chatKey) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to finalize this chat? Once finalized, it cannot be modified and you'll need to fork it to continue the conversation."
    );
    if (!confirmed) return;

    chatStateDispatch({
      type: "set_finalized",
      finalized: true,
    });

    await saveChat({
      ...chatState.chat,
      finalized: true,
    }, chatState.chatKey);
  }, [
    chatState.chat,
    chatState.chatKey,
    chatStateDispatch,
  ]);

  const handleFork = async () => {
    const { chatId: newChatId, chatKey: newChatKey } = await createChatId();
    chatStateDispatch({
      type: "set_chat_key",
      chatKey: newChatKey,
      chatId: newChatId,
    });
    chatStateDispatch({
      type: "set_finalized",
      finalized: false
    });
    setChatId(newChatId);
  };

  const handleClearChat = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all messages and create a new chat?"
    );
    if (!confirmed) return;

    const currentModel = chatState.currentModel;
    chatStateDispatch({
      type: "reset_chat"
    });
    chatStateDispatch({
      type: "set_current_model",
      model: currentModel,
    })
    setChatId(undefined);
    setToolCallForPermission(undefined);
    approvedToolCalls.current = [];
  };

  const [currentPromptText, setCurrentPromptText] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSaveOpenRouterKey = (key: string) => {
    if (key) {
      localStorage.setItem("openRouterKey", key);
      setOpenRouterKey(key);
    } else {
      localStorage.removeItem("openRouterKey");
      setOpenRouterKey(undefined);
    }
  };

  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(false);

  const topBubbleContent2 = useMemo(() => {
    let ret = topBubbleContent;

    // Warn that this is an experimental app.
    const warning = "⚠️";
    ret += `\n\n${warning} This is an experimental app and is under construction.`;

    ret += `\n\n${warning} All chats are saved and may be visible to other users.`;

    if (!jupyterConnectivity.jupyterServerIsAvailable) {
      const warning = "⚠️";
      ret += `\n\n${warning} You are not connected to a Jupyter server. I will not be able to execute any code. Use the JUPYTER CONFIG tab to connect to a Jupyter server.`;
    }
    else {
      const checkmark = "✅";
      ret += `\n\n${checkmark} You are connected to a Jupyter server.`;
    }
    if (!recommendedModels.includes(chatState.currentModel)) {
      const warning = "⚠️";
      if (cheapModels.includes(chatState.currentModel)) {
        if (openRouterKey) {
          ret += `\n\n${warning} You are using ${chatState.currentModel}. The recommended model is ${recommendedModels[0]}.`;
        }
        else {
          ret += `\n\n${warning} You are using ${chatState.currentModel}, which is free for limited use. However, the recommended model is ${recommendedModels[0]} which requires an OpenRouter key. See the settings bar at the bottom of the chat.`;
        }
      }
      else {
        if (openRouterKey) {
          ret += `\n\n${warning} You are using ${chatState.currentModel}. The recommended model is ${recommendedModels[0]}.`;
        }
        else {
          ret += `\n\n${warning} You are using ${chatState.currentModel}. To use this model, you need to provide your own OpenRouter key. Click the gear icon to enter it.`;
        }
      }
    } else {
      const checkmark = "✅";
      ret += `\n\n${checkmark} You are using the recommended model: ${chatState.currentModel}.`;
    }
    return ret;
  }, [topBubbleContent, jupyterConnectivity, chatState.currentModel, openRouterKey]);


  const messagesForUi = useMemo(() => {
    const m = chatState.pendingMessages ? chatState.pendingMessages : chatState.chat.messages;
    let ret: ORMessage[] = [];
    const introMessage: ORMessage = {
      role: "assistant",
      content: topBubbleContent2,
    };
    ret.push(introMessage);

    ret = [...ret, ...m];

    const isFirstMessage = m.length === 0;
    if (isFirstMessage) {
      if (initialUserPromptChoices) {
        const userPromptChoicesMessage: ORMessage = {
          role: "assistant",
          content: initialUserPromptChoices
            .map(
              (choice) =>
                `[${choice}](?userPrompt=${encodeURIComponent(choice)})`
            )
            .join(" | "),
        };
        ret.push(userPromptChoicesMessage);
      }
    }

    return ret;
  }, [chatState, topBubbleContent2, initialUserPromptChoices]);

  return (
    <Box
      sx={{
        position: "relative",
        width,
        height,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MessageList
        messages={messagesForUi}
        scrollToBottomEnabled={scrollToBottomEnabled}
        toolCallForPermission={toolCallForPermission}
        onSetToolCallApproval={(toolCall, approved) => {
          approvedToolCalls.current.push({ toolCall, approved });
        }}
        toolCallForCancel={toolCallForCancelState?.toolCall}
        onCancelToolCall={toolCallForCancelState?.onCancel}
        onSpecialLinkClicked={(link) => {
          if (link.startsWith("?userPrompt=")) {
            const userPrompt = decodeURIComponent(link.substring(12));
            handleSendMessage(userPrompt);
          } else {
            console.warn("Unknown special link clicked:", link);
          }
        }}
        height={height - 65} // Reduced to accommodate input and compact status bar
        onDeleteMessage={
          (!isLoading && !chatState.chat.finalized)
            ? (msg) => {
                const confirmed = window.confirm(
                  "Are you sure you want to delete this message and all subsequent messages?"
                );
                if (!confirmed) {
                  return;
                }
                const messageIndex = chatState.chat.messages.findIndex((m) => m === msg);
                const index =
                  messageIndex === -1 ? chatState.chat.messages.length : messageIndex;
                chatStateDispatch({
                  type: "delete_message",
                  messageIndex: index
                })
                setToolCallForPermission(undefined);
                approvedToolCalls.current = [];
                setCurrentPromptText(
                  typeof msg.content === "string" ? msg.content : ""
                );
              }
            : undefined
        }
        isLoading={isLoading}
      />
      <Stack spacing={1} sx={{ p: 1 }}>
        {chatState.chat.finalized && (
          <Box sx={{ color: "warning.main", textAlign: "center", mb: 1 }}>
            This chat has been finalized and cannot be modified. Use the fork button to create a copy and continue the conversation.
          </Box>
        )}
        {chatState.chat.estimatedCost > MAX_CHAT_COST && (
          <Box sx={{ color: "error.main", textAlign: "center", mb: 1 }}>
            Chat cost has exceeded ${MAX_CHAT_COST.toFixed(2)}. You may want to start a new chat.
          </Box>
        )}
        {!cheapModels.includes(chatState.currentModel) && !openRouterKey && (
          <Box sx={{ color: "error.main", textAlign: "center", mb: 1 }}>
            To use this model you need to provide your own OpenRouter key. Click
            the gear icon to enter it.
          </Box>
        )}
        <MessageInput
          currentPromptText={currentPromptText}
          setCurrentPromptText={setCurrentPromptText}
          onSendMessage={handleSendMessage}
          disabled={
            isLoading ||
            // chatState.chat.estimatedCost > MAX_CHAT_COST ||
            (!cheapModels.includes(chatState.currentModel) && !openRouterKey) ||
            chatState.chat.finalized
          }
        />
      </Stack>
      <StatusBar
        selectedModel={chatState.currentModel}
        onModelChange={(model) => {
          chatStateDispatch({
            type: "set_current_model",
            model,
          });
        }}
        tokensUp={chatState.chat.promptTokens}
        tokensDown={chatState.chat.completionTokens}
        totalCost={chatState.chat.estimatedCost}
        isLoading={isLoading}
        messages={chatState.chat.messages}
        onClearChat={handleClearChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onFork={handleFork}
        onFinalize={handleFinalize}
        isFinalized={chatState.chat.finalized}
        canFinalize={!!chatState.chatKey && !chatState.chat.finalized}
      />
      <OpenRouterKeyDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentKey={openRouterKey}
        onSave={handleSaveOpenRouterKey}
      />
    </Box>
  );
};

export default ChatInterface;
