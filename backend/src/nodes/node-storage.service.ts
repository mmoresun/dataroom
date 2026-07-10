import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AllConfigType } from '../config/config.type';

const PRESIGNED_URL_EXPIRES_IN_SECONDS = 3600;

/** S3 presigned-URL operations for Node (PDF) storage — separate from the boilerplate's
 * own `files` module, which is hardcoded to images/5MB for user avatars (see CLAUDE.md). */
@Injectable()
export class NodeStorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.s3 = new S3Client({
      region: this.configService.get('file.awsS3Region', { infer: true }),
      credentials: {
        accessKeyId: this.configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: this.configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    });
    this.bucket = this.configService.getOrThrow('file.awsDefaultS3Bucket', {
      infer: true,
    });
  }

  async presignUpload(key: string, contentLength: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: contentLength,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
    });
  }

  async presignDownload(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
    });
  }

  /** Confirms the object actually landed in S3 (right key exists). Returns null if not found. */
  async headObject(key: string): Promise<{ size?: number } | null> {
    try {
      const result = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { size: result.ContentLength };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
