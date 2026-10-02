// src/services/scannerSession.ts

let capturedImageUri: string | null = null;

/**
 * Store the latest captured camera image URI.
 */
export const setCapturedImageUri = (
  uri: string
): void => {
  capturedImageUri = uri;

  console.log(
    '💾 Scanner session URI stored:',
    uri
  );
};

/**
 * Get the latest captured image URI.
 */
export const getCapturedImageUri = (): string | null => {
  return capturedImageUri;
};

/**
 * Clear the stored image URI.
 */
export const clearCapturedImageUri = (): void => {
  capturedImageUri = null;
};