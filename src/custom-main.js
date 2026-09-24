import { installCustomMCBArchitecture } from './custom/ArchitectureExtension.js';

installCustomMCBArchitecture();

// Load the original PowerGuard-MCB application unchanged after installing
// the architecture/state extensions. This preserves the existing 3D UI,
// camera system, inspection system and simulation presentation.
// Do not use top-level await so the Vercel/Vite production target can build.
import('./main.js');
