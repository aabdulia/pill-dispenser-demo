// Interactive viewer for the dispenser CAD (binary STL exported from the STEP model).
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.getElementById('cad-viewer');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
scene.add(new THREE.HemisphereLight(0xffffff, 0xf3d9cc, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-300, 500, -400); scene.add(key);
const rim = new THREE.DirectionalLight(0xffe6da, 1.2); rim.position.set(400, 200, 300); scene.add(rim);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

function resize() {
  const { width, height } = host.getBoundingClientRect();
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);

new STLLoader().load('cad/dispenser-model.stl', (geometry) => {
  geometry.rotateX(-Math.PI / 2);          // CAD is Z-up; three.js is Y-up
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox, center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -box.min.y, -center.z);

  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xf2efec, roughness: .55, metalness: .05 }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), new THREE.LineBasicMaterial({ color: 0xd97757, transparent: true, opacity: .55 }));
  scene.add(mesh, edges);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(Math.max(size.x, size.z) * 1.1, 64), new THREE.MeshBasicMaterial({ color: 0xfbeee8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.5; scene.add(floor);

  const target = new THREE.Vector3(0, size.y * .5, 0), dist = size.y * 2.8;
  controls.target.copy(target);
  camera.position.set(dist * .55, size.y * .75, -dist * .8);
  controls.minDistance = size.y * .8; controls.maxDistance = size.y * 4;
  resize();
}, undefined, (err) => console.error('Could not load the CAD model', err));

(function tick() { requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); })();
