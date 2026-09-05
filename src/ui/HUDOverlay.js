import * as THREE from 'three';
import { soundFx } from '../audio/SoundEffects.js';

/**
 * Heads-Up Display Overlay & Interaction Controller
 * Manages DOM updates, live telemetry, oscilloscope waveform drawing,
 * camera preset transitions, and the component inspection drawer.
 */
export class HUDOverlay {
  constructor(simulationEngine, cameraController, hmiScreen) {
    this.sim = simulationEngine;
    this.camCtrl = cameraController;
    this.hmiScreen = hmiScreen;

    this.selectedComponent = null;

    // DOM Elements Cache
    this.dom = {
      fpsVal: document.getElementById('hud-fps-val'),
      modeText: document.getElementById('hud-mode-text'),
      modeDot: document.querySelector('#hud-mode-pill .status-dot'),
      doorText: document.getElementById('hud-door-text'),
      metricVoltage: document.getElementById('metric-voltage'),
      barVoltage: document.getElementById('bar-voltage'),
      metricCurrent: document.getElementById('metric-current'),
      barCurrent: document.getElementById('bar-current'),
      metricTemp: document.getElementById('metric-temp'),
      barTemp: document.getElementById('bar-temp'),
      metricArc: document.getElementById('metric-arc'),
      barArc: document.getElementById('bar-arc'),
      valActivePath: document.getElementById('val-active-path'),
      valRxSetting: document.getElementById('val-rx-setting'),
      valDutState: document.getElementById('val-dut-state'),
      valTripTime: document.getElementById('val-trip-time'),
      waveformCanvas: document.getElementById('waveform-canvas'),
      // Buttons
      btnStart: document.getElementById('hud-btn-start'),
      btnStop: document.getElementById('hud-btn-stop'),
      btnEstop: document.getElementById('hud-btn-estop'),
      btnToggleDoors: document.getElementById('btn-toggle-doors'),
      labelToggleDoors: document.getElementById('label-toggle-doors'),
      sliderExploded: document.getElementById('slider-exploded'),
      explodedValText: document.getElementById('exploded-val-text'),
      btnResetCam: document.getElementById('btn-reset-cam'),
      btnToggleWireFlow: document.getElementById('btn-toggle-wire-flow'),
      // Inspector
      inspectorDrawer: document.getElementById('component-inspector'),
      inspectorName: document.getElementById('inspector-name'),
      inspectorCategory: document.getElementById('inspector-category'),
      inspectorDesc: document.getElementById('inspector-desc'),
      inspectorMfr: document.getElementById('inspector-mfr'),
      inspectorVoltage: document.getElementById('inspector-voltage'),
      inspectorTier: document.getElementById('inspector-tier'),
      inspectorState: document.getElementById('inspector-state'),
      btnCloseInspector: document.getElementById('btn-close-inspector'),
      btnInspectorFocus: document.getElementById('btn-inspector-focus'),
      btnInspectorAction: document.getElementById('btn-inspector-action'),
      // Modal
      hmiModal: document.getElementById('hmi-modal'),
      btnCloseHmiModal: document.getElementById('btn-close-hmi-modal'),
      directCanvas: document.getElementById('hmi-direct-canvas')
    };

    this.initEventListeners();
    this.initCameraPresets();
    this.initWaveformCanvas();

    if (this.hmiScreen && this.dom.directCanvas) {
      this.hmiScreen.setDirectCanvas(this.dom.directCanvas);
    }
  }

