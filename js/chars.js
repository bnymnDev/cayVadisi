// v13.3: Skelett-animierte Menschen — Quaternius' "Animated Human" (CC0),
// per FBX2glTF nach GLB konvertiert. Ein geriggtes Basismodell, sechs
// 32×32-Palettentexturen für Outfit/Hautton-Varianten; Instanzen werden
// mit SkeletonUtils geklont und laufen über je einen AnimationMixer.
// Animationen im GLB: Idle, Walk, Run, Working, Jump, Punch, Death.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const TEX_VARIANTS = [
  'ClothedLightSkin', 'ClothedLightSkin1', 'ClothedLightSkin2',
  'ClothedDarkSkin', 'ClothedDarkSkin1', 'ClothedDarkSkin2'
];
const BASE = 'assets/models/extra/human/';
const TARGET_HEIGHT = 1.62;   // Meter im Spielmaßstab

export function createChars(ctx) {
  const lib = { ready: false };
  let root = null, clips = [], baseScale = 1;
  const textures = [];

  const texLoader = new THREE.TextureLoader(ctx.loadingManager);
  for (const name of TEX_VARIANTS) {
    const t = texLoader.load(BASE + name + '.png');
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;   // Palettentextur: nicht verwaschen
    t.flipY = false;                     // glTF-UV-Konvention
    textures.push(t);
  }

  lib.load = () => new Promise((resolve) => {
    new GLTFLoader(ctx.loadingManager).load(BASE + 'human.glb', (gltf) => {
      root = gltf.scene;
      clips = gltf.animations;
      const box = new THREE.Box3().setFromObject(root);
      const h = box.max.y - box.min.y || 1;
      baseScale = TARGET_HEIGHT / h;
      lib.ready = true;
      resolve(true);
    }, undefined, (err) => {
      console.warn('Charaktermodell nicht ladbar — prozeduraler Fallback aktiv', err);
      resolve(false);
    });
  });

  function clipByName(part) {
    return clips.find((c) => c.name.includes(part));
  }

  // spawn: eine unabhängige, animierbare Figur
  lib.spawn = (opts = {}) => {
    if (!lib.ready) return null;
    const inst = SkeletonUtils.clone(root);
    inst.scale.setScalar(baseScale * (opts.scale || 1));
    const mat = new THREE.MeshStandardMaterial({
      map: textures[(opts.tex ?? 0) % textures.length],
      roughness: 0.85,
      metalness: 0.05
    });
    if (opts.tint) mat.color.set(opts.tint);
    inst.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.material = mat;
        o.castShadow = true;
        o.frustumCulled = false;   // Bounding folgt den Bones nicht — nie wegculled
      }
    });
    const group = new THREE.Group();
    group.add(inst);

    const mixer = new THREE.AnimationMixer(inst);
    const actions = {};
    for (const short of ['Idle', 'Walk', 'Run', 'Working', 'Jump', 'Punch']) {
      const c = clipByName(short);
      if (c) actions[short] = mixer.clipAction(c);
    }
    let current = null;

    const api = {
      group,
      play(name, fade = 0.22, timeScale = 1) {
        const a = actions[name] || actions.Idle;
        if (!a) return;
        if (current === a) { a.timeScale = timeScale; return; }
        a.reset().fadeIn(fade).play();
        a.timeScale = timeScale;
        if (current) current.fadeOut(fade);
        current = a;
      },
      update(dt) { mixer.update(dt); },
      // Requisit (Hut, Korb, Mütze) an einen Bone hängen — Ziel in Welt-Deltas
      // relativ zur Bone-Position, robust gegen FBX-Einheiten/Skalierung
      attach(boneName, mesh, worldDelta = { x: 0, y: 0, z: 0 }) {
        const bone = inst.getObjectByName(boneName);
        if (!bone) return null;
        group.updateMatrixWorld(true);
        const bonePos = new THREE.Vector3();
        bone.getWorldPosition(bonePos);
        const boneScale = new THREE.Vector3();
        bone.getWorldScale(boneScale);
        bone.add(mesh);
        mesh.position.copy(bone.worldToLocal(
          bonePos.clone().add(new THREE.Vector3(worldDelta.x, worldDelta.y, worldDelta.z))));
        mesh.scale.setScalar(1 / (boneScale.y || 1));
        // In Bind-Pose aufrecht ausrichten (Bone-Achsen sind beliebig gedreht)
        const q = new THREE.Quaternion();
        bone.getWorldQuaternion(q);
        mesh.quaternion.copy(q.invert());
        return bone;
      }
    };
    api.play('Idle');
    return api;
  };

  return lib;
}
