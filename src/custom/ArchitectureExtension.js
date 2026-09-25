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
    // The base engine rejects path changes while VERIFYING/TESTING. Do not
    // update the extension's mirrored path state when that interlock rejects
    // the request, otherwise the PLC/DAQ mirror can desynchronize from activePath.
    if (pathId >= 1 && pathId <= 4 && this.activePath === pathId) {
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

}
