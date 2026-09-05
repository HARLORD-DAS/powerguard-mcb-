import * as THREE from 'three';
import { soundFx } from '../audio/SoundEffects.js';

/**
 * Real-Time Digital Twin Simulation Engine
 * Peak-Level Engineering Execution:
 * - 4 Independent testing pathways with strict hardware/software interlocking (1 active path at a time).
 * - Full DUT Configuration: Rated Current (6A-63A), Poles (SP to FP), Curve (B, C, D).
 * - Controlled Short-Circuit testing with prospective peak current Ip surge, instantaneous magnetic trip (<20ms),
 *   optical arc flash, automatic high-power switch isolation, and current collapse.
 * - High-speed DAQ sub-cycle waveform capture [i(t), v(t), Ip, I²t, trip-time].
 * - Direct 3D physical machine integration.
 */
export class MCBSimulationEngine {
  constructor() {
    this.state = 'IDLE'; // 'IDLE', 'VERIFYING', 'TESTING', 'TRIPPED', 'COMPLETE', 'FAULT'
    this.statusText = 'SYSTEM READY — SELECT PATH';

    // Active Testing Path (1: High Current, 2: Voltage, 3: SC Live, 4: SC Neutral)
    this.activePath = 1;

    // 4 Input MCBs with blue toggle rocker levers (UP = ON, DOWN = OFF, MID = TRIPPED)
    this.inputMCBs = [
      { id: 1, name: 'Path 1: High Current', state: 'ON', angle: -0.40 },
      { id: 2, name: 'Path 2: Voltage', state: 'ON', angle: -0.40 },
      { id: 3, name: 'Path 3: SC Live', state: 'ON', angle: -0.40 },
      { id: 4, name: 'Path 4: SC Neutral', state: 'ON', angle: -0.40 }
    ];

    // Common R/XL Configuration Bank (Matches marked dial settings: 0.11, 1, 10, 100, 1000)
    this.rValues = [0.11, 1.0, 10.0, 100.0, 1000.0];
    this.xlValues = [0.11, 1.0, 10.0, 100.0, 1000.0];
    this.selectedRIndex = 0; // 0.11 Ohm for realistic high current / short circuit testing
    this.selectedXlIndex = 0; // 0.11 mH default

    // High Power Switching Contactor States (STRICT INTERLOCK: Only active path contactor may close)
    this.switches = {
      highCurrent: false,
      voltage: false,
      scLive: false,
      scNeutral: false
    };

    // MCB Under Test (DUT) Engineering Configuration
    this.dutConfig = {
      ratedCurrent: 16, // In = 6, 10, 16, 25, 32, 40, 63 A
      poles: 'DP',      // 'SP', 'SPN', 'DP', 'TP', 'TPN', 'FP'
      curve: 'C',       // 'B' (3-5 In), 'C' (5-10 In), 'D' (10-20 In)
      breakingCapacityKA: 10 // 10 kA IEC 60898-1 standard
    };

    // MCB Under Test (DUT) Physical State
    this.dutState = 'NORMAL'; // 'NORMAL' (closed/armed), 'TRIPPED' (open/tripped)
    this.dutLeverAngle = 0;   // 0 = up (closed), Math.PI/4 = down (tripped)

    // Telemetry Measurements
    this.telemetry = {
      voltage: 230.4,
      current: 0.0,
      peakCurrent: 0.0,
      letThroughI2t: 0.0,
      temperature: 24.5,
      arcIntensity: 0.0,
      acousticDb: 35.0,
      tripTimeMs: null,
      arcDurationMs: null,
      dynamicArcResistance: null
    };

    // High-Speed DAQ Waveform Store (500 samples over 50ms)
    this.lastWaveform = null;
    this.lastTestReport = null;

    // View States
    this.isExploded = false;
    this.explodedProgress = 0;
    this.isXray = false;
    this.doorsOpen = true;

    // Callbacks
    this.onStateChange = null;
    this.onDUTTrip = null;

    this.testTimer = null;
    this.elapsedTestTime = 0;
  }

  // --- Electrical Impedance & Current Calculations ---

  get R() {
    return this.rValues[this.selectedRIndex];
  }

  get XL() {
    return this.xlValues[this.selectedXlIndex];
  }