  initEventListeners() {
    // Start / Stop / E-Stop
    this.dom.btnStart.addEventListener('click', () => {
      soundFx.playBeep(1400);
      this.sim.startTest();
      this.hmiScreen.render();
    });

    this.dom.btnStop.addEventListener('click', () => {
      soundFx.playBeep(900);
      this.sim.stopTest();
      this.hmiScreen.render();
    });

    this.dom.btnEstop.addEventListener('click', () => {
      if (this.sim.state === 'FAULT') {
        this.sim.resetEmergencyStop();
      } else {
        this.sim.triggerEmergencyStop();
      }
      this.hmiScreen.render();
    });

    // Enclosure Door Toggle
    this.dom.btnToggleDoors.addEventListener('click', () => {
      this.sim.toggleDoors();
      this.dom.btnToggleDoors.classList.toggle('active', this.sim.doorsOpen);
      this.dom.labelToggleDoors.textContent = this.sim.doorsOpen ? 'Close Front Doors' : 'Open Front Doors';
      this.dom.doorText.textContent = this.sim.doorsOpen ? 'CHAMBER OPEN' : 'EXTERNAL FRONT';
    });

    // Exploded Slider
    this.dom.sliderExploded.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.dom.explodedValText.textContent = `${val}%`;
      this.sim.setExploded(val / 100);
    });

    // Reset Camera
    this.dom.btnResetCam.addEventListener('click', () => {
      this.camCtrl.setPreset('front');
    });

    // Wire flow button (toggle manual test pulse)
    this.dom.btnToggleWireFlow.addEventListener('click', () => {
      soundFx.playSwitchClick(1.2);
      if (this.sim.state === 'IDLE') {
        this.sim.startTest();
      } else {
        this.sim.stopTest();
      }
    });

    // Inspector Close
    this.dom.btnCloseInspector.addEventListener('click', () => {
      this.closeInspector();
    });

    // Inspector Focus
    this.dom.btnInspectorFocus.addEventListener('click', () => {
      if (this.selectedComponent && this.selectedComponent.position) {
        soundFx.playBeep(1200);
        this.camCtrl.focusOnPoint(this.selectedComponent.position);
      }
    });

    // Inspector Action (e.g. cycle knob or toggle)
    this.dom.btnInspectorAction.addEventListener('click', () => {
      if (!this.selectedComponent) return;
      const ud = this.selectedComponent.userData || {};
      if (ud.type === 'INPUT_MCB_KNOB') {
        this.sim.toggleInputMCB(ud.pathId);
      } else if (ud.type === 'RXL_BANK') {
        this.sim.cycleResistance();
      } else if (ud.type === 'EMERGENCY_STOP') {
        this.sim.triggerEmergencyStop();
      } else if (ud.type === 'CHAMBER_DOOR_HANDLE') {
        this.sim.toggleDoors();
      }
    });

    // HMI Modal Close
    this.dom.btnCloseHmiModal.addEventListener('click', () => {
      this.dom.hmiModal.classList.add('hidden');
    });
  }

  initCameraPresets() {
    const presets = [
      { id: 'btn-view-front', name: 'front' },
      { id: 'btn-view-internal', name: 'internal' },
      { id: 'btn-view-dut', name: 'dut' },
      { id: 'btn-view-paths', name: 'paths' },
      { id: 'btn-view-sensors', name: 'sensors' },
      { id: 'btn-view-controls', name: 'controls' },
      { id: 'btn-view-left', name: 'left' },
      { id: 'btn-view-right', name: 'right' },
      { id: 'btn-view-top', name: 'top' }
    ];

    presets.forEach(p => {
      const btn = document.getElementById(p.id);
      if (btn) {
        btn.addEventListener('click', () => {
          soundFx.playBeep(1100);
          presets.forEach(o => {
            const b = document.getElementById(o.id);
            if (b) b.classList.remove('active');
          });
          btn.classList.add('active');
          this.camCtrl.setPreset(p.name);
        });
      }
    });
  }

  initWaveformCanvas() {
    this.wCtx = this.dom.waveformCanvas.getContext('2d');
  }

  showInspector(obj) {
    this.selectedComponent = obj;
    const ud = obj.userData || {};

    this.dom.inspectorName.textContent = ud.name || 'Industrial Electrical Component';
    this.dom.inspectorCategory.textContent = ud.category || 'Machinery Subassembly';
    this.dom.inspectorDesc.textContent = ud.desc || 'Precision sub-tier component integrated within the automated testing system.';

    this.dom.inspectorMfr.textContent = ud.mfr || 'Industrial IEC Grade';
    this.dom.inspectorVoltage.textContent = ud.voltage || '230V / 24V DC';
    this.dom.inspectorTier.textContent = ud.tier || (obj.position.z > 0 ? 'External Front Assembly' : 'Internal Architecture');
    this.dom.inspectorState.textContent = this.sim.state === 'TESTING' ? 'ENERGIZED / TESTING' : 'NORMAL / STANDBY';

    this.dom.inspectorDrawer.classList.remove('hidden');
    soundFx.playBeep(1300);
  }

  closeInspector() {
    this.dom.inspectorDrawer.classList.add('hidden');
    this.selectedComponent = null;
  }

  openHMIModal() {
    this.dom.hmiModal.classList.remove('hidden');
    if (this.hmiScreen) this.hmiScreen.render();
  }

  update(fps) {
    // 1. Update FPS
    this.dom.fpsVal.textContent = `${Math.round(fps)} FPS`;

    // 2. Status Mode
    this.dom.modeText.textContent = this.sim.statusText;
    this.dom.modeDot.className = 'status-dot';
    if (this.sim.state === 'IDLE') this.dom.modeDot.classList.add('green');
    else if (this.sim.state === 'TESTING') this.dom.modeDot.classList.add('blue');
    else if (this.sim.state === 'TRIPPED') this.dom.modeDot.classList.add('amber');
    else if (this.sim.state === 'FAULT') this.dom.modeDot.classList.add('red');

    // 3. Telemetry Readouts
    this.dom.metricVoltage.innerHTML = `${this.sim.telemetry.voltage.toFixed(1)} <span class="unit">V</span>`;
    this.dom.barVoltage.style.width = `${Math.min((this.sim.telemetry.voltage / 300) * 100, 100)}%`;

    this.dom.metricCurrent.innerHTML = `${this.sim.telemetry.current.toFixed(1)} <span class="unit">A</span>`;
    this.dom.barCurrent.style.width = `${Math.min((this.sim.telemetry.current / 100) * 100, 100)}%`;

    this.dom.metricTemp.innerHTML = `${this.sim.telemetry.temperature.toFixed(1)} <span class="unit">&deg;C</span>`;
    this.dom.barTemp.style.width = `${Math.min(((this.sim.telemetry.temperature - 20) / 60) * 100, 100)}%`;

    this.dom.metricArc.innerHTML = `${this.sim.telemetry.arcIntensity.toFixed(1)} <span class="unit">lx</span>`;
    this.dom.barArc.style.width = `${Math.min((this.sim.telemetry.arcIntensity / 500) * 100, 100)}%`;

    // 4. Impedance & DUT Status
    this.dom.valRxSetting.textContent = `R = ${this.sim.R.toFixed(2)} \u03A9 | XL = ${this.sim.XL.toFixed(1)} mH`;
    
    if (this.sim.dutState === 'TRIPPED') {
      this.dom.valDutState.textContent = 'TRIPPED (OPEN)';
      this.dom.valDutState.className = 'text-amber';
    } else {
      this.dom.valDutState.textContent = 'NORMAL (CLOSED)';
      this.dom.valDutState.className = 'text-green';
    }

    if (this.sim.telemetry.tripTimeMs) {
      this.dom.valTripTime.textContent = `${this.sim.telemetry.tripTimeMs} ms`;
    } else {
      this.dom.valTripTime.textContent = '\u2014 ms';
    }

    // 5. Draw live waveform
    this.drawWaveform();
  }

  drawWaveform() {
    const ctx = this.wCtx;
    const w = this.dom.waveformCanvas.width;
    const h = this.dom.waveformCanvas.height;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const history = this.sim.waveformHistory;
    if (!history || history.length < 2) return;

    const midY = h / 2;

    // Voltage waveform (Blue line)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = (i / (history.length - 1)) * w;
      const y = midY - (history[i].v / 400) * (midY * 0.85);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current waveform (Amber / Red line)
    ctx.strokeStyle = this.sim.state === 'TESTING' ? '#f59e0b' : '#334155';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = (i / (history.length - 1)) * w;
      const y = midY - (history[i].i / 100) * (midY * 0.85);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
