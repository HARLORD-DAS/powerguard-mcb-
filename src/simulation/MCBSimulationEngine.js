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
      ratedCurrent: 16,
      poles: 'DP',
      curve: 'C',
      breakingCapacityKA: 10
    };

    // Physical DUT configuration profiles. These values drive the 3D model
    // as well as the electrical/trip simulation; the UI must not be cosmetic-only.
    this.dutPoleProfiles = {
      SP:  { poles: 1, neutral: false, label: 'Single Pole' },
      SPN: { poles: 2, neutral: true,  label: 'Single Pole + Neutral' },
      DP:  { poles: 2, neutral: false, label: 'Double Pole' },
      DPN: { poles: 2, neutral: true,  label: 'Double Pole + Neutral' },
      TP:  { poles: 3, neutral: false, label: 'Triple Pole' },
      TPN: { poles: 4, neutral: true,  label: 'Triple Pole + Neutral' },
      FP:  { poles: 4, neutral: false, label: 'Four Pole' },
      PN:  { poles: 2, neutral: true,  label: 'Phase + Neutral' },
      DC:  { poles: 2, neutral: false, label: 'DC Two Pole' }
    };

    this.dutRatedCurrents = [0.5, 1, 2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63];
    this.dutCurveMultipliers = {
      B: { min: 3, max: 5 },
      C: { min: 5, max: 10 },
      D: { min: 10, max: 20 },
      K: { min: 8, max: 12 },
      Z: { min: 2, max: 3 }
    };

    // Source specifications for the two dedicated transformer pathways.
    // These are project simulation specifications, not a claim of physical compliance.
    this.transformerSpecs = {
      highCurrent: {
        inputVoltage: 240, inputCurrent: 460,
        outputVoltage: 10, outputCurrent: 11000,
        apparentPowerKVA: 110
      },
      voltageStepUp: {
        inputVoltage: 240, inputCurrent: 42,
        outputVoltage: 450, outputCurrent: 22,
        apparentPowerKVA: 10
      }
    };

    this.sourceTelemetry = {
      type: 'MAINS', inputVoltage: 230.4, outputVoltage: 230.4,
      inputCurrent: 0, outputCurrent: 0
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

    this.testConfig = {
      type: 'OVERLOAD',
      appliedVoltage: null,
      targetCurrent: null,
      durationSec: 5,
      customR: null,
      customXL: null,
      targetPowerFactor: null
    };
    this.testEvaluation = null;

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
    return this.testConfig.customR !== null ? this.testConfig.customR : this.rValues[this.selectedRIndex];
  }

  get XL() {
    return this.testConfig.customXL !== null ? this.testConfig.customXL : this.xlValues[this.selectedXlIndex];
  }

  get impedance() {
    const omegaL = 2 * Math.PI * 50 * (this.XL * 1e-3);
    return Math.sqrt(this.R * this.R + omegaL * omegaL);
  }

  get powerFactor() {
    return this.R / Math.max(this.impedance, 1e-9);
  }

  get currentRatio() {
    return this.telemetry.current / Math.max(this.dutConfig.ratedCurrent, 0.1);
  }

  get shortCircuitPowerFactorRange() {
    return this.getShortCircuitPowerFactorRange(this.telemetry.current);
  }

  getShortCircuitPowerFactorRange(current) {
    const i = Math.max(0, Number(current) || 0);
    if (i <= 1500) return [0.93, 0.98];
    if (i <= 3000) return [0.85, 0.90];
    if (i <= 4500) return [0.75, 0.80];
    if (i <= 6000) return [0.65, 0.70];
    if (i <= 10000) return [0.45, 0.50];
    return [0.20, 0.25];
  }

  // --- DUT Configuration Methods ---

  setDUTRatedCurrent(amps) {
    const valid = this.dutRatedCurrents;
    if (valid.includes(amps)) {
      this.dutConfig.ratedCurrent = amps;
      soundFx.playSwitchClick(1.2);
      this.statusText = `DUT CONFIG: In = ${amps}A (CURVE ${this.dutConfig.curve})`;
      if (this.onStateChange) this.onStateChange();
    }
  }

  setDUTPoles(poles) {
    const valid = Object.keys(this.dutPoleProfiles);
    if (valid.includes(poles)) {
      this.dutConfig.poles = poles;
      soundFx.playSwitchClick(1.2);
      this.statusText = `DUT CONFIG: ${poles} POLE ASSEMBLY`;
      if (this.onStateChange) this.onStateChange();
    }
  }

  setDUTCurve(curve) {
    const valid = Object.keys(this.dutCurveMultipliers);
    if (valid.includes(curve)) {
      this.dutConfig.curve = curve;
      soundFx.playSwitchClick(1.2);
      const mult = `${this.dutCurveMultipliers[curve].min}-${this.dutCurveMultipliers[curve].max}x`;
      this.statusText = `DUT CONFIG: TYPE ${curve} CURVE (MAGNETIC TRIP ${mult} In)`;
      if (this.onStateChange) this.onStateChange();
    }
  }

  setTestType(type) {
    const valid = ['OVERLOAD', 'INSTANTANEOUS', 'SHORT_CIRCUIT', 'BREAKING_CAPACITY', 'VOLTAGE_WITHSTAND'];
    if (!valid.includes(type)) return;
    const pathMap = { OVERLOAD: 1, INSTANTANEOUS: 3, SHORT_CIRCUIT: 3, BREAKING_CAPACITY: 3, VOLTAGE_WITHSTAND: 2 };
    this.selectPath(pathMap[type]);
    this.testConfig.type = type;
    this.statusText = 'TEST TYPE: ' + type.replaceAll('_', ' ');
    if (this.onStateChange) this.onStateChange();
  }

  setAppliedVoltage(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0 || v > 440) return;
    this.testConfig.appliedVoltage = v;
    this.statusText = 'TEST CONDITION: APPLIED VOLTAGE = ' + v.toFixed(1) + ' V';
    if (this.onStateChange) this.onStateChange();
  }

  setTargetCurrent(value) {
    const i = Number(value);
    if (!Number.isFinite(i) || i < 0 || i > 10000) return;
    this.testConfig.targetCurrent = i;
    this.statusText = 'TEST CONDITION: TARGET CURRENT = ' + i.toFixed(1) + ' A';
    if (this.onStateChange) this.onStateChange();
  }

  setTestDuration(value) {
    const s = Number(value);
    if (!Number.isFinite(s) || s < 0.1 || s > 3600) return;
    this.testConfig.durationSec = s;
    this.statusText = 'TEST CONDITION: DURATION = ' + s.toFixed(1) + ' s';
    if (this.onStateChange) this.onStateChange();
  }

  setTestResistance(value) {
    const r = Number(value);
    if (!Number.isFinite(r) || r <= 0 || r > 1000) return;
    this.testConfig.customR = r;
    this.statusText = 'COMMON R/XL: R = ' + r.toFixed(4) + ' Ω';
    if (this.onStateChange) this.onStateChange();
  }

  setTestReactance(value) {
    const xl = Number(value);
    if (!Number.isFinite(xl) || xl < 0 || xl > 1000) return;
    this.testConfig.customXL = xl;
    this.statusText = 'COMMON R/XL: XL = ' + xl.toFixed(4) + ' mH';
    if (this.onStateChange) this.onStateChange();
  }

  setTestPowerFactor(value) {
    const pf = Number(value);
    if (!Number.isFinite(pf) || pf <= 0 || pf > 1) return;
    this.testConfig.targetPowerFactor = pf;
    const resistive = this.R;
    const inductiveReactanceOhm = resistive * Math.sqrt(Math.max((1 / (pf * pf)) - 1, 0));
    this.testConfig.customXL = (inductiveReactanceOhm / (2 * Math.PI * 50)) * 1000;
    this.statusText = 'TEST CONDITION: TARGET PF = ' + pf.toFixed(3) + ' (XL recalculated)';
    if (this.onStateChange) this.onStateChange();
  }
  clearCustomImpedance() {
    this.testConfig.customR = null;
    this.testConfig.customXL = null;
    this.testConfig.targetPowerFactor = null;
    this.statusText = 'COMMON R/XL BANK: R = ' + this.R + ' Ω, XL = ' + this.XL + ' mH';
    if (this.onStateChange) this.onStateChange();
  }

  evaluateTestResult({ tripped, testType, current, tripTimeMs = null, leakageMA = null }) {
    const type = testType || this.testConfig.type;
    const ratio = current / Math.max(this.dutConfig.ratedCurrent, 0.1);
    let expected = 'REVIEW';
    let reason = 'Condition is between defined simulation acceptance boundaries.';
    if (type === 'SHORT_CIRCUIT' || type === 'BREAKING_CAPACITY') {
      const range = this.getShortCircuitPowerFactorRange(current);
      if (this.powerFactor < range[0] || this.powerFactor > range[1]) {
        this.statusText = 'TEST CONDITION INVALID: PF ' + this.powerFactor.toFixed(3) + ' OUTSIDE REQUIRED ' + range[0].toFixed(2) + '–' + range[1].toFixed(2) + ' RANGE';
        this.testEvaluation = { status: 'FAIL', expected: 'VALID_TEST_CONDITION', ratio, reason: 'Short-circuit power factor is outside the configured IEC 60898-1 test-circuit range.' };
        this.switches.highCurrent = false; this.switches.voltage = false; this.switches.scLive = false; this.switches.scNeutral = false;
        this.state = 'COMPLETE'; this.telemetry.current = 0;
        if (this.onStateChange) this.onStateChange();
        return;
      }
    }
    if (type === 'OVERLOAD') {
      if (ratio <= 1.13) { expected = 'NO_TRIP'; reason = 'At or below the conventional 1.13 × In non-tripping check.'; }
      else if (ratio >= 1.45) { expected = 'TRIP'; reason = 'At or above the conventional 1.45 × In tripping check.'; }
      else { expected = 'REVIEW'; reason = 'Between 1.13 × In and 1.45 × In; no automatic verdict.'; }
    } else if (type === 'INSTANTANEOUS' || type === 'SHORT_CIRCUIT') {
      const band = this.dutCurveMultipliers[this.dutConfig.curve] || this.dutCurveMultipliers.C;
      expected = ratio >= band.min ? 'TRIP' : 'NO_TRIP';
      reason = ratio >= band.min ? 'Current is at/above the configured curve magnetic band.' : 'Current is below the configured curve magnetic band.';
    } else if (type === 'BREAKING_CAPACITY') {
      const capacityA = this.dutConfig.breakingCapacityKA * 1000;
      expected = 'TRIP';
      reason = 'Prospective current is evaluated against the configured breaking-capacity model.';
      if (current > capacityA) return { status: 'FAIL', expected, ratio, reason: 'Prospective current exceeds the configured breaking-capacity model.', tripTimeMs };
    } else if (type === 'VOLTAGE_WITHSTAND') {
      expected = 'NO_TRIP';
      const leakagePass = Number.isFinite(leakageMA) && leakageMA <= 2.0;
      return { status: !tripped && leakagePass ? 'PASS' : 'FAIL', expected, ratio, reason: leakagePass ? 'Leakage remains within the simulation withstand threshold.' : 'Leakage exceeds the simulation withstand threshold or the DUT tripped.', tripTimeMs };
    }
    const status = expected === 'REVIEW' ? 'REVIEW' : ((expected === 'TRIP' && tripped) || (expected === 'NO_TRIP' && !tripped) ? 'PASS' : 'FAIL');
    return { status, expected, ratio, reason, tripTimeMs };
  }

  generateSteadyDAQWaveform(durationMs, nominalV, rmsCurrent) {
    const points = [];
    const totalDurationMs = Math.min(Math.max(durationMs, 50), 5000);
    const numSamples = 500;
    const dt = totalDurationMs / numSamples;
    const omega = 2 * Math.PI * 50;
    for (let k = 0; k < numSamples; k++) {
      const tMs = k * dt;
      const tSec = tMs * 1e-3;
      points.push({ t: parseFloat(tMs.toFixed(2)), i: parseFloat((rmsCurrent * Math.SQRT2 * Math.sin(omega * tSec)).toFixed(1)), v: parseFloat((nominalV * Math.SQRT2 * Math.sin(omega * tSec)).toFixed(1)) });
    }
    this.lastWaveform = points;
  }

  completeNoTrip(testType, peakCurrent = 0, leakageMA = null) {
    soundFx.stopTransformerHum();
    soundFx.playContactorThunk();
    this.switches.highCurrent = false; this.switches.voltage = false; this.switches.scLive = false; this.switches.scNeutral = false;
    const current = this.telemetry.current;
    this.telemetry.tripTimeMs = null;
    this.telemetry.peakCurrent = peakCurrent;
    this.telemetry.letThroughI2t = 0;
    this.generateSteadyDAQWaveform(this.testConfig.durationSec * 1000, this.telemetry.voltage, current);
    this.testEvaluation = this.evaluateTestResult({ tripped: false, testType, current, leakageMA });
    this.lastTestReport = {
      testType, pathId: this.activePath,
      mcbRating: this.dutConfig.ratedCurrent + ' A (Type ' + this.dutConfig.curve + ')',
      poles: this.dutConfig.poles, source: this.sourceTelemetry.type,
      sourceOutputVoltage: this.sourceTelemetry.outputVoltage.toFixed(1) + ' V',
      sourceOutputCurrent: this.sourceTelemetry.outputCurrent.toFixed(0) + ' A',
      appliedVoltage: this.telemetry.voltage.toFixed(1) + ' V',
      peakCurrentIp: peakCurrent >= 1000 ? (peakCurrent / 1000).toFixed(2) + ' kA' : peakCurrent.toFixed(1) + ' A',
      tripTime: 'NO TRIP',
      letThroughEnergy: '0 A²s',
      faultCurrentRms: testType === 'VOLTAGE_WITHSTAND' ? current.toFixed(2) + ' mA leakage' : current.toFixed(1) + ' A',
      currentRatio: testType === 'VOLTAGE_WITHSTAND' ? 'N/A' : (current / Math.max(this.dutConfig.ratedCurrent, 0.1)).toFixed(2) + ' x In',
      powerFactor: this.powerFactor.toFixed(3), rSetting: this.R + ' Ω', xlSetting: this.XL + ' mH',
      impedance: this.impedance.toFixed(3) + ' Ω', expectedResult: this.testEvaluation.expected,
      result: this.testEvaluation.status, resultReason: this.testEvaluation.reason,
      breakingStatus: 'NO TRIP — CONTACTS REMAIN CLOSED'
    };
    this.state = 'COMPLETE';
    this.statusText = 'TEST ' + this.testEvaluation.status + ': ' + testType.replaceAll('_', ' ') + ' — NO TRIP';
    if (this.onStateChange) this.onStateChange();
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
    if (pathId === 1) this.testConfig.type = 'OVERLOAD';
    else if (pathId === 2) this.testConfig.type = 'VOLTAGE_WITHSTAND';
    else if (pathId === 3 || pathId === 4) this.testConfig.type = 'SHORT_CIRCUIT';

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
    this.testConfig.customR = null;
    this.testConfig.targetPowerFactor = null;
    this.selectedRIndex = (this.selectedRIndex + 1) % this.rValues.length;
    this.updateCalculatedCurrent();
    this.statusText = `COMMON R/XL: R = ${this.R} Ω, XL = ${this.XL} mH (Z = ${this.impedance.toFixed(3)} Ω)`;
    if (this.onStateChange) this.onStateChange();
  }

  // Click Reactance (XL) Dial
  cycleReactance() {
    soundFx.playSwitchClick(0.85);
    this.testConfig.customXL = null;
    this.testConfig.targetPowerFactor = null;
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
    this.switches.highCurrent = this.activePath === 1;
    this.switches.voltage = this.activePath === 2;
    this.switches.scLive = this.activePath === 3;
    this.switches.scNeutral = this.activePath === 4;
    soundFx.playContactorThunk();
    soundFx.startTransformerHum();
    this.state = 'TESTING'; this.elapsedTestTime = 0; this.telemetry.tripTimeMs = null; this.testEvaluation = null;
    const mainsV = 230.0 + (Math.random() * 2 - 1);
    const source = this.activePath === 1 ? this.transformerSpecs.highCurrent : this.activePath === 2 ? this.transformerSpecs.voltageStepUp : null;
    const configuredV = this.testConfig.appliedVoltage;
    const defaultV = source ? source.outputVoltage : mainsV;
    const baseV = configuredV !== null ? configuredV : Math.min(defaultV, 440);
    this.sourceTelemetry = source ? { type: this.activePath === 1 ? 'HIGH_CURRENT_TRANSFORMER' : 'VOLTAGE_STEP_UP_TRANSFORMER', inputVoltage: source.inputVoltage, inputCurrent: source.inputCurrent, outputVoltage: source.outputVoltage, outputCurrent: source.outputCurrent } : { type: 'DIRECT_PATH', inputVoltage: mainsV, inputCurrent: 0, outputVoltage: mainsV, outputCurrent: 0 };
    this.telemetry.voltage = parseFloat(baseV.toFixed(1));
    const inRated = this.dutConfig.ratedCurrent; const type = this.testConfig.type; let tripDelayMs = 2000; let peakCurrent = 0; const curveBand = this.dutCurveMultipliers[this.dutConfig.curve] || this.dutCurveMultipliers.C;
    if (type === 'VOLTAGE_WITHSTAND') {
      const leakage = parseFloat((0.8 + Math.random() * 0.6).toFixed(2));
      this.telemetry.current = leakage; this.telemetry.peakCurrent = leakage;
      tripDelayMs = Math.max(1, this.testConfig.durationSec) * 1000;
      this.statusText = 'TEST RUNNING: VOLTAGE WITHSTAND (' + this.telemetry.voltage.toFixed(1) + ' V, ' + leakage.toFixed(2) + ' mA leakage)';
      this.testTimer = setTimeout(() => { if (this.state === 'TESTING') this.completeNoTrip(type, leakage, leakage); }, Math.min(tripDelayMs, 3600000));
      if (this.onStateChange) this.onStateChange(); return;
    }
    let calcCurrent = this.testConfig.targetCurrent !== null ? this.testConfig.targetCurrent : (type === 'BREAKING_CAPACITY' ? this.dutConfig.breakingCapacityKA * 1000 : baseV / Math.max(this.impedance, 0.05));
    calcCurrent = Math.min(calcCurrent, type === 'OVERLOAD' ? this.transformerSpecs.highCurrent.outputCurrent : 10000);
    this.telemetry.current = parseFloat(calcCurrent.toFixed(1));
    peakCurrent = this.telemetry.current * 1.414; this.telemetry.peakCurrent = peakCurrent;
    const iRatio = this.telemetry.current / Math.max(inRated, 0.1);
    if (type === 'OVERLOAD') {
      if (iRatio <= 1.45) {
        tripDelayMs = this.testConfig.durationSec * 1000;
        this.statusText = 'TEST RUNNING: OVERLOAD ' + (iRatio <= 1.13 ? 'NO-TRIP' : 'REVIEW') + ' CHECK (' + this.telemetry.current + ' A, ' + iRatio.toFixed(2) + 'x In)';
        this.testTimer = setTimeout(() => { if (this.state === 'TESTING') this.completeNoTrip(type, peakCurrent); }, Math.min(tripDelayMs, 3600000));
        if (this.onStateChange) this.onStateChange(); return;
      }
      tripDelayMs = Math.min(this.testConfig.durationSec * 1000, 3600000);
    } else if (type === 'INSTANTANEOUS' || type === 'SHORT_CIRCUIT') {
      if (iRatio >= curveBand.max) tripDelayMs = 7 + Math.random() * 8;
      else if (iRatio >= curveBand.min) tripDelayMs = 12 + Math.random() * 18;
      else {
        tripDelayMs = this.testConfig.durationSec * 1000;
        this.statusText = 'TEST RUNNING: ' + type.replaceAll('_', ' ') + ' NO-TRIP CHECK (' + this.telemetry.current + ' A, ' + iRatio.toFixed(2) + 'x In)';
        this.testTimer = setTimeout(() => { if (this.state === 'TESTING') this.completeNoTrip(type, peakCurrent); }, Math.min(tripDelayMs, 3600000));
        if (this.onStateChange) this.onStateChange(); return;
      }
    } else if (type === 'BREAKING_CAPACITY') { tripDelayMs = 12 + Math.random() * 18; }
    this.statusText = 'TEST RUNNING: ' + type.replaceAll('_', ' ') + ' (' + this.telemetry.current + ' A, ' + iRatio.toFixed(2) + 'x In, PF ' + this.powerFactor.toFixed(3) + ')';
    if (this.onStateChange) this.onStateChange();
    this.testTimer = setTimeout(() => { if (this.state === 'TESTING') this.tripDUT(tripDelayMs, peakCurrent, type); }, Math.min(tripDelayMs, 3600000));
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

    // 7. Evaluate and store complete test report
    this.testEvaluation = this.evaluateTestResult({ tripped: true, testType, current: faultCurrent, tripTimeMs });
    this.lastTestReport = {
      testType: testType || `PATH ${this.activePath} TEST`,
      pathId: this.activePath,
      mcbRating: `${this.dutConfig.ratedCurrent} A (Type ${this.dutConfig.curve})`,
      poles: this.dutConfig.poles,
      source: this.sourceTelemetry.type,
      sourceOutputVoltage: `${this.sourceTelemetry.outputVoltage.toFixed(1)} V`,
      sourceOutputCurrent: `${this.sourceTelemetry.outputCurrent.toFixed(0)} A`,
      appliedVoltage: `${this.telemetry.voltage.toFixed(1)} V`,
      faultCurrentRms: `${faultCurrent.toFixed(1)} A`,
      peakCurrentIp: `${(peakCurrent >= 1000 ? (peakCurrent / 1000).toFixed(2) + ' kA' : peakCurrent.toFixed(0) + ' A')}`,
      tripTime: `${tripTimeMs.toFixed(1)} ms`,
      letThroughEnergy: `${i2t.toLocaleString()} A²s`,
      arcVoltage: `${arcV} V`,
      rSetting: `${this.R} Ω`,
      xlSetting: `${this.XL} mH`,
      impedance: `${this.impedance.toFixed(3)} Ω`,
      currentRatio: `${(faultCurrent / Math.max(this.dutConfig.ratedCurrent, 0.1)).toFixed(2)} x In`,
      powerFactor: this.powerFactor.toFixed(3),
      expectedResult: this.testEvaluation.expected,
      result: this.testEvaluation.status,
      resultReason: this.testEvaluation.reason,
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