  get impedance() {
    // Z = sqrt(R^2 + (2*pi*f*L)^2) with f = 50Hz, L in H (XL in mH * 1e-3)
    const omegaL = 2 * Math.PI * 50 * (this.XL * 1e-3);
    return Math.sqrt(this.R * this.R + omegaL * omegaL);
  }

  // --- DUT Configuration Methods ---

  setDUTRatedCurrent(amps) {
    const valid = [6, 10, 16, 25, 32, 40, 63];
    if (valid.includes(amps)) {
      this.dutConfig.ratedCurrent = amps;
      soundFx.playSwitchClick(1.2);
      this.statusText = `DUT CONFIG: In = ${amps}A (CURVE ${this.dutConfig.curve})`;
      if (this.onStateChange) this.onStateChange();
    }
  }

  setDUTPoles(poles) {
    const valid = ['SP', 'SPN', 'DP', 'TP', 'TPN', 'FP'];
    if (valid.includes(poles)) {
      this.dutConfig.poles = poles;
      soundFx.playSwitchClick(1.2);
      this.statusText = `DUT CONFIG: ${poles} POLE ASSEMBLY`;
      if (this.onStateChange) this.onStateChange();
    }
  }

  setDUTCurve(curve) {
    const valid = ['B', 'C', 'D'];
    if (valid.includes(curve)) {
      this.dutConfig.curve = curve;
      soundFx.playSwitchClick(1.2);
      const mult = curve === 'B' ? '3-5x' : (curve === 'C' ? '5-10x' : '10-20x');
      this.statusText = `DUT CONFIG: TYPE ${curve} CURVE (MAGNETIC TRIP ${mult} In)`;
      if (this.onStateChange) this.onStateChange();
    }
  }

  // Reset DUT Handle (Direct physical interaction)
  resetDUT() {
    soundFx.playSwitchClick(1.1);
    this.dutState = 'NORMAL';
    this.dutLeverAngle = 0; // Handle snaps up to closed
    this.statusText = 'DUT RESET (NORMAL) — READY FOR TEST';
    if (this.onStateChange) this.onStateChange();
  }

  // --- Strict One-Path-at-a-Time Selection & Interlocking ---

  selectPath(pathId) {
    if (pathId < 1 || pathId > 4) return;
    if (this.state === 'TESTING' || this.state === 'VERIFYING') {
      soundFx.playAlarmChirp();
      this.statusText = 'INTERLOCK: CANNOT CHANGE PATHWAY DURING ACTIVE TEST';
      if (this.onStateChange) this.onStateChange();
      return;
    }

    soundFx.playSwitchClick(1.05);
    this.activePath = pathId;

    // Strict Hardware/Software Interlock: Open all switches immediately
    this.switches.highCurrent = false;
    this.switches.voltage = false;
    this.switches.scLive = false;
    this.switches.scNeutral = false;

    const names = [
      'HIGH CURRENT OVERLOAD PATH',
      'VOLTAGE WITHSTAND PATH',
      'SHORT CIRCUIT LIVE PATH',
      'SHORT CIRCUIT NEUTRAL PATH'
    ];

    const activeMCB = this.inputMCBs.find(m => m.id === pathId);
    const mcbStateText = activeMCB ? activeMCB.state : 'UNKNOWN';

    this.statusText = `PATH ${pathId} SELECTED: ${names[pathId - 1]} (MCB: ${mcbStateText})`;
    if (this.onStateChange) this.onStateChange();
  }

  // Toggle High Power Switch for a pathway (Subject to strict interlock)
  toggleSwitch(switchId) {
    if (switchId !== this.activePath) {
      soundFx.playAlarmChirp();
      this.statusText = `INTERLOCK VIOLATION: PATH ${switchId} IS INACTIVE (ONLY PATH ${this.activePath} PERMITTED)`;
      if (this.onStateChange) this.onStateChange();
      return;
    }

    const key = switchId === 1 ? 'highCurrent' : (switchId === 2 ? 'voltage' : (switchId === 3 ? 'scLive' : 'scNeutral'));
    this.switches[key] = !this.switches[key];
    soundFx.playContactorThunk();
    this.statusText = `HIGH POWER SWITCH ${switchId}: ${this.switches[key] ? 'CLOSED (ARMED)' : 'OPEN (ISOLATED)'}`;
    if (this.onStateChange) this.onStateChange();
  }

