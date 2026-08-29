import "server-only";
import sharp from "sharp";
import { storage } from "@/lib/storage";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12MB upload cap, pre-compression
export const MAX_IMAGES_PER_LISTING = 12;
export const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const FULL_MAX_DIMENSION = 1920;
const THUMB_MAX_DIMENSION = 480;
const JPEG_QUALITY = 82;

export interface ProcessedImage {
  url: string;
  key: string;
  thumbnailUrl: string;
  thumbnailKey: string;
  width: number;
  height: number;
}

/**
 * Validates, strips EXIF/GPS metadata, compresses, and generates a thumbnail
 * for a user-uploaded listing photo. Re-encoding through sharp (rather than
 * storing the original bytes) also neutralizes most image-based exploits
 * (e.g. polyglot files, embedded scripts in metadata) as a side effect.
 */
export async function processListingImage(buffer: Buffer): Promise<ProcessedImage> {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024}MB upload limit.`);
  }

  const image = sharp(buffer, { failOn: "error" }).rotate(); // .rotate() auto-orients from EXIF, then strips it
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions — the file may be corrupt or not a supported image.");
  }
  if (metadata.width < 200 || metadata.height < 200) {
    throw new Error("Image is too small. Minimum size is 200x200px.");
  }

  const full = await image
    .clone()
    .resize({ width: FULL_MAX_DIMENSION, height: FULL_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const thumb = await image
    .clone()
    .resize({ width: THUMB_MAX_DIMENSION, height: THUMB_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const [fullFile, thumbFile] = await Promise.all([
    storage.put(full.data, { folder: "listings/full", extension: "jpg", contentType: "image/jpeg" }),
    storage.put(thumb.data, { folder: "listings/thumb", extension: "jpg", contentType: "image/jpeg" }),
  ]);

  return {
    url: fullFile.url,
    key: fullFile.key,
    thumbnailUrl: thumbFile.url,
    thumbnailKey: thumbFile.key,
    width: full.info.width,
    height: full.info.height,
  };
}

const AVATAR_DIMENSION = 320;

/** Processes a profile photo: square-cropped, fixed size, EXIF stripped. */
export async function processAvatarImage(buffer: Buffer): Promise<{ url: string; key: string }> {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024}MB upload limit.`);
  }
  const image = sharp(buffer, { failOn: "error" }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions — the file may be corrupt or not a supported image.");
  }

  const output = await image
    .resize({ width: AVATAR_DIMENSION, height: AVATAR_DIMENSION, fit: "cover" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const file = await storage.put(output, { folder: "avatars", extension: "jpg", contentType: "image/jpeg" });
  return { url: file.url, key: file.key };
}

export type AutoModerationVerdict = "APPROVED" | "PENDING" | "REJECTED";

/**
 * Automated image moderation hook. No ML/vision provider is wired up by
 * default (none of the standard ones — AWS Rekognition, Google Vision,
 * Sightengine — has credentials in this environment), so uploads are
 * auto-approved and rely on the admin moderation queue + user reports for
 * enforcement, per the "never auto-delete on classifier uncertainty" rule.
 * To enable automated screening, implement this function against your
 * provider of choice and it will run before an image is attached to a
 * listing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for future provider implementations
export async function autoModerateImage(buffer: Buffer): Promise<AutoModerationVerdict> {
  return "APPROVED";
}
