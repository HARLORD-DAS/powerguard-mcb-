# PowerGuard MCB — 3D Engineering Digital Twin

A high-fidelity, photorealistic, and fully interactive **3D Engineering Digital Twin** of an AI/ML-enabled Automated Miniature Circuit Breaker (MCB) Testing System, built using Three.js and Vite.

---

## Features

- **True 3D Engineering Machine Interface**: The 3D model itself is the primary operational interface. Every switch, breaker, dial, transformer, sensor, and DAQ module is an interactive physical object.
- **Master Industrial Rack Architecture**:
  - **Path 1: High Current Path** — Modular 1P DIN MCB, High Current Transformer, Stage 1 Voltage/Current Sensors, Diodes, R/XL Bank, Stage 2 Sensors, High Power Test Switch.
  - **Path 2: Voltage Path** — Modular 1P DIN MCB, Voltage Potential Transformer, Sensors, Diodes, R/XL Bank, Voltage Test Switch.
  - **Path 3: Short Circuit Live Path** — Modular 1P DIN MCB, Stage 1 Live Conductor Sensors, Diodes, R/XL Bank, SC Live Contactor.
  - **Path 4: Short Circuit Neutral Path** — Modular 1P DIN MCB, Stage 1 Neutral Conductor Sensors, Diodes, R/XL Bank, SC Neutral Contactor.
  - **DUT (MCB Under Test) Station** — 3-pole breaker with dynamic mechanical trip lever, solid copper busbars, and transparent polycarbonate Arc Containment Zone.
  - **Top Control & Communication Tier** — Control power supply, Siemens S7-1200 PLC, High-Speed DAQ, and Wi-Fi/Bluetooth/Ethernet telemetry modules.
  - **Bottom Measurement & Grounding Tier** — Precision current shunts, voltage dividers, acoustic sensors, isolation units, and solid brass protective grounding busbar.
- **Physical 1-Pole DIN Rail Breaker Models**:
  - Stepped industrial thermoplastic housing with DIN rail mounting clip tab.
  - Ergonomic blue ribbed rocker toggle lever with 3 operating states (`ON`, `OFF`, `TRIPPED`).
  - Mechanical trip/contact position status window (`RED` = Energized/Closed, `GREEN` = Open/Safe, `AMBER` = Tripped).
  - High-contrast laser silkscreen faceplate (`C63`, `C16`, `C32`, `240V~`, `10000A [3]`, `IEC 60898-1`).
  - Upper and lower recessed screw terminal clamp wells with authentic 3D wire routing.
- **Controlled Industrial Testing & Trip Simulation**:
  - Strict hardware & software interlocks preventing multiple high-power paths from firing simultaneously.
  - Configurable DUT parameters: Rated Current ($I_n = 6\text{A}-63\text{A}$), Trip Curve (B, C, D), Poles (SP to FP).
  - Short-circuit prospective current surge calculation ($I_p > 2\text{ kA}$), sub-cycle instantaneous electromagnetic trip ($< 20\text{ ms}$), let-through energy ($I^2t$), and automatic high-power switch isolation.
  - High-Speed DAQ oscilloscope display rendering sub-cycle transient waveforms.
- **Inspection Modes**:
  - **Exploded View ('E' key)**: Smoothly animates casing and modules outward along their local normal axes.
  - **X-Ray Mode ('X' key)**: Makes thermoplastic housings transparent to inspect internal copper bimetals, trip solenoids, and de-ion arc chute plates.
  - **Audio Engine**: Synthesized mechanical switch clicks, heavy contactor thunks, transformer hums, and trip pops via Web Audio API.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm / yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/HARLORD-DAS/powerguard-mcb-.git
cd powerguard-mcb-

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Building for Production
```bash
npm run build
npm run preview
```

---

## Keyboard Controls & Interactions

| Key / Action | Function |
| :--- | :--- |
| **Left Click** | Interact with components (Toggle MCBs, switches, cycle R/XL dials, configure DUT) |
| **Right Click + Drag** | Pan 3D Camera |
| **Scroll Wheel** | Zoom In / Out |
| **Spacebar** | Start / Stop Test Cycle |
| **E** | Toggle Exploded View |
| **X** | Toggle X-Ray Internal Inspection |
| **1, 2, 3, 4** | Select & Isolate Testing Pathways 1 - 4 |
| **R** | Reset Camera to Overview |

---

## License
MIT