  // Toggle Input MCB (Direct 3D Physical DIN Breaker Control)
  toggleInputMCB(pathId) {
    const mcb = this.inputMCBs.find(m => m.id === pathId);
    if (!mcb) return;

    soundFx.playSwitchClick(1.0);

    // Toggle Kinematics:
    // UP: -0.40 rad (ON, Contacts Closed)
    // DOWN: +0.40 rad (OFF, Contacts Open)
    // MID: +0.18 rad (TRIPPED, Overload/Short-Circuit Release)
    if (mcb.state === 'OFF') {
      mcb.state = 'ON';
      mcb.angle = -0.40;
    } else if (mcb.state === 'ON') {
      mcb.state = 'OFF';
      mcb.angle = 0.40;
    } else {
      // If TRIPPED, toggle resets breaker back to OFF, then ON
      mcb.state = 'OFF';
      mcb.angle = 0.40;
    }

    // If active pathway MCB was opened, de-energize immediately
    if (pathId === this.activePath) {
      if (mcb.state !== 'ON') {
        this.telemetry.current = 0.0;
        this.switches.highCurrent = false;
        this.switches.voltage = false;
        this.switches.scLive = false;
        this.switches.scNeutral = false;
        if (this.state === 'TESTING' || this.state === 'VERIFYING') {
          this.state = 'IDLE';
          this.statusText = `PATH ${pathId} MCB OPENED (${mcb.state}) — HIGH POWER CUT`;
          soundFx.stopTransformerHum();
          soundFx.playContactorThunk();
          if (this.testTimer) clearTimeout(this.testTimer);
        } else {
          this.statusText = `PATH ${pathId} MCB: ${mcb.state} (DISCONNECTED)`;
        }
      } else {
        this.statusText = `PATH ${pathId} MCB: ENERGIZED (READY FOR TEST)`;
      }
    } else {
      this.statusText = `PATH ${pathId} MCB: ${mcb.state}`;
    }

    if (this.onStateChange) this.onStateChange();
  }

  // Click Resistance (R) Dial
  cycleResistance() {
    soundFx.playSwitchClick(0.85);
    this.selectedRIndex = (this.selectedRIndex + 1) % this.rValues.length;
    this.updateCalculatedCurrent();
    this.statusText = `COMMON R/XL: R = ${this.R} Ω, XL = ${this.XL} mH (Z = ${this.impedance.toFixed(3)} Ω)`;
    if (this.onStateChange) this.onStateChange();
  }

  // Click Reactance (XL) Dial
  cycleReactance() {
    soundFx.playSwitchClick(0.85);
    this.selectedXlIndex = (this.selectedXlIndex + 1) % this.xlValues.length;
    this.updateCalculatedCurrent();
    this.statusText = `COMMON R/XL: R = ${this.R} Ω, XL = ${this.XL} mH (Z = ${this.impedance.toFixed(3)} Ω)`;
    if (this.onStateChange) this.onStateChange();
  }

  toggleExplodedView() {
    soundFx.playSwitchClick(1.2);
    this.isExploded = !this.isExploded;
    if (this.onStateChange) this.onStateChange();
  }

  toggleXray() {
    soundFx.playSwitchClick(1.3);
    this.isXray = !this.isXray;
    if (this.onStateChange) this.onStateChange();
  }

  // --- Controlled Testing Sequence Execution ---

  startTest() {
    if (this.state === 'TESTING' || this.state === 'VERIFYING') return;

    // Safety Interlock Check 1: DUT must not be already tripped
    if (this.dutState === 'TRIPPED') {
      soundFx.playAlarmChirp();
      this.statusText = 'CANNOT START: MCB DUT IS TRIPPED — CLICK DUT HANDLE TO RESET';
      if (this.onStateChange) this.onStateChange();
      return;
    }

    // Safety Interlock Check 2: Active pathway MCB must be closed (state === 'ON')
    const activeMCB = this.inputMCBs.find(m => m.id === this.activePath);
    if (!activeMCB || activeMCB.state !== 'ON') {
      soundFx.playAlarmChirp();
      this.statusText = `CANNOT START: PATH ${this.activePath} MCB IS ${activeMCB ? activeMCB.state : 'OFF'} — ROTATE KNOB TO ON`;
      this.telemetry.current = 0.0;
      if (this.onStateChange) this.onStateChange();
      return;
    }

    // Step 1: PLC Condition Verification
    this.state = 'VERIFYING';
    this.statusText = `PLC: VERIFYING PATH ${this.activePath} INTERLOCKS & SENSORS...`;
    soundFx.playBeep(880);
    if (this.onStateChange) this.onStateChange();

    if (this.testTimer) clearTimeout(this.testTimer);

    this.testTimer = setTimeout(() => {
      this.executeEnergizedTest();
    }, 280);
  }

