import * as ImagePicker from 'expo-image-picker';

import type { CapturedImage } from './scannerSession';
import { dataUrlSizeBytes, toImageDataUrl } from './utils';

// Matches the server default (MAX_IMAGE_MB=8).
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// 0.6 keeps phone photos around 0.5–2 MB, which is plenty for recognition.
export const IMAGE_QUALITY = 0.6;

export function ensureImageSize(dataUrl: string): void {
  if (dataUrlSizeBytes(dataUrl) > MAX_IMAGE_BYTES) {
    throw new Error('This image is larger than 8 MB. Please choose a smaller photo.');
  }
}

/** Opens the photo library. Returns null if the user cancels. */
export async function pickImageFromLibrary(): Promise<CapturedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: IMAGE_QUALITY,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const dataUrl = toImageDataUrl(asset.base64 ?? (asset.uri.startsWith('data:') ? asset.uri : null), asset.mimeType ?? 'image/jpeg');
  if (!dataUrl) {
    throw new Error('Could not read the selected image.');
  }
  ensureImageSize(dataUrl);
  return { uri: asset.uri, dataUrl, source: 'library' };
}
