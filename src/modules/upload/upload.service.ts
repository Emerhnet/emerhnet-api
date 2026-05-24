import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { env } from '../../config/env';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadFileToS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'bin';
  const key = `uploads/${randomBytes(16).toString('hex')}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${originalName}"`,
    }),
  );

  return key;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key }),
    { expiresIn },
  );
}
