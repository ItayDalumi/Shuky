import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { NewPhoto } from './api';

/** Longest side of uploaded photos */
const MAX_SIDE = 1600;

/**
 * Prepares a picked photo for upload: re-encodes it as a fresh JPEG (no EXIF / GPS / other
 * metadata survives re-encoding) and downsizes it. api.uploadPhoto() also strips metadata
 * segments from the bytes as a second safety net.
 */
export async function preparePhoto(uri: string): Promise<NewPhoto & { uri: string }> {
  const image = await ImageManipulator.manipulate(uri, { maxWidth: MAX_SIDE, maxHeight: MAX_SIDE }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error('could not process the photo');
  return { uri: saved.uri, base64: saved.base64, mimeType: 'image/jpeg' };
}
