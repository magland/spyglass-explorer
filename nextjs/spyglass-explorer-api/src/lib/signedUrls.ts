import {
  Bucket,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  objectExists,
} from "./s3Helpers";

export const createSignedDownloadUrl = async (a: {
  zone: Zone;
  chatId: string;
}): Promise<{
  found: boolean;
  signedDownloadUrl: string;
  size: number;
  objectKey: string;
}> => {
  const h = a.chatId;
  const objectKey = joinKeys(
    a.zone.directory || "",
    `chats/${h[0]}${h[1]}/${a.chatId}/chat.json`,
  );

  const bucket: Bucket = {
    uri: a.zone.bucketUri,
    credentials: a.zone.credentials,
  };
  const { exists, size } = await objectExists(bucket, objectKey);
  if (!exists) {
    return {
      found: false,
      signedDownloadUrl: "",
      size: 0,
      objectKey,
    };
  }

  const url = await getSignedDownloadUrl(bucket, objectKey, 60 * 60);

  return {
    found: true,
    signedDownloadUrl: url,
    size: size || 0,
    objectKey,
  };
};

export const checkFileExists = async (a: {
  zone: Zone;
  hash: string;
  hashAlg: string;
}): Promise<boolean> => {
  const h = a.hash;
  const objectKey = joinKeys(
    a.zone.directory || "",
    `${a.hashAlg}/${h[0]}${h[1]}/${h[2]}${h[3]}/${h[4]}${h[5]}/${a.hash}`,
  );

  const bucket: Bucket = {
    uri: a.zone.bucketUri,
    credentials: a.zone.credentials,
  };
  const { exists } = await objectExists(bucket, objectKey);
  return exists;
};

type Zone = {
  bucketUri: string;
  directory: string;
  credentials: string;
}

export const createSignedUploadUrl = async (a: {
  zone: Zone;
  size: number;
  chatId: string;
}): Promise<{
  signedUploadUrl: string;
  objectKey: string;
}> => {
  const h = a.chatId;
  const objectKey = joinKeys(
    a.zone.directory || "",
    `chats/${h[0]}${h[1]}/${a.chatId}/chat.json`,
  );
  const bucket: Bucket = {
    uri: a.zone.bucketUri,
    credentials: a.zone.credentials,
  };
  const url = await getSignedUploadUrl(bucket, objectKey);

  return {
    signedUploadUrl: url,
    objectKey,
  };
};

export const joinKeys = (a: string, b: string) => {
  if (!a) return b;
  if (!b) return a;
  if (a.endsWith("/")) return a + b;
  else return a + "/" + b;
};
