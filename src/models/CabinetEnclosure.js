import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator.js';

/**
 * Industrial Machine Cabinet Enclosure (Matching Master Reference Image)
 * Models the dark powder-coated steel cabinet, open hinged left door with louvers,
 * right panel louvers, lifting eye bolts, and physical 3D machine pushbuttons.
 */
export class CabinetEnclosure {
  constructor(simulationEngine) {
    this.sim = simulationEngine;
    this.group = new THREE.Group();
    this.group.name = 'CabinetEnclosure';

    this.interactiveObjects = [];

    // Moving parts
    this.doorPivot = null;
    this.startBtnMesh = null;
    this.stopBtnMesh = null;
    this.estopBtnMesh = null;
    this.explodeSwitchMesh = null;
    this.xraySwitchMesh = null;

    this.initMaterials();
    this.initCabinetFrame();
    this.initOpenLeftDoor();
    this.initRightPanelLouvers();
    this.initLiftingEyeBolts();
    this.initMachinePhysicalControls();
  }

  initMaterials() {
    // Dark Charcoal / Anthracite Powder-Coated Metal
    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x1e2228,
      roughness: 0.55,
      metalness: 0.7
    });

    // Interior Frame Bevel Material
    this.innerFrameMat = new THREE.MeshStandardMaterial({
      color: 0x14171c,
      roughness: 0.5,
      metalness: 0.8
    });

    // Stainless Steel / Chrome (Hinges, Eyebolts, Screws)
    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.25,
      metalness: 0.95
    });

    // Ventilation Louver Material
    this.louverMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createCabinetLouversTexture(),
      roughness: 0.55,
      metalness: 0.65
    });

    // Rubber Feet
    this.rubberMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c0e,
      roughness: 0.9,
      metalness: 0.1
    });

    // Pushbutton Materials
    this.greenBtnMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x064e3b,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.3
    });

    this.redBtnMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.3
    });

    this.yellowBezelMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.4,
      metalness: 0.6
    });

    this.blackSwitchMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.5
    });
  }

  initCabinetFrame() {
    const W = 14.8;
    const H = 9.6;
    const D = 3.2;
    const T = 0.15; // Wall thickness

    // 1. Top Panel
    const topGeo = new THREE.BoxGeometry(W, T, D);
    const topMesh = new THREE.Mesh(topGeo, this.metalMat);
    topMesh.position.set(0, H / 2 - T / 2, -D / 2 + 0.8);
    topMesh.castShadow = true;
    this.group.add(topMesh);

    // 2. Bottom Panel
    const botGeo = new THREE.BoxGeometry(W, T, D);
    const botMesh = new THREE.Mesh(botGeo, this.metalMat);
    botMesh.position.set(0, -H / 2 + T / 2, -D / 2 + 0.8);
    botMesh.receiveShadow = true;
    this.group.add(botMesh);

    // 3. Right Side Panel
    const rightGeo = new THREE.BoxGeometry(T, H - 2 * T, D);
    const rightMesh = new THREE.Mesh(rightGeo, this.metalMat);
    rightMesh.position.set(W / 2 - T / 2, 0, -D / 2 + 0.8);
    rightMesh.castShadow = true;
    this.group.add(rightMesh);

    // 4. Left Side Panel
    const leftGeo = new THREE.BoxGeometry(T, H - 2 * T, D);
    const leftMesh = new THREE.Mesh(leftGeo, this.metalMat);
    leftMesh.position.set(-W / 2 + T / 2, 0, -D / 2 + 0.8);
    leftMesh.castShadow = true;
    this.group.add(leftMesh);

    // 5. Back Outer Shell
    const backGeo = new THREE.BoxGeometry(W, H, T);
    const backMesh = new THREE.Mesh(backGeo, this.metalMat);
    backMesh.position.set(0, 0, -D + 0.8 + T / 2);
    this.group.add(backMesh);

    // 6. Perimeter Front Lip / Bevel Frame
    const lipMat = this.innerFrameMat;
    // Top lip
    const tLip = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, 0.12), lipMat);
    tLip.position.set(0, H / 2 - 0.125, 0.8);
    this.group.add(tLip);
    // Bottom lip
    const bLip = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, 0.12), lipMat);
    bLip.position.set(0, -H / 2 + 0.125, 0.8);
    this.group.add(bLip);
    // Right lip
    const rLip = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, 0.12), lipMat);
    rLip.position.set(W / 2 - 0.125, 0, 0.8);
    this.group.add(rLip);
    // Left lip
    const lLip = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, 0.12), lipMat);
    lLip.position.set(-W / 2 + 0.125, 0, 0.8);
    this.group.add(lLip);

    // 7. Base Rubber Mounting Feet (4 corners)
    [-W / 2 + 0.8, W / 2 - 0.8].forEach(fx => {
      [-D + 1.2, 0.5].forEach(fz => {
        const footGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.25, 16);
        const foot = new THREE.Mesh(footGeo, this.rubberMat);
        foot.position.set(fx, -H / 2 - 0.125, fz);
        this.group.add(foot);
      });
    });
  }

  // -------------------------------------------------------------
  // DUAL OPEN HINGED DOORS (Left and Right - matching master reference image)
  // -------------------------------------------------------------
  initOpenLeftDoor() {
    const W = 14.8;
    const H = 9.6;
    const doorW = 4.2;
    const doorH = H - 0.2;

    // --- 1. LEFT DOOR ---
    // Hinge Pivot at front-left edge of cabinet
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-W / 2 + 0.1, 0, 0.82);
    // Swung open forward and to the left at ~78 degrees
    this.doorPivot.rotation.y = Math.PI * 0.43;

    const leftDoorGroup = new THREE.Group();
    leftDoorGroup.position.set(doorW / 2, 0, 0);

    const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), this.metalMat);
    leftDoorGroup.add(leftPlate);

    // Inner stiffener perimeter flanges
    const fT = 0.08;
    const fD = 0.15;
    const topF = new THREE.Mesh(new THREE.BoxGeometry(doorW, fT, fD), this.innerFrameMat);
    topF.position.set(0, doorH / 2 - fT / 2, -fD / 2);
    leftDoorGroup.add(topF);

    const botF = new THREE.Mesh(new THREE.BoxGeometry(doorW, fT, fD), this.innerFrameMat);
    botF.position.set(0, -doorH / 2 + fT / 2, -fD / 2);
    leftDoorGroup.add(botF);

    const outerF = new THREE.Mesh(new THREE.BoxGeometry(fT, doorH, fD), this.innerFrameMat);
    outerF.position.set(doorW / 2 - fT / 2, 0, -fD / 2);
    leftDoorGroup.add(outerF);

    // Inside Stamped Ventilation Louvers
    const louverGeo = new THREE.PlaneGeometry(1.6, 5.2);
    const leftLouver = new THREE.Mesh(louverGeo, this.louverMat);
    leftLouver.rotation.y = Math.PI;
    leftLouver.position.set(0, 0, -0.045);
    leftDoorGroup.add(leftLouver);

    // 3 Stainless Steel Barrel Hinges on Left Edge
    [-3.5, 0, 3.5].forEach(hy => {
      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.45, 16),
        this.steelMat
      );
      hinge.position.set(-doorW / 2, hy, 0);
      leftDoorGroup.add(hinge);
    });

    leftDoorGroup.userData = {
      type: 'CABINET_DOOR_LEFT',
      name: 'Left Hinged Enclosure Door',
      category: 'Enclosure Protection',
      desc: 'Heavy-gauge industrial door with internal stiffeners and ventilation louvers.'
    };

    this.doorPivot.add(leftDoorGroup);
    this.group.add(this.doorPivot);
    this.interactiveObjects.push(leftDoorGroup);

    // --- 2. RIGHT DOOR ---
    // Hinge Pivot at front-right edge of cabinet
    this.rightDoorPivot = new THREE.Group();
    this.rightDoorPivot.position.set(W / 2 - 0.1, 0, 0.82);
    // Swung open forward and to the right at ~78 degrees
    this.rightDoorPivot.rotation.y = -Math.PI * 0.43;

    const rightDoorGroup = new THREE.Group();
    rightDoorGroup.position.set(-doorW / 2, 0, 0);

    const rightPlate = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), this.metalMat);
    rightDoorGroup.add(rightPlate);

    // Inner stiffeners
    const rTopF = new THREE.Mesh(new THREE.BoxGeometry(doorW, fT, fD), this.innerFrameMat);
    rTopF.position.set(0, doorH / 2 - fT / 2, -fD / 2);
    rightDoorGroup.add(rTopF);

    const rBotF = new THREE.Mesh(new THREE.BoxGeometry(doorW, fT, fD), this.innerFrameMat);
    rBotF.position.set(0, -doorH / 2 + fT / 2, -fD / 2);
    rightDoorGroup.add(rBotF);

    const rOuterF = new THREE.Mesh(new THREE.BoxGeometry(fT, doorH, fD), this.innerFrameMat);
    rOuterF.position.set(-doorW / 2 + fT / 2, 0, -fD / 2);
    rightDoorGroup.add(rOuterF);

    // Inside Louvers
    const rightLouver = new THREE.Mesh(louverGeo, this.louverMat);
    rightLouver.rotation.y = Math.PI;
    rightLouver.position.set(0, 0, -0.045);
    rightDoorGroup.add(rightLouver);

    // 3 Barrel Hinges on Right Edge
    [-3.5, 0, 3.5].forEach(hy => {
      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.45, 16),
        this.steelMat
      );
      hinge.position.set(doorW / 2, hy, 0);
      rightDoorGroup.add(hinge);
    });

    rightDoorGroup.userData = {
      type: 'CABINET_DOOR_RIGHT',
      name: 'Right Hinged Enclosure Door',
      category: 'Enclosure Protection',
      desc: 'Heavy-gauge industrial door with internal stiffeners and ventilation louvers.'
    };

    this.rightDoorPivot.add(rightDoorGroup);
    this.group.add(this.rightDoorPivot);
    this.interactiveObjects.push(rightDoorGroup);
  }

  // -------------------------------------------------------------
  // RIGHT PANEL VENTILATION LOUVERS
  // -------------------------------------------------------------
  initRightPanelLouvers() {
    const W = 14.8;
    const louverGeo = new THREE.PlaneGeometry(2.0, 5.5);
    const louverMesh = new THREE.Mesh(louverGeo, this.louverMat);
    louverMesh.rotation.y = Math.PI / 2;
    louverMesh.position.set(W / 2 + 0.01, 0, -0.6);
    this.group.add(louverMesh);
  }

  // -------------------------------------------------------------
  // LIFTING EYE BOLTS (Top Left and Right)
  // -------------------------------------------------------------
  initLiftingEyeBolts() {
    const W = 14.8;
    const H = 9.6;

    [-W / 2 + 1.2, W / 2 - 1.2].forEach(ex => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(ex, H / 2 + 0.1, -0.4);

      // Threaded collar base
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.2, 16),
        this.steelMat
      );
      eyeGroup.add(collar);

      // Torus ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.08, 12, 24),
        this.steelMat
      );
      ring.position.y = 0.35;
      eyeGroup.add(ring);

      this.group.add(eyeGroup);
    });
  }

  // -------------------------------------------------------------
  // PHYSICAL 3D MACHINE CONTROLS (Mounted directly on Cabinet Frame)
  // The Model ITSELF is the User Interface!
  // -------------------------------------------------------------
  initMachinePhysicalControls() {
    const W = 14.8;
    const H = 9.6;
    const topRimY = H / 2 - 0.12;

    // Control Plate strip along upper right frame rim
    const ctrlGroup = new THREE.Group();
    ctrlGroup.position.set(W / 2 - 2.8, topRimY, 0.85);

    // 1. Physical Green Illuminated "TEST START" Pushbutton
    const startGroup = new THREE.Group();
    startGroup.position.set(-2.2, 0, 0);

    const bezel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 20), this.steelMat);
    bezel1.rotation.x = Math.PI / 2;
    startGroup.add(bezel1);

    this.startBtnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 20), this.greenBtnMat);
    this.startBtnMesh.rotation.x = Math.PI / 2;
    this.startBtnMesh.position.z = 0.05;
    startGroup.add(this.startBtnMesh);

    startGroup.userData = {
      type: 'PHYSICAL_START_BTN',
      name: 'System Test Start Pushbutton',
      category: 'Physical Control',
      desc: 'Industrial 22mm illuminated momentary pushbutton. Press to initiate calibrated MCB trip test sequence.'
    };
    ctrlGroup.add(startGroup);
    this.interactiveObjects.push(startGroup);

    // 2. Physical Red "TEST STOP" Pushbutton
    const stopGroup = new THREE.Group();
    stopGroup.position.set(-1.4, 0, 0);

    const bezel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 20), this.steelMat);
    bezel2.rotation.x = Math.PI / 2;
    stopGroup.add(bezel2);

    this.stopBtnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 20), this.redBtnMat);
    this.stopBtnMesh.rotation.x = Math.PI / 2;
    this.stopBtnMesh.position.z = 0.05;
    stopGroup.add(this.stopBtnMesh);

    stopGroup.userData = {
      type: 'PHYSICAL_STOP_BTN',
      name: 'System Test Stop Pushbutton',
      category: 'Physical Control',
      desc: 'Industrial flush pushbutton. Press to halt current testing sequence.'
    };
    ctrlGroup.add(stopGroup);
    this.interactiveObjects.push(stopGroup);

    // 3. Physical Mushroom "E-STOP" Twist-to-Release
    const estopGroup = new THREE.Group();
    estopGroup.position.set(-0.6, 0, 0);

    // Yellow hazard collar
    const yCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24), this.yellowBezelMat);
    yCollar.rotation.x = Math.PI / 2;
    estopGroup.add(yCollar);

    // Red mushroom head
    this.estopBtnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.16, 24), this.redBtnMat);
    this.estopBtnMesh.rotation.x = Math.PI / 2;
    this.estopBtnMesh.position.z = 0.09;
    estopGroup.add(this.estopBtnMesh);

    estopGroup.userData = {
      type: 'PHYSICAL_ESTOP_BTN',
      name: 'Emergency Stop Mushroom Switch',
      category: 'Safety Interlock',
      desc: 'Twist-to-release 40mm emergency disconnect switch. Immediately isolates all power contactors.'
    };
    ctrlGroup.add(estopGroup);
    this.interactiveObjects.push(estopGroup);

    // 4. Physical Rotary Selector for "EXPLODED VIEW"
    const explodeGroup = new THREE.Group();
    explodeGroup.position.set(0.4, 0, 0);

    const exBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 20), this.steelMat);
    exBezel.rotation.x = Math.PI / 2;
    explodeGroup.add(exBezel);

    this.explodeSwitchMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.14), this.blackSwitchMat);
    this.explodeSwitchMesh.position.z = 0.08;
    explodeGroup.add(this.explodeSwitchMesh);

    explodeGroup.userData = {
      type: 'PHYSICAL_EXPLODE_SWITCH',
      name: 'Exploded Inspection Selector Switch',
      category: 'Inspection Mode',
      desc: '2-position industrial rotary switch. Turn to explode/reassemble internal assemblies into 3D inspection planes.'
    };
    ctrlGroup.add(explodeGroup);
    this.interactiveObjects.push(explodeGroup);

    // 5. Physical Toggle Switch for "X-RAY MODE"
    const xrayGroup = new THREE.Group();
    xrayGroup.position.set(1.2, 0, 0);

    const xrBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.08, 20), this.steelMat);
    xrBezel.rotation.x = Math.PI / 2;
    xrayGroup.add(xrBezel);

    this.xraySwitchMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 12), this.steelMat);
    this.xraySwitchMesh.rotation.x = Math.PI / 4;
    this.xraySwitchMesh.position.set(0, 0.08, 0.1);
    xrayGroup.add(this.xraySwitchMesh);

    xrayGroup.userData = {
      type: 'PHYSICAL_XRAY_SWITCH',
      name: 'Internal X-Ray Toggle Switch',
      category: 'Inspection Mode',
      desc: 'Heavy-duty toggle switch. Flip to see through breaker housings, revealing internal bimetals, trip coils, and arc chutes.'
    };
    ctrlGroup.add(xrayGroup);
    this.interactiveObjects.push(xrayGroup);

    // 6. Reset Camera Button
    const resetGroup = new THREE.Group();
    resetGroup.position.set(2.0, 0, 0);

    const rBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 20), this.steelMat);
    rBezel.rotation.x = Math.PI / 2;
    resetGroup.add(rBezel);

    const rBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), this.innerFrameMat);
    rBtn.rotation.x = Math.PI / 2;
    rBtn.position.z = 0.04;
    resetGroup.add(rBtn);

    resetGroup.userData = {
      type: 'PHYSICAL_RESET_BTN',
      name: 'Camera Reset Pushbutton',
      category: 'View Control',
      desc: 'Resets camera orbit to front master blueprint inspection framing.'
    };
    ctrlGroup.add(resetGroup);
    this.interactiveObjects.push(resetGroup);

    this.group.add(ctrlGroup);
  }

  update(time, delta) {
    // 1. Animate door opening/closing if door state toggles
    if (this.doorPivot) {
      const targetAngle = this.sim.doorsOpen ? -Math.PI * 0.45 : -Math.PI * 0.02;
      this.doorPivot.rotation.y = THREE.MathUtils.lerp(
        this.doorPivot.rotation.y,
        targetAngle,
        delta * 6.0
      );
    }

    // 2. Animate Exploded Switch rotation
    if (this.explodeSwitchMesh) {
      const targetAngle = this.sim.isExploded ? Math.PI / 4 : -Math.PI / 4;
      this.explodeSwitchMesh.rotation.z = THREE.MathUtils.lerp(
        this.explodeSwitchMesh.rotation.z,
        targetAngle,
        delta * 8.0
      );
    }

    // 3. Animate X-Ray Switch toggle
    if (this.xraySwitchMesh) {
      const targetAngle = this.sim.isXray ? -Math.PI / 4 : Math.PI / 4;
      this.xraySwitchMesh.rotation.x = THREE.MathUtils.lerp(
        this.xraySwitchMesh.rotation.x,
        targetAngle,
        delta * 8.0
      );
    }

    // 4. Glow Green start button when testing
    if (this.startBtnMesh && this.startBtnMesh.material) {
      const isTesting = this.sim.state === 'TESTING';
      const targetIntensity = isTesting ? 1.4 : 0.3;
      this.startBtnMesh.material.emissiveIntensity = THREE.MathUtils.lerp(
        this.startBtnMesh.material.emissiveIntensity,
        targetIntensity,
        delta * 8.0
      );
    }
  }
}
