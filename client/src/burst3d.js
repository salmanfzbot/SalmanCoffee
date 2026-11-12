// 3D ingredient burst for the hero (three.js). The cup stays a photo in the DOM; this canvas sits above it
// and throws beans, milk splashes, glass shards, cinnamon sticks and sugar cubes out of the cup, one after
// another, driven by scroll progress. 30 parts per dish, each with its own bearing, depth and spin.
// One group per featured dish; only the groups whose scene is on screen draw.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = q => { const t = clamp(q); return t * t * (3 - 2 * t); };
const easeOutCubic = q => 1 - Math.pow(1 - clamp(q), 3);

// Seeded random so every visit looks the same.
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 7;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Thirty parts per dish (was twelve): 12 beans, 6 sugar cubes, 5 milk splashes, 4 glass shards, 3 cinnamon sticks,
// shuffled with a seed so each dish has its own order. The order is the order they leave the cup.
function makeKit(seed) {
  const kit = [...Array(12).fill('bean'), ...Array(6).fill('sugar'), ...Array(5).fill('milk'),
    ...Array(4).fill('shard'), ...Array(3).fill('cinnamon')];
  const r = rng(seed);
  for (let i = kit.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kit[i], kit[j]] = [kit[j], kit[i]];
  }
  return kit;
}

function makeGeoms() {
  // Coffee bean: an ellipsoid with its long axis along X and a crease running down the front face.
  // The crease is pressed in a little and darkened, so the bean reads as a bean, not a dot.
  const bean = new THREE.SphereGeometry(1, 40, 26);
  {
    const p = bean.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      let z = p.getZ(i);
      const taper = clamp(1 - Math.abs(x) * 1.15);
      const groove = Math.exp(-Math.pow(y / 0.1, 2)) * clamp(z * 1.4) * taper;
      z -= 0.14 * groove;
      p.setZ(i, z);
      const v = 1 - 0.62 * groove;
      col.set([v, v * 0.96, v * 0.92], i * 3);
    }
    bean.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  bean.scale(0.2, 0.13, 0.115);
  bean.computeVertexNormals();

  // Milk splash: a lumpy blob, flattened like a drop that just hit something. Three shapes.
  const milks = [11, 23, 37].map(seed => {
    const r = rng(seed);
    const g = new THREE.IcosahedronGeometry(1, 3);
    const p = g.attributes.position;
    const a = r() * 6, b = r() * 6, c = r() * 6;
    for (let i = 0; i < p.count; i++) {
      const d = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const k = 1 + 0.22 * Math.sin(3.1 * d.x + a) * Math.cos(2.7 * d.y + b) + 0.13 * Math.sin(5.3 * d.z + c) + 0.08 * Math.sin(7.7 * (d.x + d.y));
      p.setXYZ(i, d.x * k, d.y * k, d.z * k);
    }
    g.scale(0.24, 0.13, 0.22);
    g.computeVertexNormals();
    return g;
  });

  // Glass shard: a thin irregular piece with a bevelled edge. Three shapes.
  const shards = [5, 19, 41].map(seed => {
    const r = rng(seed);
    const n = 4 + Math.floor(r() * 2);
    const shape = new THREE.Shape();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.6;
      const R = 0.2 + r() * 0.1;
      const x = Math.cos(a) * R * 1.3, y = Math.sin(a) * R;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
    g.center();
    return g;
  });

  // Cinnamon stick: a rounded rod, lying along X.
  const cinnamon = new THREE.CapsuleGeometry(0.05, 0.5, 4, 16);
  cinnamon.rotateZ(Math.PI / 2);

  // Sugar cube: a rounded box.
  const sugar = new RoundedBoxGeometry(0.17, 0.17, 0.17, 4, 0.03);
  return { bean, milks, shards, cinnamon, sugar };
}

