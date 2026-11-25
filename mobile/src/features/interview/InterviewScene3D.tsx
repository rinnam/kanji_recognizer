import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';
import { playDoorKnockSfx, playDoorOpenSfx } from './interview-sfx';

export type AvatarMood = 'idle' | 'bowing' | 'listening' | 'speaking';

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
  phase: ScenePhase;
  mood: AvatarMood;
  knockCount: number;
  interviewerName: string;
  companyName: string;
  onDoorClick?: () => void;
}

function makeDoorSignTexture(labelTop: string, labelBottom: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = '#1C1917';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelTop, 256, 88);

    ctx.fillStyle = '#78716C';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(labelBottom, 256, 144);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function buildInterviewerAvatar(tieColor: string, hairColor: string, xPos: number) {
  const root = new THREE.Group();
  root.position.set(xPos, 0.82, -0.45);

  const upperBody = new THREE.Group();
  root.add(upperBody);

  const suitMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.65 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.82, 0.38), suitMat);
  torso.position.set(0, 0.41, 0);
  torso.castShadow = true;
  upperBody.add(torso);

  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.3, 0.4),
    new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 }),
  );
  shirt.position.set(0, 0.67, 0.01);
  upperBody.add(shirt);

  const tie = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.34, 0.41),
    new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.45 }),
  );
  tie.position.set(0, 0.55, 0.02);
  upperBody.add(tie);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), suitMat);
  leftArm.position.set(-0.44, 0.36, 0.08);
  leftArm.rotation.z = 0.12;
  upperBody.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), suitMat);
  rightArm.position.set(0.44, 0.36, 0.08);
  rightArm.rotation.z = -0.12;
  upperBody.add(rightArm);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.03, 0);
  upperBody.add(headGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: '#F5D0B5', roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 24, 24), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 }),
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
    const height = container.clientHeight || 390;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EFE7DB');

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 60);
    camera.position.set(0, 1.62, 5.15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight('#FFF7EC', 0.95));
    const sunLight = new THREE.DirectionalLight('#FFF3E0', 1.15);
    sunLight.position.set(3.5, 5.5, 3.5);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const hallwayLight = new THREE.PointLight('#FFFBEB', 0.9, 8);
    hallwayLight.position.set(0, 2.8, 4.8);
    scene.add(hallwayLight);

    // Floors (Room + Hallway)
    const roomFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshStandardMaterial({ color: '#D8C3A5', roughness: 0.82 }),
    );
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(0, 0, 0.5);
    roomFloor.receiveShadow = true;
    scene.add(roomFloor);

    const hallwayFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      new THREE.MeshStandardMaterial({ color: '#C7BFB4', roughness: 0.9 }),
    );
    hallwayFloor.rotation.x = -Math.PI / 2;
    hallwayFloor.position.set(0, 0, 5.6);
    scene.add(hallwayFloor);

    // Room Back Wall + Side Walls + Ceiling
    const wallMat = new THREE.MeshStandardMaterial({ color: '#FAF5EE', roughness: 0.9 });
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

    // Window with Tokyo skyline silhouette
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

    // Wall partition with doorway at z = 3.25
    const partitionLeft = new THREE.Mesh(new THREE.BoxGeometry(3.55, 4.4, 0.16), wallMat);
    partitionLeft.position.set(-2.45, 2.2, 3.25);
    scene.add(partitionLeft);

    const partitionRight = new THREE.Mesh(new THREE.BoxGeometry(3.55, 4.4, 0.16), wallMat);
    partitionRight.position.set(2.45, 2.2, 3.25);
    scene.add(partitionRight);

    const partitionTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.85, 0.16), wallMat);
    partitionTop.position.set(0, 3.475, 3.25);
    scene.add(partitionTop);

    // Door Frame
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.55, 0.22), woodTrimMat);
    frameL.position.set(-0.68, 1.275, 3.25);
    scene.add(frameL);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.55, 0.22), woodTrimMat);
    frameR.position.set(0.68, 1.275, 3.25);
    scene.add(frameR);
    const frameT = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.09, 0.22), woodTrimMat);
    frameT.position.set(0, 2.56, 3.25);
    scene.add(frameT);

    // Interactive 3D Wooden Door (pivoted on left hinge at x = -0.63, z = 3.25)
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.63, 0, 3.25);
    scene.add(doorPivot);

    const doorMat = new THREE.MeshStandardMaterial({ color: '#A47551', roughness: 0.58 });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.26, 2.5, 0.08), doorMat);
    doorMesh.position.set(0.63, 1.25, 0);
    doorMesh.castShadow = true;
    doorMesh.name = 'interview_door';
    doorPivot.add(doorMesh);

    // Brass handle on outside & inside
    const brassMat = new THREE.MeshStandardMaterial({ color: '#D97706', metalness: 0.65, roughness: 0.28 });
    const handleOut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.09), brassMat);
    handleOut.position.set(1.06, 1.12, 0.07);
    doorPivot.add(handleOut);

    const handleIn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.09), brassMat);
    handleIn.position.set(1.06, 1.12, -0.07);
    doorPivot.add(handleIn);

    // Door plaque "面接室" on hallway side
    const signTex = makeDoorSignTexture('面接室', companyName || 'INTERVIEW ROOM');
    const doorSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.26),
      new THREE.MeshBasicMaterial({ map: signTex }),
    );
    doorSign.position.set(0.63, 1.82, 0.045);
    doorPivot.add(doorSign);

    // Conference desk + 2 laptops + documents
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.12, 1.25),
      new THREE.MeshStandardMaterial({ color: '#B6895B', roughness: 0.55 }),
    );
    deskTop.position.set(0, 0.82, 0.55);
    deskTop.receiveShadow = true;
    deskTop.castShadow = true;
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

    // Candidate Chair (visible to the right when standing beside it!)
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
    [
      [-0.24, -0.22],
      [0.24, -0.22],
      [-0.24, 0.22],
      [0.24, 0.22],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.4 }),
      );
      leg.position.set(lx, 0.24, lz);
      chairGroup.add(leg);
    });

    // Potted office plant
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

    // 2 Interviewers behind the desk (Lead + HR Co-Interviewer)
    const leadInterviewer = buildInterviewerAvatar('#D97706', '#1C1917', -0.45);
    scene.add(leadInterviewer.root);

    const hrInterviewer = buildInterviewerAvatar('#2563EB', '#292524', 0.78);
    scene.add(hrInterviewer.root);

    // Raycaster for clicking the 3D door directly!
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    let parallaxX = 0;
    let parallaxY = 0;

    const onPointerMove = (e: PointerEvent) => {
      updatePointer(e);
      parallaxX = pointer.x * 0.14;
      parallaxY = pointer.y * 0.06;
      if (phaseRef.current === 'hallway' || phaseRef.current === 'at_door_exit') {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects([doorMesh, doorSign, handleOut, handleIn]);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (phaseRef.current !== 'hallway') return;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([doorMesh, doorSign, handleOut]);
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
      const h = container.clientHeight || 390;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const lookTarget = new THREE.Vector3(0, 1.5, 3.25);
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const curPhase = phaseRef.current;
      const curMood = moodRef.current;

      // Target camera position, lookAt, and door swing angle per etiquette phase
      let tx = 0;
      let ty = 1.62;
      let tz = 5.15;
      let lx = 0;
      let ly = 1.5;
      let lz = 3.25;
      let targetDoorAngle = 0;

      if (curPhase === 'hallway') {
        tx = 0;
        ty = 1.62;
        tz = 5.15;
        lx = 0;
        ly = 1.52;
        lz = 3.25;
        targetDoorAngle = 0;
      } else if (curPhase === 'entering') {
        tx = 0.05;
        ty = 1.68 + Math.sin(t * 7) * 0.025;
        tz = 2.85;
        lx = 0;
        ly = 1.38;
        lz = -0.4;
        targetDoorAngle = -1.25;
      } else if (curPhase === 'standing_by_chair' || curPhase === 'exit_standing') {
        // Standing beside the left of the candidate chair (椅子の横)
        tx = -0.35;
        ty = 1.72;
        tz = 2.25;
        lx = 0.05;
        ly = 1.35;
        lz = -0.4;
        targetDoorAngle = 0;
      } else if (curPhase === 'bowing_30') {
        // User's POV bows 30 degrees (敬礼)
        tx = -0.35;
        ty = 1.48;
        tz = 2.15;
        lx = 0.05;
        ly = 0.42;
        lz = 0.35;
        targetDoorAngle = 0;
      } else if (curPhase === 'bowing_45') {
        // User's POV deep bow 45 degrees (最敬礼)
        tx = -0.35;
        ty = 1.32;
        tz = 2.08;
        lx = 0.05;
        ly = 0.08;
        lz = 0.65;
        targetDoorAngle = 0;
      } else if (curPhase === 'seated') {
        tx = 0.12;
        ty = 1.36;
        tz = 1.98;
        lx = 0.05;
        ly = 1.32;
        lz = -0.45;
        targetDoorAngle = 0;
      } else if (curPhase === 'at_door_exit') {
        // Standing near the door facing back toward the panel for final 失礼いたします
        tx = 0.0;
        ty = 1.7;
        tz = 2.95;
        lx = 0.05;
        ly = 1.35;
        lz = -0.45;
        targetDoorAngle = 0;
      } else if (curPhase === 'left_room') {
        tx = 0;
        ty = 1.65;
        tz = 4.95;
        lx = 0;
        ly = 1.5;
        lz = 3.25;
        targetDoorAngle = -1.15;
      }

      camera.position.x += (tx + parallaxX - camera.position.x) * 0.07;
      camera.position.y += (ty + parallaxY - camera.position.y) * 0.07;
      camera.position.z += (tz - camera.position.z) * 0.065;

      lookTarget.x += (lx - lookTarget.x) * 0.08;
      lookTarget.y += (ly - lookTarget.y) * 0.08;
      lookTarget.z += (lz - lookTarget.z) * 0.08;
      camera.lookAt(lookTarget);

      // Door swing + knock vibration
      doorPivot.rotation.y += (targetDoorAngle - doorPivot.rotation.y) * 0.08;
      if (doorShakeRef.current > 0.01) {
        doorPivot.position.z = 3.25 - Math.sin(t * 75) * 0.025 * doorShakeRef.current;
        doorShakeRef.current *= 0.84;
      } else {
        doorPivot.position.z = 3.25;
      }

      // Interviewer animations
      const animatePerson = (
        person: ReturnType<typeof buildInterviewerAvatar>,
        isPrimary: boolean,
        phaseOffset: number,
      ) => {
        person.upperBody.position.y = Math.sin(t * 2.0 + phaseOffset) * 0.01;
        const targetBow =
          curMood === 'bowing' || curPhase === 'bowing_30' || curPhase === 'bowing_45' ? 0.36 : 0;
        person.upperBody.rotation.x += (targetBow - person.upperBody.rotation.x) * 0.1;

        if (curMood === 'listening') {
          person.headGroup.rotation.x = Math.sin(t * 3.0 + phaseOffset) * 0.08;
          person.headGroup.rotation.y = Math.sin(t * 1.1 + phaseOffset) * 0.05;
        } else if (curMood === 'speaking' && isPrimary) {
          person.headGroup.rotation.x = Math.sin(t * 5.2) * 0.04;
          person.headGroup.rotation.y = Math.sin(t * 2.1) * 0.07;
        } else {
          person.headGroup.rotation.x *= 0.9;
          person.headGroup.rotation.y = Math.sin(t * 0.7 + phaseOffset) * 0.04;
        }

        if (curMood === 'speaking' && isPrimary) {
          person.mouth.scale.y = 1 + Math.abs(Math.sin(t * 15)) * 2.5;
        } else {
          person.mouth.scale.y += (1 - person.mouth.scale.y) * 0.2;
        }
      };

      animatePerson(leadInterviewer, true, 0);
      animatePerson(hrInterviewer, false, 1.3);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      signTex.dispose();
      renderer.dispose();
    };
  }, [companyName]);

  const phaseHint =
    phase === 'hallway'
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
          <Text style={styles.nativeText}>Phòng phỏng vấn 3D tối ưu cho trình duyệt Web</Text>
        </View>
      )}
      <View style={styles.badgeTopLeft}>
        <Text style={styles.companyText}>{companyName}</Text>
        <Text style={styles.nameText}>{interviewerName}</Text>
      </View>
      <View
        style={[
          styles.moodBadge,
          (mood === 'speaking' || phase === 'hallway') && styles.moodAccent,
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
