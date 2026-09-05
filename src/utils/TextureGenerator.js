import * as THREE from 'three';

/**
 * Procedural High-Resolution Vector Texture Generator
 * Exactly replicates all labels, faceplates, dials, PCB silkscreens,
 * and industrial markings from the uploaded Master Reference Image.
 */
export class TextureGenerator {

  // -------------------------------------------------------------
  // 1. MASTER INTERNAL BACKPLATE TEXTURE (Full Cabinet Layout)
  // -------------------------------------------------------------
  static createTestingPathsBackplateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 3072;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Dark industrial powder-coated chassis backplate
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle metallic plate seams & sub-panels
    ctx.strokeStyle = '#0f1115';
    ctx.lineWidth = 6;

    // Helper: Draw beveled sub-panel
    const drawSubPanel = (x, y, w, h, title = null, subtitle = null) => {
      // Panel background
      ctx.fillStyle = '#181b20';
      ctx.fillRect(x, y, w, h);

      // Bevel border
      ctx.strokeStyle = '#282d35';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      ctx.strokeStyle = '#0e1013';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Corner Allen/hex screws
      ctx.fillStyle = '#475569';
      const drawHexScrew = (sx, sy) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#475569';
      };
      drawHexScrew(x + 16, y + 16);
      drawHexScrew(x + w - 16, y + 16);
      drawHexScrew(x + 16, y + h - 16);
      drawHexScrew(x + w - 16, y + h - 16);