export function createBurst3D(canvas, n) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // Lights: warm key from the upper left casting soft shadows, a gold fill from the right, a rim point light.
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1a120b, 0.5));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.4);
  key.position.set(-2.4, 3.4, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 0.5, far: 16 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd9a0, 0.6);
  fill.position.set(2.6, -1, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(0xf6dc98, 8, 12, 2);
  rim.position.set(2.4, -0.8, 2.2);
  scene.add(rim);

  // A transparent floor that only catches shadows, just behind the parts.
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.26 }));
  catcher.position.z = -1.1;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // The canvas is 3x the cup box (so parts can fly past the photo). The cup photo's radius is 1 world unit,
  // so the visible half-height is 3 units: the camera sits at 3 / tan(14 deg) from the scene.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 0, 3 / Math.tan(THREE.MathUtils.degToRad(14)));

  const G = makeGeoms();
  const mat = {
    bean: new THREE.MeshStandardMaterial({ color: '#8a5230', vertexColors: true, roughness: 0.4, envMapIntensity: 0.9 }),
    milk: new THREE.MeshPhysicalMaterial({ color: '#fbf6ec', roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.0 }),
    shard: new THREE.MeshPhysicalMaterial({ color: '#d4f1ec', roughness: 0.03, transparent: true, opacity: 0.5, clearcoat: 1, ior: 1.5, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false }),
    cinnamon: new THREE.MeshStandardMaterial({ color: '#8f4c24', roughness: 0.5, envMapIntensity: 0.8 }),
    sugar: new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.5, envMapIntensity: 0.9 }),
  };

  const groups = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const r = rng(1000 + i * 97);
    const kit = makeKit(500 + i * 31);
    const N = kit.length;
    const parts = kit.map((kind, k) => {
      let geo, m, size = 1;
      if (kind === 'bean') { geo = G.bean; m = mat.bean; size = 0.9 + r() * 0.35; }
      else if (kind === 'milk') { geo = G.milks[Math.floor(r() * G.milks.length)]; m = mat.milk; size = 0.9 + r() * 0.4; }
      else if (kind === 'shard') { geo = G.shards[Math.floor(r() * G.shards.length)]; m = mat.shard; size = 0.95 + r() * 0.3; }
      else if (kind === 'cinnamon') { geo = G.cinnamon; m = mat.cinnamon; size = 0.95 + r() * 0.25; }
      else { geo = G.sugar; m = mat.sugar; size = 0.85 + r() * 0.35; }
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      // A golden-angle fan around the cup: even coverage, every part on its own bearing and depth.
      const a = k * 2.39996 + (r() - 0.5) * 0.5 + i * 0.7;
      const reach = 1.25 + r() * 1.25;
      return {
        mesh, k,
        end: new THREE.Vector3(Math.cos(a) * reach, Math.sin(a) * reach * 0.9, (r() - 0.5) * 1.4),
        // Strictly in sequence: part k leaves at its slot, with a little jitter so it is not a metronome.
        delay: 0.02 + (k / N) * 0.5 + (r() - 0.5) * 0.03,
        spin: new THREE.Vector3((r() - 0.5) * 7, (r() - 0.5) * 7, (r() - 0.5) * 9),
        base: new THREE.Euler(r() * 3, r() * 3, r() * 3),
        s: size,
      };
    });
    g.userData.parts = parts;
    g.visible = false;
    scene.add(g);
    groups.push(g);
  }

  const renderFrame = () => renderer.render(scene, camera);

  // x runs 0..n across the hero (scene i is x in [i, i+1]). Returns the lift for the cup box, weighted by how
  // visible each dish is, so the cup slides up with its own photo as the scenes cross-fade.
  function setFrame(x) {
    let wsum = 0, lsum = 0;
    for (let i = 0; i < n; i++) {
      const local = x - i;
      const vis = smooth((local + 0.15) / 0.22) * smooth((1.15 - local) / 0.22);
      const g = groups[i];
      g.visible = vis > 0.01;
      if (!g.visible) continue;
      wsum += vis;
      lsum += vis * (1 - clamp(local * 1.6));
      const t = clamp(local);
      for (const p of g.userData.parts) {
        const e = easeOutCubic((t - p.delay) / 0.35);
        p.mesh.visible = e > 0.01;
        if (!p.mesh.visible) continue;
        const wob = Math.sin((t * 5 + p.k) * 1.3) * 0.03 * e;
        p.mesh.position.set(p.end.x * e, p.end.y * e + wob, p.end.z * e);
        p.mesh.rotation.set(p.base.x + p.spin.x * e, p.base.y + p.spin.y * e, p.base.z + p.spin.z * e);
        p.mesh.scale.setScalar(p.s * vis * (0.25 + 0.75 * e));
      }
    }
    renderFrame();
    return wsum > 0 ? lsum / wsum : 1;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderFrame();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas);
  resize();

  function dispose() {
    if (ro) ro.disconnect();
    Object.values(G).forEach(v => (Array.isArray(v) ? v : [v]).forEach(x => x.dispose()));
    Object.values(mat).forEach(m => m.dispose());
    catcher.geometry.dispose(); catcher.material.dispose();
    renderer.dispose();
  }

  return { setFrame, resize, dispose };
}
