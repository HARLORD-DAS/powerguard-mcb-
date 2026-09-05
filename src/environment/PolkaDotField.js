import * as THREE from 'three';

/**
 * True 3D Polka-Dot Environment
 * Creates thousands of actual 3D spatial dot elements in the world space around the machine.
 * Provides genuine perspective, motion parallax, depth scaling, and floor reflections.
 */
export class PolkaDotField {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'PolkaDotEnvironment';
    this.scene.add(this.group);

    this.instancedMesh = null;
    this.dotCount = 0;
    this.dummy = new THREE.Object3D();
    this.dotData = []; // { pos, baseScale, phase, speed, color }

    this.initDots();
    this.initLaboratoryFloor();
  }

  initDots() {
    // Generate 3D grid distribution forming a volumetric curved digital-twin laboratory space
    const dots = [];
    
    // 1. Rear 3D Dot Wall (deep behind the machine with multi-layer depth)
    const rearCols = 46;
    const rearRows = 28;
    const colSpacing = 1.35;
    const rowSpacing = 1.35;
    const startX = -(rearCols * colSpacing) / 2;
    const startY = -4.0;
    
    for (let r = 0; r < rearRows; r++) {
      for (let c = 0; c < rearCols; c++) {
        // Multi-layered depth with subtle curve
        const x = startX + c * colSpacing;
        const y = startY + r * rowSpacing;
        // Parabolic depth curve to wrap around
        const depthCurve = (x * x) * 0.008;
        const z = -14.0 - depthCurve + (Math.sin(r * 0.5 + c * 0.3) * 0.35);
        
        dots.push({
          x, y, z,
          scale: 0.12,
          type: 'wall'
        });
      }
    }

    // 2. Left and Right 3D Spatial Flanks (framing the machine with depth)
    const flankRows = 24;
    const flankDepth = 30;
    const flankZSpacing = 1.35;
    
    for (let f = 0; f < 2; f++) {
      const isLeft = f === 0;
      const baseSideX = isLeft ? -26.0 : 26.0;
      
      for (let r = 0; r < flankRows; r++) {
        for (let d = 0; d < flankDepth; d++) {
          const z = -14.0 + d * flankZSpacing;
          const y = startY + r * rowSpacing;
          const x = baseSideX + (isLeft ? -(d * 0.2) : (d * 0.2));
          
          dots.push({
            x, y, z,
            scale: 0.11,
            type: 'flank'
          });
        }
      }
    }

    // 3. Ground / Floor perimeter 3D Dot Ring (subtle spatial beacons near floor)
    const ringCount = 120;
    const radius = 22.0;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const rDist = radius + (Math.sin(i * 4) * 2.0);
      const x = Math.cos(angle) * rDist;
      const z = Math.sin(angle) * rDist;
      const y = -4.85;
      dots.push({
        x, y, z,
        scale: 0.09,
        type: 'floor'
      });
    }

    this.dotCount = dots.length;

    // Use a small SphereGeometry with smooth shading for physical 3D volumetric presence
    const dotGeometry = new THREE.SphereGeometry(1.0, 10, 8);

    // Glowing digital twin emissive dot material
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.instancedMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, this.dotCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Color palette: Cyan, Electric Blue, Bright White-Blue
    const colorPalette = [
      new THREE.Color(0x38bdf8), // vibrant sky blue
      new THREE.Color(0x0ea5e9), // deep electric blue
      new THREE.Color(0x00f0ff), // bright cyber cyan
      new THREE.Color(0xe0f2fe), // luminescent white-blue
      new THREE.Color(0x93c5fd), // soft periwinkle
    ];

    for (let i = 0; i < this.dotCount; i++) {
      const d = dots[i];
      
      this.dummy.position.set(d.x, d.y, d.z);
      this.dummy.scale.set(d.scale, d.scale, d.scale);
      this.dummy.updateMatrix();
      
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      // Assign realistic color variation
      const colIndex = Math.floor(Math.random() * colorPalette.length);
      const color = colorPalette[colIndex].clone();
      
      // Slight brightness attenuation based on Z depth
      const depthFactor = THREE.MathUtils.clamp(1.0 - (Math.abs(d.z) / 40.0) * 0.35, 0.45, 1.0);
      color.multiplyScalar(depthFactor);
      
      this.instancedMesh.setColorAt(i, color);

      this.dotData.push({
        pos: new THREE.Vector3(d.x, d.y, d.z),
        baseScale: d.scale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.8,
        color: color
      });
    }

    this.instancedMesh.instanceColor.needsUpdate = true;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedMesh);
  }

  initLaboratoryFloor() {
    // 1. Dark high-tech reflective ground plane
    const floorGeo = new THREE.PlaneGeometry(100, 100, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x05070c,
      roughness: 0.32,
      metalness: 0.88,
      envMapIntensity: 0.6
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.95;
    floor.receiveShadow = true;
    this.group.add(floor);

    // 2. High-precision circular pedestal ring grid under the machine
    const ringGeo = new THREE.RingGeometry(8.5, 8.58, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -4.93;
    this.group.add(ring);

    const innerRingGeo = new THREE.RingGeometry(12.0, 12.06, 80);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = -4.93;
    this.group.add(innerRing);

    // 3. Subtle grid lines on the floor around the pedestal
    const gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -4.94;
    gridHelper.material.opacity = 0.55;
    gridHelper.material.transparent = true;
    this.group.add(gridHelper);

    // 4. Soft contact shadow plane directly beneath the machine cabinet base
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(256, 256, 60, 256, 256, 256);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.8, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 512, 512);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(16, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -4.92;
    this.group.add(contactShadow);
  }

  update(time, delta) {
    // Subtle breathing shimmer to give the dots a living digital-twin presence
    // Only update matrices periodically or subtly animate scale to maintain 60fps
    if (!this.instancedMesh) return;

    // Subtle luminance pulse
    const pulseFactor = 0.95 + Math.sin(time * 1.5) * 0.05;
    this.instancedMesh.material.opacity = 0.82 * pulseFactor;
  }
}