      // Title header if provided
      if (title) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, x + w / 2, y + 36);

        if (subtitle) {
          ctx.font = '500 16px Inter, sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(subtitle, x + w / 2, y + 60);
        }
      }
    };

    // --- TOP ROW: 4 BAYS ---
    // Bay 1: Control Power Supply (X: 30 to 760, Y: 25 to 380)
    drawSubPanel(30, 25, 730, 360, 'CONTROL POWER SUPPLY');
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('STEP DOWN TRANSFORMER', 160, 85);
    ctx.fillText('RECTIFIER', 450, 85);
    ctx.fillText('REGULATOR', 630, 85);

    // Bay 2: PLC (Siemens S7-1200) (X: 780 to 1640, Y: 25 to 380)
    drawSubPanel(780, 25, 860, 360, 'PLC (SIEMENS S7-1200)');

    // Bay 3: High Speed DAQ (X: 1660 to 2260, Y: 25 to 380)
    drawSubPanel(1660, 25, 600, 360, 'HIGH SPEED DAQ');

    // Bay 4: Communication Modules (X: 2280 to 3040, Y: 25 to 380)
    drawSubPanel(2280, 25, 760, 360, 'COMMUNICATION MODULES');
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Wi-Fi', 2420, 85);
    ctx.fillText('Bluetooth', 2660, 85);
    ctx.fillText('LAN (Ethernet)', 2900, 85);

    // --- MIDDLE SECTION (THE 4 PATHS + R/XL + SWITCHING + DUT) ---
    // Left Testing Paths Area: 4 Horizontal Rows (Y: 410 to 1570)
    const pathStartY = 410;
    const pathHeight = 280;
    const pathGap = 10;

    const pathBadges = [
      { num: '1', name: 'HIGH\nCURRENT\nPATH', bg: '#047857', border: '#10b981' },
      { num: '2', name: 'VOLTAGE\nPATH', bg: '#b45309', border: '#f59e0b' },
      { num: '3', name: 'SHORT CIRCUIT\n- LIVE\nPATH', bg: '#1d4ed8', border: '#3b82f6' },
      { num: '4', name: 'SHORT CIRCUIT\n- NEUTRAL\nPATH', bg: '#b91c1c', border: '#ef4444' }
    ];

    for (let i = 0; i < 4; i++) {
      const py = pathStartY + i * (pathHeight + pathGap);

      // Row background tray
      ctx.fillStyle = '#16191f';
      ctx.fillRect(30, py, 1400, pathHeight);
      ctx.strokeStyle = '#252a33';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, py, 1400, pathHeight);

      // Left Badge (Center X = -6.15 -> Pixel X = 205)
      const badge = pathBadges[i];
      ctx.fillStyle = badge.bg;
      ctx.fillRect(40, py + 15, 120, pathHeight - 30);
      ctx.strokeStyle = badge.border;
      ctx.lineWidth = 4;
      ctx.strokeRect(40, py + 15, 120, pathHeight - 30);

      // Badge Number
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 56px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badge.num, 100, py + 85);

      // Badge Name
      ctx.font = 'bold 15px Inter, sans-serif';
      const lines = badge.name.split('\n');
      lines.forEach((l, lIdx) => {
        ctx.fillText(l, 100, py + 130 + lIdx * 22);
      });

      // Text labels above components in each row (Exactly aligned with 3D components)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';

      // 1. Input MCB (3D X = -5.4 -> Pixel X = 368)
      ctx.fillText('INPUT MCB', 368, py + 26);
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('(1P DIN MCB)', 368, py + 42);

      // 2. Transformer (3D X = -4.3 -> Pixel X = 606)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 13px Inter, sans-serif';
      if (i === 0) {
        ctx.fillText('HIGH CURRENT', 606, py + 26);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TRANSFORMER', 606, py + 42);
      } else if (i === 1) {
        ctx.fillText('VOLTAGE', 606, py + 26);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TRANSFORMER', 606, py + 42);
      }

      // 3. Sensor Stage 1 (Paths 1 & 2 at Pixel X = 887, Paths 3 & 4 at Pixel X = 670)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 13px Inter, sans-serif';
      if (i === 2) {
        ctx.fillText('SENSOR STAGE 1', 670, py + 26);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('(VOLTAGE + CURRENT)', 670, py + 42);
        ctx.fillText('(LIVE CONDUCTOR)', 670, py + 56);
      } else if (i === 3) {
        ctx.fillText('SENSOR STAGE 1', 670, py + 26);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('(VOLTAGE + CURRENT)', 670, py + 42);
        ctx.fillText('(NEUTRAL CONDUCTOR)', 670, py + 56);
      } else {
        ctx.fillText('SENSOR STAGE 1', 887, py + 26);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('(VOLTAGE + CURRENT)', 887, py + 42);
      }

      // 4. Diode 1 (3D X = -1.8 -> Pixel X = 1146)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('DIODE 1', 1146, py + 26);

      // 5. Diode 2 (3D X = -1.0 -> Pixel X = 1320)
      ctx.fillText('DIODE 2', 1320, py + 26);
    }

    // Center Column: Common R/XL Configuration Bank (3D X = 0.35 -> Pixel X = 1440 to 1780)
    drawSubPanel(1440, 410, 340, 1150, 'COMMON R / XL', 'CONFIGURATION BANK\n(PROGRAMMABLE IMPEDANCE)');

    // Next Column: Sensor Stage 2 (3D X = 2.05 -> Pixel X = 1800 to 2160)
    drawSubPanel(1800, 410, 360, 1150, 'SENSOR STAGE 2', '(AFTER R / XL)\n(VOLTAGE + CURRENT)');

    // Next Column: High Power Test Switching (3D X = 3.3 -> Pixel X = 2180 to 2520)
    drawSubPanel(2180, 410, 340, 1150, 'HIGH POWER', 'TEST SWITCHING');
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH CURRENT TEST SWITCH', 2350, 520);
    ctx.fillText('VOLTAGE TEST SWITCH', 2350, 810);
    ctx.fillText('SHORT CIRCUIT LIVE SWITCH', 2350, 1100);
    ctx.fillText('SHORT CIRCUIT NEUTRAL SWITCH', 2350, 1390);

    // Far Right: MCB Under Test (DUT) Station (3D X = 5.2 -> Pixel X = 2540 to 3040)
    drawSubPanel(2540, 410, 500, 1150, 'MCB UNDER TEST', '(DUT) STATION');

    // --- BOTTOM ROW: 4 BAYS (Y: 1600 to 2020) ---
    // Bay 1: Output Sensor System (X: 30 to 1050)
    drawSubPanel(30, 1600, 1020, 420, 'OUTPUT SENSOR SYSTEM (AFTER DUT)');
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.fillText('VOLTAGE SENSOR', 160, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 160, 1693);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('CURRENT SENSOR', 400, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 400, 1693);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('TEMPERATURE SENSOR', 670, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 670, 1693);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('ARC SENSOR', 920, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 920, 1693);

    // Bay 2: Data Acquisition & Measurement (X: 1070 to 1870)
    drawSubPanel(1070, 1600, 800, 420, 'DATA ACQUISITION & MEASUREMENT');
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH SPEED DAQ', 1200, 1678);

    ctx.fillText('CURRENT SHUNT', 1480, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 1480, 1693);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('VOLTAGE DIVIDER', 1720, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 1720, 1693);

    // Bay 3: Additional Measurement Modules (X: 1890 to 2470)
    drawSubPanel(1890, 1600, 580, 420, 'ADDITIONAL MEASUREMENT MODULES');
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.fillText('ACOUSTIC SENSOR', 2030, 1675);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(OUTPUT)', 2030, 1693);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('ISOLATION &', 2330, 1675);
    ctx.fillText('PROTECTION', 2330, 1693);

    // Bay 4: Earth / Grounding Bus (X: 2490 to 3040)
    drawSubPanel(2490, 1600, 550, 420, 'EARTH / GROUNDING BUS');
    // Earth symbol at bottom right
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(2960, 1940, 24, 0, Math.PI * 2);
    ctx.stroke();
    // 3 lines
    ctx.beginPath();
    ctx.moveTo(2945, 1934); ctx.lineTo(2975, 1934);
    ctx.moveTo(2950, 1941); ctx.lineTo(2970, 1941);
    ctx.moveTo(2955, 1948); ctx.lineTo(2965, 1948);
    // Vertical stem
    ctx.moveTo(2960, 1922); ctx.lineTo(2960, 1934);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // -------------------------------------------------------------
  // 2. COMMON R / XL PANEL TEXTURE (Rotary Dial Markings & Studs)
  // -------------------------------------------------------------
  static createRXLPanelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Dark grey brushed steel plate
    ctx.fillStyle = '#1c2026';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#2d333b';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Header Titles
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText('COMMON R / XL', canvas.width / 2, 80);
    ctx.font = '600 24px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CONFIGURATION BANK', canvas.width / 2, 120);
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('(PROGRAMMABLE IMPEDANCE)', canvas.width / 2, 155);

    // Helper: Draw Circular Dial Face
    const drawDialFace = (cy, label, unit) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 32px Inter, sans-serif';
      ctx.fillText(`${label} (${unit})`, canvas.width / 2, cy - 250);

      // Brass terminal markers 1 to 8 across top
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#d97706';
      for (let t = 1; t <= 8; t++) {
        const tx = 180 + (t - 1) * 94;
        ctx.fillText(`${t}`, tx, cy - 190);
        // Small terminal circle
        ctx.beginPath();
        ctx.arc(tx, cy - 165, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Outer dial ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, cy, 180, 0, Math.PI * 2);
      ctx.stroke();

      // Dial values: 0.11, 1, 10, 100, 1000
      const dialValues = [
        { val: '0.11', angle: Math.PI * 0.8 },
        { val: '1', angle: Math.PI * 0.6 },
        { val: '10', angle: Math.PI * 0.5 },
        { val: '100', angle: Math.PI * 0.4 },
        { val: '1000', angle: Math.PI * 0.2 }
      ];

      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f8fafc';
      dialValues.forEach(dv => {
        const rad = dv.angle - Math.PI / 2;
        const x = canvas.width / 2 + Math.cos(rad) * 230;
        const y = cy + Math.sin(rad) * 230;
        ctx.fillText(dv.val, x, y + 8);

        // Tick mark
        const tx1 = canvas.width / 2 + Math.cos(rad) * 175;
        const ty1 = cy + Math.sin(rad) * 175;
        const tx2 = canvas.width / 2 + Math.cos(rad) * 195;
        const ty2 = cy + Math.sin(rad) * 195;
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // Bottom terminal markers 1 to 8 across bottom
      ctx.fillStyle = '#d97706';
      for (let t = 1; t <= 8; t++) {
        const tx = 180 + (t - 1) * 94;
        ctx.fillText(`${t}`, tx, cy + 220);
        ctx.beginPath();
        ctx.arc(tx, cy + 195, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };

    // R Section (Top)
    drawDialFace(580, 'R', 'RESISTANCE Ω');

    // Separator line
    ctx.strokeStyle = '#2d333b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 1060);
    ctx.lineTo(canvas.width - 40, 1060);
    ctx.stroke();

    // XL Section (Bottom)
    drawDialFace(1520, 'XL', 'REACTANCE mH');

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // -------------------------------------------------------------
  // 3. SIEMENS SIMATIC S7-1200 PLC FACEPLATE TEXTURE
  // -------------------------------------------------------------
  static createSiemensPLCTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Siemens industrial dark casing
    ctx.fillStyle = '#2b313a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bevel edges & flaps
    ctx.fillStyle = '#1c2026';
    ctx.fillRect(0, 0, canvas.width, 65);
    ctx.fillRect(0, canvas.height - 65, canvas.width, 65);

    // Siemens classic turquoise bar
    ctx.fillStyle = '#00646e';
    ctx.fillRect(60, 85, 180, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SIEMENS', 150, 114);

    // SIMATIC S7-1200
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('SIMATIC', 270, 104);
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText('S7-1200', 270, 136);

    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CPU 1214C DC/DC/DC', 270, 164);
    ctx.fillText('6ES7 214-1AG40-0XB0', 270, 186);

    // Diagnostic LEDs
    const leds = [
      { label: 'RUN/STOP', color: '#10b981', y: 240 },
      { label: 'ERROR', color: '#334155', y: 285 },
      { label: 'MAINT', color: '#334155', y: 330 }
    ];

    leds.forEach(led => {
      ctx.beginPath();
      ctx.arc(80, led.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = led.color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(led.label, 105, led.y + 5);
    });

    // Digital I/O Status Bar grid
    ctx.fillStyle = '#1c2026';
    ctx.fillRect(450, 210, 520, 180);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(450, 210, 520, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('DI a: .0 .1 .2 .3 .4 .5 .6 .7', 470, 245);
    ctx.fillText('DQ a: .0 .1 .2 .3 .4 .5', 470, 310);
    ctx.fillText('PROFINET: 192.168.0.10 (ONLINE)', 470, 365);

    // Green simulated indicator dots
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(630 + i * 26, 241, 4, 0, Math.PI * 2);
      ctx.fillStyle = (i % 2 === 0) ? '#10b981' : '#334155';
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 4. ARC CONTAINMENT ZONE SHIELD TEXTURE (Yellow Caution Sign)
  // -------------------------------------------------------------
  static createArcShieldTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Crystal clear transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle clear border with rounded corners
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Yellow Hazard Caution Triangle
    const cy = 200;
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, cy - 80);
    ctx.lineTo(canvas.width / 2 + 85, cy + 60);
    ctx.lineTo(canvas.width / 2 - 85, cy + 60);
    ctx.closePath();
    ctx.fill();

    // Black Lightning Bolt inside triangle
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 + 6, cy - 50);
    ctx.lineTo(canvas.width / 2 - 20, cy);
    ctx.lineTo(canvas.width / 2 - 2, cy);
    ctx.lineTo(canvas.width / 2 - 15, cy + 45);
    ctx.lineTo(canvas.width / 2 + 20, cy - 5);
    ctx.lineTo(canvas.width / 2 + 2, cy - 5);
    ctx.closePath();
    ctx.fill();

    // "ARC CONTAINMENT ZONE" Text
    ctx.font = '900 32px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('ARC', canvas.width / 2, cy + 120);
    ctx.fillText('CONTAINMENT', canvas.width / 2, cy + 160);
    ctx.fillText('ZONE', canvas.width / 2, cy + 200);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 5. AXIAL POWER DIODE TEXTURE (Black body with silver band)
  // -------------------------------------------------------------
  static createDiodeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Black epoxy diode body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Silver cathode ring band on right side
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(180, 0, 35, canvas.height);

    // Part number silkscreen
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('1N5408', 90, 70);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 6. BLUE VOLTAGE SENSOR FACEPLATE
  // -------------------------------------------------------------
  static createVoltageSensorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    // Royal Blue Industrial Transducer Housing
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bevel frame
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Top terminal strip well (dark recess)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 12, canvas.width - 32, 60);

    // Bottom terminal strip well
    ctx.fillRect(16, canvas.height - 72, canvas.width - 32, 60);

    // 4 Brass terminal screw points top & bottom
    ctx.fillStyle = '#d97706';
    for (let i = 0; i < 4; i++) {
      const tx = 38 + i * 60;
      // Top screws
      ctx.beginPath();
      ctx.arc(tx, 42, 10, 0, Math.PI * 2);
      ctx.fill();
      // Bottom screws
      ctx.beginPath();
      ctx.arc(tx, canvas.height - 42, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Terminal labels
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.textAlign = 'center';
    ctx.fillText('L1', 38, 86);
    ctx.fillText('L2', 98, 86);
    ctx.fillText('L3', 158, 86);
    ctx.fillText('N', 218, 86);

    ctx.fillText('+V', 38, canvas.height - 84);
    ctx.fillText('-V', 98, canvas.height - 84);
    ctx.fillText('S1', 158, canvas.height - 84);
    ctx.fillText('S2', 218, canvas.height - 84);

    // Center Silkscreen
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px Inter, sans-serif';
    ctx.fillText('PROTOTYPE', canvas.width / 2, 145);
    ctx.font = '900 21px Inter, sans-serif';
    ctx.fillText('VOLTAGE SENSOR', canvas.width / 2, 172);

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#bfdbfe';
    ctx.fillText('0 - 500V AC/DC', canvas.width / 2, 208);
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText('2.5kV GALVANIC ISOLATION', canvas.width / 2, 228);

    // Green Power LED
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 268, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('ACTIVE', canvas.width / 2, 290);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 7. GREEN CURRENT SENSOR PCB TEXTURE
  // -------------------------------------------------------------
  static createCurrentSensorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    // Forest Green FR4 Soldermask
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Copper routing traces
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 40); ctx.lineTo(120, 160); ctx.lineTo(120, 240);
    ctx.moveTo(226, 40); ctx.lineTo(136, 160); ctx.lineTo(136, 240);
    ctx.moveTo(40, 340); ctx.lineTo(120, 260);
    ctx.moveTo(216, 340); ctx.lineTo(136, 260);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('HALL EFFECT', canvas.width / 2, 140);
    ctx.fillText('CURRENT SENSOR', canvas.width / 2, 168);
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#bbf7d0';
    ctx.fillText('ACS758 100A', canvas.width / 2, 210);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 8. MCB DUT SPECIFICATION LABEL TEXTURE
  // -------------------------------------------------------------
  static createDUTTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Off-white breaker face
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MCB UNDER TEST', canvas.width / 2, 60);

    ctx.font = '900 64px "JetBrains Mono", monospace';
    ctx.fillText('C16', canvas.width / 2, 140);

    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText('230V / 400V ~', canvas.width / 2, 190);
    ctx.fillText('10000A [3]', canvas.width / 2, 230);
    ctx.fillText('IEC 60898-1', canvas.width / 2, 270);

    // Indicator Window (Red / Green)
    ctx.fillStyle = '#10b981'; // Green for closed/ready
    ctx.fillRect(canvas.width / 2 - 40, 320, 80, 40);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeRect(canvas.width / 2 - 40, 320, 80, 40);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 9. CABINET VENTILATION LOUVERS TEXTURE
  // -------------------------------------------------------------
  static createCabinetLouversTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Dark grey powder-coat base
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stamped horizontal louver slots
    ctx.fillStyle = '#0a0c0e';
    for (let y = 80; y < canvas.height - 80; y += 38) {
      // Louver cutout shadow
      ctx.fillRect(80, y, 352, 16);
      // Top bevel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(80, y - 2, 352, 2);
      ctx.fillStyle = '#0a0c0e';
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // -------------------------------------------------------------
  // 10. DEDICATED PATHWAY INPUT MCB FACEPLATE SILKSCREEN (MATCHING USER REFERENCE)
  // -------------------------------------------------------------
  static createPathwayMCBTexture(pathId = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Flame-retardant industrial off-white thermoplastic casing
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle edge chamfer vignette
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#e2e8f0');
    grad.addColorStop(0.08, '#f8fafc');
    grad.addColorStop(0.92, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lateral parting lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // 1. UPPER SECTION: Toggle Lever Aperture Laser Markings
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('I - ON', canvas.width / 2, 38);

    // Red indicator dot for ON
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(canvas.width / 2 + 42, 33, 4, 0, Math.PI * 2);
    ctx.fill();

    // Toggle Slot Boundary (visual guide on texture)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(44, 48, canvas.width - 88, 140);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(48, 52, canvas.width - 96, 132);

    // OFF Marking below slot
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText('O - OFF', canvas.width / 2, 212);

    // Green indicator dot for OFF
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(canvas.width / 2 + 45, 207, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. MIDDLE SECTION: Mechanical Trip Status Window Marking
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 28, 226, 56, 32);

    // 3. LOWER SECTION: Brand, Rating & Certification (Exact match to Peytul reference)
    // Brand Logo Emblem: Orange square with angled cutout
    const logoX = canvas.width / 2 - 62;
    const logoY = 276;
    ctx.fillStyle = '#ea580c'; // Vibrant Industrial Orange
    ctx.fillRect(logoX, logoY, 26, 26);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(logoX + 7, logoY + 7, 12, 12);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(logoX + 11, logoY + 11, 8, 8);

    // Brand Name "Peytul"
    ctx.fillStyle = '#ea580c';
    ctx.font = '900 24px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Peytul', logoX + 34, logoY + 22);

    // Breaker Model Series
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CDB6-63  1P`, canvas.width / 2, 322);

    // Rating (Bold prominent C63, C16, C32)
    const rating = pathId === 1 ? 'C63' : (pathId === 2 ? 'C16' : 'C32');
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 52px "JetBrains Mono", monospace';
    ctx.fillText(rating, canvas.width / 2, 372);

    // Voltage & Frequency
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('240V ~ 50Hz', canvas.width / 2, 404);

    // Breaking Capacity Box [10000] and Energy Class [3]
    const boxW = 86;
    const boxH = 24;
    const boxX = canvas.width / 2 - boxW / 2 - 14;
    const boxY = 418;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 15px "JetBrains Mono", monospace';
    ctx.fillText('10000', boxX + boxW / 2, boxY + 17);

    // Energy limit class [3] in adjacent square
    ctx.strokeRect(boxX + boxW + 6, boxY, 24, boxH);
    ctx.fillText('3', boxX + boxW + 18, boxY + 17);

    // Standards & Certification
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('IEC 60898-1  CE', canvas.width / 2, 460);

    // Single-line Breaker Schematic Symbol at bottom
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 474);
    ctx.lineTo(canvas.width / 2, 484);
    ctx.lineTo(canvas.width / 2 - 14, 496);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 498);
    ctx.lineTo(canvas.width / 2, 506);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
