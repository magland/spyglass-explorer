import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { connectDB } from '../../../lib/mongodb';
import { Chat } from '../../../models/Chat';

const sha1Hash = (data: string) => {
    const hash = createHash('sha1');
    hash.update(data);
    return hash.digest('hex');
};

export async function DELETE(
    request: Request
) {
    try {
        const { searchParams } = new URL(request.url);
        const chatId = searchParams.get('chatId');
        const chatKey = searchParams.get('chatKey');
        const passcode = searchParams.get('passcode');

        if (!chatId) {
            return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
        }

        if (!chatKey) {
            return NextResponse.json({ error: 'Chat key is required' }, { status: 400 });
        }

        const chatKeyHash = await sha1Hash(chatKey);
        if (chatKeyHash !== chatId) {
            return NextResponse.json({ error: 'Invalid chat key' }, { status: 401 });
        }

        if (!passcode || passcode !== process.env.CHAT_PASSCODE) {
            return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
        }

        // Check if chat is finalized before deleting
        await connectDB();
        const chat = await Chat.findOne({ chatId });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        if (chat.finalized) {
            return NextResponse.json({ error: 'Cannot delete a finalized chat' }, { status: 403 });
        }

        const result = await Chat.deleteOne({ chatId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in delete_chat:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
