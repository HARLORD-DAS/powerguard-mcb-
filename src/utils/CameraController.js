import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Professional CAD Engineering Camera Controller
 * Supports smooth Orbit, Pan, Zoom, Intelligent Component Framing,
 * and seamless animated transitions with cubic easing.
 */
export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 32.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Keep ground plane oriented

    // Default overview position matching Master Reference Image framing
    this.defaultCamPos = new THREE.Vector3(-0.35, 0.15, 14.2);
    this.defaultLookAt = new THREE.Vector3(-0.15, 0.0, 0);

    this.targetCamPos = this.defaultCamPos.clone();
    this.targetLookAt = this.defaultLookAt.clone();
    this.isTransitioning = false;
  }

  // Selection must never move or zoom the camera. Manual OrbitControls input is
  // the only way to zoom/orbit/pan toward a selected component.
  focusOnComponent() {
    return;
  }

  // Smoothly reset camera to the full master cabinet overview
  resetView() {
    this.targetCamPos.copy(this.defaultCamPos);
    this.targetLookAt.copy(this.defaultLookAt);
    this.isTransitioning = true;
  }

  update(delta) {
    if (this.isTransitioning) {
      // Smooth cubic lerp
      this.camera.position.lerp(this.targetCamPos, delta * 4.8);
      this.controls.target.lerp(this.targetLookAt, delta * 4.8);

      if (this.camera.position.distanceTo(this.targetCamPos) < 0.03 &&
          this.controls.target.distanceTo(this.targetLookAt) < 0.03) {
        this.camera.position.copy(this.targetCamPos);
        this.controls.target.copy(this.targetLookAt);
        this.isTransitioning = false;
      }
    }

    this.controls.update();
  }
}