  executeEnergizedTest() {
    // Step 2: Close High-Power Switch for the single active pathway
    this.switches.highCurrent = (this.activePath === 1);
    this.switches.voltage = (this.activePath === 2);
    this.switches.scLive = (this.activePath === 3);
    this.switches.scNeutral = (this.activePath === 4);

    soundFx.playContactorThunk();
    soundFx.startTransformerHum();

    this.state = 'TESTING';
    this.elapsedTestTime = 0;
    this.telemetry.tripTimeMs = null;

    const baseV = 230.0 + (Math.random() * 2 - 1);
    this.telemetry.voltage = parseFloat(baseV.toFixed(1));

    const inRated = this.dutConfig.ratedCurrent;
    let tripDelayMs = 2000;
    let peakCurrent = 0;
    let testType = '';

    // Branch logic per Pathway:
    if (this.activePath === 1) {
      // PATH 1: HIGH CURRENT OVERLOAD TEST
      testType = 'HIGH CURRENT OVERLOAD TEST';
      const calcCurrent = baseV / Math.max(this.impedance, 0.5);
      this.telemetry.current = parseFloat(calcCurrent.toFixed(1));
      peakCurrent = this.telemetry.current * 1.414;

      const iRatio = this.telemetry.current / inRated;
      // Inverse time trip curve
      if (iRatio >= 10.0) {
        tripDelayMs = 50 + Math.random() * 40;
      } else if (iRatio >= 5.0) {
        tripDelayMs = 250 + Math.random() * 150;
      } else if (iRatio >= 1.5) {
        tripDelayMs = 1200 + Math.random() * 600;
      } else {
        tripDelayMs = 3500;
      }
      this.statusText = `TEST RUNNING: HIGH CURRENT (${this.telemetry.current} A, ${iRatio.toFixed(1)}x In)`;

    } else if (this.activePath === 2) {
      // PATH 2: VOLTAGE WITHSTAND TEST
      testType = 'VOLTAGE WITHSTAND TEST';
      this.telemetry.voltage = 1500.0 + Math.random() * 100;
      this.telemetry.current = parseFloat((0.8 + Math.random() * 0.6).toFixed(2)); // mA leakage
      peakCurrent = 2.2;
      tripDelayMs = 2500; // Passes withstand test
      this.statusText = `TEST RUNNING: HIGH VOLTAGE POTENTIAL (${this.telemetry.voltage.toFixed(0)} V, LEAKAGE: ${this.telemetry.current} mA)`;

    } else {
      // PATH 3 & 4: CONTROLLED SHORT CIRCUIT (LIVE OR NEUTRAL)
      testType = this.activePath === 3 ? 'SHORT CIRCUIT LIVE FAULT' : 'SHORT CIRCUIT NEUTRAL FAULT';

      // Massive Prospective Fault Current: Isc_rms = V / Z
      const loopZ = Math.max(this.impedance, 0.05);
      const iscRms = baseV / loopZ;
      // Peak asymmetric fault current: Ip = sqrt(2) * Isc * kappa
      const kappa = 1.0 + Math.exp(-Math.PI * this.R / Math.max(2 * Math.PI * 50 * (this.XL * 1e-3), 0.01));
      peakCurrent = parseFloat((Math.sqrt(2) * iscRms * kappa).toFixed(1));
      this.telemetry.current = parseFloat(iscRms.toFixed(1));
      this.telemetry.peakCurrent = peakCurrent;

      // Instantaneous Electromagnetic Solenoid Trip (< 20 ms, within 1 mains cycle)
      // Curve B: 3-5 In, Curve C: 5-10 In, Curve D: 10-20 In
      tripDelayMs = 7 + Math.random() * 8; // 7ms to 15ms sub-cycle trip!

      this.statusText = `FAULT APPLIED: ${testType} (Ip: ${(peakCurrent / 1000).toFixed(2)} kA)`;
    }

    if (this.onStateChange) this.onStateChange();

    // Schedule trip & DAQ capture
    this.testTimer = setTimeout(() => {
      if (this.state === 'TESTING') {
        this.tripDUT(tripDelayMs, peakCurrent, testType);
      }
    }, Math.min(tripDelayMs, 4000));
  }

