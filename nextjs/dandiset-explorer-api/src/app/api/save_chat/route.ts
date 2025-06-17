import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createSignedUploadUrl } from '../../../lib/signedUrls';
import { connectDB } from '../../../lib/mongodb';
import { Chat } from '../../../models/Chat';

const s3BucketUri = process.env.S3_BUCKET_URI;
const s3Credentials = process.env.S3_CREDENTIALS;

if (!s3BucketUri) {
    throw new Error('S3_BUCKET_URI is not defined');
}
if (!s3Credentials) {
    throw new Error('S3_CREDENTIALS is not defined');
}

const zone = {
    bucketUri: s3BucketUri,
    credentials: s3Credentials,
    directory: 'spyglass-explorer-chats'
};

const sha1Hash = (data: string) => {
    const hash = createHash('sha1');
    hash.update(data);
    return hash.digest('hex');
};

export async function POST(
    request: Request
) {
    try {
        const { chat, chatKey, size, passcode } = await request.json();
        const { chatId } = chat;

        // Validate required fields
        if (!chatId || !chatKey || !size) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const chatKeyHash = await sha1Hash(chatKey);
        if (chatKeyHash !== chatId) {
            return NextResponse.json({ error: 'Invalid chat key' }, { status: 401 });
        }

        if (!passcode || passcode !== process.env.CHAT_PASSCODE) {
            return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
        }

        if (size > 1024 * 1024 * 100) {
            return NextResponse.json({ error: 'File size exceeds limit' }, { status: 400 });
        }

        // Get object key and signed URL
        const { objectKey, signedUploadUrl } = await createSignedUploadUrl({
            zone,
            chatId,
            size
        });

        // Construct permanent URL
        const permanentUrl = `https://neurosift.org/${objectKey}`;

        // Save metadata to MongoDB
        await connectDB();
        await Chat.findOneAndUpdate(
            { chatId },
            {
                ...chat,
                chatUrl: permanentUrl,
            },
            { upsert: true }
        );

        return NextResponse.json({ signedUrl: signedUploadUrl });
    } catch (error) {
        console.error('Error in save_chat:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
