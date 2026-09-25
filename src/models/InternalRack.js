import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator.js';

/**
 * Photorealistic Internal Electrical Architecture (Exact Master Reference Blueprint)
 * Reconstructs the exact internal system from the uploaded master image:
 * - 4 Testing Paths with color badges
 * - Input MCBs with physical interactive knobs
 * - Heavy High Current & Voltage Transformers
 * - Stage 1 Sensors (Voltage + Current)
 * - 8 Axial Power Diodes (2 per path) on heatsinks
 * - Common R/XL Configuration Bank with dual rotary dials and brass studs
 * - Stage 2 Sensors (3 sets, neutral bypass on 4)
 * - 4 High Power Test Switching contactors
 * - MCB Under Test (DUT) Station with 3-pole breaker, busbars & Arc Containment Zone
 * - Top Row: Control Power Supply, Siemens S7-1200 PLC, High-Speed DAQ, Comm Modules
 * - Bottom Row: Output Sensors, DAQ, Current Shunt, Voltage Divider, Acoustic, Isolation, Earth Bus
 * - Exploded Engineering Mode & True X-Ray Internal Dissection Geometry
 */
export class InternalRack {
  constructor(simulationEngine) {
    this.sim = simulationEngine;
    this.group = new THREE.Group();
    this.group.name = 'InternalRack';

    this.interactiveObjects = [];

    // Interactive moving parts
    this.mcbKnobs = [];
    this.rDial = null;
    this.xlDial = null;
    this.dutLever = null;
    this.dutLeverPivot = null;
    this.dutLevers = [];
    this.dutModelGroup = null;
    this.dutDynamicCasingMeshes = [];
    this.dutDynamicXrayGroup = null;
    this.lastDutConfigKey = null;
    this.switchArms = [];

    // Assembly Groups for Exploded View
    this.assemblies = {
      backplate: null,
      topControl: new THREE.Group(),
      paths: [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()],
      rxlBank: new THREE.Group(),
      stage2AndSwitching: new THREE.Group(),
      dutStation: new THREE.Group(),
      bottomMeasurement: new THREE.Group()
    };

    // X-Ray Groups (Casings vs Internals)
    this.casingMeshes = [];
    this.internalXrayMeshes = [];

    this.initMaterials();
    this.initRackBackplateAndDINRails();
    this.initTopControlTier();
    this.initFourTestingPaths();
    this.initCommonRXLBank();
    this.initSensorStage2AndSwitching();
    this.initMCBDUTStation();
    this.initBottomMeasurementTier();

    // Assemble groups
    Object.values(this.assemblies).forEach(grp => {
      if (grp && grp.isGroup) {
        this.group.add(grp);
      } else if (Array.isArray(grp)) {
        grp.forEach(subGrp => {
          if (subGrp && subGrp.isGroup) this.group.add(subGrp);
        });
      }
    });
  }