  // Execute instantaneous trip, interrupt current, isolate switch, and capture DAQ
  tripDUT(tripTimeMs, peakCurrent, testType) {
    soundFx.stopTransformerHum();
    soundFx.playContactorThunk();
    soundFx.playArcZap();

    // 1. Mechanical DUT trip: Lever snaps down
    this.dutState = 'TRIPPED';
    this.dutLeverAngle = Math.PI / 4; // Physically down (45 deg)

    // 2. High-Power Switch Contactor immediately OPENS to isolate high power source
    this.switches.highCurrent = false;
    this.switches.voltage = false;
    this.switches.scLive = false;
    this.switches.scNeutral = false;

    // 3. Current immediately collapses to 0.0 A (Interruption complete)
    const faultCurrent = this.telemetry.current;
    this.telemetry.current = 0.0;
    this.telemetry.tripTimeMs = parseFloat(tripTimeMs.toFixed(1));

    // 4. Calculate Let-through energy I²t = 0.5 * Ip^2 * t_clear
    const tSec = tripTimeMs * 1e-3;
    const i2t = Math.round(0.5 * peakCurrent * peakCurrent * tSec * 0.65);
    this.telemetry.letThroughI2t = i2t;

    // 5. Arc voltage and temperature dynamics
    const arcV = parseFloat((85 + Math.random() * 45).toFixed(1));
    this.telemetry.arcIntensity = parseFloat((150 + Math.random() * 150).toFixed(1));
    this.telemetry.temperature += parseFloat((2.5 + Math.random() * 3.8).toFixed(1));
    this.telemetry.acousticDb = parseFloat((95 + Math.random() * 12).toFixed(1));

    // 6. Generate High-Speed DAQ Waveform (500 samples over 50ms)
    this.generateDAQWaveform(tripTimeMs, peakCurrent, this.telemetry.voltage, arcV);

    // 7. Store Complete Test Report
    this.lastTestReport = {
      testType: testType || `PATH ${this.activePath} TEST`,
      pathId: this.activePath,
      mcbRating: `${this.dutConfig.ratedCurrent} A (Type ${this.dutConfig.curve})`,
      poles: this.dutConfig.poles,
      appliedVoltage: `${this.telemetry.voltage.toFixed(1)} V`,
      faultCurrentRms: `${faultCurrent.toFixed(1)} A`,
      peakCurrentIp: `${(peakCurrent >= 1000 ? (peakCurrent / 1000).toFixed(2) + ' kA' : peakCurrent.toFixed(0) + ' A')}`,
      tripTime: `${tripTimeMs.toFixed(1)} ms`,
      letThroughEnergy: `${i2t.toLocaleString()} A²s`,
      arcVoltage: `${arcV} V`,
      rSetting: `${this.R} Ω`,
      xlSetting: `${this.XL} mH`,
      impedance: `${this.impedance.toFixed(3)} Ω`,
      breakingStatus: 'INTERRUPTED (CONTACTS OPEN, HIGH-POWER ISOLATED)'
    };

    this.state = 'TRIPPED';
    this.statusText = `DUT TRIPPED & ISOLATED (t: ${tripTimeMs.toFixed(1)}ms, Ip: ${(peakCurrent >= 1000 ? (peakCurrent / 1000).toFixed(2) + ' kA' : peakCurrent.toFixed(0) + ' A')}, I²t: ${i2t} A²s)`;

    if (this.onDUTTrip) this.onDUTTrip();
    if (this.onStateChange) this.onStateChange();
  }

