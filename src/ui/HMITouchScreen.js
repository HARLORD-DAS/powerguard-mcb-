import * as THREE from 'three';
import { soundFx } from '../audio/SoundEffects.js';

/**
 * Interactive HMI Touch Display Engine
 * Renders a dynamic, clickable 10-inch industrial touchscreen UI onto a Three.js CanvasTexture,
 * and synchronizes with the direct 2D canvas modal.
 */
export class HMITouchScreen {
  constructor(simulationEngine) {
    this.sim = simulationEngine;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 680;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 8;

    this.activeTab = 'DASHBOARD'; // DASHBOARD, TEST CONFIG, LIVE MONITORING, WAVEFORMS, RESULTS, REPORTS, HISTORY, SETTINGS, DIAGNOSTICS
    this.hoverBtn = null;

    this.buttons = [];
    this.directCanvas = null;

    this.initButtons();
    this.render();
  }

  initButtons() {
    this.buttons = [];

    // Top 3x3 navigation button grid (Matching Reference 1 exactly)
    const tabs = [
      ['DASHBOARD', 'TEST CONFIG', 'LIVE MONITORING'],
      ['WAVEFORMS', 'RESULTS', 'REPORTS'],
      ['HISTORY', 'SETTINGS', 'DIAGNOSTICS']
    ];

    const startX = 60;
    const startY = 120;
    const btnW = 280;
    const btnH = 80;
    const gapX = 30;
    const gapY = 20;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const title = tabs[r][c];
        const x = startX + c * (btnW + gapX);
        const y = startY + r * (btnH + gapY);
        this.buttons.push({
          id: title,
          type: 'tab',
          x, y, w: btnW, h: btnH,
          label: title
        });
      }
    }

    // Bottom Primary Action Buttons
    // Green "START TEST"
    this.buttons.push({
      id: 'START_TEST',
      type: 'action',
      x: 80, y: 520, w: 380, h: 100,
      label: 'START TEST',
      color: '#059669',
      hoverColor: '#10b981'
    });

    // Red "STOP"
    this.buttons.push({
      id: 'STOP_TEST',
      type: 'action',
      x: 560, y: 520, w: 380, h: 100,
      label: 'STOP',
      color: '#dc2626',
      hoverColor: '#ef4444'
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - Dark High-Tech Blue Industrial Screen
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c1626');
    bgGrad.addColorStop(1, '#060a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Screen border glow
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // --- Header Bar ---
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 4, w - 8, 65);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 70); ctx.lineTo(w - 4, 70);
    ctx.stroke();

    // HMI Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 24px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MCB TESTING SYSTEM', 30, 42);

    // System Status Pill in Header
    const statusText = this.sim ? this.sim.statusText : 'IDLE';
    let statusBg = '#059669';
    if (statusText.includes('TESTING')) statusBg = '#2563eb';
    else if (statusText.includes('TRIP')) statusBg = '#d97706';
    else if (statusText.includes('FAULT')) statusBg = '#dc2626';

    ctx.fillStyle = statusBg;
    ctx.beginPath();
    ctx.roundRect(750, 18, 200, 34, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 850, 40);

    // Help "?" Icon
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(980, 35, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText('?', 980, 41);

    // --- Tab Navigation Grid (3x3) ---
    this.buttons.forEach(btn => {
      if (btn.type === 'tab') {
        const isActive = this.activeTab === btn.label;
        const isHover = this.hoverBtn === btn.id;

        // Button background
        if (isActive) {
          ctx.fillStyle = '#1e40af';
          ctx.strokeStyle = '#60a5fa';
        } else if (isHover) {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#38bdf8';
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#1e3a8a';
        }

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
        ctx.fill();
        ctx.stroke();

        // Icon simulation (circle with target)
        ctx.strokeStyle = isActive ? '#93c5fd' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(btn.x + 35, btn.y + btn.h / 2, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(btn.x + 35, btn.y + btn.h / 2, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(btn.label, btn.x + 65, btn.y + btn.h / 2 + 6);
      }
    });

    // --- Sub-View / System Status Strip ---
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(60, 435, 904, 60);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 435, 904, 60);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SYSTEM STATUS:', 90, 472);

    ctx.fillStyle = statusBg;
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText(statusText, 250, 472);

    // Active Profile / Param summary
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    const curVal = this.sim ? this.sim.telemetry.current.toFixed(1) : '16.0';
    const voltVal = this.sim ? this.sim.telemetry.voltage.toFixed(1) : '230.0';
    ctx.fillText(`V: ${voltVal}V | I: ${curVal}A | 50Hz | CLASS C`, 930, 472);

    // --- Bottom Primary Action Buttons (START TEST / STOP) ---
    this.buttons.forEach(btn => {
      if (btn.type === 'action') {
        const isHover = this.hoverBtn === btn.id;
        ctx.fillStyle = isHover ? btn.hoverColor : btn.color;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 10);
      }
    });

    this.texture.needsUpdate = true;

    // Mirror to direct modal canvas if available
    if (this.directCanvas) {
      const dCtx = this.directCanvas.getContext('2d');
      dCtx.drawImage(this.canvas, 0, 0, this.directCanvas.width, this.directCanvas.height);
    }
  }

  handleCanvasClick(x, y) {
    // Check buttons
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        soundFx.playBeep(btn.type === 'action' ? 1400 : 1100);

        if (btn.type === 'tab') {
          this.activeTab = btn.label;
        } else if (btn.id === 'START_TEST') {
          if (this.sim) this.sim.startTest();
        } else if (btn.id === 'STOP_TEST') {
          if (this.sim) this.sim.stopTest();
        }
        this.render();
        return true;
      }
    }
    return false;
  }

  handleDirectCanvasClick(evt) {
    if (!this.directCanvas) return;
    const rect = this.directCanvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;
    this.handleCanvasClick(x, y);
  }

  setDirectCanvas(canvasElement) {
    this.directCanvas = canvasElement;
    if (this.directCanvas) {
      this.directCanvas.addEventListener('click', (e) => this.handleDirectCanvasClick(e));
      this.render();
    }
  }
}
