import * as THREE from 'three';
import { MCBSimulationEngine } from '../simulation/MCBSimulationEngine.js';
import { InternalRack } from '../models/InternalRack.js';

const installed = Symbol('customMCBArchitectureInstalled');

export function installCustomMCBArchitecture() {
  if (MCBSimulationEngine.prototype[installed]) return;
  MCBSimulationEngine.prototype[installed] = true;

  const ensureArchitecture = (sim) => {
    if (sim.customArchitecture) return sim.customArchitecture;
    sim.customArchitecture = {
      selectedPath: 1,
      pathStates: {
        1: { transformer: 'HIGH_CURRENT_TRANSFORMER', diode: 'D1', switch: 'HIGH_POWER_TEST_SWITCH', active: false },
        2: { transformer: 'VOLTAGE_TRANSFORMER', diode: 'D2', switch: 'VOLTAGE_TEST_SWITCH', active: false },
        3: { transformer: null, diode: 'D3', switch: 'SHORT_CIRCUIT_LIVE_SWITCH', active: false },
        4: { transformer: null, diode: 'D4', switch: 'SHORT_CIRCUIT_NEUTRAL_SWITCH', active: false }
      },
      commonRXL: true,
      sensorStage1: [1, 2, 3, 4].map(path => ({ path, voltage: 0, current: 0, active: false })),
      sensorStage2: [1, 2, 3, 4].map(path => ({ path, voltage: 0, current: 0, active: false })),
      dutSensors: { temperature: 24.5, arc: 0, acoustic: 35, outputVoltage: 230.4, outputCurrent: 0 },
      plcState: 'IDLE',
      daqState: 'IDLE'
    };
    return sim.customArchitecture;
  };

  const resetPathStates = (sim) => {
    const a = ensureArchitecture(sim);
    Object.values(a.pathStates).forEach(p => p.active = false);
    a.sensorStage1.forEach(s => { s.active = false; s.voltage = 0; s.current = 0; });
    a.sensorStage2.forEach(s => { s.active = false; s.voltage = 0; s.current = 0; });
  };

  const originalSelectPath = MCBSimulationEngine.prototype.selectPath;
  MCBSimulationEngine.prototype.selectPath = function(pathId) {
    const result = originalSelectPath.call(this, pathId);
    const a = ensureArchitecture(this);
    if (pathId >= 1 && pathId <= 4) {
      a.selectedPath = pathId;
      resetPathStates(this);
      a.plcState = 'PATH SELECTION';
      a.daqState = 'READY';
    }
    return result;
  };

  const originalStartTest = MCBSimulationEngine.prototype.startTest;
  MCBSimulationEngine.prototype.startTest = function() {
    const a = ensureArchitecture(this);
    a.plcState = 'SAFETY CHECK';
    a.daqState = 'ARMED';
    resetPathStates(this);
    const path = a.selectedPath;
    a.pathStates[path].active = true;
    a.sensorStage1[path - 1].active = true;
    a.sensorStage2[path - 1].active = true;
    return originalStartTest.call(this);
  };

  const originalExecute = MCBSimulationEngine.prototype.executeEnergizedTest;
  MCBSimulationEngine.prototype.executeEnergizedTest = function() {
    const a = ensureArchitecture(this);
    const path = a.selectedPath;
    a.plcState = 'TEST';
    a.daqState = 'ACQUIRING';
    a.pathStates[path].active = true;
    a.sensorStage1[path - 1].active = true;
    a.sensorStage2[path - 1].active = true;

    const result = originalExecute.call(this);

    const s1 = a.sensorStage1[path - 1];
    const s2 = a.sensorStage2[path - 1];
    s1.voltage = this.telemetry.voltage;
    s1.current = this.telemetry.current;
    s2.voltage = this.telemetry.voltage;
    s2.current = this.telemetry.current;
    a.dutSensors.outputVoltage = this.telemetry.voltage;
    a.dutSensors.outputCurrent = this.telemetry.current;
    return result;
  };

  const originalTrip = MCBSimulationEngine.prototype.tripDUT;
  MCBSimulationEngine.prototype.tripDUT = function(...args) {
    const result = originalTrip.apply(this, args);
    const a = ensureArchitecture(this);
    a.plcState = 'TRIP DETECTION';
    a.daqState = 'CAPTURE COMPLETE';
    a.dutSensors.temperature = this.telemetry.temperature;
    a.dutSensors.arc = this.telemetry.arcIntensity;
    a.dutSensors.acoustic = this.telemetry.acousticDb;
    a.dutSensors.outputVoltage = this.telemetry.voltage;
    a.dutSensors.outputCurrent = this.telemetry.current;
    return result;
  };

  const originalStop = MCBSimulationEngine.prototype.stopTest;
  MCBSimulationEngine.prototype.stopTest = function() {
    const result = originalStop.call(this);
    const a = ensureArchitecture(this);
    resetPathStates(this);
    a.plcState = 'IDLE';
    a.daqState = 'IDLE';
    return result;
  };

  const originalEStop = MCBSimulationEngine.prototype.triggerEmergencyStop;
  MCBSimulationEngine.prototype.triggerEmergencyStop = function() {
    const result = originalEStop.call(this);
    const a = ensureArchitecture(this);
    resetPathStates(this);
    a.plcState = 'EMERGENCY STOP / SAFE';
    a.daqState = 'ABORTED';
    return result;
  };

  const originalReset = MCBSimulationEngine.prototype.resetEmergencyStop;
  MCBSimulationEngine.prototype.resetEmergencyStop = function() {
    const result = originalReset.call(this);
    const a = ensureArchitecture(this);
    resetPathStates(this);
    a.plcState = 'IDLE';
    a.daqState = 'IDLE';
    return result;
  };

  // Extend the existing Stage-2 construction with the missing fourth physical sensor assembly.
  const originalStage2 = InternalRack.prototype.initSensorStage2AndSwitching;
  InternalRack.prototype.initSensorStage2AndSwitching = function() {
    originalStage2.call(this);

    const grp = this.assemblies.stage2AndSwitching;
    if (!grp || grp.userData?.customStage2Path4Added) return;

    const sensor = new THREE.Group();
    sensor.name = 'Sensor Stage 2 — Path 4';
    sensor.position.set(2.05, -1.8, -0.28);

    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.72, 0.08),
      this.pcbGreenMat
    );
    sensor.add(pcb);

    const voltageModule = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.36, 0.10),
      this.voltSensorMat
    );
    voltageModule.position.set(-0.16, 0.03, 0.08);
    sensor.add(voltageModule);

    const currentModule = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.36, 0.10),
      this.currSensorMat
    );
    currentModule.position.set(0.16, 0.03, 0.08);
    sensor.add(currentModule);

    for (let i = 0; i < 4; i++) {
      const terminal = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.12, 0.07),
        this.brassMat
      );
      terminal.position.set(-0.21 + i * 0.14, -0.27, 0.08);
      sensor.add(terminal);
    }

    sensor.userData = {
      type: 'SENSOR_STAGE_2',
      pathId: 4,
      name: 'Sensor Stage 2 — Path 4',
      category: 'Voltage + Current Sensing',
      desc: 'Physical Stage 2 voltage and current measurement assembly for the Short-Circuit Neutral pathway.'
    };

    grp.add(sensor);
    this.interactiveObjects.push(sensor);
    grp.userData = { customStage2Path4Added: true };
  };
}
