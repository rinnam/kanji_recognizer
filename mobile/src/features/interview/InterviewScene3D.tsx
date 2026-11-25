import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';

export type AvatarMood = 'idle' | 'bowing' | 'listening' | 'speaking';

interface InterviewScene3DProps {
  mood: AvatarMood;
  interviewerName: string;
  companyName: string;
}

export function InterviewScene3D({
  mood,
  interviewerName,
  companyName,
}: InterviewScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const moodRef = useRef<AvatarMood>(mood);
  moodRef.current = mood;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F5EFE6');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 1.55, 3.15);
    camera.lookAt(0, 1.25, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Japanese office lighting
    const ambient = new THREE.AmbientLight('#FFF7EC', 0.9);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight('#FFF3E0', 1.15);
    sunLight.position.set(3.5, 5, 3);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#E0F2FE', 0.45);
    fillLight.position.set(-3, 2.5, 2);
    scene.add(fillLight);

    // Room: wooden floor + back wall + Shoji-inspired window frame
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({ color: '#D8C3A5', roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6),
      new THREE.MeshStandardMaterial({ color: '#FAF5EE', roughness: 0.9 }),
    );
    backWall.position.set(0, 3, -2.2);
    scene.add(backWall);

    // Window pane with soft Tokyo sky glow
    const windowSky = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.1),
      new THREE.MeshBasicMaterial({ color: '#CFE8FF' }),
    );
    windowSky.position.set(-1.6, 2.1, -2.18);
    scene.add(windowSky);

    const frameMat = new THREE.MeshStandardMaterial({ color: '#8D6E63', roughness: 0.6 });
    const barH = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.08, 0.06), frameMat);
    barH.position.set(-1.6, 2.1, -2.14);
    scene.add(barH);
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.06), frameMat);
    barV.position.set(-1.6, 2.1, -2.14);
    scene.add(barV);

    // Potted office plant on the right
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.16, 0.36, 16),
      new THREE.MeshStandardMaterial({ color: '#C87D55', roughness: 0.7 }),
    );
    pot.position.set(2.2, 0.18, -1.4);
    scene.add(pot);
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#4D7C5B', roughness: 0.8 }),
    );
    foliage.position.set(2.2, 0.72, -1.4);
    scene.add(foliage);

    // Wooden conference desk
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.12, 1.35),
      new THREE.MeshStandardMaterial({ color: '#B6895B', roughness: 0.55 }),
    );
    deskTop.position.set(0, 0.82, 0.65);
    deskTop.receiveShadow = true;
    deskTop.castShadow = true;
    scene.add(deskTop);

    // Laptop + resume paper on desk
    const laptopBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.03, 0.38),
      new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.3, roughness: 0.4 }),
    );
    laptopBase.position.set(0.75, 0.9, 0.45);
    scene.add(laptopBase);

    const laptopScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.36, 0.02),
      new THREE.MeshStandardMaterial({ color: '#1F2937', metalness: 0.4, roughness: 0.3 }),
    );
    laptopScreen.position.set(0.75, 1.07, 0.27);
    laptopScreen.rotation.x = -0.18;
    scene.add(laptopScreen);

    const resumeSheet = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.01, 0.56),
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 }),
    );
    resumeSheet.position.set(-0.35, 0.89, 0.55);
    resumeSheet.rotation.y = 0.08;
    scene.add(resumeSheet);

    // Stylized Japanese Interviewer Avatar (Group pivoted at waist for Ojigi bow)
    const avatarRoot = new THREE.Group();
    avatarRoot.position.set(0, 0.82, -0.35);
    scene.add(avatarRoot);

    const upperBody = new THREE.Group();
    avatarRoot.add(upperBody);

    // Dark navy Japanese business suit torso
    const suitMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.65 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.84, 0.4), suitMat);
    torso.position.set(0, 0.42, 0);
    torso.castShadow = true;
    upperBody.add(torso);

    // White dress shirt V-collar + orange-terracotta tie
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.32, 0.42),
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 }),
    );
    shirt.position.set(0, 0.68, 0.01);
    upperBody.add(shirt);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.36, 0.43),
      new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.45 }),
    );
    tie.position.set(0, 0.56, 0.02);
    upperBody.add(tie);

    // Shoulders / arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22), suitMat);
    leftArm.position.set(-0.46, 0.38, 0.08);
    leftArm.rotation.z = 0.12;
    upperBody.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22), suitMat);
    rightArm.position.set(0.46, 0.38, 0.08);
    rightArm.rotation.z = -0.12;
    upperBody.add(rightArm);

    // Head group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.05, 0);
    upperBody.add(headGroup);

    const skinMat = new THREE.MeshStandardMaterial({ color: '#F5D0B5', roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Hair cap
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.275, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
      new THREE.MeshStandardMaterial({ color: '#1C1917', roughness: 0.8 }),
    );
    hair.position.set(0, 0.03, -0.02);
    headGroup.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.2 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 12), eyeMat);
    leftEye.position.set(-0.085, 0.02, 0.235);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 12), eyeMat);
    rightEye.position.set(0.085, 0.02, 0.235);
    headGroup.add(rightEye);

    // Animated Mouth (scales vertically during speaking)
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.022, 0.02),
      new THREE.MeshStandardMaterial({ color: '#9F1239', roughness: 0.5 }),
    );
    mouth.position.set(0, -0.085, 0.245);
    headGroup.add(mouth);

    // Subtle mouse parallax
    let targetCamX = 0;
    let targetCamY = 1.55;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetCamX = nx * 0.25;
      targetCamY = 1.55 - ny * 0.1;
    };
    container.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const currentMood = moodRef.current;

      // Smooth camera parallax
      camera.position.x += (targetCamX - camera.position.x) * 0.06;
      camera.position.y += (targetCamY - camera.position.y) * 0.06;
      camera.lookAt(0, 1.25, 0);

      // Breathing
      upperBody.position.y = Math.sin(t * 2.1) * 0.012;

      // Bowing (Ojigi 30 degrees)
      const targetBow = currentMood === 'bowing' ? 0.52 : 0;
      upperBody.rotation.x += (targetBow - upperBody.rotation.x) * 0.1;

      // Head nods when listening or speaking
      if (currentMood === 'listening') {
        headGroup.rotation.x = Math.sin(t * 3.2) * 0.08;
        headGroup.rotation.y = Math.sin(t * 1.1) * 0.06;
      } else if (currentMood === 'speaking') {
        headGroup.rotation.x = Math.sin(t * 5.5) * 0.04;
        headGroup.rotation.y = Math.sin(t * 2.3) * 0.08;
      } else {
        headGroup.rotation.x *= 0.9;
        headGroup.rotation.y = Math.sin(t * 0.7) * 0.04;
      }

      // Lip-sync mouth animation
      if (currentMood === 'speaking') {
        mouth.scale.y = 1 + Math.abs(Math.sin(t * 15)) * 2.4;
      } else {
        mouth.scale.y += (1 - mouth.scale.y) * 0.2;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  const moodLabel =
    mood === 'speaking'
      ? 'Đang nói...'
      : mood === 'listening'
        ? 'Đang lắng nghe bạn...'
        : mood === 'bowing'
          ? 'Cúi chào (Ojigi)'
          : 'Sẵn sàng';

  return (
    <View style={styles.wrapper}>
      {Platform.OS === 'web' ? (
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', minHeight: 340, display: 'block' }}
        />
      ) : (
        <View style={styles.nativeFallback}>
          <Text style={styles.nativeText}>Khung cảnh 3D tối ưu cho trình duyệt Web</Text>
        </View>
      )}
      <View style={styles.badgeTopLeft}>
        <Text style={styles.companyText}>{companyName}</Text>
        <Text style={styles.nameText}>{interviewerName}</Text>
      </View>
      <View style={[styles.moodBadge, mood === 'speaking' && styles.moodSpeaking]}>
        <Text style={styles.moodText}>{moodLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: '#C87D55',
    backgroundColor: '#F5EFE6',
    position: 'relative',
  },
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nativeText: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '600',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  companyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  moodBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  moodSpeaking: {
    backgroundColor: '#EA580C',
  },
  moodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
