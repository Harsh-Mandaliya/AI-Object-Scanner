// Holds the image currently being analysed.
//
// The photo is kept in memory instead of being passed as a route param,
// because Expo Router URL-encodes params and a base64 image is far too large
// for a URL anyway.

export type CapturedImage = {
  /** Something <Image> can display (file://, blob:, or data: URL). */
  uri: string;
  /** data:image/...;base64,... sent to the backend. */
  dataUrl: string;
  source: 'camera' | 'library';
};

let current: CapturedImage | null = null;

export function setCapturedImage(image: CapturedImage): void {
  current = image;
}

export function getCapturedImage(): CapturedImage | null {
  return current;
}

export function clearCapturedImage(): void {
  current = null;
}
