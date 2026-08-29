import "server-only";
import { env } from "@/lib/env";
import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";

export interface StoredFile {
  key: string;
  url: string;
}

export interface Storage {
  /** Writes a buffer and returns its public URL. */
  put(buffer: Buffer, opts: { folder: string; extension: string; contentType: string }): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

class LocalStorage implements Storage {
  private baseDir = path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR);
  private publicPath = env.LOCAL_STORAGE_PUBLIC_PATH;

  async put(buffer: Buffer, opts: { folder: string; extension: string }): Promise<StoredFile> {
    const key = `${opts.folder}/${nanoid()}.${opts.extension}`;
    const fullPath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { key, url: `${this.publicPath}/${key}` };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.rm(fullPath, { force: true });
  }
}

class S3Storage implements Storage {
  private bucket = env.S3_BUCKET!;
  private publicUrl = env.S3_PUBLIC_URL ?? "";

  private async client() {
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
    return { client, PutObjectCommand, DeleteObjectCommand };
  }

  async put(buffer: Buffer, opts: { folder: string; extension: string; contentType: string }): Promise<StoredFile> {
    const { client, PutObjectCommand } = await this.client();
    const key = `${opts.folder}/${nanoid()}.${opts.extension}`;
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: `${this.publicUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    const { client, DeleteObjectCommand } = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const storage: Storage = env.STORAGE_PROVIDER === "s3" ? new S3Storage() : new LocalStorage();
