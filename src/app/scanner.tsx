import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { ensureImageSize, IMAGE_QUALITY, pickImageFromLibrary } from '@/services/imageCapture';
import { setCapturedImage, type CapturedImage } from '@/services/scannerSession';
import { toImageDataUrl } from '@/services/utils';

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ScannerScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const openResult = (image: CapturedImage) => {
    setCapturedImage(image);
    router.push('/result');
  };

  const takePicture = async () => {
    if (!cameraRef.current || busy || !cameraReady) return;
    try {
      setBusy(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: IMAGE_QUALITY, base64: true });
      const dataUrl = toImageDataUrl(photo?.base64 ?? (photo?.uri?.startsWith('data:') ? photo.uri : null));
      if (!photo?.uri || !dataUrl) {
        throw new Error('The camera did not return an image.');
      }
      ensureImageSize(dataUrl);
      openResult({ uri: photo.uri, dataUrl, source: 'camera' });
    } catch (error) {
      showError('Capture failed', error instanceof Error ? error.message : 'Unable to capture image.');
    } finally {
      setBusy(false);
    }
  };

  const chooseFromLibrary = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const image = await pickImageFromLibrary();
      if (image) openResult(image);
    } catch (error) {
      showError('Could not open photo', error instanceof Error ? error.message : 'Unable to load the image.');
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------
  // Permission states
  // ------------------------------------------------------------

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Allow camera access to scan objects, or pick an existing photo instead.
        </Text>

        {permission.canAskAgain !== false ? (
          <Pressable style={styles.primaryButton} onPress={requestPermission} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Allow Camera</Text>
          </Pressable>
        ) : (
          <Text style={styles.permissionHint}>Camera access was denied. Enable it in your device settings.</Text>
        )}

        <Pressable style={styles.secondaryButton} onPress={chooseFromLibrary} accessibilityRole="button">
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Choose from Photos</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.linkButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------
  // Camera
  // ------------------------------------------------------------

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        onCameraReady={() => setCameraReady(true)}
        onMountError={(event) => showError('Camera unavailable', event.message)}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.roundButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <Text style={styles.roundButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Scan Object</Text>
          {Platform.OS !== 'web' ? (
            <Pressable
              style={[styles.roundButton, torch && styles.roundButtonActive]}
              onPress={() => setTorch((on) => !on)}
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
            >
              <Text style={styles.iconText}>{torch ? '🔦' : '💡'}</Text>
            </Pressable>
          ) : (
            <View style={styles.roundButtonPlaceholder} />
          )}
        </View>

        <View style={styles.frameArea} pointerEvents="none">
          <Text style={styles.instruction}>Place the object inside the frame</Text>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.tip}>Good light and a plain background give the best results</Text>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.sideButton} onPress={chooseFromLibrary} accessibilityLabel="Choose from photos">
            <Text style={styles.iconText}>🖼️</Text>
            <Text style={styles.sideButtonLabel}>Photos</Text>
          </Pressable>

          <Pressable
            style={[styles.captureButton, (busy || !cameraReady) && styles.captureDisabled]}
            onPress={takePicture}
            disabled={busy || !cameraReady}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={styles.captureInner}>
              {busy || !cameraReady ? <ActivityIndicator color={colors.primary} /> : null}
            </View>
          </Pressable>

          <Pressable
            style={styles.sideButton}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityLabel="Flip camera"
          >
            <Text style={styles.iconText}>🔄</Text>
            <Text style={styles.sideButtonLabel}>Flip</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER = 34;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },

  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionIcon: { fontSize: 56, marginBottom: 16 },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  permissionText: { marginTop: 10, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  permissionHint: { marginTop: 22, fontSize: 13, color: colors.warning, textAlign: 'center' },
  primaryButton: {
    marginTop: 26,
    minWidth: 220,
    paddingVertical: 15,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    marginTop: 12,
    minWidth: 220,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 14, padding: 10 },
  linkButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonActive: { backgroundColor: 'rgba(250,204,21,0.6)' },
  roundButtonPlaceholder: { width: 44, height: 44 },
  roundButtonText: { color: '#FFFFFF', fontSize: 32, lineHeight: 34, marginTop: -3 },
  iconText: { fontSize: 20 },

  frameArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  instruction: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  frame: { width: 270, height: 270 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF' },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 14 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 14 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 14 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 14,
  },
  tip: { marginTop: 18, color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 24,
    paddingTop: 12,
  },
  sideButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonLabel: { color: '#FFFFFF', fontSize: 10, marginTop: 2, fontWeight: '600' },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureDisabled: { opacity: 0.6 },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
