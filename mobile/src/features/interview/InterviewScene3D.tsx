import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';
import { playDoorKnockSfx, playDoorOpenSfx } from './interview-sfx';

export type AvatarMood = 'idle' | 'bowing' | 'listening' | 'speaking';

export type SceneType = 'interview' | 'restaurant' | 'clinic' | 'horenso';

export type ScenePhase =
  | 'hallway'
  | 'entering'
  | 'standing_by_chair'
  | 'bowing_30'
  | 'seated'
  | 'exit_standing'
  | 'bowing_45'
  | 'at_door_exit'
  | 'left_room';

interface InterviewScene3DProps {
  sceneType?: SceneType;
  phase: ScenePhase;
  mood: AvatarMood;
  knockCount: number;
  interviewerName: string;
  companyName: string;
  onDoorClick?: () => void;
}

function makePlaqueTexture(
  labelTop: string,
  labelBottom: string,
  bgColor = '#FDFBF7',
  borderColor = '#8D6E63',
  textColor = '#1C1917',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelTop, 256, 88);

    ctx.fillStyle = '#78716C';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(labelBottom, 256, 144);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface AvatarOutfit {
  torsoColor: string;
  innerShirtColor: string;
  accentColor: string; // tie, apron band, or stethoscope
  hairColor: string;
  xPos: number;
  zPos?: number;
  yBase?: number;
  isApron?: boolean;
  isDoctor?: boolean;
}

function buildCharacterAvatar(outfit: AvatarOutfit) {
  const root = new THREE.Group();
  root.position.set(outfit.xPos, outfit.yBase ?? 0.82, outfit.zPos ?? -0.45);

  const upperBody = new THREE.Group();
  root.add(upperBody);

  const torsoMat = new THREE.MeshStandardMaterial({ color: outfit.torsoColor, roughness: 0.65 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.84, 0.38), torsoMat);
  torso.position.set(0, 0.42, 0);
  torso.castShadow = true;
  upperBody.add(torso);

  if (outfit.isApron) {
    // Japanese restaurant dark apron + red collar band
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.62, 0.4),
      new THREE.MeshStandardMaterial({ color: outfit.accentColor, roughness: 0.7 }),
    );
    apron.position.set(0, 0.3, 0.01);
    upperBody.add(apron);

    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.4),
      new THREE.MeshStandardMaterial({ color: outfit.innerShirtColor, roughness: 0.6 }),
    );
    collar.position.set(0, 0.74, 0.01);
    upperBody.add(collar);
  } else if (outfit.isDoctor) {
    // White lab coat with blue inner scrub/shirt + dark stethoscope arc
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.44, 0.4),
      new THREE.MeshStandardMaterial({ color: outfit.innerShirtColor, roughness: 0.5 }),
    );
    inner.position.set(0, 0.62, 0.01);
    upperBody.add(inner);

    const stethL = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.36, 0.42),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3 }),
    );
    stethL.position.set(-0.14, 0.65, 0.02);
    upperBody.add(stethL);

    const stethR = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.36, 0.42),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3 }),
    );
    stethR.position.set(0.14, 0.65, 0.02);
    upperBody.add(stethR);
  } else {
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.3, 0.4),
      new THREE.MeshStandardMaterial({ color: outfit.innerShirtColor, roughness: 0.5 }),
    );
    shirt.position.set(0, 0.67, 0.01);
    upperBody.add(shirt);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.34, 0.41),
      new THREE.MeshStandardMaterial({ color: outfit.accentColor, roughness: 0.45 }),
    );
    tie.position.set(0, 0.55, 0.02);
    upperBody.add(tie);
  }

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), torsoMat);
  leftArm.position.set(-0.44, 0.36, 0.08);
  leftArm.rotation.z = 0.12;
  upperBody.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), torsoMat);
  rightArm.position.set(0.44, 0.36, 0.08);
  rightArm.rotation.z = -0.12;
  upperBody.add(rightArm);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.04, 0);
  upperBody.add(headGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: '#F5D0B5', roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 24, 24), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({ color: outfit.hairColor, roughness: 0.8 }),
  );
  hair.position.set(0, 0.03, -0.02);
  headGroup.add(hair);

  const eyeMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.2 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), eyeMat);
  leftEye.position.set(-0.08, 0.02, 0.22);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), eyeMat);
  rightEye.position.set(0.08, 0.02, 0.22);
  headGroup.add(rightEye);

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: '#9F1239', roughness: 0.5 }),
  );
  mouth.position.set(0, -0.08, 0.232);
  headGroup.add(mouth);

  return { root, upperBody, headGroup, mouth };
}

