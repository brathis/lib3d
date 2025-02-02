export function printMat4(a) {
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

export function printElementBuffer(a, components, vertices) {
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

export function matmuln(a, b, n) {
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
export function matmulnm(a, b, n, m, p) {
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

export function normalize4(v) {
  const [x, y, z, w] = v;
  return [x / w, y / w, z / w, 1];
}
