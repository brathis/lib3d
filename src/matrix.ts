import { Lib3d, Lib3dVertex } from "./lib3d";

export function printVec4(a): void {
  console.log(
    `[${Number(a[0]).toFixed(2)}, ${Number(a[1]).toFixed(2)}, ${Number(a[2]).toFixed(2)}, ${Number(a[3]).toFixed(2)}]`
  );
}

export function printMat4(a): void {
  let out = "";
  for (let row = 0; row < 4; ++row) {
    for (let col = 0; col < 4; ++col) {
      out += new Number(a[col * 4 + row]).toFixed(2);
      if (col < 3) {
        out += " ";
      }
    }
    if (row < 3) {
      out += "\n";
    }
  }
  console.log(out);
}

export function printElementBuffer(
  a,
  components: number,
  vertices: number
): void {
  if (a.length % components !== 0) {
    console.error(
      `number of components ${components} inconsistent with buffer size ${a.length}`
    );
    return;
  }

  let out = "";
  for (let i = 0; i < a.length; ++i) {
    if (i > 0) {
      if (i % components === 0) {
        out += "\n";
      } else {
        out += " ";
      }
      if (i % (components * vertices) === 0) {
        out += "\n";
      }
    }
    out += new Number(a[i]).toFixed(2);
  }
  console.log(out);
}

/**
 * Multiply two 4x4 matrices, both in column-major order.
 * @param {*} a
 * @param {*} b
 * @returns
 */
export function matmul4(a, b) {
  return matmuln(a, b, 4);
}

export function matvec4(a, v) {
  return matmulnm(a, v, 4, 1, 4);
}

export function matmuln(a, b, n: number) {
  const out: number[] = [];

  for (let i = 0; i < n * n; ++i) {
    let col = Math.floor(i / n);
    let row = i % n;

    let sum = 0;
    for (let j = 0; j < n; ++j) {
      sum += a[j * n + row] * b[n * col + j];
    }
    out.push(sum);
  }

  return out;
}

/**
 * Multiply two matrices a and b
 * @param {} a
 * @param {*} b
 * @param {*} n number of rows in a
 * @param {*} m number of columns in b
 * @param {*} p number of columns in a or rows in b
 * @returns
 */
export function matmulnm(a, b, n: number, m: number, p: number) {
  const out: number[] = [];

  for (let j = 0; j < n * m; ++j) {
    let outcol = Math.floor(j / p);
    let outrow = j % p;

    let sum = 0;
    for (let k = 0; k < p; ++k) {
      sum += a[k * n + outrow] * b[p * outcol + k];
    }
    out.push(sum);
  }

  return out;
}

export function normalize3(v) {
  const magnitude = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / magnitude, v[1] / magnitude, v[2] / magnitude, 1];
}

export function normalizeVertex(v: Lib3dVertex): Lib3dVertex {
  const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return new Lib3dVertex({ x: v.x / magnitude, y: v.y / magnitude, z: v.z / magnitude });
}

export function crossVertex(a: Lib3dVertex, b: Lib3dVertex): Lib3dVertex {
  return new Lib3dVertex({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  });
}

export function toVertex(v): Lib3dVertex {
  return new Lib3dVertex({ x: v[0], y: v[1], z: v[2] });
}

export function toVector(v: Lib3dVertex) {
  return [v.x, v.y, v.z, 0];
}

export function toRadians(deg: number): number {
  return (deg / 180) * Math.PI;
}

export function toDegrees(rad: number): number {
  return (rad / Math.PI) * 180;
}

export function rotX(angleRad: number) {
  return [
    1,
    0,
    0,
    0,
    0,
    Math.cos(angleRad),
    Math.sin(angleRad),
    0,
    0,
    -Math.sin(angleRad),
    Math.cos(angleRad),
    0,
    0,
    0,
    0,
    1,
  ];
}

export function rotY(angleRad: number) {
  return [
    Math.cos(angleRad),
    0,
    -Math.sin(angleRad),
    0,
    0,
    1,
    0,
    0,
    Math.sin(angleRad),
    0,
    Math.cos(angleRad),
    0,
    0,
    0,
    0,
    1,
  ];
}

export function rotZ(angleRad: number) {
  return [
    Math.cos(angleRad),
    Math.sin(angleRad),
    0,
    0,
    -Math.sin(angleRad),
    Math.cos(angleRad),
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ];
}
