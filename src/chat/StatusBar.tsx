/* eslint-disable @typescript-eslint/no-explicit-any */
import { ForkRight, ResetTv } from "@mui/icons-material";
import LockIcon from "@mui/icons-material/Lock";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { FunctionComponent } from "react";
import { AVAILABLE_MODELS } from "./availableModels";
import { ORMessage } from "./openRouterTypes";

const StatusBar: FunctionComponent<{
  selectedModel: string;
  onModelChange: (model: string) => void;
  tokensUp?: number;
  tokensDown?: number;
  totalCost?: number;
  isLoading?: boolean;
  messages: ORMessage[];
  onClearChat?: () => void;
  onUploadChat?: (chatData: any) => void;
  onOpenSettings?: () => void;
  onFork?: () => void;
  onFinalize?: () => void;
  isFinalized?: boolean;
  canFinalize?: boolean;
}> = ({
  selectedModel,
  onModelChange,
  tokensUp = 0,
  tokensDown = 0,
  totalCost = 0,
  isLoading = false,
  messages,
  onClearChat,
  onOpenSettings,
  onFork,
  onFinalize,
  isFinalized,
  canFinalize
}) => {
  const numMessages = messages.length;

  return (
    <Box
      sx={{
        p: 0.5,
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FormControl
          size="small"
          sx={{
            minWidth: 150,
            "& .MuiInputLabel-root": { fontSize: "0.8rem" },
            "& .MuiSelect-select": { fontSize: "0.8rem", py: 0.5 },
          }}
        >
          <InputLabel
            id="model-select-label"
            sx={{ backgroundColor: "background.paper", px: 0.25 }}
          >
            Model
          </InputLabel>
          <Select
            labelId="model-select-label"
            value={selectedModel}
            label="Model"
            onChange={(e) => onModelChange(e.target.value as string)}
          >
            {AVAILABLE_MODELS.map((m) => (
              <MenuItem key={m.model} value={m.model}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          size="small"
          title="Clear all messages and start a new chat"
          disabled={isLoading || numMessages === 0}
          onClick={onClearChat}
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "error.main",
            },
          }}
        >
          <ResetTv fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          title="OpenRouter Settings"
          onClick={onOpenSettings}
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
        {onFork && (
          <IconButton
            size="small"
            title="Create a fork of this chat with a new ID"
            onClick={onFork}
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
              },
            }}
            disabled={isLoading}
          >
            <ForkRight fontSize="small" sx={{ width: 16, height: 16 }} />
          </IconButton>
        )}
        {canFinalize && !isFinalized && (
          <IconButton
            size="small"
            title="Finalize this chat - it will become read-only"
            onClick={onFinalize}
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "warning.main",
              },
            }}
            disabled={isLoading}
          >
            <LockIcon fontSize="small" sx={{ width: 16, height: 16 }} />
          </IconButton>
        )}
        {isFinalized && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LockIcon sx={{ width: 16, height: 16, color: 'warning.main' }} />
            <span style={{ fontSize: '0.8rem', color: 'warning.main' }}>Finalized</span>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          fontSize: "0.8rem",
          color: "text.secondary",
          ml: "auto",
          display: "flex",
          gap: 0.5,
          alignItems: "center",
        }}
      >
        <span>
          ↑{(tokensUp / 1000).toFixed(1)}k ↓{(tokensDown / 1000).toFixed(1)}k
          tokens
        </span>
        <span>${totalCost.toFixed(3)}</span>
      </Box>
    </Box>
  );
};

export default StatusBar;
