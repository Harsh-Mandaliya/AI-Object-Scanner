import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn, NATIVE, Pulse, Ripple, ScanLine } from '@/components/motion';
import { colors, gradients, radius } from '@/constants/theme';
import { ensureImageSize, IMAGE_QUALITY, pickImageFromLibrary } from '@/services/imageCapture';
import { setCapturedImage, type CapturedImage } from '@/services/scannerSession';
import { toImageDataUrl } from '@/services/utils';

const FRAME = 270;

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
  const [flash] = useState(() => new Animated.Value(0));

  const openResult = (image: CapturedImage) => {
    setCapturedImage(image);
    router.push('/result');
  };

  // White "shutter" flash when a photo is taken.
  const playFlash = () => {
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: NATIVE }).start();
  };

  const takePicture = async () => {
    if (!cameraRef.current || busy || !cameraReady) return;
    try {
      setBusy(true);
      playFlash();
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={gradients.dark} style={styles.permissionScreen}>
        <SafeAreaView style={styles.centeredDark} edges={['top', 'bottom']}>
          <FadeIn style={styles.permissionContent}>
            <View style={styles.permissionIconWrap}>
              <Ripple size={96} color={colors.cyan} />
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permissionIcon}>
                <Ionicons name="camera" size={42} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Allow the camera to scan objects, or pick an existing photo instead.
            </Text>

            {permission.canAskAgain !== false ? (
              <Pressable onPress={requestPermission} accessibilityRole="button" style={styles.fullWidth}>
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
                  <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Allow Camera</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Text style={styles.permissionHint}>Camera access was denied. Enable it in your device settings.</Text>
            )}

            <Pressable style={styles.secondaryButton} onPress={chooseFromLibrary} accessibilityRole="button">
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.secondaryButtonText}>Choose from Photos</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.linkButton} onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.linkButtonText}>Go back</Text>
            </Pressable>
          </FadeIn>
        </SafeAreaView>
      </LinearGradient>
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

      {/* Darken the edges so the frame stands out */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(2,6,23,0.75)', 'rgba(2,6,23,0)', 'rgba(2,6,23,0)', 'rgba(2,6,23,0.85)']}
        locations={[0, 0.25, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.roundButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.titlePill}>
            <View style={styles.liveDot} />
            <Text style={styles.headerTitle}>Scan Object</Text>
          </View>
          {Platform.OS !== 'web' ? (
            <Pressable
              style={[styles.roundButton, torch && styles.roundButtonActive]}
              onPress={() => setTorch((on) => !on)}
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
            >
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color={torch ? '#0F172A' : '#FFFFFF'} />
            </Pressable>
          ) : (
            <View style={styles.roundButtonPlaceholder} />
          )}
        </View>

        <View style={styles.frameArea} pointerEvents="none">
          <FadeIn>
            <Text style={styles.instruction}>Place the object inside the frame</Text>
          </FadeIn>
          <Pulse min={1} max={1.025} duration={1400}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {cameraReady ? <ScanLine height={FRAME} color={colors.cyan} /> : null}
            </View>
          </Pulse>
          <View style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.tip}>Good light and a plain background work best</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.sideButton} onPress={chooseFromLibrary} accessibilityLabel="Choose from photos">
            <Ionicons name="images" size={22} color="#FFFFFF" />
            <Text style={styles.sideButtonLabel}>Photos</Text>
          </Pressable>

          <View style={styles.captureWrap}>
            {cameraReady && !busy ? <Ripple size={84} color="#FFFFFF" duration={2000} /> : null}
            <Pressable
              style={[styles.captureButton, (busy || !cameraReady) && styles.captureDisabled]}
              onPress={takePicture}
              disabled={busy || !cameraReady}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.captureInner}>
                {busy || !cameraReady ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name="scan" size={28} color="#FFFFFF" />
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable
            style={styles.sideButton}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityLabel="Flip camera"
          >
            <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
            <Text style={styles.sideButtonLabel}>Flip</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
    </View>
  );
}

const CORNER = 36;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  flash: { backgroundColor: '#FFFFFF' },

  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  permissionScreen: { flex: 1 },
  centeredDark: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  permissionContent: { alignItems: 'center', width: '100%', maxWidth: 360 },
  permissionIconWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  permissionIcon: { width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  permissionTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  permissionText: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#CBD5E1', textAlign: 'center' },
  permissionHint: { marginTop: 22, fontSize: 13, color: '#FBBF24', textAlign: 'center' },
  fullWidth: { width: '100%' },
  primaryButton: {
    marginTop: 26,
    paddingVertical: 15,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 14, padding: 10 },
  linkButtonText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cyan },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonActive: { backgroundColor: '#FDE047' },
  roundButtonPlaceholder: { width: 44, height: 44 },

  frameArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  instruction: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
    overflow: 'hidden',
  },
  frame: { width: FRAME, height: FRAME, overflow: 'hidden', borderRadius: 18 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.cyan },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 18 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 18 },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 18,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 18,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 30 },
  tip: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 26,
    paddingTop: 12,
  },
  sideButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonLabel: { color: '#FFFFFF', fontSize: 10, marginTop: 2, fontWeight: '600' },
  captureWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureDisabled: { opacity: 0.6 },
  captureInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
});
