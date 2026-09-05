import * as THREE from 'three';

/**
 * Engineered 3D Wiring System (Master Blueprint Electrical Routes)
 * Connects all internal components with realistic Catmull-Rom tube geometries,
 * industrial color standards (Red = Live/High current, Blue = Neutral/Signal, Green/Yellow = Earth),
 * subtle technical electrical flow response during active testing, and path route tracing.
 */
export class WiringSystem {
  constructor(simulationEngine) {
    this.sim = simulationEngine;
    this.group = new THREE.Group();
    this.group.name = 'WiringSystem';

    this.wireMaterials = {};
    this.pulseTubes = [];
    this.allWireMeshes = [];

    this.initMaterials();
    this.initTestingPathWires();
    this.initDUTAndOutputWires();
    this.initTopControlWires();
    this.initEarthGroundingWires();
  }

  initMaterials() {
    // Red Live / High Current Cable
    this.wireMaterials.live = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.35,
      metalness: 0.15
    });

    // Blue Neutral / Signal Cable
    this.wireMaterials.neutral = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.35,
      metalness: 0.15
    });

    // Green Protective Earth Cable
    this.wireMaterials.earth = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.35,
      metalness: 0.15
    });

    // Heavy Copper Busbar
    this.wireMaterials.busbar = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.25,
      metalness: 0.92
    });

    // Black Return / Neutral Conductor (Emerging from lower MCB collar lug)
    this.wireMaterials.black = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.1
    });

    // Subtle, Technical Electrical Activity Flow Texture
    const flowCanvas = document.createElement('canvas');
    flowCanvas.width = 512;
    flowCanvas.height = 32;
    const fCtx = flowCanvas.getContext('2d');
    const grad = fCtx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, 'rgba(56, 189, 248, 0.05)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.05)');
    fCtx.fillStyle = grad;
    fCtx.fillRect(0, 0, 512, 32);

    this.flowTexture = new THREE.CanvasTexture(flowCanvas);
    this.flowTexture.wrapS = THREE.RepeatWrapping;
    this.flowTexture.wrapT = THREE.RepeatWrapping;
    this.flowTexture.repeat.set(6, 1);

    this.flowMaterial = new THREE.MeshBasicMaterial({
      map: this.flowTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  createWireSpline(points, radius = 0.026, materialType = 'live', pathId = 1, isPulseEnabled = true) {
    const curve = new THREE.CatmullRomCurve3(points);
    curve.curveType = 'chordal';

    const geometry = new THREE.TubeGeometry(curve, 36, radius, 8, false);
    const mat = this.wireMaterials[materialType] || this.wireMaterials.live;
    const mesh = new THREE.Mesh(geometry, mat);

    mesh.userData = {
      type: 'ELECTRICAL_WIRE',
      pathId: pathId,
      name: `Path ${pathId} Electrical Conductor`,
      category: 'Power Transmission',
      desc: `High-conductivity multi-strand copper cable with halogen-free flame-retardant insulation routed to IEC 60204-1 specifications.`
    };
    this.group.add(mesh);
    this.allWireMeshes.push(mesh);

    if (isPulseEnabled) {
      const flowGeo = new THREE.TubeGeometry(curve, 36, radius * 1.3, 8, false);
      const flowMesh = new THREE.Mesh(flowGeo, this.flowMaterial);
      flowMesh.userData = { pathId: pathId };
      this.group.add(flowMesh);
      this.pulseTubes.push(flowMesh);
    }

    return mesh;
  }

  // -------------------------------------------------------------
  // 4 TESTING PATHS WIRING (Connecting all components in series)
  // -------------------------------------------------------------
  initTestingPathWires() {
    const paths = [
      { id: 1, y: 1.8, mat: 'live' },
      { id: 2, y: 0.6, mat: 'live' },
      { id: 3, y: -0.6, mat: 'live' },
      { id: 4, y: -1.8, mat: 'neutral' }
    ];

    paths.forEach(p => {
      // 1. Incoming Line Conductor (from side wireway into MCB Top Terminal)
      this.createWireSpline([
        new THREE.Vector3(-6.08, p.y + 0.44, -0.34),
        new THREE.Vector3(-5.75, p.y + 0.44, -0.28),
        new THREE.Vector3(-5.40, p.y + 0.44, -0.22)
      ], 0.026, p.mat, p.id);

      // 2. Outgoing Load Conductor (from MCB Bottom Terminal to downstream stage)
      if (p.id <= 2) {
        // MCB Bottom Terminal (-5.4, p.y - 0.44) to Transformer Input Terminal (at X = -4.35)
        this.createWireSpline([
          new THREE.Vector3(-5.40, p.y - 0.44, -0.22),
          new THREE.Vector3(-4.88, p.y - 0.16, -0.32),
          new THREE.Vector3(-4.35, p.y + 0.12, -0.36)
        ], 0.026, p.mat, p.id);

        // Transformer Lower Terminal Return Wire to Stage 1
        this.createWireSpline([
          new THREE.Vector3(-4.35, p.y - 0.12, -0.36),
          new THREE.Vector3(-3.85, p.y - 0.12, -0.38)
        ], 0.024, 'black', p.id, false);

        // Transformer to Stage 1 Voltage Sensor (at X = -3.3)
        this.createWireSpline([
          new THREE.Vector3(-3.85, p.y, -0.36),
          new THREE.Vector3(-3.55, p.y, -0.42),
          new THREE.Vector3(-3.35, p.y, -0.4)
        ], 0.03, p.mat, p.id);

        // Stage 1 Voltage Sensor (-3.3) to Current Sensor (-2.65)
        this.createWireSpline([
          new THREE.Vector3(-3.05, p.y, -0.4),
          new THREE.Vector3(-2.85, p.y, -0.4)
        ], 0.026, p.mat, p.id);

        // Stage 1 Current Sensor (-2.65) to Diode 1 (-1.8)
        this.createWireSpline([
          new THREE.Vector3(-2.45, p.y, -0.4),
          new THREE.Vector3(-2.15, p.y, -0.42),
          new THREE.Vector3(-1.95, p.y, -0.4)
        ], 0.026, p.mat, p.id);
      } else {
        // Paths 3 & 4: MCB Bottom Terminal (-5.4, p.y - 0.44) to Stage 1 Voltage Sensor (-4.2)
        this.createWireSpline([
          new THREE.Vector3(-5.40, p.y - 0.44, -0.22),
          new THREE.Vector3(-4.85, p.y - 0.16, -0.34),
          new THREE.Vector3(-4.25, p.y + (p.id === 3 ? 0.08 : -0.08), -0.4)
        ], 0.026, p.mat, p.id);

        // Stage 1 Voltage Sensor (-4.2) to Current Sensor (-3.45)
        this.createWireSpline([
          new THREE.Vector3(-3.95, p.y, -0.4),
          new THREE.Vector3(-3.65, p.y, -0.4)
        ], 0.026, p.mat, p.id);

        // Stage 1 Current Sensor (-3.45) to Diode 1 (-1.8)
        this.createWireSpline([
          new THREE.Vector3(-3.25, p.y, -0.4),
          new THREE.Vector3(-2.55, p.y, -0.4),
          new THREE.Vector3(-1.95, p.y, -0.4)
        ], 0.026, p.mat, p.id);
      }

      // 3. Diode 1 (-1.8) to Diode 2 (-1.0)
      this.createWireSpline([
        new THREE.Vector3(-1.65, p.y, -0.4),
        new THREE.Vector3(-1.15, p.y, -0.4)
      ], 0.024, p.mat, p.id);

      // 4. Diode 2 (-1.0) to Common R/XL Configuration Bank (0.35)
      this.createWireSpline([
        new THREE.Vector3(-0.85, p.y, -0.4),
        new THREE.Vector3(-0.3, p.y, -0.45),
        new THREE.Vector3(0.1, p.y, -0.38)
      ], 0.028, p.mat, p.id);

      // 5. Common R/XL Bank (0.35) to Sensor Stage 2 / High Power Switching (3.3)
      if (p.id <= 3) {
        // R/XL to Stage 2 Voltage Sensor (1.75)
        this.createWireSpline([
          new THREE.Vector3(0.6, p.y, -0.38),
          new THREE.Vector3(1.15, p.y, -0.42),
          new THREE.Vector3(1.6, p.y, -0.4)
        ], 0.028, p.mat, p.id);

        // Stage 2 Voltage (1.75) to Current Sensor (2.35)
        this.createWireSpline([
          new THREE.Vector3(1.9, p.y, -0.4),
          new THREE.Vector3(2.15, p.y, -0.4)
        ], 0.026, p.mat, p.id);

        // Stage 2 Current Sensor (2.35) to High Power Switch Contactor (3.3)
        this.createWireSpline([
          new THREE.Vector3(2.55, p.y, -0.4),
          new THREE.Vector3(2.85, p.y, -0.4),
          new THREE.Vector3(3.1, p.y, -0.38)
        ], 0.03, p.mat, p.id);
      } else {
        // PATH 4: Clean heavy neutral cable routing directly into Short Circuit Neutral Switch
        this.createWireSpline([
          new THREE.Vector3(0.6, -1.8, -0.38),
          new THREE.Vector3(1.5, -1.8, -0.45),
          new THREE.Vector3(2.4, -1.8, -0.45),
          new THREE.Vector3(3.1, -1.8, -0.38)
        ], 0.036, 'neutral', 4);
      }

      // 6. High Power Switch Contactor (3.3) into MCB Under Test (DUT) Station (5.2)
      this.createWireSpline([
        new THREE.Vector3(3.5, p.y, -0.38),
        new THREE.Vector3(4.2, p.y, -0.42),
        new THREE.Vector3(4.8, p.y > 0 ? 1.45 : -1.45, -0.35)
      ], 0.034, p.mat, p.id);
    });
  }

  // -------------------------------------------------------------
  // MCB DUT TO OUTPUT SENSORS & DAQ
  // -------------------------------------------------------------
  initDUTAndOutputWires() {
    // DUT bottom load terminals down to Output Sensor System (Voltage Sensor at X = -6.36)
    this.createWireSpline([
      new THREE.Vector3(5.0, -1.8, -0.35),
      new THREE.Vector3(4.8, -2.6, -0.5),
      new THREE.Vector3(0.0, -2.6, -0.5),
      new THREE.Vector3(-5.8, -2.6, -0.5),
      new THREE.Vector3(-6.36, -3.0, -0.4)
    ], 0.032, 'live', 1);

    // Linking Output Voltage Sensor (-6.36) to Current Sensor (-5.25)
    this.createWireSpline([
      new THREE.Vector3(-6.1, -3.3, -0.4),
      new THREE.Vector3(-5.5, -3.3, -0.4)
    ], 0.026, 'neutral', 1);

    // Current Sensor (-5.25) to Output DAQ (-1.55)
    this.createWireSpline([
      new THREE.Vector3(-5.0, -3.3, -0.4),
      new THREE.Vector3(-3.2, -3.3, -0.45),
      new THREE.Vector3(-1.75, -3.3, -0.4)
    ], 0.024, 'neutral', 1);

    // Output DAQ (-1.55) to Shunt (-0.26)
    this.createWireSpline([
      new THREE.Vector3(-1.35, -3.3, -0.4),
      new THREE.Vector3(-0.45, -3.3, -0.4)
    ], 0.028, 'busbar', 1);

    // Shunt (-0.26) to Ground Bus (+5.50)
    this.createWireSpline([
      new THREE.Vector3(-0.05, -3.3, -0.4),
      new THREE.Vector3(2.5, -3.3, -0.45),
      new THREE.Vector3(5.2, -3.3, -0.4)
    ], 0.028, 'busbar', 1);
  }

  // -------------------------------------------------------------
  // TOP CONTROL & PLC WIRING
  // -------------------------------------------------------------
  initTopControlWires() {
    // Power Supply DC Output to Siemens S7-1200 PLC
    this.createWireSpline([
      new THREE.Vector3(-4.0, 3.3, -0.38),
      new THREE.Vector3(-3.0, 3.3, -0.42),
      new THREE.Vector3(-2.6, 3.3, -0.38)
    ], 0.022, 'neutral', 0, false);

    // PLC to High-Speed DAQ
    this.createWireSpline([
      new THREE.Vector3(-0.1, 3.3, -0.38),
      new THREE.Vector3(0.8, 3.3, -0.42),
      new THREE.Vector3(1.0, 3.3, -0.42)
    ], 0.02, 'live', 0, false);
  }

  // -------------------------------------------------------------
  // PROTECTIVE EARTH GROUNDING WIRING
  // -------------------------------------------------------------
  initEarthGroundingWires() {
    // Heavy earth connection from Ground Bus to Cabinet Frame
    this.createWireSpline([
      new THREE.Vector3(6.3, -3.3, -0.42),
      new THREE.Vector3(6.8, -3.3, -0.5),
      new THREE.Vector3(6.8, -4.2, -0.5)
    ], 0.038, 'earth', 0, false);

    // Earth bond from Transformer core to Ground Bus
    this.createWireSpline([
      new THREE.Vector3(-3.7, 1.4, -0.36),
      new THREE.Vector3(-3.7, -2.6, -0.5),
      new THREE.Vector3(5.7, -2.6, -0.5),
      new THREE.Vector3(5.7, -3.1, -0.42)
    ], 0.028, 'earth', 0, false);
  }

  // -------------------------------------------------------------
  // UPDATE LOOP: Electrical Current Flow Animation
  // -------------------------------------------------------------
  update(time, delta) {
    const isTesting = this.sim && this.sim.state === 'TESTING';

    if (this.flowMaterial) {
      // Smooth technical electrical pulse fade
      const targetOpacity = isTesting ? 0.75 : 0.0;
      this.flowMaterial.opacity = THREE.MathUtils.lerp(
        this.flowMaterial.opacity,
        targetOpacity,
        delta * 6.0
      );

      // Animate flow texture offset along cable paths
      if (this.flowTexture && isTesting) {
        this.flowTexture.offset.x = (this.flowTexture.offset.x - delta * 3.8) % 1.0;
      }
    }
  }

  // Trace a specific electrical route by highlighting its connected wires
  highlightPath(pathId) {
    this.pulseTubes.forEach(tube => {
      const match = tube.userData && tube.userData.pathId === pathId;
      tube.visible = match || pathId === null;
    });
  }
}
