import { Box, CircularProgress } from "@mui/material";
import { FunctionComponent, useEffect, useRef } from "react";
import Message from "./Message";
import ToolApprovalMessage from "./ToolApprovalMessage";
import { ORMessage, ORToolCall } from "./openRouterTypes";

type MessageListProps = {
  messages: ORMessage[];
  scrollToBottomEnabled: boolean;
  toolCallForPermission?: ORToolCall;
  onSetToolCallApproval?: (toolCall: ORToolCall, approved: boolean) => void;
  toolCallForCancel?: ORToolCall | "completion";
  onCancelToolCall?: (toolCall: ORToolCall | "completion") => void;
  height: number;
  onDeleteMessage?: (message: ORMessage) => void;
  onSpecialLinkClicked?: (linkText: string) => void;
  isLoading: boolean;
};

const MessageList: FunctionComponent<MessageListProps> = ({
  messages,
  scrollToBottomEnabled,
  toolCallForPermission,
  onSetToolCallApproval,
  toolCallForCancel,
  onCancelToolCall,
  height,
  onDeleteMessage,
  onSpecialLinkClicked,
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (scrollToBottomEnabled) {
      scrollToBottom();
    }
  }, [messages, toolCallForPermission, scrollToBottomEnabled]);

  return (
    <Box
      sx={{
        height: height - 100, // Leave space for input
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        py: 2,
      }}
    >
      {messages
        .map((msg, index) => (
          <Box key={index}>
            <Message
              message={msg}
              messages={messages}
              isUser={msg.role === "user"}
              onDeleteMessage={
                msg.role === "user" && onDeleteMessage
                  ? () => onDeleteMessage(msg)
                  : undefined
              }
              onSpecialLinkClicked={onSpecialLinkClicked}
            />
          </Box>
        ))}
      {toolCallForPermission && onSetToolCallApproval && (
        <ToolApprovalMessage
          toolCallForPermission={toolCallForPermission}
          onSetToolCallApproval={onSetToolCallApproval}
        />
      )}
      {toolCallForCancel && onCancelToolCall && (
        <button onClick={() => {
          onCancelToolCall(toolCallForCancel)
        }}
          style={{
            background: "gray",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {toolCallForCancel === "completion" ? "Cancel Completion" : `Cancel ${toolCallForCancel.function.name}`}
        </button>
      )}
      {isLoading && (
        <CircularProgress size={20} sx={{ alignSelf: "center" }} />
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
