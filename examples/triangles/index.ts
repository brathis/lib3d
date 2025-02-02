import { Lib3d, Lib3dCameraOrientation, Lib3dVertex } from "../../src/lib3d";

const cameraParameters = {
  f: 1.0,
  width: 1.0,
  height: 1.0,
  zfar: 100,
  znear: 0.1,
};

function getCameraPosition(t: number): Lib3dVertex {
  return {
    x: 0.5 - 3 * Math.sin(t),
    y: 0.75,
    z: -0.5 - 3 * Math.cos(t),
  };
}

function getCameraOrientation(t: number): Lib3dCameraOrientation {
  return {
    vx: { x: -Math.cos(t), y: 0, z: Math.sin(t) },
    vy: { x: 0, y: 1, z: 0 },
    vz: { x: -Math.sin(t), y: 0, z: -Math.cos(t) },
  };
}

const canvas = document.querySelector("canvas");
if (canvas === null) {
  throw new Error("could not find canvas element");
}
const lib3d = new Lib3d(
  canvas,
  cameraParameters,
  getCameraPosition(0),
  getCameraOrientation(0)
);

// Lib3d retains a reference to the triangle.
// When the user updates the shape or color of the triangle, Lib3d automatically applies these changes to the WebGL buffers.
const t1 = lib3d.addTriangle({
  v1: { x: 1, y: 1, z: -1 },
  v2: { x: 1, y: 0, z: -1 },
  v3: { x: 0, y: 1, z: -1 },
  c: { r: 0.72, g: 0.13, b: 0.2, a: 1.0 },
});
const t2 = lib3d.addTriangle({
  v1: { x: 1, y: 1, z: -1 },
  v2: { x: 1, y: 1, z: 0 },
  v3: { x: 0, y: 1, z: -1 },
  c: { r: 0.82, g: 0.4, b: 0.35, a: 1.0 },
});
const t3 = lib3d.addTriangle({
  v1: { x: 1, y: 0, z: -1 },
  v2: { x: 1, y: 1, z: 0 },
  v3: { x: 0, y: 1, z: -1 },
  c: { r: 0.95, g: 0.7, b: 0.55, a: 1.0 },
});
const t4 = lib3d.addTriangle({
  v1: { x: 1, y: 1, z: -1 },
  v2: { x: 1, y: 0, z: -1 },
  v3: { x: 1, y: 1, z: 0 },
  c: { r: 0.96, g: 0.87, b: 0.85, a: 1.0 },
});
const lx = lib3d.addLine({
  v1: { x: 0, y: 0, z: 0 },
  v2: { x: 1, y: 0, z: 0 },
  c: { r: 1, g: 0, b: 0, a: 1 },
});
const ly = lib3d.addLine({
  v1: { x: 0, y: 0, z: 0 },
  v2: { x: 0, y: 1, z: 0 },
  c: { r: 0, g: 1, b: 0, a: 1 },
});
const lz = lib3d.addLine({
  v1: { x: 0, y: 0, z: 0 },
  v2: { x: 0, y: 0, z: 1 },
  c: { r: 0, g: 0, b: 1, a: 1 },
});

function updateScene(t: number) {
  // Like with the triangles, the changes to the camera parameters are immediately reflected in the buffers.
  lib3d.setCameraPosition(getCameraPosition(t));
  lib3d.setCameraOrientation(getCameraOrientation(t));
}

const TIME_PER_REVOLUTION_MILLISECONDS = 3000;

function draw(timeMilliseconds: number) {
  const radiansPerMillisecond =
    (2 * Math.PI) / TIME_PER_REVOLUTION_MILLISECONDS;
  updateScene((timeMilliseconds * radiansPerMillisecond) % (2 * Math.PI));

  // Finally, draw the scene!
  lib3d.draw();

  // request next draw
  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
