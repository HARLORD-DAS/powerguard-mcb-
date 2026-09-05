import * as THREE from 'three';

/**
 * Clean Engineering Studio Lighting & Neutral Environment
 * Creates photorealistic neutral laboratory lighting, soft contact shadows,
 * ground reflection/shadow plane, and technical arc flash effect.
 */
export class StudioLighting {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'StudioEnvironment';
    this.scene.add(this.group);

    this.arcFlashLight = null;
    this.initEnvironment();
    this.initLights();
    this.initGroundShadowPlane();
  }

  initEnvironment() {
    // Light neutral clean engineering studio background
    const bgCol = new THREE.Color(0xdde3ea);
    this.scene.background = bgCol;
    this.scene.fog = new THREE.FogExp2(0xdde3ea, 0.015);
  }

  initLights() {
    // 1. Balanced Ambient Fill Light (Soft neutral daylight)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.group.add(ambientLight);

    // 2. Main Key Light (Top-Front Right, casting soft shadows on floor and components)
    const keyLight = new THREE.DirectionalLight(0xfffdfa, 2.6);
    keyLight.position.set(10, 16, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 3.0; // Soft PCF shadow edges
    this.group.add(keyLight);

    // 3. Top-Down Light (Illuminating top-mounted PLC, DAQ, and cable raceways)
    const topLight = new THREE.DirectionalLight(0xf1f5f9, 1.5);
    topLight.position.set(0, 18, 2);
    this.group.add(topLight);

    // 4. Soft Fill Light (Left Front, to soften shadows inside bays)
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.4);
    fillLight.position.set(-12, 8, 8);
    this.group.add(fillLight);

    // 5. Subtle Studio Rim / Glint Light (Right and Rear for specular edges on metals)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(14, 6, -8);
    this.group.add(rimLight);

    // 6. Dynamic Arc Flash Strobe Light (Positioned right at MCB DUT station)
    this.arcFlashLight = new THREE.PointLight(0x00f0ff, 0, 18, 1.2);
    this.arcFlashLight.position.set(4.9, 0.0, 0.8);
    this.group.add(this.arcFlashLight);
  }

  initGroundShadowPlane() {
    // Floor plane that catches the cabinet's soft contact shadow
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.ShadowMaterial({
      opacity: 0.28
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.9; // Just below cabinet bottom
    floor.receiveShadow = true;
    this.group.add(floor);

    // Clean subtle radial gradient floor circle beneath cabinet
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const ambientFloorMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const ambientFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), ambientFloorMat);
    ambientFloor.rotation.x = -Math.PI / 2;
    ambientFloor.position.set(0, -4.89, 0.5);
    this.group.add(ambientFloor);
  }

  triggerArcFlash() {
    if (!this.arcFlashLight) return;
    this.arcFlashLight.intensity = 25.0;
    this.arcFlashLight.color.setHex(0x67e8f9);

    let step = 0;
    const strobe = () => {
      step++;
      if (step < 7) {
        this.arcFlashLight.intensity = Math.random() > 0.3 ? 18.0 : 3.0;
        this.arcFlashLight.color.setHex(Math.random() > 0.5 ? 0xffffff : 0x00f0ff);
        setTimeout(strobe, 20);
      } else {
        this.arcFlashLight.intensity = 0;
      }
    };
    strobe();
  }
}
