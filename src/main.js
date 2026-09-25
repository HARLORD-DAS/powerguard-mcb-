import * as THREE from 'three';
import { StudioLighting } from './environment/StudioLighting.js';
import { MCBSimulationEngine } from './simulation/MCBSimulationEngine.js';
import { CabinetEnclosure } from './models/CabinetEnclosure.js';
import { InternalRack } from './models/InternalRack.js';
import { WiringSystem } from './models/WiringSystem.js';
import { CameraController } from './utils/CameraController.js';

/**
 * MCB Testing System — True 3D Digital Twin Application
 * The 3D Model ITSELF is the User Interface.
 * No permanent 2D UI panels, no dashboards, no KPI cards.
 * Direct 3D object manipulation, internal architecture inspection,
 * exploded mode, X-ray mode, and real-time simulation.
 */
class DigitalTwinApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.calloutEl = document.getElementById('world-callout');
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Callout tracking
    this.inspectedObject = null;
    this.inspectedWorldPos = new THREE.Vector3();

    this.initRenderer();
    this.initSceneAndCamera();
    this.initSystems();
    this.initInteractions();
    this.initKeyboardShortcuts();
    this.initCalloutUI();
    this.animate();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  initSceneAndCamera() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(-0.35, 0.15, 14.2);

    this.camCtrl = new CameraController(this.camera, this.renderer.domElement);
  }

  initSystems() {
    // 1. Clean Engineering Studio Lighting (Neutral light studio, no polka dots!)
    this.lighting = new StudioLighting(this.scene);

    // 2. MCB Test Digital Twin Simulation Engine
    this.sim = new MCBSimulationEngine();

    // 3. Cabinet Enclosure (Master Reference Open Cabinet)
    this.cabinet = new CabinetEnclosure(this.sim);
    this.scene.add(this.cabinet.group);

    // 4. Internal Electrical Architecture (Master Blueprint)
    this.internalRack = new InternalRack(this.sim);
    this.scene.add(this.internalRack.group);

    // 5. Engineered 3D Wiring System
    this.wiring = new WiringSystem(this.sim);
    this.scene.add(this.wiring.group);

    // Combine all interactive objects for raycasting
    this.allInteractive = [
      ...this.cabinet.interactiveObjects,
      ...this.internalRack.interactiveObjects,
      ...this.wiring.allWireMeshes
    ];

    // Digital twin events
    this.sim.onDUTTrip = () => {
      this.lighting.triggerArcFlash();
      this.updateCalloutContent();
    };

    this.sim.onStateChange = () => {
      this.updateCalloutContent();
    };
  }

  initInteractions() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Mouse click for direct 3D object manipulation
    this.renderer.domElement.addEventListener('click', (e) => this.onPointerClick(e));

    // Pointer move for hover feedback
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onPointerMove(e));
  }

  onPointerMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.allInteractive, true);

    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  }

  onPointerClick(e) {
    // Don't trigger if clicking callout itself
    if (e.target.closest('#world-callout') || e.target.closest('#hotkey-bar')) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.allInteractive, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let targetObj = hit.object;

      // Climb parent chain to find object with userData
      while (targetObj && (!targetObj.userData || !targetObj.userData.type) && targetObj.parent) {
        if (targetObj.parent.userData && targetObj.parent.userData.type) {
          targetObj = targetObj.parent;
          break;
        }
        targetObj = targetObj.parent;
      }

      const ud = targetObj.userData || {};

      // 1. Physical Machine Pushbuttons (Direct cabinet interaction)
      if (ud.type === 'PHYSICAL_START_BTN') {
        this.sim.startTest();
        return;
      }
      if (ud.type === 'PHYSICAL_STOP_BTN') {
        this.sim.stopTest();
        return;
      }
      if (ud.type === 'PHYSICAL_ESTOP_BTN') {
        if (this.sim.state === 'FAULT') {
          this.sim.resetEmergencyStop();
        } else {
          this.sim.triggerEmergencyStop();
        }
        return;
      }
      if (ud.type === 'PHYSICAL_EXPLODE_SWITCH') {
        this.sim.toggleExplodedView();
        return;
      }
      if (ud.type === 'PHYSICAL_XRAY_SWITCH') {
        this.sim.toggleXray();
        return;
      }
      if (ud.type === 'PHYSICAL_RESET_BTN') {
        this.camCtrl.resetView();
        this.dismissCallout();
        return;
      }

      // 2. Physical input MCB toggle: operate the lever and select its pathway.
      if (ud.type === 'INPUT_MCB_TOGGLE') {
        this.sim.selectPath(ud.pathId);
        this.sim.toggleInputMCB(ud.pathId);
        this.wiring.highlightPath(ud.pathId);
        return;
      }

      // 3. Input MCB body click (Direct Physical Pathway Control)
      if (ud.type === 'INPUT_MCB_KNOB') {
        this.sim.selectPath(ud.pathId);
        this.sim.toggleInputMCB(ud.pathId);
        this.wiring.highlightPath(ud.pathId);
        this.showCallout(targetObj, hit.point);
        return;
      }

      // 4. Common R/XL Configuration Bank Click
      if (ud.type === 'RXL_BANK') {
        if (hit.point.y > 0) this.sim.cycleResistance();
        else this.sim.cycleReactance();
        this.showCallout(targetObj, hit.point);
        return;
      }
      if (ud.type === 'R_DIAL') {
        this.sim.cycleResistance();
        this.showCallout(targetObj, hit.point);
        return;
      }
      if (ud.type === 'XL_DIAL') {
        this.sim.cycleReactance();
        this.showCallout(targetObj, hit.point);
        return;
      }

      // 5. High-Power Test Switch Click: selecting a physical contactor also selects its path.
      if (ud.type === 'POWER_SWITCH') {
        const pathId = ud.pathId ?? ud.switchId;
        if (pathId >= 1 && pathId <= 4) {
          this.sim.selectPath(pathId);
          this.wiring.highlightPath(pathId);
        }
        this.sim.toggleSwitch(pathId);
        this.showCallout(targetObj, hit.point);
        return;
      }

      // 6. MCB Under Test (DUT) physical handle / station interaction.
      // Every pole handle is a real interactive control; all linked handles
      // operate the same DUT mechanism together.
      if (ud.type === 'MCB_DUT_POLE_TOGGLE') {
        if (this.sim.dutState === 'TRIPPED') {
          this.sim.resetDUT();
        } else {
          this.sim.startTest();
        }
        this.showCallout(targetObj, hit.point);
        return;
      }
      if (ud.type === 'MCB_DUT_STATION' || ud.type === 'MCB_DUT_MODEL') {
        if (this.sim.dutState === 'TRIPPED') {
          this.sim.resetDUT();
        }
        this.showCallout(targetObj, hit.point);
        return;
      }

      // 7. Cabinet Enclosure Door Click
      if (ud.type === 'CABINET_DOOR') {
        this.sim.doorsOpen = !this.sim.doorsOpen;
        return;
      }

      // 8. Electrical Wire Click (Route tracing + pathway selection)
      if (ud.type === 'ELECTRICAL_WIRE') {
        if (ud.pathId >= 1 && ud.pathId <= 4) this.sim.selectPath(ud.pathId);
        this.wiring.highlightPath(ud.pathId);
        this.showCallout(targetObj, hit.point);
        return;
      }

      // 9. Any physical component belonging to a pathway selects that pathway.
      // This makes the four rows independently operable from the 3D machine,
      // not only from the keyboard shortcuts.
      if (ud.pathId >= 1 && ud.pathId <= 4) {
        this.sim.selectPath(ud.pathId);
        this.wiring.highlightPath(ud.pathId);
      }

      // 10. DAQ & General Component Inspection (Transformers, Sensors, PLC, DAQ, Earth Bus)
      if (ud.type === 'HIGH_SPEED_DAQ' || ud.type === 'DATA_ACQUISITION') {
        this.showCallout(targetObj, hit.point);
        return;
      }

      // Selection is camera-neutral. The user controls orbit/pan/zoom manually.
      this.showCallout(targetObj, hit.point);
    } else {
      // Click on background -> Reset view and dismiss callout
      this.dismissCallout();
      this.wiring.highlightPath(null);
    }
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Space: Run / Stop Test
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.sim.state === 'TESTING') {
          this.sim.stopTest();
        } else {
          this.sim.startTest();
        }
      }
      // E: Exploded View
      else if (e.key === 'e' || e.key === 'E') {
        this.sim.toggleExplodedView();
      }
      // X: X-Ray Mode
      else if (e.key === 'x' || e.key === 'X') {
        this.sim.toggleXray();
      }
      // 1-4: Select Pathway directly
      else if (e.key >= '1' && e.key <= '4') {
        const pId = parseInt(e.key);
        this.sim.selectPath(pId);
        this.wiring.highlightPath(pId);
        this.updateCalloutContent();
      }
      // R: Reset Camera View & Reset DUT if tripped
      else if (e.key === 'r' || e.key === 'R') {
        this.camCtrl.resetView();
        if (this.sim.dutState === 'TRIPPED') {
          this.sim.resetDUT();
        }
        this.dismissCallout();
        this.wiring.highlightPath(null);
      }
      // Escape: Dismiss
      else if (e.key === 'Escape') {
        this.dismissCallout();
        this.wiring.highlightPath(null);
      }
    });
  }

  // --- Dynamic 3D Object Callout ---

  showCallout(object, worldHitPoint = null) {
    this.inspectedObject = object;
    if (worldHitPoint) {
      this.inspectedWorldPos.copy(worldHitPoint);
    } else {
      object.getWorldPosition(this.inspectedWorldPos);
    }

    this.updateCalloutContent();
    this.calloutEl.classList.remove('hidden');
  }

  updateCalloutContent() {
    if (!this.inspectedObject || !this.inspectedObject.userData) return;
    const ud = this.inspectedObject.userData;

    let category = ud.category || 'SYSTEM COMPONENT';
    let name = ud.name || 'Component';
    let desc = ud.desc || '';

    const dutCfgEl = document.getElementById('callout-dut-config');
    const wfEl = document.getElementById('callout-waveform-container');
    const operateBtn = document.getElementById('callout-operate-btn');

    // Default visibility
    if (dutCfgEl) dutCfgEl.classList.add('hidden');
    if (wfEl) wfEl.classList.add('hidden');
    if (operateBtn) operateBtn.textContent = 'Operate / Toggle';

    if (ud.type === 'INPUT_MCB_KNOB' || ud.type === 'INPUT_MCB_TOGGLE') {
      const mcb = this.sim.inputMCBs.find(m => m.id === ud.pathId);
      if (mcb) {
        category = '1-POLE MODULAR DIN BREAKER';
        name = `Input MCB (${mcb.state}) — Path ${ud.pathId}`;
        const posText = mcb.state === 'ON' 
          ? 'UP / I-ON (Contacts Closed, Circuit Live)' 
          : (mcb.state === 'TRIPPED' ? 'MID / TRIPPED (Trip Unit Released)' : 'DOWN / O-OFF (Contacts Open, Isolated)');
        const flagText = mcb.state === 'ON' ? 'RED (Closed/Energized)' : (mcb.state === 'TRIPPED' ? 'AMBER (Tripped)' : 'GREEN (Open/Safe)');
        const rating = ud.pathId === 1 ? 'C63' : (ud.pathId === 2 ? 'C16' : 'C32');
        desc = `Authentic 1-Pole Modular DIN Miniature Circuit Breaker (MCB).\n• Rating: ${rating} | 240V~ 50Hz | 10000A Breaking Capacity\n• Operating Handle: Blue ribbed toggle rocker switch (${posText})\n• Status Window: ${flagText}\n• Line Connection (Top): Screw clamp from wireway feed\n• Load Connection (Bottom): Screw clamp to test pathway\n• Pathway Interlock: ${mcb.state === 'ON' ? 'ARMED (Ready to test)' : 'ISOLATED'}\n\nClick blue toggle lever in 3D scene to switch ON / OFF.`;
        if (operateBtn) operateBtn.textContent = `Flip Switch ${mcb.state === 'ON' ? 'OFF' : 'ON'}`;
      }
    } else if (ud.type === 'MCB_DUT_STATION' || ud.type === 'MCB_DUT_MODEL') {
      category = 'MCB UNDER TEST (DUT)';
      name = `MCB Under Test — ${this.sim.dutConfig.ratedCurrent}A Curve ${this.sim.dutConfig.curve} (${this.sim.dutConfig.poles})`;
      const isTripped = this.sim.dutState === 'TRIPPED';
      const profile = this.sim.dutPoleProfiles[this.sim.dutConfig.poles];
      desc = `${profile ? profile.label : this.sim.dutConfig.poles} physical MCB under test in Arc Containment Zone.\n• Handle State: ${isTripped ? 'TRIPPED (Down 45°)' : 'ARMED / CLOSED (Up 0°)'}\n• Rating: In = ${this.sim.dutConfig.ratedCurrent} A, Curve ${this.sim.dutConfig.curve}, Poles: ${this.sim.dutConfig.poles}\n• Breaking Capacity: 10 kA (IEC 60898-1)\n• Arc Containment: Polycarbonate safety blast shield active.\n\nConfigure parameters below or click handle in 3D scene to reset.`;
      
      if (dutCfgEl) {
        dutCfgEl.classList.remove('hidden');
        this.syncDUTConfigChips();
        this.syncTestConditionUI();
      }
      if (operateBtn) {
        operateBtn.textContent = isTripped ? 'Reset DUT Handle' : 'Execute Test';
      }
      if (this.sim.lastWaveform && wfEl) {
        wfEl.classList.remove('hidden');
        this.renderWaveformCanvas();
      }
    } else if (ud.type === 'HIGH_SPEED_DAQ' || ud.type === 'DATA_ACQUISITION') {
      category = 'DATA ACQUISITION & TELEMETRY';
      name = 'High-Speed DAQ System (10 MS/s)';
      desc = 'Sub-cycle FPGA digitizer capturing dynamic short-circuit waveforms, peak current Ip, arc ignition voltage, and let-through energy I²t.';
      if (wfEl) {
        wfEl.classList.remove('hidden');
        this.renderWaveformCanvas();
      }
    } else if (ud.type === 'RXL_BANK') {
      category = 'PROGRAMMABLE IMPEDANCE';
      name = 'Common R / XL Configuration Bank';
      desc = `Shared load impedance bank for all 4 testing branches.\n• Resistance R: ${this.sim.R} Ω\n• Reactance XL: ${this.sim.XL} mH (50 Hz)\n• Loop Impedance Z: ${this.sim.impedance.toFixed(3)} Ω\n• Power Factor: ${this.sim.powerFactor.toFixed(3)}\n\nClick R dial (top) or XL dial (bottom) in 3D scene to cycle values, or enter precise HMI values in the DUT test-condition panel.`;
      if (operateBtn) operateBtn.textContent = 'Cycle R / XL';
    } else if (ud.type === 'POWER_SWITCH') {
      category = 'HIGH-POWER SWITCHING';
      name = ud.name;
      const swKey = typeof ud.switchId === 'string' ? ud.switchId : (ud.pathId === 1 ? 'highCurrent' : ud.pathId === 2 ? 'voltage' : ud.pathId === 3 ? 'scLive' : 'scNeutral');
      const isClosed = this.sim.switches && this.sim.switches[swKey];
      desc = `Vacuum test contactor for ${ud.name}.\n• State: ${isClosed ? 'CLOSED (HIGH POWER CONNECTED)' : 'OPEN (ISOLATED)'}\n• Hardware Interlock: ${ud.pathId === this.sim.activePath ? 'PERMITTED (Active Path)' : 'LOCKED OUT (Inactive Path)'}\n\nClick contactor in 3D scene to operate.`;
      if (operateBtn) operateBtn.textContent = isClosed ? 'Open Switch' : 'Close Switch';
    }

    document.getElementById('callout-category').textContent = category;
    document.getElementById('callout-name').textContent = name;
    document.getElementById('callout-desc').textContent = desc;

    // Live Telemetry Readouts
    const stateEl = document.getElementById('callout-stat-state');
    stateEl.textContent = this.sim.statusText;
    stateEl.className = this.sim.state === 'TESTING' || this.sim.state === 'VERIFYING'
      ? 'val-amber' 
      : (this.sim.state === 'TRIPPED' ? 'val-red' : 'val-green');

    document.getElementById('callout-stat-v').textContent = `${this.sim.telemetry.voltage.toFixed(1)} V`;
    document.getElementById('callout-stat-i').textContent = `${this.sim.telemetry.current.toFixed(1)} A`;
    const pfEl = document.getElementById('callout-stat-pf');
    if (pfEl) pfEl.textContent = this.sim.powerFactor.toFixed(3);
    const resultEl = document.getElementById('callout-stat-result');
    if (resultEl) {
      const result = this.sim.testEvaluation?.status || (this.sim.state === 'TRIPPED' ? 'TRIPPED' : 'READY');
      resultEl.textContent = result;
      resultEl.className = result === 'PASS' ? 'val-green' : (result === 'FAIL' ? 'val-red' : (result === 'REVIEW' ? 'val-amber' : 'val-green'));
    }
    this.syncTestConditionUI();
  }

  syncDUTConfigChips() {
    // Sync Rated Current
    document.querySelectorAll('#cfg-in-chips .cfg-chip').forEach(chip => {
      const val = parseFloat(chip.dataset.in);
      chip.classList.toggle('active', val === this.sim.dutConfig.ratedCurrent);
    });
    // Sync Curve
    document.querySelectorAll('#cfg-curve-chips .cfg-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.curve === this.sim.dutConfig.curve);
    });
    // Sync Poles
    document.querySelectorAll('#cfg-poles-chips .cfg-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.poles === this.sim.dutConfig.poles);
    });
  }

  syncTestConditionUI() {
    const cfg = this.sim.testConfig;
    document.querySelectorAll('#cfg-testtype-chips .cfg-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.testtype === cfg.type);
    });
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (!el || document.activeElement === el) return;
      el.value = value === null || value === undefined ? '' : value;
    };
    setValue('cfg-test-voltage', cfg.appliedVoltage);
    setValue('cfg-test-current', cfg.targetCurrent);
    setValue('cfg-test-r', cfg.customR);
    setValue('cfg-test-xl', cfg.customXL);
    setValue('cfg-test-pf-target', cfg.targetPowerFactor);
    setValue('cfg-test-duration', cfg.durationSec);
    const z = document.getElementById('cfg-test-z');
    const pf = document.getElementById('cfg-test-pf');
    const ratio = document.getElementById('cfg-test-ratio');
    if (z) z.textContent = this.sim.impedance.toFixed(3) + ' Ω';
    if (pf) pf.textContent = this.sim.powerFactor.toFixed(3);
    if (ratio) ratio.textContent = this.sim.currentRatio.toFixed(2) + '×';
    const evalEl = document.getElementById('cfg-test-evaluation');
    if (evalEl) {
      if (this.sim.testEvaluation) evalEl.textContent = this.sim.testEvaluation.status + ' — ' + this.sim.testEvaluation.reason;
      else evalEl.textContent = 'EXPECTED: ' + cfg.type.replaceAll('_', ' ') + ' — configure the test and execute';
      evalEl.className = 'test-evaluation ' + ((this.sim.testEvaluation?.status || 'READY').toLowerCase());
    }
  }
  renderWaveformCanvas() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero center line
    const zeroY = h * 0.58;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();

    const data = this.sim.lastWaveform;
    if (!data || data.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Execute a test to capture sub-cycle DAQ waveform', w / 2, h / 2);
      return;
    }

    // Badges update
    const rep = this.sim.lastTestReport;
    if (rep) {
      const bIp = document.getElementById('badge-ip');
      const bT = document.getElementById('badge-ttrip');
      const bI2t = document.getElementById('badge-i2t');
      if (bIp) bIp.textContent = `Ip: ${rep.peakCurrentIp}`;
      if (bT) bT.textContent = `t: ${rep.tripTime}`;
      if (bI2t) bI2t.textContent = `I²t: ${rep.letThroughEnergy}`;
    }

    // Find scaling factors
    let maxI = 1;
    let maxV = 1;
    data.forEach(pt => {
      if (Math.abs(pt.i) > maxI) maxI = Math.abs(pt.i);
      if (Math.abs(pt.v) > maxV) maxV = Math.abs(pt.v);
    });

    // 1. Draw Voltage Curve v(t) in Cyan
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    data.forEach((pt, idx) => {
      const px = (idx / (data.length - 1)) * w;
      const py = zeroY - (pt.v / maxV) * (h * 0.42);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 2. Draw Current Curve i(t) in Glowing Yellow
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    data.forEach((pt, idx) => {
      const px = (idx / (data.length - 1)) * w;
      const py = zeroY - (pt.i / maxI) * (h * 0.5);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow
  }

  dismissCallout() {
    this.inspectedObject = null;
    this.calloutEl.classList.add('hidden');
  }

  initCalloutUI() {
    document.getElementById('callout-close-btn').addEventListener('click', () => {
      this.dismissCallout();
    });

    document.getElementById('callout-focus-btn').addEventListener('click', () => {
      // Selection information is intentionally camera-neutral. The user controls
      // orbit/pan/zoom manually with OrbitControls and mouse/trackpad input.
      this.updateCalloutContent();
    });

    document.getElementById('callout-operate-btn').addEventListener('click', () => {
      if (!this.inspectedObject) return;
      const ud = this.inspectedObject.userData || {};

      if (ud.type === 'INPUT_MCB_KNOB' || ud.type === 'INPUT_MCB_TOGGLE') {
        this.sim.selectPath(ud.pathId);
        this.sim.toggleInputMCB(ud.pathId);
      } else if (ud.type === 'RXL_BANK') {
        this.sim.cycleResistance();
      } else if (ud.type === 'POWER_SWITCH') {
        const pathId = ud.pathId ?? ud.switchId;
        if (pathId >= 1 && pathId <= 4) {
          this.sim.selectPath(pathId);
          this.wiring.highlightPath(pathId);
        }
        this.sim.toggleSwitch(pathId);
      } else if (ud.type === 'MCB_DUT_STATION' || ud.type === 'MCB_DUT_MODEL' || ud.type === 'MCB_DUT_POLE_TOGGLE') {
        if (this.sim.dutState === 'TRIPPED') {
          this.sim.resetDUT();
        } else {
          this.sim.startTest();
        }
      } else {
        this.sim.startTest();
      }
      this.updateCalloutContent();
    });

    // Test-condition controls
    document.querySelectorAll('#cfg-testtype-chips .cfg-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sim.setTestType(chip.dataset.testtype);
        this.wiring.highlightPath(this.sim.activePath);
        this.syncTestConditionUI();
        this.updateCalloutContent();
      });
    });

    const bindNumber = (id, setter) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        if (el.value === '') return;
        setter.call(this.sim, parseFloat(el.value));
        this.syncTestConditionUI();
        this.updateCalloutContent();
      });
    };
    bindNumber('cfg-test-voltage', this.sim.setAppliedVoltage);
    bindNumber('cfg-test-current', this.sim.setTargetCurrent);
    bindNumber('cfg-test-r', this.sim.setTestResistance);
    bindNumber('cfg-test-xl', this.sim.setTestReactance);
    bindNumber('cfg-test-pf-target', this.sim.setTestPowerFactor);
    bindNumber('cfg-test-duration', this.sim.setTestDuration);

    // DUT Config Chips Listeners
    document.querySelectorAll('#cfg-in-chips .cfg-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sim.setDUTRatedCurrent(parseFloat(chip.dataset.in));
        this.syncDUTConfigChips();
        this.updateCalloutContent();
      });
    });

    document.querySelectorAll('#cfg-curve-chips .cfg-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sim.setDUTCurve(chip.dataset.curve);
        this.syncDUTConfigChips();
        this.updateCalloutContent();
      });
    });

    document.querySelectorAll('#cfg-poles-chips .cfg-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sim.setDUTPoles(chip.dataset.poles);
        this.syncDUTConfigChips();
        this.updateCalloutContent();
      });
    });
  }

  updateCalloutScreenPosition() {
    if (!this.inspectedObject || this.calloutEl.classList.contains('hidden')) return;

    // Project 3D world position to 2D screen coordinate
    const pos = this.inspectedWorldPos.clone();
    pos.project(this.camera);

    // Check if behind camera
    if (pos.z > 1) {
      this.calloutEl.style.display = 'none';
      return;
    } else {
      this.calloutEl.style.display = 'block';
    }

    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;

    this.calloutEl.style.left = `${Math.round(x)}px`;
    this.calloutEl.style.top = `${Math.round(y)}px`;
  }

  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Simulation step
    this.sim.update(delta);

    // 2. Systems update
    this.cabinet.update(time, delta);
    this.internalRack.update(time, delta);
    this.wiring.update(time, delta);
    this.camCtrl.update(delta);

    // 3. Project 3D callout onto screen
    this.updateCalloutScreenPosition();

    // 4. Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate reliably whether the dynamically imported module loads before
// or after DOMContentLoaded. This prevents a blank canvas when custom-main.js
// loads main.js asynchronously.
const bootDigitalTwin = () => {
  if (window.__mcbDigitalTwinBooted) return;
  window.__mcbDigitalTwinBooted = true;
  new DigitalTwinApp();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootDigitalTwin, { once: true });
} else {
  bootDigitalTwin();
}
