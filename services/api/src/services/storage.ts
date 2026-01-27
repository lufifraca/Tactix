import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../env";

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // important for MinIO
});

export function encodeS3Key(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export async function putObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; publicUrl: string }> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );

  const publicUrl = `${env.S3_PUBLIC_BASE_URL}/${encodeS3Key(params.key)}`;
  return { key: params.key, publicUrl };
}

import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function getObject(key: string): Promise<string | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return res.Body?.transformToString() ?? null;
  } catch {
    return null;
  }
}

export async function listObjects(prefix: string): Promise<string[]> {
  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: env.S3_BUCKET, Prefix: prefix }));
    return res.Contents?.map((c) => c.Key).filter((k): k is string => !!k) ?? [];
  } catch {
    return [];
  }
}
