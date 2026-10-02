// src/app/scanner.tsx

import React, {
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  router,
} from 'expo-router';

import {
  setCapturedImageUri,
} from '@/services/scannerSession';

export default function ScannerScreen() {
  // ============================================================
  // CAMERA REF
  // ============================================================

  const cameraRef =
    useRef<CameraView | null>(null);

  // ============================================================
  // CAMERA PERMISSION
  // ============================================================

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  // ============================================================
  // CAMERA FACING
  // ============================================================

  const [
    facing,
    setFacing,
  ] = useState<'back' | 'front'>(
    'back'
  );

  // ============================================================
  // CAPTURE STATE
  // ============================================================

  const [
    isCapturing,
    setIsCapturing,
  ] = useState(false);

  // ============================================================
  // PERMISSION LOADING
  // ============================================================

  if (!permission) {
    return (
      <View
        style={
          styles.permissionContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#111827"
        />
      </View>
    );
  }

  // ============================================================
  // PERMISSION NOT GRANTED
  // ============================================================

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={
          styles.permissionContainer
        }
        edges={[
          'top',
          'bottom',
        ]}
      >
        <Text
          style={
            styles.permissionIcon
          }
        >
          📷
        </Text>

        <Text
          style={
            styles.permissionTitle
          }
        >
          Camera Permission Required
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          AI Object Scanner needs camera
          access to identify objects.
        </Text>

        <Pressable
          style={
            styles.permissionButton
          }
          onPress={requestPermission}
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            Allow Camera
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.backButtonPermission
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            Go Back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ============================================================
  // TAKE PICTURE
  // ============================================================

  const takePicture = async () => {
    if (
      !cameraRef.current ||
      isCapturing
    ) {
      return;
    }

    try {
      setIsCapturing(true);

      console.log(
        '📸 Taking picture...'
      );

      const photo =
        await cameraRef.current.takePictureAsync(
          {
            quality: 0.8,
            base64: false,
            skipProcessing: false,
          }
        );

      // ========================================================
      // VALIDATE PHOTO
      // ========================================================

      if (!photo?.uri) {
        throw new Error(
          'Camera did not return an image.'
        );
      }

      console.log(
        '📸 Photo captured:',
        photo.uri
      );

      // ========================================================
      // IMPORTANT FIX
      // ========================================================
      //
      // DO NOT pass the file URI through
      // Expo Router params.
      //
      // Expo Router URL-encodes the URI and
      // corrupts the file path.
      //
      // Store it in the scanner session instead.
      // ========================================================

      setCapturedImageUri(
        photo.uri
      );

      console.log(
        '➡️ Opening result screen...'
      );

      router.push('/result');

    } catch (error) {
      console.error(
        '❌ Camera capture error:',
        error
      );

      Alert.alert(
        'Capture Failed',
        error instanceof Error
          ? error.message
          : 'Unable to capture image.'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // ============================================================
  // FLIP CAMERA
  // ============================================================

  const flipCamera = () => {
    setFacing(
      current =>
        current === 'back'
          ? 'front'
          : 'back'
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <View
      style={styles.container}
    >

      {/* ======================================================
          CAMERA
      ====================================================== */}

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />

      {/* ======================================================
          OVERLAY
      ====================================================== */}

      <View
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <SafeAreaView
          style={styles.safeArea}
          edges={[
            'top',
            'bottom',
          ]}
        >

          {/* ==================================================
              TOP BAR
          ================================================== */}

          <View
            style={styles.topBar}
          >

            <Pressable
              style={styles.topButton}
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.topButtonText
                }
              >
                ‹
              </Text>
            </Pressable>

            <Text
              style={
                styles.headerTitle
              }
            >
              Scan Object
            </Text>

            <Pressable
              style={styles.topButton}
              onPress={flipCamera}
            >
              <Text
                style={styles.flipIcon}
              >
                🔄
              </Text>
            </Pressable>

          </View>

          {/* ==================================================
              SCAN AREA
          ================================================== */}

          <View
            style={
              styles.scanAreaContainer
            }
          >
            <Text
              style={
                styles.instructionText
              }
            >
              Place the object inside the frame
            </Text>

            <View
              style={styles.scanFrame}
            >

              <View
                style={[
                  styles.corner,
                  styles.topLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.topRight,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.bottomLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.bottomRight,
                ]}
              />

            </View>
          </View>

          {/* ==================================================
              BOTTOM CONTROLS
          ================================================== */}

          <View
            style={
              styles.bottomContainer
            }
          >
            <Text
              style={styles.bottomText}
            >
              Make sure the object is clearly visible
            </Text>

            <Pressable
              style={[
                styles.captureButton,
                isCapturing &&
                  styles.captureButtonDisabled,
              ]}
              onPress={takePicture}
              disabled={isCapturing}
            >
              <View
                style={
                  styles.captureInner
                }
              >
                {isCapturing ? (
                  <ActivityIndicator
                    size="small"
                    color="#111827"
                  />
                ) : (
                  <Text
                    style={
                      styles.cameraIcon
                    }
                  >
                    📷
                  </Text>
                )}
              </View>
            </Pressable>
          </View>

        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ==========================================================
  // CAMERA
  // ==========================================================

  camera: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  // ==========================================================
  // PERMISSION
  // ==========================================================

  permissionContainer: {
    flex: 1,
    backgroundColor: '#F7F7F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  permissionIcon: {
    fontSize: 60,
    marginBottom: 20,
  },

  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },

  permissionText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 25,
  },

  permissionButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  backButtonPermission: {
    marginTop: 14,
    paddingVertical: 12,
  },

  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // ==========================================================
  // OVERLAY
  // ==========================================================

  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },

  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ==========================================================
  // TOP BAR
  // ==========================================================

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  topButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor:
      'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topButtonText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 42,
  },

  flipIcon: {
    fontSize: 20,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // ==========================================================
  // SCAN AREA
  // ==========================================================

  scanAreaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 22,
    textAlign: 'center',
    backgroundColor:
      'rgba(0,0,0,0.45)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },

  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderColor: '#FFFFFF',
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },

  // ==========================================================
  // BOTTOM
  // ==========================================================

  bottomContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },

  bottomText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 18,
    backgroundColor:
      'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 15,
  },

  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor:
      'rgba(255,255,255,0.5)',
  },

  captureButtonDisabled: {
    opacity: 0.7,
  },

  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraIcon: {
    fontSize: 27,
  },
});