import path from 'path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

export interface StoredFile {
  url: string;
  key: string;
}

async function storeLocal(file: Express.Multer.File, folder: string): Promise<StoredFile> {
  const dir = path.resolve(env.localUploadDir, folder);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(file.originalname) || '.bin';
  const key = `${folder}/${uuid()}${ext}`;
  const dest = path.resolve(env.localUploadDir, key);
  await fs.writeFile(dest, file.buffer);
  return { url: publicAssetUrl(`/uploads/${key}`), key };
}

async function storeCloudinary(file: Express.Multer.File, folder: string): Promise<StoredFile> {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new AppError(500, 'Cloudinary is not configured');
  }

  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });

  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `sheettomate/${folder}`, resource_type: 'auto' },
      (error, upload) => {
        if (error || !upload) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ secure_url: upload.secure_url, public_id: upload.public_id });
      },
    );
    stream.end(file.buffer);
  });

  return { url: result.secure_url, key: result.public_id };
}

async function storeS3(file: Express.Multer.File, folder: string): Promise<StoredFile> {
  if (!env.awsS3Bucket || !env.awsAccessKeyId) {
    throw new AppError(500, 'AWS S3 is not configured');
  }

  logger.warn('S3 storage selected but SDK upload is a stub; configure AWS SDK in production', {
    bucket: env.awsS3Bucket,
  });

  const key = `templates/${folder}/${uuid()}-${file.originalname}`;
  const origin = `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
  return {
    url: env.cdnBaseUrl ? `${env.cdnBaseUrl}/${key}` : origin,
    key,
  };
}

export async function storeTemplateFile(
  file: Express.Multer.File,
  folder = 'templates/files',
): Promise<StoredFile> {
  if (env.storageProvider === 'cloudinary') {
    return storeCloudinary(file, folder);
  }
  if (env.storageProvider === 's3') {
    return storeS3(file, folder);
  }
  return storeLocal(file, folder);
}

export function publicAssetUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    if (env.cdnBaseUrl && pathOrUrl.includes('amazonaws.com') && env.awsS3Bucket) {
      return pathOrUrl.replace(`https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com`, env.cdnBaseUrl);
    }
    return pathOrUrl;
  }
  if (env.cdnBaseUrl) {
    return `${env.cdnBaseUrl}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  }
  return pathOrUrl;
}

export function resolveLocalFile(fileUrl: string, fileKey?: string | null): string | null {
  const key = fileKey || (fileUrl.startsWith('/uploads/') ? fileUrl.replace('/uploads/', '') : null);
  if (!key || key.includes('..')) {
    return null;
  }
  return path.resolve(env.localUploadDir, key);
}
