import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Stack, Box, Tooltip } from '@mui/material';
import LockIcon from "@mui/icons-material/Lock";
import { getAllStoredChatKeys, removeChatKeyInfo } from '../chat/chatKeyStorage';
import { Chat } from '../chat/Chat';
import { useNavigate } from 'react-router-dom';

const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
};

const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
};

const getUniqueModels = (chat: Chat) => {
    const models = new Set(chat.messageMetadata.map(m => m.model));
    return Array.from(models).join(', ');
};

interface AdminChatsPageProps {
    width: number;
    height: number;
}

const AdminChatsPage = ({ width, height }: AdminChatsPageProps) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const storedChatKeys = getAllStoredChatKeys();
    const passcode = "default-chat-passcode";

    const navigate = useNavigate();

    useEffect(() => {
        const fetchChats = async () => {
            const response = await fetch(
                `https://spyglass-explorer-api.vercel.app/api/list_chats?passcode=${passcode}`
            );

            if (!response.ok) {
                console.error("Failed to fetch chats");
                return;
            }

            const data = await response.json();
            setChats(data.chats);
        };

        fetchChats();
    }, []);

    return (
        <TableContainer
            component={Paper}
            sx={{
                width,
                height,
                overflow: 'auto'
            }}
        >
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Chat ID</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell>Messages</TableCell>
                        <TableCell>Est. Cost</TableCell>
                        <TableCell>Models</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {[...chats].sort((a, b) => b.timestampUpdated - a.timestampUpdated).map((chat) => (
                        <TableRow key={chat.chatId}>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <span>{chat.chatId.slice(0, 8)}</span>
                                    {chat.finalized && (
                                        <Tooltip title="Finalized chat">
                                            <LockIcon sx={{ width: 16, height: 16, color: 'warning.main' }} />
                                        </Tooltip>
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell>{formatTimestamp(chat.timestampCreated)}</TableCell>
                            <TableCell>{formatTimestamp(chat.timestampUpdated)}</TableCell>
                            <TableCell>{chat.messageMetadata.length}</TableCell>
                            <TableCell>{formatCost(chat.estimatedCost)}</TableCell>
                            <TableCell>{getUniqueModels(chat)}</TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            navigate(`/spyglass-explorer/chat?chatId=${chat.chatId}`);
                                        }}
                                    >
                                        Open
                                    </Button>
                                    {storedChatKeys[chat.chatId]?.chatKey && !chat.finalized && <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={async () => {
                                            const confirmed = window.confirm('Are you sure you want to delete this chat?');
                                            if (!confirmed) return;

                                            const chatKey = storedChatKeys[chat.chatId]?.chatKey || "";
                                            const response = await fetch(
                                                `https://spyglass-explorer-api.vercel.app/api/delete_chat?chatId=${chat.chatId}&chatKey=${chatKey}&passcode=${passcode}`,
                                                {
                                                    method: 'DELETE'
                                                }
                                            );

                                            if (!response.ok) {
                                                alert('Failed to delete chat');
                                                return;
                                            }

                                            if (storedChatKeys[chat.chatId]) {
                                                // Remove chat key from local storage if it exists
                                                removeChatKeyInfo(chat.chatId);
                                            }

                                            // Refresh the chats list
                                            const fetchResponse = await fetch(
                                                `https://spyglass-explorer-api.vercel.app/api/list_chats?passcode=${passcode}`
                                            );

                                            if (fetchResponse.ok) {
                                                const data = await fetchResponse.json();
                                                setChats(data.chats);
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>}
                                </Stack>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AdminChatsPage;