  // Generate 500-point sub-cycle DAQ waveform [t_ms, i_A, v_V]
  generateDAQWaveform(tripTimeMs, peakCurrent, nominalV, arcV) {
    const points = [];
    const totalDurationMs = 50.0;
    const numSamples = 500;
    const dt = totalDurationMs / numSamples;
    const f = 50; // 50 Hz
    const omega = 2 * Math.PI * f;

    for (let k = 0; k < numSamples; k++) {
      const tMs = -10.0 + k * dt; // Start 10ms before fault inception
      const tSec = tMs * 1e-3;

      let i = 0;
      let v = 0;

      if (tMs < 0) {
        // Pre-fault state (normal nominal current and voltage)
        v = nominalV * Math.SQRT2 * Math.sin(omega * tSec);
        i = (nominalV / Math.max(this.impedance, 10)) * Math.SQRT2 * Math.sin(omega * tSec - 0.2);
      } else if (tMs <= tripTimeMs) {
        // Active fault interval (steep short-circuit surge with DC decay)
        const tau = 0.015; // 15ms DC time constant
        const dcDecay = Math.exp(-tSec / tau);
        i = peakCurrent * (Math.sin(omega * tSec) + dcDecay);

        // Contact separation begins at 60% of trip time: arc voltage develops
        if (tMs >= tripTimeMs * 0.6) {
          v = arcV * (Math.random() * 0.2 + 0.9);
        } else {
          v = nominalV * 0.15 * Math.sin(omega * tSec); // Voltage dip during fault
        }
      } else {
        // Post-interruption state (current extinguished, voltage recovers to open-circuit mains)
        i = 0.0;
        const recovTime = (tMs - tripTimeMs) * 1e-3;
        v = nominalV * Math.SQRT2 * Math.sin(omega * (tSec) + Math.PI / 4) * (1 - Math.exp(-recovTime / 0.002));
      }

      points.push({
        t: parseFloat(tMs.toFixed(2)),
        i: parseFloat(i.toFixed(1)),
        v: parseFloat(v.toFixed(1))
      });
    }

    this.lastWaveform = points;
  }

  stopTest() {
    soundFx.stopTransformerHum();
    soundFx.playContactorThunk();

    if (this.testTimer) clearTimeout(this.testTimer);
    this.switches.highCurrent = false;
    this.switches.voltage = false;
    this.switches.scLive = false;
    this.switches.scNeutral = false;

    this.state = 'IDLE';
    this.statusText = 'TEST STOPPED — HIGH POWER ISOLATED';
    this.telemetry.current = 0.0;

    if (this.onStateChange) this.onStateChange();
  }

  triggerEmergencyStop() {
    soundFx.stopTransformerHum();
    soundFx.playAlarmChirp();

    if (this.testTimer) clearTimeout(this.testTimer);
    this.switches.highCurrent = false;
    this.switches.voltage = false;
    this.switches.scLive = false;
    this.switches.scNeutral = false;

    this.state = 'FAULT';
    this.statusText = 'EMERGENCY STOP ENGAGED — ALL POWER ISOLATED';
    this.telemetry.voltage = 0.0;
    this.telemetry.current = 0.0;
    this.dutState = 'TRIPPED';
    this.dutLeverAngle = Math.PI / 4;

    if (this.onStateChange) this.onStateChange();
  }

  resetEmergencyStop() {
    soundFx.playSwitchClick(0.9);
    this.state = 'IDLE';
    this.statusText = 'SYSTEM RESET (READY)';
    this.telemetry.voltage = 230.4;
    this.telemetry.current = 0.0;
    this.dutState = 'NORMAL';
    this.dutLeverAngle = 0;

    if (this.onStateChange) this.onStateChange();
  }

  updateCalculatedCurrent() {
    if (this.state === 'TESTING') {
      const calcI = this.telemetry.voltage / Math.max(this.impedance, 0.05);
      this.telemetry.current = parseFloat(calcI.toFixed(1));
    }
  }

  update(delta) {
    const targetEx = this.isExploded ? 1.0 : 0.0;
    this.explodedProgress = THREE.MathUtils.lerp(this.explodedProgress, targetEx, delta * 5.0);

    if (this.state !== 'TESTING' && this.telemetry.temperature > 24.5) {
      this.telemetry.temperature = Math.max(24.5, this.telemetry.temperature - delta * 0.15);
    }
  }
}