export function InterviewScene3D({
  sceneType = 'interview',
  phase,
  mood,
  knockCount,
  interviewerName,
  companyName,
  onDoorClick,
}: InterviewScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<ScenePhase>(phase);
  const moodRef = useRef<AvatarMood>(mood);
  const onDoorClickRef = useRef(onDoorClick);
  const doorShakeRef = useRef(0);
  const prevPhaseRef = useRef<ScenePhase>(phase);

  phaseRef.current = phase;
  moodRef.current = mood;
  onDoorClickRef.current = onDoorClick;

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      if (phase === 'entering' || phase === 'left_room') {
        playDoorOpenSfx();
      }
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  useEffect(() => {
    if (knockCount > 0) {
      doorShakeRef.current = 1.0;
    }
  }, [knockCount]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 680;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    const bgHex =
      sceneType === 'restaurant'
        ? '#3B281E'
        : sceneType === 'clinic'
          ? '#EEF6FB'
          : sceneType === 'horenso'
            ? '#F1F5F9'
            : '#EFE7DB';
    scene.background = new THREE.Color(bgHex);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 60);
    if (sceneType === 'interview') {
      camera.position.set(0, 1.62, 5.15);
    } else {
      camera.position.set(0, 1.4, 2.05);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const disposables: THREE.Texture[] = [];

    // Lighting tailored to each Japanese environment
    if (sceneType === 'restaurant') {
      scene.add(new THREE.AmbientLight('#FFE8CC', 0.9));
      const lanternGlow = new THREE.PointLight('#F97316', 1.4, 10);
      lanternGlow.position.set(0, 2.4, 0.4);
      scene.add(lanternGlow);
      const warmSpot = new THREE.DirectionalLight('#FFF1DB', 0.85);
      warmSpot.position.set(2, 4, 3);
      scene.add(warmSpot);
    } else if (sceneType === 'clinic') {
      scene.add(new THREE.AmbientLight('#FFFFFF', 1.15));
      const clinicLight = new THREE.DirectionalLight('#F0F9FF', 0.9);
      clinicLight.position.set(2, 5, 3);
      scene.add(clinicLight);
    } else {
      scene.add(new THREE.AmbientLight('#FFF7EC', 0.95));
      const sunLight = new THREE.DirectionalLight('#FFF3E0', 1.15);
      sunLight.position.set(3.5, 5.5, 3.5);
      sunLight.castShadow = true;
      scene.add(sunLight);
      const hallwayLight = new THREE.PointLight('#FFFBEB', 0.9, 8);
      hallwayLight.position.set(0, 2.8, 4.8);
      scene.add(hallwayLight);
    }

    // Room Floors & Walls
    const floorColor =
      sceneType === 'restaurant'
        ? '#5C3D2E'
        : sceneType === 'clinic'
          ? '#DCE7EE'
          : sceneType === 'horenso'
            ? '#CBD5E1'
            : '#D8C3A5';
    const wallColor =
      sceneType === 'restaurant'
        ? '#F3E5D0'
        : sceneType === 'clinic'
          ? '#F8FBFE'
          : sceneType === 'horenso'
            ? '#F8FAFC'
            : '#FAF5EE';

    const roomFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.82 }),
    );
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(0, 0, 0.5);
    scene.add(roomFloor);

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.4), wallMat);
    backWall.position.set(0, 2.2, -2.5);
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.4), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-4.2, 2.2, 2.0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.4), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(4.2, 2.2, 2.0);
    scene.add(rightWall);

    // Characters list + optional interactive door (Interview only)
    const characters: Array<{
      avatar: ReturnType<typeof buildCharacterAvatar>;
      isPrimary: boolean;
      offset: number;
    }> = [];
    let doorPivot: THREE.Group | null = null;
    const clickableDoorMeshes: THREE.Object3D[] = [];

    if (sceneType === 'restaurant') {
      // ── JAPANESE WASHOKU / IZAKAYA RESTAURANT ─────────────────────────────
      // Traditional wooden vertical slats (Koushi) on back wall
      const slatMat = new THREE.MeshStandardMaterial({ color: '#6B4226', roughness: 0.65 });
      for (let sx = -3.4; sx <= 3.4; sx += 0.42) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 0.06), slatMat);
        slat.position.set(sx, 2.1, -2.44);
        scene.add(slat);
      }

      // Red Japanese Noren curtains across upper back wall
      const norenMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.8 });
      [-1.35, -0.45, 0.45, 1.35].forEach((nx) => {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.04), norenMat);
        cloth.position.set(nx, 2.65, -2.1);
        scene.add(cloth);
      });

      // Glowing red Chochin paper lanterns left & right
      const lanternMat = new THREE.MeshStandardMaterial({
        color: '#DC2626',
        emissive: '#EA580C',
        emissiveIntensity: 0.45,
        roughness: 0.6,
      });
      [-2.1, 2.1].forEach((lx) => {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 16), lanternMat);
        lantern.scale.set(0.85, 1.25, 0.85);
        lantern.position.set(lx, 2.35, -1.2);
        scene.add(lantern);
      });

      // Warm dark-wood dining table + Menu stand + Green tea cup + Ceramic plate + Chopsticks
      const table = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.12, 1.4),
        new THREE.MeshStandardMaterial({ color: '#7C4A27', roughness: 0.5 }),
      );
      table.position.set(0, 0.78, 0.58);
      scene.add(table);

      const menuTex = makePlaqueTexture('お品書き', 'MENU · WASHOKU', '#FFFBEB', '#991B1B', '#991B1B');
      disposables.push(menuTex);
      const menuStand = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.52, 0.03),
        new THREE.MeshBasicMaterial({ map: menuTex }),
      );
      menuStand.position.set(-0.92, 1.08, 0.5);
      menuStand.rotation.y = 0.28;
      menuStand.rotation.x = -0.12;
      scene.add(menuStand);

      // Green tea cup (Yunomi)
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: '#1E3A2F', roughness: 0.4 }),
      );
      cup.position.set(0.65, 0.91, 0.65);
      scene.add(cup);

      // Ceramic plate + wooden chopsticks
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.2, 0.03, 24),
        new THREE.MeshStandardMaterial({ color: '#F5F5F4', roughness: 0.3 }),
      );
      plate.position.set(0.05, 0.86, 0.75);
      scene.add(plate);

      const chopstick = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.015, 0.025),
        new THREE.MeshStandardMaterial({ color: '#D6B88C', roughness: 0.6 }),
      );
      chopstick.position.set(0.05, 0.87, 1.05);
      scene.add(chopstick);

      // Single friendly Restaurant Staff wearing black kimono-style shirt + crimson apron
      const staff = buildCharacterAvatar({
        torsoColor: '#1C1917',
        innerShirtColor: '#FFFFFF',
        accentColor: '#991B1B',
        hairColor: '#292524',
        xPos: 0,
        zPos: -0.45,
        yBase: 0.82,
        isApron: true,
      });
      scene.add(staff.root);
      characters.push({ avatar: staff, isPrimary: true, offset: 0 });
    } else if (sceneType === 'clinic') {
      // ── JAPANESE MEDICAL CLINIC (診察室) ──────────────────────────────────
      // Wall sign "診察室 · SHINJUKU CLINIC"
      const clinicTex = makePlaqueTexture('診察室', companyName || 'MEDICAL CLINIC', '#FFFFFF', '#0284C7', '#0369A1');
      disposables.push(clinicTex);
      const clinicSign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.56),
        new THREE.MeshBasicMaterial({ map: clinicTex }),
      );
      clinicSign.position.set(-1.35, 2.25, -2.44);
      scene.add(clinicSign);

      // Red Medical Cross emblem on wall
      const crossMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.5 });
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), crossMat);
      crossH.position.set(1.5, 2.25, -2.45);
      scene.add(crossH);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.04), crossMat);
      crossV.position.set(1.5, 2.25, -2.45);
      scene.add(crossV);

      // Examination bed in right background
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.42, 0.78),
        new THREE.MeshStandardMaterial({ color: '#BAE6FD', roughness: 0.7 }),
      );
      bed.position.set(2.15, 0.45, -1.55);
      scene.add(bed);
      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.12, 0.52),
        new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.8 }),
      );
      pillow.position.set(2.65, 0.72, -1.55);
      scene.add(pillow);

      // Clean white doctor desk + monitor + medicine chart
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.1, 1.25),
        new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.4 }),
      );
      desk.position.set(0, 0.82, 0.55);
      scene.add(desk);

      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.42, 0.03),
        new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.3 }),
      );
      monitor.position.set(0.88, 1.14, 0.32);
      monitor.rotation.y = -0.25;
      scene.add(monitor);

      const chart = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.015, 0.52),
        new THREE.MeshStandardMaterial({ color: '#E0F2FE', roughness: 0.8 }),
      );
      chart.position.set(-0.55, 0.88, 0.55);
      scene.add(chart);

      // Single Doctor wearing white lab coat + blue scrub + stethoscope
      const doctor = buildCharacterAvatar({
        torsoColor: '#FFFFFF',
        innerShirtColor: '#0284C7',
        accentColor: '#334155',
        hairColor: '#1E293B',
        xPos: 0,
        zPos: -0.45,
        yBase: 0.82,
        isDoctor: true,
      });
      scene.add(doctor.root);
      characters.push({ avatar: doctor, isPrimary: true, offset: 0 });
    } else if (sceneType === 'horenso') {
      // ── JAPANESE IT OFFICE · HORENSO / DAILY STANDUP ──────────────────────
      // Sprint Kanban Whiteboard on back wall
      const boardTex = makePlaqueTexture('スプリント進捗', 'TODO · DOING · DONE', '#FFFFFF', '#334155', '#0F172A');
      disposables.push(boardTex);
      const whiteboard = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 1.35),
        new THREE.MeshBasicMaterial({ map: boardTex }),
      );
      whiteboard.position.set(0, 2.15, -2.44);
      scene.add(whiteboard);

      // Colorful sticky notes on whiteboard
      [
        [-0.95, 1.72, '#FDE047'],
        [-0.55, 1.72, '#FDBA74'],
        [0.0, 1.72, '#93C5FD'],
        [0.65, 1.72, '#86EFAC'],
      ].forEach(([sx, sy, col]) => {
        const note = new THREE.Mesh(
          new THREE.PlaneGeometry(0.24, 0.2),
          new THREE.MeshBasicMaterial({ color: col as string }),
        );
        note.position.set(sx as number, sy as number, -2.42);
        scene.add(note);
      });

      // Modern light-oak desk + dual monitors + coffee mug
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 0.1, 1.25),
        new THREE.MeshStandardMaterial({ color: '#D6B88C', roughness: 0.5 }),
      );
      desk.position.set(0, 0.82, 0.55);
      scene.add(desk);

      const laptop = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.36, 0.025),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.35, roughness: 0.3 }),
      );
      laptop.position.set(0.8, 1.05, 0.32);
      laptop.rotation.x = -0.15;
      scene.add(laptop);

      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.055, 0.13, 16),
        new THREE.MeshStandardMaterial({ color: '#EA580C', roughness: 0.4 }),
      );
      mug.position.set(-0.78, 0.93, 0.58);
      scene.add(mug);

      // Single Japanese PM wearing crisp light-blue business-casual shirt
      const pm = buildCharacterAvatar({
        torsoColor: '#3B82F6',
        innerShirtColor: '#FFFFFF',
        accentColor: '#1E3A8A',
        hairColor: '#1C1917',
        xPos: 0,
        zPos: -0.45,
        yBase: 0.82,
      });
      scene.add(pm.root);
      characters.push({ avatar: pm, isPrimary: true, offset: 0 });
    } else {
      // ── JAPANESE JOB INTERVIEW ROOM (面接室 + Interactive 3-Knock Door) ───
      const hallwayFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 5),
        new THREE.MeshStandardMaterial({ color: '#C7BFB4', roughness: 0.9 }),
      );
      hallwayFloor.rotation.x = -Math.PI / 2;
      hallwayFloor.position.set(0, 0, 5.6);
      scene.add(hallwayFloor);

      // Window with Tokyo skyline
      const windowSky = new THREE.Mesh(
        new THREE.PlaneGeometry(3.8, 2.0),
        new THREE.MeshBasicMaterial({ color: '#CFE8FF' }),
      );
      windowSky.position.set(-1.5, 2.1, -2.47);
      scene.add(windowSky);

      const bldgMat = new THREE.MeshBasicMaterial({ color: '#94A3B8' });
      [-2.7, -2.1, -1.4, -0.8, -0.1].forEach((bx, i) => {
        const h = 0.55 + (i % 3) * 0.28;
        const b = new THREE.Mesh(new THREE.PlaneGeometry(0.42, h), bldgMat);
        b.position.set(bx, 1.12 + h / 2, -2.45);
        scene.add(b);
      });

      const woodTrimMat = new THREE.MeshStandardMaterial({ color: '#8D6E63', roughness: 0.6 });
      const barH = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 0.06), woodTrimMat);
      barH.position.set(-1.5, 2.1, -2.42);
      scene.add(barH);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 0.06), woodTrimMat);
      barV.position.set(-1.5, 2.1, -2.42);
      scene.add(barV);

      // Partition wall & interactive 3D door
      const partitionLeft = new THREE.Mesh(new THREE.BoxGeometry(3.55, 4.4, 0.16), wallMat);
      partitionLeft.position.set(-2.45, 2.2, 3.25);
      scene.add(partitionLeft);
      const partitionRight = new THREE.Mesh(new THREE.BoxGeometry(3.55, 4.4, 0.16), wallMat);
      partitionRight.position.set(2.45, 2.2, 3.25);
      scene.add(partitionRight);
      const partitionTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.85, 0.16), wallMat);
      partitionTop.position.set(0, 3.475, 3.25);
      scene.add(partitionTop);

      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.55, 0.22), woodTrimMat);
      frameL.position.set(-0.68, 1.275, 3.25);
      scene.add(frameL);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.55, 0.22), woodTrimMat);
      frameR.position.set(0.68, 1.275, 3.25);
      scene.add(frameR);
      const frameT = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.09, 0.22), woodTrimMat);
      frameT.position.set(0, 2.56, 3.25);
      scene.add(frameT);

      doorPivot = new THREE.Group();
      doorPivot.position.set(-0.63, 0, 3.25);
      scene.add(doorPivot);

      const doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.26, 2.5, 0.08),
        new THREE.MeshStandardMaterial({ color: '#A47551', roughness: 0.58 }),
      );
      doorMesh.position.set(0.63, 1.25, 0);
      doorPivot.add(doorMesh);

      const brassMat = new THREE.MeshStandardMaterial({ color: '#D97706', metalness: 0.65, roughness: 0.28 });
      const handleOut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.09), brassMat);
      handleOut.position.set(1.06, 1.12, 0.07);
      doorPivot.add(handleOut);
      const handleIn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.09), brassMat);
      handleIn.position.set(1.06, 1.12, -0.07);
      doorPivot.add(handleIn);

      const signTex = makePlaqueTexture('面接室', companyName || 'INTERVIEW ROOM');
      disposables.push(signTex);
      const doorSign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.68, 0.26),
        new THREE.MeshBasicMaterial({ map: signTex }),
      );
      doorSign.position.set(0.63, 1.82, 0.045);
      doorPivot.add(doorSign);
      clickableDoorMeshes.push(doorMesh, doorSign, handleOut, handleIn);

      // Conference desk + CV + laptop
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.12, 1.25),
        new THREE.MeshStandardMaterial({ color: '#B6895B', roughness: 0.55 }),
      );
      deskTop.position.set(0, 0.82, 0.55);
      scene.add(deskTop);

      const resumeSheet = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.01, 0.56),
        new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 }),
      );
      resumeSheet.position.set(-0.4, 0.89, 0.45);
      resumeSheet.rotation.y = 0.06;
      scene.add(resumeSheet);

      const laptopBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.03, 0.36),
        new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.3, roughness: 0.4 }),
      );
      laptopBase.position.set(0.95, 0.9, 0.4);
      scene.add(laptopBase);
      const laptopScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.34, 0.02),
        new THREE.MeshStandardMaterial({ color: '#1F2937', metalness: 0.4, roughness: 0.3 }),
      );
      laptopScreen.position.set(0.95, 1.06, 0.24);
      laptopScreen.rotation.x = -0.18;
      scene.add(laptopScreen);

      // Candidate Chair
      const chairGroup = new THREE.Group();
      chairGroup.position.set(0.32, 0, 1.92);
      scene.add(chairGroup);
      const chairMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 0.54), chairMat);
      seat.position.set(0, 0.48, 0);
      chairGroup.add(seat);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.07), chairMat);
      backrest.position.set(0, 0.8, 0.25);
      chairGroup.add(backrest);

      // Potted plant
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.16, 0.36, 16),
        new THREE.MeshStandardMaterial({ color: '#C87D55', roughness: 0.7 }),
      );
      pot.position.set(2.55, 0.18, -1.65);
      scene.add(pot);
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#4D7C5B', roughness: 0.8 }),
      );
      foliage.position.set(2.55, 0.74, -1.65);
      scene.add(foliage);

      // 2 Interviewers (Lead + HR)
      const lead = buildCharacterAvatar({
        torsoColor: '#1E293B',
        innerShirtColor: '#FFFFFF',
        accentColor: '#D97706',
        hairColor: '#1C1917',
        xPos: -0.45,
      });
      scene.add(lead.root);
      characters.push({ avatar: lead, isPrimary: true, offset: 0 });

      const hr = buildCharacterAvatar({
        torsoColor: '#1E293B',
        innerShirtColor: '#FFFFFF',
        accentColor: '#2563EB',
        hairColor: '#292524',
        xPos: 0.78,
      });
      scene.add(hr.root);
      characters.push({ avatar: hr, isPrimary: false, offset: 1.3 });
    }

    // Raycaster for 3D Door Click (Interview)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let parallaxX = 0;
    let parallaxY = 0;

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointer(e);
      parallaxX = pointer.x * 0.14;
      parallaxY = pointer.y * 0.06;
      if (clickableDoorMeshes.length > 0 && phaseRef.current === 'hallway') {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableDoorMeshes);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (clickableDoorMeshes.length === 0 || phaseRef.current !== 'hallway') return;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableDoorMeshes);
      if (hits.length > 0) {
        playDoorKnockSfx();
        doorShakeRef.current = 1.0;
        onDoorClickRef.current?.();
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      const w = container.clientWidth || 680;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const lookTarget = new THREE.Vector3(0, 1.35, sceneType === 'interview' ? 3.25 : -0.45);
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const curPhase = phaseRef.current;
      const curMood = moodRef.current;

      let tx = 0;
      let ty = 1.4;
      let tz = 2.05;
      let lx = 0;
      let ly = 1.35;
      let lz = -0.45;
      let targetDoorAngle = 0;

      if (sceneType === 'interview') {
        if (curPhase === 'hallway') {
          tx = 0; ty = 1.62; tz = 5.15; lx = 0; ly = 1.52; lz = 3.25;
        } else if (curPhase === 'entering') {
          tx = 0.05; ty = 1.68 + Math.sin(t * 7) * 0.025; tz = 2.85; lx = 0; ly = 1.38; lz = -0.4; targetDoorAngle = -1.25;
        } else if (curPhase === 'standing_by_chair' || curPhase === 'exit_standing') {
          tx = -0.35; ty = 1.72; tz = 2.25; lx = 0.05; ly = 1.35; lz = -0.4;
        } else if (curPhase === 'bowing_30') {
          tx = -0.35; ty = 1.48; tz = 2.15; lx = 0.05; ly = 0.42; lz = 0.35;
        } else if (curPhase === 'bowing_45') {
          tx = -0.35; ty = 1.32; tz = 2.08; lx = 0.05; ly = 0.08; lz = 0.65;
        } else if (curPhase === 'seated') {
          tx = 0.12; ty = 1.36; tz = 1.98; lx = 0.05; ly = 1.32; lz = -0.45;
        } else if (curPhase === 'at_door_exit') {
          tx = 0; ty = 1.7; tz = 2.95; lx = 0.05; ly = 1.35; lz = -0.45;
        } else if (curPhase === 'left_room') {
          tx = 0; ty = 1.65; tz = 4.95; lx = 0; ly = 1.5; lz = 3.25; targetDoorAngle = -1.15;
        }
      } else {
        // Roleplay scenes: smooth seated / bowing POV
        if (curPhase === 'bowing_30') {
          tx = 0; ty = 1.25; tz = 1.95; lx = 0; ly = 0.55; lz = 0.25;
        } else {
          tx = 0; ty = 1.4; tz = 2.05; lx = 0; ly = 1.32; lz = -0.45;
        }
      }

      camera.position.x += (tx + parallaxX - camera.position.x) * 0.07;
      camera.position.y += (ty + parallaxY - camera.position.y) * 0.07;
      camera.position.z += (tz - camera.position.z) * 0.065;

      lookTarget.x += (lx - lookTarget.x) * 0.08;
      lookTarget.y += (ly - lookTarget.y) * 0.08;
      lookTarget.z += (lz - lookTarget.z) * 0.08;
      camera.lookAt(lookTarget);

      if (doorPivot) {
        doorPivot.rotation.y += (targetDoorAngle - doorPivot.rotation.y) * 0.08;
        if (doorShakeRef.current > 0.01) {
          doorPivot.position.z = 3.25 - Math.sin(t * 75) * 0.025 * doorShakeRef.current;
          doorShakeRef.current *= 0.84;
        } else {
          doorPivot.position.z = 3.25;
        }
      }

      for (const item of characters) {
        const person = item.avatar;
        person.upperBody.position.y = Math.sin(t * 2.0 + item.offset) * 0.01;
        const targetBow =
          curMood === 'bowing' || curPhase === 'bowing_30' || curPhase === 'bowing_45' ? 0.36 : 0;
        person.upperBody.rotation.x += (targetBow - person.upperBody.rotation.x) * 0.1;

        if (curMood === 'listening') {
          person.headGroup.rotation.x = Math.sin(t * 3.0 + item.offset) * 0.08;
          person.headGroup.rotation.y = Math.sin(t * 1.1 + item.offset) * 0.05;
        } else if (curMood === 'speaking' && item.isPrimary) {
          person.headGroup.rotation.x = Math.sin(t * 5.2) * 0.04;
          person.headGroup.rotation.y = Math.sin(t * 2.1) * 0.07;
        } else {
          person.headGroup.rotation.x *= 0.9;
          person.headGroup.rotation.y = Math.sin(t * 0.7 + item.offset) * 0.04;
        }

        if (curMood === 'speaking' && item.isPrimary) {
          person.mouth.scale.y = 1 + Math.abs(Math.sin(t * 15)) * 2.5;
        } else {
          person.mouth.scale.y += (1 - person.mouth.scale.y) * 0.2;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      disposables.forEach((tex) => tex.dispose());
      renderer.dispose();
    };
  }, [companyName, sceneType]);

  const phaseHint =
    sceneType === 'restaurant'
      ? mood === 'speaking'
        ? 'Nhân viên nhà hàng đang nói...'
        : mood === 'listening'
          ? 'Nhân viên đang lắng nghe bạn gọi món...'
          : 'Nhà hàng Washoku Sakura · Sẵn sàng gọi món'
      : sceneType === 'clinic'
        ? mood === 'speaking'
          ? 'Bác sĩ Kobayashi đang tư vấn...'
          : mood === 'listening'
            ? 'Bác sĩ đang lắng nghe triệu chứng của bạn...'
            : 'Phòng khám Nội khoa Shinjuku · Đang khám bệnh'
        : sceneType === 'horenso'
          ? mood === 'speaking'
            ? 'Sếp Takahashi đang phản hồi...'
            : mood === 'listening'
              ? 'Sếp PM đang lắng nghe báo cáo Horenso...'
              : 'Phòng Dự án IT · Họp Horenso (報連相)'
          : phase === 'hallway'
            ? `Ngoài hành lang · Click trực tiếp vào cánh cửa để gõ (${knockCount}/3 lần)`
            : phase === 'entering'
              ? 'Đang mở cửa bước vào phòng...'
              : phase === 'standing_by_chair'
                ? 'Đang đứng bên trái ghế (椅子の横)'
                : phase === 'bowing_30'
                  ? 'Đang cúi chào 30° (敬礼)'
                  : phase === 'bowing_45'
                    ? 'Đang cúi chào sâu 45° (最敬礼)'
                    : phase === 'seated'
                      ? mood === 'speaking'
                        ? 'Nhà tuyển dụng đang nói...'
                        : mood === 'listening'
                          ? 'Hội đồng đang lắng nghe bạn...'
                          : 'Đang ngồi phỏng vấn'
                      : phase === 'exit_standing'
                        ? 'Đã đứng dậy cạnh ghế chuẩn bị chào ra về'
                        : phase === 'at_door_exit'
                          ? 'Đứng trước cửa quay mặt chào lần cuối'
                          : 'Đã rời phòng phỏng vấn';

  return (
    <View style={styles.wrapper}>
      {Platform.OS === 'web' ? (
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', minHeight: 380, display: 'block' }}
        />
      ) : (
        <View style={styles.nativeFallback}>
          <Text style={styles.nativeText}>Không gian 3D tối ưu cho trình duyệt Web</Text>
        </View>
      )}
      <View style={styles.badgeTopLeft}>
        <Text style={styles.companyText}>{companyName}</Text>
        <Text style={styles.nameText}>{interviewerName}</Text>
      </View>
      <View
        style={[
          styles.moodBadge,
          (mood === 'speaking' || (sceneType === 'interview' && phase === 'hallway')) &&
            styles.moodAccent,
        ]}
      >
        <Text style={styles.moodText}>{phaseHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: '#C87D55',
    backgroundColor: '#EFE7DB',
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(28, 25, 23, 0.78)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  moodAccent: {
    backgroundColor: 'rgba(217, 119, 6, 0.92)',
  },
  moodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