  initMaterials() {
    // Structural DIN rail & steel
    this.dinRailMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      metalness: 0.95
    });

    // Dark Charcoal Sub-Panel / Tray Frame Material
    this.innerFrameMat = new THREE.MeshStandardMaterial({
      color: 0x181b20,
      roughness: 0.55,
      metalness: 0.7
    });

    // Stainless Steel (Probes, Hardware)
    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.25,
      metalness: 0.95
    });

    // Solid Red Copper (Busbars, Transformer Windings)
    this.copperMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.25,
      metalness: 0.92
    });

    // Solid Brass (Terminals, Studs, Screws, Shunts)
    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.28,
      metalness: 0.9
    });

    // Dark Steel / Transformer Core Laminations
    this.transformerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.65,
      metalness: 0.7
    });

    // White MCB Housing Plastic
    this.mcbPlasticMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      roughness: 0.35,
      metalness: 0.1
    });

    // Industrial Dark Knobs & Switch Bodies
    this.knobMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.4
    });

    // Vibrant Industrial Blue MCB Toggle Switch Lever (Matching Reference Photo)
    this.mcbToggleBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      roughness: 0.3,
      metalness: 0.15
    });

    // DIN Rail Mounting Clip Latch Blue
    this.dinClipMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.35,
      metalness: 0.1
    });

    // Royal Blue PCB / Transducer Housing
    this.pcbBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.35,
      metalness: 0.3
    });

    // Forest Green PCB
    this.pcbGreenMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.35,
      metalness: 0.3
    });

    // Black Slotted Cable Trunking
    this.trunkingMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.55,
      metalness: 0.2
    });

    // Aluminum Heatsinks
    this.heatsinkMat = new THREE.MeshStandardMaterial({
      color: 0x1e2228,
      roughness: 0.4,
      metalness: 0.8
    });

    // Axial Diode Material
    this.diodeMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createDiodeTexture(),
      roughness: 0.3,
      metalness: 0.5
    });

    // Voltage Sensor Faceplate
    this.voltSensorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createVoltageSensorTexture(),
      roughness: 0.35,
      metalness: 0.4
    });

    // Current Sensor PCB Faceplate
    this.currSensorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createCurrentSensorTexture(),
      roughness: 0.35,
      metalness: 0.4
    });

    // Polycarbonate Transparent Safety Shield
    this.arcShieldMat = new THREE.MeshPhysicalMaterial({
      map: TextureGenerator.createArcShieldTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.88,
      thickness: 0.04,
      depthWrite: false
    });
  }

  // -------------------------------------------------------------
  // HELPER: Create Hex/Pan Head Terminal Screws
  // -------------------------------------------------------------
  createScrew(x, y, z, r = 0.04, isBrass = true) {
    const screwGeo = new THREE.CylinderGeometry(r, r, 0.04, 12);
    const screw = new THREE.Mesh(screwGeo, isBrass ? this.brassMat : this.dinRailMat);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(x, y, z);
    return screw;
  }

  // -------------------------------------------------------------
  // HELPER: Create Prototype Voltage Sensor Transducer Unit
  // -------------------------------------------------------------
  createVoltageSensorUnit(x, y, z, name = 'Prototype Voltage Sensor', pathId = null, category = 'Voltage Transducer') {
    const vSens = new THREE.Group();
    vSens.position.set(x, y, z);

    // Blue molded modular transducer housing
    const vBody = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.82, 0.22), this.voltSensorMat);
    vSens.add(vBody);
    this.casingMeshes.push(vBody);

    // 8 Brass Terminal Clamp Screws (4 top row, 4 bottom row)
    for (let s = 0; s < 4; s++) {
      const sx = -0.17 + s * 0.113;
      vSens.add(this.createScrew(sx, 0.35, 0.12, 0.026, true));
      vSens.add(this.createScrew(sx, -0.35, 0.12, 0.026, true));
    }

    // Side terminal header pins (3 pins on left, 3 pins on right) matching reference image
    [-0.28, 0.28].forEach(px => {
      for (let p = -1; p <= 1; p++) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 8), this.brassMat);
        pin.rotation.z = Math.PI / 2;
        pin.position.set(px, p * 0.15, 0.02);
        vSens.add(pin);
      }
    });

    // Bright status indicator LED
    const vLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    vLed.position.set(0, -0.12, 0.12);
    vSens.add(vLed);

    vSens.userData = {
      type: 'PROTOTYPE_VOLTAGE_SENSOR',
      pathId: pathId,
      name: name,
      category: category,
      desc: 'Precision 0-500V isolated prototype voltage sensor transducer with 2.5kV galvanic isolation barrier, terminal screws L1-L3/N and secondary analog outputs +V/-V.'
    };

    return vSens;
  }

  // -------------------------------------------------------------
  // MASTER BACKPLATE & SLOTTED STEEL DIN RAILS
  // -------------------------------------------------------------
  initRackBackplateAndDINRails() {
    this.assemblies.backplate = new THREE.Group();

    // 1. High-Resolution Master Internal Backplate
    const backGeo = new THREE.PlaneGeometry(14.2, 9.2);
    const backMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createTestingPathsBackplateTexture(),
      roughness: 0.5,
      metalness: 0.65
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.set(0, 0, -0.6);
    this.assemblies.backplate.add(backMesh);

    // 2. Slotted Top-Hat DIN EN 50022 Steel Rails
    const railYPositions = [3.2, 1.8, 0.6, -0.6, -1.8, -3.3];
    railYPositions.forEach(ry => {
      const railGroup = new THREE.Group();
      railGroup.position.set(0, ry, -0.55);

      // Center spine
      const spine = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.08, 0.04), this.dinRailMat);
      railGroup.add(spine);
      // Top lip
      const tLip = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.02, 0.03), this.dinRailMat);
      tLip.position.set(0, 0.04, 0.02);
      railGroup.add(tLip);
      // Bottom lip
      const bLip = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.02, 0.03), this.dinRailMat);
      bLip.position.set(0, -0.04, 0.02);
      railGroup.add(bLip);

      // Standoff screws along rail
      for (let sx = -6.4; sx <= 6.4; sx += 1.6) {
        railGroup.add(this.createScrew(sx, 0, 0.03, 0.035, false));
      }

      this.assemblies.backplate.add(railGroup);
    });

    // 3. Perimeter Wireways (Slotted Cable Ducts along outer borders)
    const ducts = [
      { x: -6.98, y: 0, w: 0.16, h: 8.9, d: 0.06 },
      { x: 6.98, y: 0, w: 0.16, h: 8.9, d: 0.06 },
      { x: 0, y: 4.5, w: 14.1, h: 0.14, d: 0.06 },
      { x: 0, y: -4.5, w: 14.1, h: 0.14, d: 0.06 }
    ];
    ducts.forEach(d => {
      const duct = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.d || 0.06), this.trunkingMat);
      duct.position.set(d.x, d.y, -0.57);
      this.assemblies.backplate.add(duct);
    });

    this.group.add(this.assemblies.backplate);
  }

  // -------------------------------------------------------------
  // TOP ROW: Control Power, Siemens PLC, High Speed DAQ, Comm
  // -------------------------------------------------------------
  initTopControlTier() {
    const grp = this.assemblies.topControl;
    const yTop = 3.3;

    // --- 1. CONTROL POWER SUPPLY (Step Down Transformer, Rectifier, Regulator) ---
    const psuGroup = new THREE.Group();
    psuGroup.position.set(-5.1, yTop, -0.38);

    // Step Down Transformer
    const transGroup = new THREE.Group();
    transGroup.position.set(-0.9, 0, 0);

    const core = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.65), this.transformerCoreMat);
    transGroup.add(core);

    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.72, 24), this.copperMat);
    coil.rotation.z = Math.PI / 2;
    transGroup.add(coil);

    // Terminal barrier block on top with brass screws
    const termBlock = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.22), this.knobMat);
    termBlock.position.set(0, 0.48, 0);
    transGroup.add(termBlock);
    [-0.24, -0.08, 0.08, 0.24].forEach(tx => {
      termBlock.add(this.createScrew(tx, 0.09, 0, 0.03, true));
    });

    psuGroup.add(transGroup);

    // Rectifier Module
    const rectGroup = new THREE.Group();
    rectGroup.position.set(0.2, 0, 0);

    const rectPcb = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.06), this.pcbGreenMat);
    rectGroup.add(rectPcb);

    // Black bridge rectifier block
    const brBlock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.16), this.knobMat);
    brBlock.position.set(0, 0.1, 0.1);
    rectGroup.add(brBlock);

    // Aluminum Heatsink
    const hs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.12), this.heatsinkMat);
    hs.position.set(0, -0.15, 0.08);
    rectGroup.add(hs);

    psuGroup.add(rectGroup);

    // DC Voltage Regulator Module
    const regGroup = new THREE.Group();
    regGroup.position.set(1.1, 0, 0);

    const regPcb = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.06), this.pcbGreenMat);
    regGroup.add(regPcb);

    // Rotary potentiometer knob on regulator
    const potKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16), this.knobMat);
    potKnob.rotation.x = Math.PI / 2;
    potKnob.position.set(0, 0.12, 0.08);
    regGroup.add(potKnob);

    // Cylindrical filter capacitors
    [-0.16, 0.16].forEach(cx => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.32, 16), this.transformerCoreMat);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(cx, -0.18, 0.18);
      regGroup.add(cap);
    });

    psuGroup.add(regGroup);

    psuGroup.userData = {
      type: 'CONTROL_POWER_SUPPLY',
      name: 'Control Power Supply Unit',
      category: 'Auxiliary Power',
      desc: '230V AC to 24V DC regulated industrial power supply feeding the Siemens S7-1200 PLC, DAQ, and sensor excitation buses.'
    };
    grp.add(psuGroup);
    this.interactiveObjects.push(psuGroup);

    // --- 2. SIEMENS SIMATIC S7-1200 PLC ---
    const plcGroup = new THREE.Group();
    plcGroup.position.set(-1.4, yTop, -0.38);

    const plcBodyGeo = new THREE.BoxGeometry(2.5, 1.15, 0.45);
    const plcMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createSiemensPLCTexture(),
      roughness: 0.45,
      metalness: 0.35
    });
    const plcMesh = new THREE.Mesh(plcBodyGeo, plcMat);
    plcGroup.add(plcMesh);

    // Green Terminal Strips (Top & Bottom) with brass screw terminals
    for (let i = 0; i < 14; i++) {
      const tx = -1.05 + i * 0.16;
      // Top terminals
      const tBlk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), this.pcbGreenMat);
      tBlk.position.set(tx, 0.62, 0.1);
      plcGroup.add(tBlk);
      tBlk.add(this.createScrew(0, 0.08, 0, 0.025, true));

      // Bottom terminals
      const bBlk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), this.pcbGreenMat);
      bBlk.position.set(tx, -0.62, 0.1);
      plcGroup.add(bBlk);
      bBlk.add(this.createScrew(0, -0.08, 0, 0.025, true));
    }

    // Ethernet RJ45 jack with blue cable entering
    const rj45 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.18), this.dinRailMat);
    rj45.position.set(1.0, -0.35, 0.22);
    plcGroup.add(rj45);

    plcGroup.userData = {
      type: 'SIEMENS_PLC',
      name: 'Siemens SIMATIC S7-1200 PLC',
      category: 'Industrial Controller',
      desc: 'Master CPU 1214C DC/DC/DC executing real-time high-speed sequencing, sub-millisecond trip detection, and PROFINET industrial Ethernet telemetry.'
    };
    grp.add(plcGroup);
    this.interactiveObjects.push(plcGroup);

    // --- 3. HIGH SPEED DAQ ---
    const daqGroup = new THREE.Group();
    daqGroup.position.set(1.8, yTop, -0.42);

    const daqGeo = new THREE.BoxGeometry(1.65, 0.95, 0.08);
    const daqMesh = new THREE.Mesh(daqGeo, this.pcbBlueMat);
    daqGroup.add(daqMesh);

    // Gold SMA / BNC Coaxial Connectors along left and right edges
    [-0.85, 0.85].forEach(sx => {
      for (let j = 0; j < 4; j++) {
        const sma = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12),
          this.brassMat
        );
        sma.rotation.z = Math.PI / 2;
        sma.position.set(sx, 0.3 - j * 0.2, 0.04);
        daqGroup.add(sma);
      }
    });

    // Bottom signal wire terminals
    for (let k = 0; k < 8; k++) {
      const term = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), this.knobMat);
      term.position.set(-0.55 + k * 0.16, -0.5, 0.04);
      daqGroup.add(term);
      term.add(this.createScrew(0, 0, 0.04, 0.02, true));
    }

    daqGroup.userData = {
      type: 'HIGH_SPEED_DAQ',
      name: 'High-Speed DAQ System',
      category: 'Data Acquisition',
      desc: '16-Channel 10 MS/s FPGA synchronized transient digitizer capturing sub-cycle fault currents, arc flash ionization, and voltage recovery waveforms.'
    };
    grp.add(daqGroup);
    this.interactiveObjects.push(daqGroup);

    // --- 4. COMMUNICATION MODULES (Wi-Fi, Bluetooth, LAN) ---
    const commGroup = new THREE.Group();
    commGroup.position.set(4.6, yTop, -0.42);

    const commTypes = [
      { name: 'Wi-Fi 6', x: -0.8 },
      { name: 'Bluetooth 5.2', x: 0.0 },
      { name: 'Gigabit LAN', x: 0.8 }
    ];

    commTypes.forEach(c => {
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.06), this.pcbGreenMat);
      cMesh.position.x = c.x;
      commGroup.add(cMesh);

      // Metallic RF shield or RJ45 jack
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.08), this.dinRailMat);
      shield.position.set(c.x, 0.05, 0.06);
      commGroup.add(shield);

      // Status LED
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      led.position.set(c.x, 0.28, 0.05);
      commGroup.add(led);
    });

    commGroup.userData = {
      type: 'COMMUNICATION_MODULES',
      name: 'IoT Communication Gateways',
      category: 'Networking',
      desc: 'Industrial wireless and wired telemetry interfaces broadcasting real-time test data to edge servers and cloud SCADA systems.'
    };
    grp.add(commGroup);
    this.interactiveObjects.push(commGroup);
  }

  // -------------------------------------------------------------
  // THE FOUR TESTING PATHS (Master Image Left Section)
  // -------------------------------------------------------------
  initFourTestingPaths() {
    const paths = [
      { id: 1, name: 'Path 1: High Current Path', y: 1.8, badgeCol: 0x047857 },
      { id: 2, name: 'Path 2: Voltage Path', y: 0.6, badgeCol: 0xb45309 },
      { id: 3, name: 'Path 3: Short Circuit Live Path', y: -0.6, badgeCol: 0x1d4ed8 },
      { id: 4, name: 'Path 4: Short Circuit Neutral Path', y: -1.8, badgeCol: 0xb91c1c }
    ];

    paths.forEach((p, idx) => {
      const pGrp = this.assemblies.paths[idx];

      // 1. INPUT MCB (AUTHENTIC 1-POLE DIN-RAIL MINIATURE CIRCUIT BREAKER) - Matching Reference Photo
      const mcbGroup = new THREE.Group();
      mcbGroup.position.set(-5.4, p.y, -0.36);

      // Compact Vertical Single-Pole DIN MCB Proportions:
      // Height = 0.90 (Centered at p.y. Extends from p.y - 0.45 to p.y + 0.45)
      // Pathway row spacing is 1.20, leaving a clean 0.30 vertical gap of dark backplate between rows!
      // Width = 0.38 (Standard 1P modular width)
      // Depth = 0.58 (Base depth 0.36 + stepped front nose 0.22 forward)
      const mcbW = 0.38;
      const mcbH = 0.90;
      const mcbBaseD = 0.36;

      // (1) 35mm Steel DIN Rail Segment mounted behind this specific breaker
      const dinRailSegment = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.16, 0.04),
        this.dinRailMat
      );
      dinRailSegment.position.set(0, 0, -mcbBaseD / 2 - 0.02);
      mcbGroup.add(dinRailSegment);
      mcbGroup.add(this.createScrew(-0.20, 0, -mcbBaseD / 2 - 0.02, 0.025, false));
      mcbGroup.add(this.createScrew(0.20, 0, -mcbBaseD / 2 - 0.02, 0.025, false));

      // (2) Base Enclosure Body: Molded off-white flame-retardant thermoplastic
      const mcbBase = new THREE.Mesh(
        new THREE.BoxGeometry(mcbW, mcbH, mcbBaseD),
        this.mcbPlasticMat
      );
      mcbGroup.add(mcbBase);
      this.casingMeshes.push(mcbBase);

      // Blue DIN Rail Mounting Latch Clip on top rear (Iconic feature of DIN breakers)
      const dinLatch = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.04),
        this.dinClipMat
      );
      dinLatch.position.set(0, mcbH / 2 + 0.03, -0.12);
      mcbGroup.add(dinLatch);

      const dinLatchHole = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.05),
        this.knobMat
      );
      dinLatchHole.position.set(0, mcbH / 2 + 0.03, -0.12);
      mcbGroup.add(dinLatchHole);

      // (3) Recessed Terminal Shoulders (Top & Bottom Tiers)
      // Top Recessed Terminal Shoulder
      const topShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(mcbW, 0.22, 0.18),
        this.mcbPlasticMat
      );
      topShoulder.position.set(0, 0.34, 0.18);
      mcbGroup.add(topShoulder);
      this.casingMeshes.push(topShoulder);

      // Top Cylindrical Terminal Screw Well
      const topScrewWell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16),
        this.knobMat
      );
      topScrewWell.rotation.x = Math.PI / 2;
      topScrewWell.position.set(0, 0.34, 0.21);
      mcbGroup.add(topScrewWell);
      mcbGroup.add(this.createScrew(0, 0.34, 0.21, 0.038, false));

      // Top Wire Entrance Port
      const topWirePort = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.04, 0.12),
        this.knobMat
      );
      topWirePort.position.set(0, mcbH / 2 - 0.01, 0.14);
      mcbGroup.add(topWirePort);

      // Bottom Recessed Terminal Shoulder
      const botShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(mcbW, 0.22, 0.18),
        this.mcbPlasticMat
      );
      botShoulder.position.set(0, -0.34, 0.18);
      mcbGroup.add(botShoulder);
      this.casingMeshes.push(botShoulder);

      // Bottom Cylindrical Terminal Screw Well
      const botScrewWell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16),
        this.knobMat
      );
      botScrewWell.rotation.x = Math.PI / 2;
      botScrewWell.position.set(0, -0.34, 0.21);
      mcbGroup.add(botScrewWell);
      mcbGroup.add(this.createScrew(0, -0.34, 0.21, 0.038, false));

      // Bottom Wire Exit Port
      const botWirePort = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.04, 0.12),
        this.knobMat
      );
      botWirePort.position.set(0, -mcbH / 2 + 0.01, 0.14);
      mcbGroup.add(botWirePort);

      // (4) Center Protruding Nose / Faceplate
      const noseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(mcbW, 0.46, 0.22),
        this.mcbPlasticMat
      );
      noseMesh.position.set(0, 0, 0.29);
      mcbGroup.add(noseMesh);
      this.casingMeshes.push(noseMesh);

      // Top & Bottom 45-degree Beveled Transition Chamfers
      const topChamfer = new THREE.Mesh(
        new THREE.BoxGeometry(mcbW, 0.06, 0.08),
        this.mcbPlasticMat
      );
      topChamfer.rotation.x = Math.PI / 4;
      topChamfer.position.set(0, 0.24, 0.25);
      mcbGroup.add(topChamfer);

      const botChamfer = new THREE.Mesh(
        new THREE.BoxGeometry(mcbW, 0.06, 0.08),
        this.mcbPlasticMat
      );
      botChamfer.rotation.x = -Math.PI / 4;
      botChamfer.position.set(0, -0.24, 0.25);
      mcbGroup.add(botChamfer);

      // Front Silkscreen Faceplate (Matches Peytul reference layout)
      const faceplateMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createPathwayMCBTexture(p.id),
        roughness: 0.35,
        metalness: 0.12
      });
      const faceplate = new THREE.Mesh(
        new THREE.PlaneGeometry(mcbW - 0.01, 0.45),
        faceplateMat
      );
      faceplate.position.set(0, 0, 0.401);
      mcbGroup.add(faceplate);

      // (5) Operating Toggle Lever Aperture & Vibrant Blue Rocker Lever Handle
      // Recessed Toggle Slot Cavity
      const slotMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.22, 0.14),
        this.knobMat
      );
      slotMesh.position.set(0, 0.09, 0.34);
      mcbGroup.add(slotMesh);

      // Toggle Lever Pivot Group (Pivots vertically along X axis)
      const togglePivot = new THREE.Group();
      togglePivot.position.set(0, 0.09, 0.32);
      // Initial angle: -0.40 rad (pointing UP / ON)
      togglePivot.rotation.x = -0.40;

      // Blue Rocker Lever Handle Body
      const handleBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.16, 0.12),
        this.mcbToggleBlueMat
      );
      togglePivot.add(handleBody);

      // Cylindrical Curved Nose Lip of Handle
      const handleNose = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.13, 16),
        this.mcbToggleBlueMat
      );
      handleNose.rotation.z = Math.PI / 2;
      handleNose.position.set(0, 0.04, 0.06);
      togglePivot.add(handleNose);

      // Five Raised Horizontal Ergonomic Grip Ridges (Iconic blue ribbed lever in reference photo)
      const ridgeMat = new THREE.MeshStandardMaterial({
        color: 0x1565c0,
        roughness: 0.25,
        metalness: 0.2
      });
      for (let r = 0; r < 5; r++) {
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.125, 0.015, 0.018),
          ridgeMat
        );
        ridge.position.set(0, -0.04 + r * 0.022, 0.075);
        togglePivot.add(ridge);
      }

      togglePivot.userData = {
        type: 'INPUT_MCB_TOGGLE',
        pathId: p.id,
        name: `Input MCB ${p.id} Physical Toggle`,
        category: 'Pathway MCB Toggle',
        desc: `Physical operating lever for Path ${p.id}. Clicking the blue lever changes the breaker state.`
      };
      mcbGroup.add(togglePivot);

      // (6) Dynamic Mechanical Trip / Contact Status Window (Below toggle lever)
      const winBezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.055, 0.01),
        this.innerFrameMat
      );
      winBezel.position.set(0, -0.05, 0.402);
      mcbGroup.add(winBezel);

      // Flag indicator mesh (Red = Closed/ON, Green = Open/OFF, Amber = TRIPPED)
      const statusWinMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const statusWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.04, 0.015),
        statusWinMat
      );
      statusWin.position.set(0, -0.05, 0.403);
      mcbGroup.add(statusWin);

      // Clear protective acrylic window cover
      const winLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.045, 0.005),
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          transmission: 0.8
        })
      );
      winLens.position.set(0, -0.05, 0.41);
      mcbGroup.add(winLens);

      // Register with active MCBs array for animation & updates
      this.mcbKnobs.push({
        id: p.id,
        pivot: togglePivot,
        indicator: statusWin
      });

      // (7) Molded Side Casing Details (Assembly Rivets & Parting Lines)
      [-0.191, 0.191].forEach(sx => {
        // 4 Rivet holes where casing halves join
        [
          [0.32, -0.04],
          [-0.32, -0.04],
          [0.14, 0.12],
          [-0.14, 0.12]
        ].forEach(([ry, rz]) => {
          const rivet = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, 0.006, 12),
            this.innerFrameMat
          );
          rivet.rotation.z = Math.PI / 2;
          rivet.position.set(sx, ry, rz);
          mcbGroup.add(rivet);
        });
      });

      // (8) Internal X-Ray Mechanisms (Revealed in X-ray mode)
      const xrayGroup = new THREE.Group();
      // Copper bimetal overload strip
      const bimetal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.05), this.copperMat);
      bimetal.position.set(-0.04, 0, 0);
      xrayGroup.add(bimetal);

      // Electromagnetic trip solenoid coil
      const sol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.20, 16), this.copperMat);
      sol.position.set(0.04, 0.10, 0);
      xrayGroup.add(sol);

      // Arc chute de-ion splitter plates
      for (let ap = 0; ap < 5; ap++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.016, 0.16), this.dinRailMat);
        plate.position.set(0.04, -0.10 - ap * 0.035, 0);
        xrayGroup.add(plate);
      }
      xrayGroup.visible = false;
      mcbGroup.add(xrayGroup);
      this.internalXrayMeshes.push(xrayGroup);

      // Interactive UserData
      mcbGroup.userData = {
        type: 'INPUT_MCB_KNOB', // Group click selects + toggles the physical input MCB

        pathId: p.id,
        name: `Input MCB (${p.name})`,
        category: '1-Pole DIN Miniature Circuit Breaker',
        desc: `Authentic industrial 1-pole DIN-rail miniature circuit breaker protecting ${p.name}. Equipped with vibrant blue ribbed operating toggle lever (ON/OFF), dynamic mechanical contact position window, recessed screw terminals, and IEC 60898-1 thermal-magnetic protection. Click lever to operate.`
      };
      pGrp.add(mcbGroup);
      this.interactiveObjects.push(mcbGroup);

      // 2. TRANSFORMERS (Paths 1 and 2 only) - Exactly at X = -4.3
      if (p.id === 1) {
        // High Current Injection Transformer (Thick copper busbar windings)
        const hcTrans = new THREE.Group();
        hcTrans.position.set(-4.3, p.y, -0.36);

        const core = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.6), this.transformerCoreMat);
        hcTrans.add(core);
        this.casingMeshes.push(core);

        const copperWinding = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.65), this.copperMat);
        hcTrans.add(copperWinding);

        // Heavy brass terminal lugs
        [-0.42, 0.42].forEach(lx => {
          const lug = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.25), this.brassMat);
          lug.position.set(lx, 0.42, 0.2);
          hcTrans.add(lug);
          lug.add(this.createScrew(0, 0.08, 0, 0.04, true));
        });

        hcTrans.userData = {
          type: 'HIGH_CURRENT_TRANSFORMER',
          name: 'High-Current Injection Transformer',
          category: 'Current Injection',
          desc: 'Path 1 custom high-current transformer. Project specification: 240 V AC input, approximately 460 A input current, 10 V AC output, approximately 11,000 A output current, approximately 110 kVA.'
        };
        pGrp.add(hcTrans);
        this.interactiveObjects.push(hcTrans);
      } else if (p.id === 2) {
        // Voltage Testing Transformer - Exactly at X = -4.3
        const vTrans = new THREE.Group();
        vTrans.position.set(-4.3, p.y, -0.36);

        const core = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.5), this.transformerCoreMat);
        vTrans.add(core);
        this.casingMeshes.push(core);

        const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 24), this.copperMat);
        coil.rotation.z = Math.PI / 2;
        vTrans.add(coil);

        // Top terminal barrier block with brass screws
        const tBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.2), this.knobMat);
        tBlock.position.set(0, 0.44, 0.15);
        vTrans.add(tBlock);
        [-0.22, -0.07, 0.07, 0.22].forEach(tx => {
          tBlock.add(this.createScrew(tx, 0.08, 0, 0.028, true));
        });

        vTrans.userData = {
          type: 'VOLTAGE_TRANSFORMER',
          name: 'Precision Voltage Transformer',
          category: 'Voltage Testing Section',
          desc: 'Path 2 voltage step-up transformer. Project specification: 240 V AC input, approximately 42 A input current, 450 V AC output, 22 A output current, approximately 10 kVA.'
        };
        pGrp.add(vTrans);
        this.interactiveObjects.push(vTrans);
      }

      // 3. SENSOR STAGE 1 (VOLTAGE + CURRENT)
      // In Paths 1 & 2: Voltage Sensor at X = -3.3, Current Sensor at X = -2.65
      // In Paths 3 & 4: (No transformer) Voltage Sensor at X = -4.2, Current Sensor at X = -3.45, followed by extended busbars to Diode 1
      const vSensX = (p.id <= 2) ? -3.3 : -4.2;
      const iSensX = (p.id <= 2) ? -2.65 : -3.45;

      // (1) Prototype Voltage Sensor (Blue Molded Housing with 8 brass screws & side header pins)
      const vSens1 = this.createVoltageSensorUnit(
        vSensX,
        p.y,
        -0.4,
        `Stage 1 Prototype Voltage Sensor (${p.name})`,
        p.id,
        'Input Voltage Transducer'
      );
      pGrp.add(vSens1);
      this.interactiveObjects.push(vSens1);

      // (2) Current Sensor (Green FR4 PCB + Yellow Toroid)
      const iSens1 = new THREE.Group();
      iSens1.position.set(iSensX, p.y, -0.4);

      const iBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.08), this.currSensorMat);
      iSens1.add(iBody);

      // Yellow Toroid Ring
      const toroid = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.052, 14, 24),
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 })
      );
      toroid.position.set(0, 0, 0.1);
      iSens1.add(toroid);

      // Heavy copper conductor passing through toroid center
      const cond = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.82, 12), this.copperMat);
      cond.position.set(0, 0, 0.1);
      iSens1.add(cond);

      // 4 Brass terminal header pins
      for (let hp = 0; hp < 4; hp++) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), this.brassMat);
        pin.position.set(-0.15 + hp * 0.1, -0.38, 0.08);
        iSens1.add(pin);
      }

      iSens1.userData = {
        type: 'SENSOR_STAGE_1_CURRENT',
        pathId: p.id,
        name: `Stage 1 Current Sensor (${p.name})`,
        category: 'Input Current Transducer',
        desc: 'Hall-effect current transducer measuring initial test current injection.'
      };
      pGrp.add(iSens1);
      this.interactiveObjects.push(iSens1);

      // For Paths 3 & 4: Extended parallel conductors with standoff guides from Stage 1 to Diode 1 (matching reference image)
      if (p.id >= 3) {
        [-0.08, 0.08].forEach(wy => {
          const busWire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 1.45, 12),
            this.copperMat
          );
          busWire.rotation.z = Math.PI / 2;
          busWire.position.set(-2.55, p.y + wy, -0.38);
          pGrp.add(busWire);

          // Standoff insulator posts
          [-2.8, -2.1].forEach(sx => {
            const post = new THREE.Mesh(
              new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8),
              this.knobMat
            );
            post.rotation.x = Math.PI / 2;
            post.position.set(sx, p.y + wy, -0.44);
            pGrp.add(post);
          });
        });
      }

      // 4. EXACTLY ONE DIODE PER TESTING PATH (D1-D4)
      const diodeGroup = new THREE.Group();
      diodeGroup.position.set(-1.8, p.y, -0.4);
      const hsBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.08), this.heatsinkMat);
      diodeGroup.add(hsBase);
      for (let f = -0.18; f <= 0.18; f += 0.09) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.12), this.heatsinkMat);
        fin.position.set(0, f, 0.06);
        diodeGroup.add(fin);
      }
      const diodeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 16), this.diodeMat);
      diodeCyl.rotation.z = Math.PI / 2;
      diodeCyl.position.z = 0.12;
      diodeGroup.add(diodeCyl);
      [-0.28, 0.28].forEach(lx => {
        const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), this.brassMat);
        lead.rotation.z = Math.PI / 2;
        lead.position.set(lx, 0, 0.12);
        diodeGroup.add(lead);
      });
      diodeGroup.userData = {
        type: 'AXIAL_DIODE',
        pathId: p.id,
        diodeNum: p.id,
        name: 'Diode ' + p.id + ' (' + p.name + ')',
        category: 'Axial Power Diode',
        desc: 'Single discrete power diode for Path ' + p.id + '.'
      };
      pGrp.add(diodeGroup);
      this.interactiveObjects.push(diodeGroup);
    });
  }

  // -------------------------------------------------------------
  // COMMON R / XL CONFIGURATION BANK (Center Column)
  // -------------------------------------------------------------
  initCommonRXLBank() {
    const grp = this.assemblies.rxlBank;
    grp.position.set(0.35, 0.0, -0.38);

    // Front Panel with dial markings
    const panelGeo = new THREE.BoxGeometry(1.55, 3.9, 0.12);
    const panelMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createRXLPanelTexture(),
      roughness: 0.45,
      metalness: 0.55
    });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    grp.add(panelMesh);

    // Corner brass standoff hex screws
    [-0.65, 0.65].forEach(sx => {
      [-1.8, 1.8].forEach(sy => {
        grp.add(this.createScrew(sx, sy, 0.07, 0.04, true));
      });
    });

    // 8 Brass studs row above R dial (matching reference image)
    for (let s = 0; s < 8; s++) {
      const sx = -0.52 + s * 0.15;
      grp.add(this.createScrew(sx, 1.62, 0.08, 0.035, true));
    }

    // 1. Interactive Resistance Dial (R)
    const rGroup = new THREE.Group();
    rGroup.position.set(0, 0.95, 0.1);

    const rKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.4, 0.16, 32),
      this.knobMat
    );
    rKnob.rotation.x = Math.PI / 2;
    rGroup.add(rKnob);

    // Metal pointer arrow
    const rPointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.32, 0.08),
      this.brassMat
    );
    rPointer.position.set(0, 0.16, 0.09);
    rGroup.add(rPointer);

    this.rDial = rGroup;
    rGroup.userData = { type: 'R_DIAL', name: 'Resistance R Control', category: 'Common R / XL', desc: 'Physical resistance selector for the single common R/XL bank. Click to cycle R values.' };
    grp.add(rGroup);
    this.interactiveObjects.push(rGroup);

    // 2. Interactive Reactance Dial (XL)
    const xlGroup = new THREE.Group();
    xlGroup.position.set(0, -0.95, 0.1);

    const xlKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.4, 0.16, 32),
      this.knobMat
    );
    xlKnob.rotation.x = Math.PI / 2;
    xlGroup.add(xlKnob);

    const xlPointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.32, 0.08),
      this.brassMat
    );
    xlPointer.position.set(0, 0.16, 0.09);
    xlGroup.add(xlPointer);

    this.xlDial = xlGroup;
    xlGroup.userData = { type: 'XL_DIAL', name: 'Reactance XL Control', category: 'Common R / XL', desc: 'Physical reactance selector for the single common R/XL bank. Click to cycle XL values.' };
    grp.add(xlGroup);
    this.interactiveObjects.push(xlGroup);

    // 8 Brass studs row below XL dial (matching reference image)
    for (let s = 0; s < 8; s++) {
      const sx = -0.52 + s * 0.15;
      grp.add(this.createScrew(sx, -1.62, 0.08, 0.035, true));
    }

    grp.userData = {
      type: 'RXL_BANK',
      name: 'Common R / XL Configuration Bank',
      category: 'Programmable Load Impedance',
      desc: 'High-power calibrated resistance (0.11 to 1000 Ω) and reactance (0.11 to 1000 mH) bank setting fault power factor and short-circuit current. Click dials to cycle values.'
    };
    this.interactiveObjects.push(grp);
  }

  // -------------------------------------------------------------
  // SENSOR STAGE 2 & HIGH POWER SWITCHING
  // -------------------------------------------------------------
  initSensorStage2AndSwitching() {
    const grp = this.assemblies.stage2AndSwitching;

    // SENSOR STAGE 2: 3 sets for Paths 1, 2, 3. Path 4 has neutral bypass
    const stage2Rows = [
      { id: 1, y: 1.8, name: 'Path 1' },
      { id: 2, y: 0.6, name: 'Path 2' },
      { id: 3, y: -0.6, name: 'Path 3' }
    ];

    stage2Rows.forEach(r => {
      // (1) Prototype Voltage Sensor (Blue Molded Housing with 8 brass screws)
      const vSens = this.createVoltageSensorUnit(
        1.75,
        r.y,
        -0.4,
        `Stage 2 Prototype Voltage Sensor (${r.name})`,
        r.id,
        'Post-Impedance Sensor Stage'
      );
      grp.add(vSens);
      this.interactiveObjects.push(vSens);

      // (2) Current Sensor (Green PCB + Yellow Toroid)
      const iSens = new THREE.Group();
      iSens.position.set(2.35, r.y, -0.4);

      const iBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.08), this.currSensorMat);
      iSens.add(iBody);

      const toroid = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.05, 14, 24),
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 })
      );
      toroid.position.set(0, 0, 0.1);
      iSens.add(toroid);

      // Conductor through toroid
      const cond = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.82, 12), this.copperMat);
      cond.position.set(0, 0, 0.1);
      iSens.add(cond);

      // 4 Brass terminal header pins
      for (let hp = 0; hp < 4; hp++) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), this.brassMat);
        pin.position.set(-0.15 + hp * 0.1, -0.38, 0.08);
        iSens.add(pin);
      }

      iSens.userData = {
        type: 'SENSOR_STAGE_2_CURRENT',
        pathId: r.id,
        name: `Stage 2 Current Sensor (${r.name})`,
        category: 'Post-Impedance Sensor Stage',
        desc: 'Current sensor verifying current delivery before high-power test switches.'
      };
      grp.add(iSens);
      this.interactiveObjects.push(iSens);
    });

    // SENSOR STAGE 2 — Path 4 (Short-Circuit Neutral)
    const p4v = this.createVoltageSensorUnit(
      1.75, -1.8, -0.4,
      'Stage 2 Prototype Voltage Sensor (Path 4)',
      4,
      'Post-Impedance Sensor Stage'
    );
    grp.add(p4v);
    this.interactiveObjects.push(p4v);

    const p4i = new THREE.Group();
    p4i.position.set(2.35, -1.8, -0.4);
    const p4Body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.08), this.currSensorMat);
    p4i.add(p4Body);
    const p4Toroid = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.05, 14, 24),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 })
    );
    p4Toroid.position.set(0, 0, 0.1);
    p4i.add(p4Toroid);
    const p4Cond = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.82, 12), this.copperMat);
    p4Cond.position.set(0, 0, 0.1);
    p4i.add(p4Cond);
    for (let hp = 0; hp < 4; hp++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), this.brassMat);
      pin.position.set(-0.15 + hp * 0.1, -0.38, 0.08);
      p4i.add(pin);
    }
    p4i.userData = {
      type: 'SENSOR_STAGE_2_CURRENT',
      pathId: 4,
      name: 'Stage 2 Current Sensor (Path 4)',
      category: 'Post-Impedance Sensor Stage',
      desc: 'Current sensor verifying delivery before the short-circuit neutral switch.'
    };
    grp.add(p4i);
    this.interactiveObjects.push(p4i);

    // Row 4 neutral bypass trunking
    const neutralTrunk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.14), this.trunkingMat);
    neutralTrunk.position.set(2.05, -1.8, -0.45);
    grp.add(neutralTrunk);

    // HIGH POWER TEST SWITCHING (4 Heavy Contactors)
    const switches = [
      { id: 'highCurrent', name: 'High Current Test Switch', y: 1.8 },
      { id: 'voltage', name: 'Voltage Test Switch', y: 0.6 },
      { id: 'scLive', name: 'Short Circuit Live Switch', y: -0.6 },
      { id: 'scNeutral', name: 'Short Circuit Neutral Switch', y: -1.8 }
    ];

    switches.forEach(sw => {
      const swGroup = new THREE.Group();
      swGroup.position.set(3.3, sw.y, -0.38);

      // Contactor body
      const swBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.42), this.knobMat);
      swGroup.add(swBody);
      this.casingMeshes.push(swBody);

      // Moving mechanical toggle lever / contact arm
      const armPivot = new THREE.Group();
      armPivot.position.set(0, 0, 0.22);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.12), this.copperMat);
      armPivot.add(arm);
      swGroup.add(armPivot);
      this.switchArms.push({ id: sw.id, pivot: armPivot });

      // Brass contact lugs
      [-0.24, 0.24].forEach(lx => {
        swGroup.add(this.createScrew(lx, 0.32, 0.22, 0.035, true));
        swGroup.add(this.createScrew(lx, -0.32, 0.22, 0.035, true));
      });

      swGroup.userData = {
        type: 'POWER_SWITCH',
        switchId: sw.id,
        pathId: sw.id === 'highCurrent' ? 1 : sw.id === 'voltage' ? 2 : sw.id === 'scLive' ? 3 : 4,
        name: sw.name,
        category: 'High-Power Switching',
        desc: `Vacuum power contactor rated for 100A test currents. Automatically engages during selected test sequence. Click to manually toggle.`
      };
      grp.add(swGroup);
      this.interactiveObjects.push(swGroup);
    });
  }

  // -------------------------------------------------------------
  // MCB UNDER TEST (DUT) STATION (Far Right Column)
  // -------------------------------------------------------------
  initMCBDUTStation() {
    const grp = this.assemblies.dutStation;
    grp.position.set(5.2, 0.0, -0.35);

    // Base mounting tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.7, 4.4, 0.12), this.innerFrameMat);
    grp.add(tray);

    // Heavy Solid Copper Busbars (Top & Bottom)
    [-0.32, 0.32].forEach(bx => {
      // Top busbar
      const tBus = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.08), this.copperMat);
      tBus.position.set(bx, 1.45, 0.12);
      grp.add(tBus);
      tBus.add(this.createScrew(0, 0.45, 0.05, 0.045, true));

      // Bottom busbar
      const bBus = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.08), this.copperMat);
      bBus.position.set(bx, -1.45, 0.12);
      grp.add(bBus);
      bBus.add(this.createScrew(0, -0.45, 0.05, 0.045, true));
    });

    // DIN Rail
    const din = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.05), this.dinRailMat);
    din.position.set(0, 0, 0.08);
    grp.add(din);

    // Dynamic interchangeable MCB Under Test model.
    // The physical DUT is rebuilt from the selected configuration rather than
    // changing only labels in the callout UI.
    this.dutModelGroup = new THREE.Group();
    this.dutModelGroup.position.set(0, 0, 0);
    grp.add(this.dutModelGroup);
    this.updateDUTModel(this.sim.dutConfig);

    // Transparent Arc Containment Safety Shield (covers lower section matching reference photo)
    const shieldGeo = new THREE.PlaneGeometry(1.5, 2.1);
    const shield = new THREE.Mesh(shieldGeo, this.arcShieldMat);
    shield.position.set(0, -0.9, 0.62);
    grp.add(shield);

    // Dynamic Arc Flash Light & Glow behind transparent blast shield
    this.dutArcLight = new THREE.PointLight(0x93c5fd, 0, 4.0);
    this.dutArcLight.position.set(0, 0, 0.45);
    grp.add(this.dutArcLight);

    const arcGlowGeo = new THREE.PlaneGeometry(0.9, 1.3);
    const arcGlowMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.dutArcGlowMesh = new THREE.Mesh(arcGlowGeo, arcGlowMat);
    this.dutArcGlowMesh.position.set(0, 0, 0.48);
    grp.add(this.dutArcGlowMesh);

    // 4 Brass Standoff Hex Bolts on Arc Shield
    [-0.65, 0.65].forEach(sx => {
      [-1.85, 0.05].forEach(sy => {
        const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.15, 12), this.brassMat);
        standoff.rotation.x = Math.PI / 2;
        standoff.position.set(sx, sy, 0.58);
        grp.add(standoff);
      });
    });

    grp.userData = {
      type: 'MCB_DUT_STATION',
      name: 'MCB Under Test (DUT) Station',
      category: 'Testing Chamber',
      desc: 'Interchangeable MCB Under Test station. The installed physical breaker changes geometry, pole count, terminals and mechanism when SP/SPN/DP/DPN/TP/TPN/FP/PN/DC is selected.'
    };
    this.interactiveObjects.push(grp);
  }

  // -------------------------------------------------------------
  // DYNAMIC INTERCHANGEABLE DUT MCB MODEL
  // -------------------------------------------------------------
  updateDUTModel(config) {
    if (!this.dutModelGroup || !config) return;

    const key = config.poles + '|' + config.ratedCurrent + '|' + config.curve;
    if (this.lastDutConfigKey === key) return;
    this.lastDutConfigKey = key;

    this.dutDynamicCasingMeshes.forEach(mesh => {
      const idx = this.casingMeshes.indexOf(mesh);
      if (idx >= 0) this.casingMeshes.splice(idx, 1);
    });
    this.dutDynamicCasingMeshes = [];
    if (this.dutDynamicXrayGroup) {
      const idx = this.internalXrayMeshes.indexOf(this.dutDynamicXrayGroup);
      if (idx >= 0) this.internalXrayMeshes.splice(idx, 1);
    }
    this.dutModelGroup.clear();
    this.dutLever = null;
    this.dutLeverPivot = null;

    const profile = this.sim.dutPoleProfiles[config.poles] || this.sim.dutPoleProfiles.DP;
    const poleCount = profile.poles;
    const moduleWidth = 0.38;
    const bodyW = Math.max(moduleWidth, poleCount * moduleWidth);
    const bodyH = 1.4;
    const bodyD = 0.5;
    const spacing = bodyW / poleCount;

    const dutMaterial = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createDUTTexture(), roughness: 0.35, metalness: 0.1
    });

    // Build the DUT as separate physical pole modules instead of stretching one casing.
    for (let p = 0; p < poleCount; p++) {
      const px = -bodyW / 2 + spacing / 2 + p * spacing;
      const poleBody = new THREE.Mesh(
        new THREE.BoxGeometry(spacing * 0.94, bodyH, bodyD),
        dutMaterial.clone()
      );
      poleBody.position.set(px, 0, 0.32);
      poleBody.userData = {
        type: 'MCB_DUT_POLE',
        poleIndex: p + 1,
        poleCount,
        config: config.poles
      };
      this.dutModelGroup.add(poleBody);
      this.casingMeshes.push(poleBody);
      this.dutDynamicCasingMeshes.push(poleBody);

      if (p > 0) {
        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, bodyH * 0.94, 0.035),
          this.dinRailMat
        );
        seam.position.set(px - spacing / 2, 0, 0.585);
        this.dutModelGroup.add(seam);
      }
    }

    for (let p = 0; p < poleCount; p++) {
      const px = -bodyW / 2 + spacing / 2 + p * spacing;
      const topShoulder = new THREE.Mesh(new THREE.BoxGeometry(spacing * 0.92, 0.22, 0.18), this.mcbPlasticMat);
      topShoulder.position.set(px, 0.34, 0.18);
      this.dutModelGroup.add(topShoulder);
      this.casingMeshes.push(topShoulder);
      this.dutDynamicCasingMeshes.push(topShoulder);
      topShoulder.add(this.createScrew(0, 0, 0.08, 0.04, true));

      const bottomShoulder = new THREE.Mesh(new THREE.BoxGeometry(spacing * 0.92, 0.22, 0.18), this.mcbPlasticMat);
      bottomShoulder.position.set(px, -0.34, 0.18);
      this.dutModelGroup.add(bottomShoulder);
      this.casingMeshes.push(bottomShoulder);
      this.dutDynamicCasingMeshes.push(bottomShoulder);
      bottomShoulder.add(this.createScrew(0, 0, 0.08, 0.04, true));

      const topConductor = new THREE.Mesh(new THREE.BoxGeometry(spacing * 0.5, 0.48, 0.035), this.copperMat);
      topConductor.position.set(px, 0.76, 0.12);
      this.dutModelGroup.add(topConductor);
      const bottomConductor = topConductor.clone();
      bottomConductor.position.y = -0.76;
      this.dutModelGroup.add(bottomConductor);
    }

    const nose = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.46, 0.22), this.mcbPlasticMat);
    nose.position.set(0, 0, 0.29);
    this.dutModelGroup.add(nose);
    this.casingMeshes.push(nose);
    this.dutDynamicCasingMeshes.push(nose);

    // One mechanical carrier links one visible operating handle per pole.
    this.dutLeverPivot = new THREE.Group();
    this.dutLeverPivot.position.set(0, 0.05, 0.58);
    this.dutModelGroup.add(this.dutLeverPivot);
    this.dutLevers = [];

    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.35,
      metalness: 0.05
    });

    for (let p = 0; p < poleCount; p++) {
      const px = -bodyW / 2 + spacing / 2 + p * spacing;
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(0.22, spacing * 0.62), 0.38, 0.16),
        handleMaterial.clone()
      );
      handle.position.set(px, 0.12, 0);
      handle.userData = {
        type: 'MCB_DUT_POLE_TOGGLE',
        poleIndex: p + 1,
        poleCount,
        config: config.poles,
        linkedAssembly: true
      };
      this.dutLeverPivot.add(handle);
      this.dutLevers.push(handle);
    }

    if (poleCount > 1) {
      const coupling = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 0.72, 0.075, 0.19),
        this.knobMat
      );
      coupling.position.set(0, 0.10, 0.015);
      this.dutLeverPivot.add(coupling);
    }

    this.dutLever = this.dutLevers[0] || null;

    const xray = new THREE.Group();
    for (let p = 0; p < poleCount; p++) {
      const px = -bodyW / 2 + spacing / 2 + p * spacing;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.06), this.copperMat);
      arm.position.set(px, 0, 0.2); xray.add(arm);
      const sol = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 12), this.copperMat);
      sol.position.set(px, 0.25, 0.2); xray.add(sol);
      for (let ap = 0; ap < 6; ap++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.12, spacing * 0.65), 0.02, 0.18), this.dinRailMat);
        plate.position.set(px, -0.2 - ap * 0.04, 0.2); xray.add(plate);
      }
    }
    xray.visible = !!this.sim.isXray;
    this.dutModelGroup.add(xray);
    this.dutDynamicXrayGroup = xray;
    this.internalXrayMeshes.push(xray);

    this.dutModelGroup.userData = {
      type: 'MCB_DUT_MODEL',
      name: config.poles + ' MCB Under Test — ' + config.ratedCurrent + 'A Curve ' + config.curve,
      category: 'Interchangeable DUT',
      poles: config.poles, ratedCurrent: config.ratedCurrent, curve: config.curve,
      desc: profile.label + ' physical DUT with ' + poleCount + ' modeled pole(s), terminal sets, linked operating mechanism and configurable trip characteristic.'
    };
    if (!this.interactiveObjects.includes(this.dutModelGroup)) this.interactiveObjects.push(this.dutModelGroup);
  }

  // -------------------------------------------------------------
  // BOTTOM MEASUREMENT & OUTPUT TIER
  // -------------------------------------------------------------
  initBottomMeasurementTier() {
    const grp = this.assemblies.bottomMeasurement;
    const yBot = -3.3;

    // --- 1. OUTPUT SENSOR SYSTEM (Voltage, Current, Temp, Arc) ---
    // (1) Prototype Voltage Sensor (Blue Molded Transducer at X = -6.36, exactly matching VOLTAGE SENSOR label)
    const vSens = this.createVoltageSensorUnit(
      -6.36,
      yBot,
      -0.4,
      'Output Prototype Voltage Sensor',
      null,
      'Output Sensor System'
    );
    grp.add(vSens);
    this.interactiveObjects.push(vSens);

    // (2) Output Current Sensor (Green PCB + Yellow Toroid at X = -5.25, exactly matching CURRENT SENSOR label)
    const iSens = new THREE.Group();
    iSens.position.set(-5.25, yBot, -0.4);

    const iBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.08), this.currSensorMat);
    iSens.add(iBody);

    const toroid = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.05, 14, 24),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 })
    );
    toroid.position.set(0, 0, 0.1);
    iSens.add(toroid);

    const iCond = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.82, 12), this.copperMat);
    iCond.position.set(0, 0, 0.1);
    iSens.add(iCond);

    for (let hp = 0; hp < 4; hp++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), this.brassMat);
      pin.position.set(-0.15 + hp * 0.1, -0.38, 0.08);
      iSens.add(pin);
    }

    iSens.userData = {
      type: 'OUTPUT_CURRENT_SENSOR',
      name: 'Output Current Sensor',
      category: 'Output Sensor System',
      desc: 'Hall-effect transducer verifying complete current extinction post-trip.'
    };
    grp.add(iSens);
    this.interactiveObjects.push(iSens);

    // (3) Temperature Sensor (Stainless Steel Probe with coiled cable at X = -4.00)
    const tempGroup = new THREE.Group();
    tempGroup.position.set(-4.00, yBot, -0.4);

    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 16), this.steelMat);
    probe.rotation.z = Math.PI / 4;
    tempGroup.add(probe);

    const coilCable = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 24), this.knobMat);
    tempGroup.add(coilCable);

    tempGroup.userData = {
      type: 'OUTPUT_TEMP_SENSOR',
      name: 'DUT Temperature Sensor (RTD Probe)',
      category: 'Output Sensor System',
      desc: 'Precision RTD temperature sensor capturing terminal thermal rise during overload testing.'
    };
    grp.add(tempGroup);
    this.interactiveObjects.push(tempGroup);

    // (4) Arc Flash Optical Sensor (At X = -2.85)
    const arcGroup = new THREE.Group();
    arcGroup.position.set(-2.85, yBot, -0.4);

    const arcBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.16), this.knobMat);
    arcGroup.add(arcBody);

    // Corner brass screws
    [-0.18, 0.18].forEach(ax => {
      [-0.18, 0.18].forEach(ay => {
        arcGroup.add(this.createScrew(ax, ay, 0.09, 0.025, true));
      });
    });

    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, transmission: 0.9, roughness: 0.1 })
    );
    lens.position.z = 0.09;
    arcGroup.add(lens);

    arcGroup.userData = {
      type: 'OUTPUT_ARC_SENSOR',
      name: 'Optical Arc Flash Sensor',
      category: 'Output Sensor System',
      desc: 'Sub-microsecond optical photodiode measuring arc flash duration and plasma intensity inside the DUT chamber.'
    };
    grp.add(arcGroup);
    this.interactiveObjects.push(arcGroup);

    // --- 2. DATA ACQUISITION & MEASUREMENT (DAQ, Current Shunt, Voltage Divider) ---
    // High Speed DAQ at X = -1.55
    const outDaq = new THREE.Group();
    outDaq.position.set(-1.55, yBot, -0.4);

    const daqPcb = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.68, 0.08), this.pcbBlueMat);
    outDaq.add(daqPcb);

    // Gold SMA/BNC pins on sides
    [-0.48, 0.48].forEach(sx => {
      for (let j = 0; j < 3; j++) {
        const sma = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), this.brassMat);
        sma.rotation.z = Math.PI / 2;
        sma.position.set(sx, 0.2 - j * 0.2, 0.02);
        outDaq.add(sma);
      }
    });

    outDaq.userData = {
      type: 'SECONDARY_DAQ',
      name: 'Output DAQ Module',
      category: 'Measurement Acquisition',
      desc: 'Secondary high-speed analog acquisition conditioning output sensors.'
    };
    grp.add(outDaq);
    this.interactiveObjects.push(outDaq);

    // Heavy Current Shunt (Solid manganese-copper block with brass studs at X = -0.26)
    const shuntGroup = new THREE.Group();
    shuntGroup.position.set(-0.26, yBot, -0.4);

    const blkL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.18), this.brassMat);
    blkL.position.x = -0.16;
    shuntGroup.add(blkL);
    blkL.add(this.createScrew(0, 0, 0.1, 0.045, true));

    const blkR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.18), this.brassMat);
    blkR.position.x = 0.16;
    shuntGroup.add(blkR);
    blkR.add(this.createScrew(0, 0, 0.1, 0.045, true));

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.06), this.transformerCoreMat);
    shuntGroup.add(strip);

    shuntGroup.userData = {
      type: 'CURRENT_SHUNT',
      name: 'Precision Current Shunt (Manganin)',
      category: 'Precision Measurement',
      desc: '100A 75mV calibrated manganin shunt providing non-inductive current measurement.'
    };
    grp.add(shuntGroup);
    this.interactiveObjects.push(shuntGroup);

    // Precision Voltage Divider PCB at X = +0.85
    const vDiv = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.06), this.pcbGreenMat);
    vDiv.position.set(0.85, yBot, -0.4);
    grp.add(vDiv);

    // --- 3. ADDITIONAL MEASUREMENT MODULES (Acoustic, Isolation) ---
    // Acoustic Sensor at X = +2.28
    const micGroup = new THREE.Group();
    micGroup.position.set(2.28, yBot, -0.4);
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 16), this.steelMat);
    mic.rotation.z = Math.PI / 4;
    micGroup.add(mic);
    micGroup.userData = {
      type: 'ACOUSTIC_SENSOR',
      name: 'Acoustic Emission Microphone',
      category: 'Diagnostic Sensor',
      desc: 'Ultrasonic acoustic sensor detecting mechanical contact bounce and internal arc blast shockwaves.'
    };
    grp.add(micGroup);
    this.interactiveObjects.push(micGroup);

    // Isolation Barrier at X = +3.67
    const isoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.35), this.dinRailMat);
    isoMesh.position.set(3.67, yBot, -0.38);
    grp.add(isoMesh);

    // --- 4. EARTH / GROUNDING BUSBAR AT X = +5.50 ---
    const groundGroup = new THREE.Group();
    groundGroup.position.set(5.50, yBot, -0.4);

    // Solid brass busbar strip
    const gBus = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.08), this.brassMat);
    groundGroup.add(gBus);

    // 8 Brass hex studs with green/yellow grounding wires
    for (let g = 0; g < 8; g++) {
      const gx = -0.48 + g * 0.14;
      groundGroup.add(this.createScrew(gx, 0, 0.05, 0.035, true));

      const gWire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      gWire.position.set(gx, -0.28, 0.05);
      groundGroup.add(gWire);
    }

    groundGroup.userData = {
      type: 'EARTH_BUS',
      name: 'Protective Earth Grounding Busbar',
      category: 'Safety Grounding',
      desc: 'Solid copper/brass equipotential grounding busbar connecting all sub-frames, transformer laminations, and enclosures to PE earth.'
    };
    grp.add(groundGroup);
    this.interactiveObjects.push(groundGroup);
  }

  // -------------------------------------------------------------
  // UPDATE LOOP: Rotations, Exploded Mode, X-Ray Mode
  // -------------------------------------------------------------
  update(time, delta) {
    // 1. Update MCB Knobs rotation & mechanical trip indicator flags
    this.mcbKnobs.forEach(knob => {
      const targetMCB = this.sim.inputMCBs.find(m => m.id === knob.id);
      if (targetMCB) {
        if (knob.pivot) {
          knob.pivot.rotation.x = THREE.MathUtils.lerp(
            knob.pivot.rotation.x,
            targetMCB.angle,
            delta * 12.0
          );
        }
        if (knob.indicator && knob.indicator.material) {
          if (targetMCB.state === 'ON') {
            knob.indicator.material.color.setHex(0xef4444); // Red = Closed / Energized
            knob.indicator.material.emissive.setHex(0x991b1b);
          } else if (targetMCB.state === 'TRIPPED') {
            knob.indicator.material.color.setHex(0xf59e0b); // Amber = Tripped
            knob.indicator.material.emissive.setHex(0x78350f);
          } else {
            knob.indicator.material.color.setHex(0x10b981); // Green = Open / Disconnected
            knob.indicator.material.emissive.setHex(0x064e3b);
          }
        }
      }
    });

    // 2. Update R and XL Dials rotation
    if (this.rDial) {
      const targetRAngle = (this.sim.selectedRIndex / 5) * Math.PI * 1.5;
      this.rDial.rotation.z = THREE.MathUtils.lerp(this.rDial.rotation.z, targetRAngle, delta * 6.0);
    }
    if (this.xlDial) {
      const targetXlAngle = (this.sim.selectedXlIndex / 5) * Math.PI * 1.5;
      this.xlDial.rotation.z = THREE.MathUtils.lerp(this.xlDial.rotation.z, targetXlAngle, delta * 6.0);
    }

    // 3. Rebuild the physical DUT only when its configuration changes.
    this.updateDUTModel(this.sim.dutConfig);

    // 4. Update MCB DUT Lever angle (snaps down when tripped) & color
    if (this.dutLeverPivot) {
      this.dutLeverPivot.rotation.x = THREE.MathUtils.lerp(
        this.dutLeverPivot.rotation.x,
        this.sim.dutLeverAngle,
        delta * 16.0
      );
    }
    if (this.dutLevers && this.dutLevers.length) {
      const isTripped = this.sim.dutState === 'TRIPPED';
      const handleColor = isTripped ? 0xb91c1c : 0x15803d;
      this.dutLevers.forEach(handle => {
        if (handle && handle.material && handle.material.color) {
          handle.material.color.setHex(handleColor);
        }
      });
    }

    // Dynamic Arc Flash Light & Glow behind safety blast shield
    if (this.dutArcLight && this.dutArcGlowMesh) {
      if (this.sim.telemetry.arcIntensity > 0) {
        this.dutArcLight.intensity = (this.sim.telemetry.arcIntensity / 100) * 4.0;
        this.dutArcGlowMesh.material.opacity = Math.min(1.0, this.sim.telemetry.arcIntensity / 70);
        this.sim.telemetry.arcIntensity = Math.max(0, this.sim.telemetry.arcIntensity - delta * 250);
      } else {
        this.dutArcLight.intensity = 0;
        this.dutArcGlowMesh.material.opacity = 0;
      }
    }

    // 4. Update switch contactor armatures (STRICT ONE-PATH AT A TIME INTERLOCK)
    this.switchArms.forEach(sw => {
      const isClosed = !!(this.sim.switches && this.sim.switches[sw.id]);
      const targetAngle = isClosed ? 0 : Math.PI / 5;
      sw.pivot.rotation.z = THREE.MathUtils.lerp(sw.pivot.rotation.z, targetAngle, delta * 12.0);
    });

    // 5. EXPLODED VIEW INTERPOLATION
    const exProg = this.sim.explodedProgress || 0;
    // Top Control tier moves forward and slightly up
    this.assemblies.topControl.position.z = THREE.MathUtils.lerp(this.assemblies.topControl.position.z, exProg * 1.6, delta * 6.0);
    this.assemblies.topControl.position.y = THREE.MathUtils.lerp(this.assemblies.topControl.position.y, exProg * 0.4, delta * 6.0);

    // 4 Paths move forward in staggered planes
    this.assemblies.paths.forEach((pGrp, idx) => {
      pGrp.position.z = THREE.MathUtils.lerp(pGrp.position.z, exProg * (1.2 + idx * 0.25), delta * 6.0);
    });

    // R/XL Bank moves forward
    this.assemblies.rxlBank.position.z = THREE.MathUtils.lerp(this.assemblies.rxlBank.position.z, exProg * 2.2, delta * 6.0);

    // Sensor Stage 2 & Switching move forward
    this.assemblies.stage2AndSwitching.position.z = THREE.MathUtils.lerp(this.assemblies.stage2AndSwitching.position.z, exProg * 2.5, delta * 6.0);

    // MCB DUT Station moves prominently forward into focus
    this.assemblies.dutStation.position.z = THREE.MathUtils.lerp(this.assemblies.dutStation.position.z, exProg * 3.2, delta * 6.0);

    // Bottom Measurement Tier moves forward and down
    this.assemblies.bottomMeasurement.position.z = THREE.MathUtils.lerp(this.assemblies.bottomMeasurement.position.z, exProg * 1.5, delta * 6.0);
    this.assemblies.bottomMeasurement.position.y = THREE.MathUtils.lerp(this.assemblies.bottomMeasurement.position.y, -exProg * 0.35, delta * 6.0);

    // 6. X-RAY MODE INTERPOLATION
    const isXray = this.sim.isXray || false;
    this.casingMeshes.forEach(mesh => {
      if (mesh.material) {
        if (isXray) {
          mesh.material.transparent = true;
          mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity || 1.0, 0.25, delta * 8.0);
          mesh.material.depthWrite = false;
        } else {
          mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity || 0.25, 1.0, delta * 8.0);
          if (mesh.material.opacity > 0.95) {
            mesh.material.transparent = false;
            mesh.material.depthWrite = true;
          }
        }
      }
    });

    this.internalXrayMeshes.forEach(grp => {
      grp.visible = isXray;
    });
  }
}