import {
  crossVertex,
  matmul4,
  matvec4,
  normalizeVertex,
  printMat4,
  printVec4,
  rotX,
  rotZ,
  toDegrees,
  toVector,
  toVertex,
} from "./matrix";
// @ts-ignore this is esbuild magic
import vertexShader from "./shaders/vertex.glsl";
// @ts-ignore this is esbuild magic
import fragmentShader from "./shaders/fragment.glsl";
import { hashCode } from "./util";

/**
 * Lib3d
 *
 * A graphics library for drawing triangles and lines using WebGL
 *
 */

export type Lib3dHandle = number;

export class Lib3dVertex {
  x: number;
  y: number;
  z: number;

  constructor(init: {x: number, y: number, z: number}) {
    this.x = init.x;
    this.y = init.y;
    this.z = init.z;
  }

  hashCode(): number {
    return hashCode(`${this.x}${this.y}${this.z}`);
  }
}

export interface Lib3dColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Lib3dCameraParameters {
  f: number;
  width: number;
  height: number;
  zfar: number;
  znear: number;
}

export interface Lib3dCameraOrientation {
  vx: Lib3dVertex;
  vy: Lib3dVertex;
  vz: Lib3dVertex;
}

export interface Lib3dCamera {
  parameters: Lib3dCameraParameters;
  position: Lib3dVertex;
  orientation: Lib3dCameraOrientation;
}

export class Lib3dTriangle {
  v1: Lib3dVertex;
  v2: Lib3dVertex;
  v3: Lib3dVertex;
  c: Lib3dColor;

  constructor(init: {v1: Lib3dVertex, v2: Lib3dVertex, v3: Lib3dVertex, c: Lib3dColor}) {
    this.v1 = init.v1;
    this.v2 = init.v2;
    this.v3 = init.v3;
    this.c = init.c;
  }

  hashCode(): number {
    return hashCode(`${this.v1.hashCode()}${this.v2.hashCode()}${this.v3.hashCode()}`);
  }
}

export class Lib3dLine {
  v1: Lib3dVertex;
  v2: Lib3dVertex;
  c: Lib3dColor;

  constructor(init: {v1: Lib3dVertex, v2: Lib3dVertex, c: Lib3dColor}) {
    this.v1 = init.v1;
    this.v2 = init.v2;
    this.c = init.c;
  }

  hashCode(): number {
    return hashCode(`${this.v1.hashCode()}${this.v2.hashCode()}`);
  }
}

export class Lib3d {
  private webgl: WebGLRenderingContext;
  private camera: Lib3dCamera;
  private inverseMatrix: Float32Array;
  private projectionMatrix: Float32Array;
  private invertCameraPositionMatrix: Float32Array;
  private invertCameraOrientationMatrix: Float32Array;

  private triangleProgram: WebGLProgram;
  private trianglePositionBuffer: WebGLBuffer;
  private triangleColorBuffer: WebGLBuffer;
  private triangleUniformMatrixLocation: WebGLUniformLocation | null;
  private triangles: Map<Lib3dHandle, Lib3dTriangle>;
  private trianglePositionBufferContent: number[];
  private triangleColorBufferContent: number[];

  private lineProgram: WebGLProgram;
  private linePositionBuffer: WebGLBuffer;
  private lineColorBuffer: WebGLBuffer;
  private lineUniformMatrixLocation: WebGLUniformLocation | null;
  private lines: Map<Lib3dHandle, Lib3dLine>;
  private linePositionBufferContent: number[];
  private lineColorBufferContent: number[];

  static readonly DEFAULT_CAMERA_POSITION: Lib3dVertex = new Lib3dVertex({
    x: 0,
    y: 1,
    z: 0,
  });
  static readonly DEFAULT_CAMERA_ORIENTATION: Lib3dCameraOrientation = {
    vx: new Lib3dVertex({ x: -1, y: 0, z: 0 }),
    vy: new Lib3dVertex({ x: 0, y: 0, z: 1 }),
    vz: new Lib3dVertex({ x: 0, y: 1, z: 0 }),
  };

  constructor(
    canvas: HTMLCanvasElement,
    cameraParameters: Lib3dCameraParameters,
    cameraPosition: Lib3dVertex,
    cameraOrientation: Lib3dCameraOrientation
  ) {
    const context = canvas.getContext("webgl");
    if (!context) {
      throw new Error("WebGL not supported");
    }
    this.webgl = context;

    this.triangleProgram = this.#createProgram(vertexShader, fragmentShader);
    this.lineProgram = this.#createProgram(vertexShader, fragmentShader);

    this.#setupMatrices();
    this.#setupTriangleProgram();
    this.#setupLineProgram();
    this.camera = {
      parameters: cameraParameters,
      position: cameraPosition,
      orientation: cameraOrientation,
    };
    this.#computeProjectionMatrix();
    this.#computeInvertCameraOrientationMatrix();
    this.#computeInvertCameraPositionMatrix();
    this.#computeMatrix();
    console.info("Lib3d initialized 🚀");
  }

  #createProgram(
    vertexShaderSource: string,
    fragmentShaderSource: string
  ): WebGLProgram {
    const shaders: WebGLShader[] = [];
    for (const shaderSourceAndType of [
      {
        shaderSource: vertexShaderSource,
        shaderType: this.webgl.VERTEX_SHADER,
      },
      {
        shaderSource: fragmentShaderSource,
        shaderType: this.webgl.FRAGMENT_SHADER,
      },
    ]) {
      const { shaderSource, shaderType } = shaderSourceAndType;
      const shader = this.webgl.createShader(shaderType);
      if (shader === null) {
        throw new Error("failed to create shader");
      }
      this.webgl.shaderSource(shader, shaderSource);
      this.webgl.compileShader(shader);
      if (!this.webgl.getShaderParameter(shader, this.webgl.COMPILE_STATUS)) {
        throw new Error(
          `failed to compile shader: ${this.webgl.getShaderInfoLog(shader)}`
        );
      }
      shaders.push(shader);
    }
    const program = this.webgl.createProgram();
    for (const shader of shaders) {
      this.webgl.attachShader(program, shader);
    }
    this.webgl.linkProgram(program);
    if (!this.webgl.getProgramParameter(program, this.webgl.LINK_STATUS)) {
      throw new Error(
        `failed to compile program: ${this.webgl.getProgramInfoLog(program)}`
      );
    }
    const numberOfAttachedShaders = this.webgl.getProgramParameter(
      program,
      this.webgl.ATTACHED_SHADERS
    );
    const numberOfActiveAttributes = this.webgl.getProgramParameter(
      program,
      this.webgl.ACTIVE_ATTRIBUTES
    );
    const numberOfActiveUniforms = this.webgl.getProgramParameter(
      program,
      this.webgl.ACTIVE_UNIFORMS
    );
    console.info(
      `attached shaders: ${numberOfAttachedShaders}, active attributes: ${numberOfActiveAttributes}, active uniforms: ${numberOfActiveUniforms}`
    );

    return program;
  }

  #setupViewport() {
    this.webgl.viewport(
      0,
      0,
      this.webgl.canvas.width,
      this.webgl.canvas.height
    );
    this.webgl.enable(this.webgl.DEPTH_TEST);
    this.webgl.depthFunc(this.webgl.GREATER);
    this.webgl.clearColor(1, 1, 1, 1);
    this.webgl.clearDepth(-1.0);
    this.webgl.clear(this.webgl.COLOR_BUFFER_BIT | this.webgl.DEPTH_BUFFER_BIT);
  }

  #setupMatrices() {
    this.inverseMatrix = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    this.projectionMatrix = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    this.invertCameraPositionMatrix = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    this.invertCameraOrientationMatrix = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
  }

  #setupTriangleProgram() {
    this.webgl.useProgram(this.triangleProgram);
    this.trianglePositionBuffer = this.webgl.createBuffer();
    this.triangleColorBuffer = this.webgl.createBuffer();
    this.triangleUniformMatrixLocation = this.webgl.getUniformLocation(
      this.triangleProgram,
      "u_matrix"
    );
    this.triangles = new Map();
    this.trianglePositionBufferContent = [];
    this.triangleColorBufferContent = [];
  }

  #setupLineProgram() {
    this.webgl.useProgram(this.lineProgram);
    this.linePositionBuffer = this.webgl.createBuffer();
    this.lineColorBuffer = this.webgl.createBuffer();
    this.lineUniformMatrixLocation = this.webgl.getUniformLocation(
      this.lineProgram,
      "u_matrix"
    );
    this.lines = new Map();
    this.linePositionBufferContent = [];
    this.lineColorBufferContent = [];
  }

  #updateTriangleBuffers() {
    // console.info(`drawing ${this.triangles.length} triangles`)

    this.trianglePositionBufferContent = [];
    this.triangleColorBufferContent = [];
    for (const t of this.triangles.values()) {
      for (const v of [t.v1, t.v2, t.v3]) {
        for (const coordinate of [v.x, v.y, v.z, 1]) {
          this.trianglePositionBufferContent.push(coordinate);
        }
        for (const component of [t.c.r, t.c.g, t.c.b, t.c.a]) {
          this.triangleColorBufferContent.push(component);
        }
      }
    }

    // console.info('Position buffer:')
    // printElementBuffer(this.trianglePositionBufferContent, 4, 3);

    // console.info('Color buffer:')
    // printElementBuffer(this.triangleColorBufferContent, 4, 3);
  }

  #drawTriangles() {
    this.webgl.useProgram(this.triangleProgram);

    this.webgl.uniformMatrix4fv(
      this.triangleUniformMatrixLocation,
      false,
      this.inverseMatrix
    );

    const positionAttributeLocation = this.webgl.getAttribLocation(
      this.triangleProgram,
      "a_position"
    );
    this.webgl.enableVertexAttribArray(positionAttributeLocation);
    this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.trianglePositionBuffer);
    this.webgl.bufferData(
      this.webgl.ARRAY_BUFFER,
      new Float32Array(this.trianglePositionBufferContent),
      this.webgl.STATIC_DRAW
    );
    this.webgl.vertexAttribPointer(
      positionAttributeLocation,
      4,
      this.webgl.FLOAT,
      false,
      0,
      0
    );

    const colorAttributeLocation = this.webgl.getAttribLocation(
      this.triangleProgram,
      "a_color"
    );
    this.webgl.enableVertexAttribArray(colorAttributeLocation);
    this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.triangleColorBuffer);
    this.webgl.bufferData(
      this.webgl.ARRAY_BUFFER,
      new Float32Array(this.triangleColorBufferContent),
      this.webgl.STATIC_DRAW
    );
    this.webgl.vertexAttribPointer(
      colorAttributeLocation,
      4,
      this.webgl.FLOAT,
      false,
      0,
      0
    );

    this.webgl.drawArrays(this.webgl.TRIANGLES, 0, 3 * this.triangles.size);
  }

  #updateLineBuffers() {
    this.linePositionBufferContent = [];
    this.lineColorBufferContent = [];
    for (const l of this.lines.values()) {
      for (const v of [l.v1, l.v2]) {
        for (const coordinate of [v.x, v.y, v.z, 1]) {
          this.linePositionBufferContent.push(coordinate);
        }
        for (const component of [l.c.r, l.c.g, l.c.b, l.c.a]) {
          this.lineColorBufferContent.push(component);
        }
      }
    }
  }

  #drawLines() {
    this.webgl.useProgram(this.lineProgram);

    this.webgl.uniformMatrix4fv(
      this.lineUniformMatrixLocation,
      false,
      this.inverseMatrix
    );

    const positionAttributeLocation = this.webgl.getAttribLocation(
      this.lineProgram,
      "a_position"
    );
    this.webgl.enableVertexAttribArray(positionAttributeLocation);
    this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.linePositionBuffer);
    this.webgl.bufferData(
      this.webgl.ARRAY_BUFFER,
      new Float32Array(this.linePositionBufferContent),
      this.webgl.STATIC_DRAW
    );
    this.webgl.vertexAttribPointer(
      positionAttributeLocation,
      4,
      this.webgl.FLOAT,
      false,
      0,
      0
    );
    const colorAttributeLocation = this.webgl.getAttribLocation(
      this.lineProgram,
      "a_color"
    );
    this.webgl.enableVertexAttribArray(colorAttributeLocation);
    this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.lineColorBuffer);
    this.webgl.bufferData(
      this.webgl.ARRAY_BUFFER,
      new Float32Array(this.lineColorBufferContent),
      this.webgl.STATIC_DRAW
    );
    this.webgl.vertexAttribPointer(
      colorAttributeLocation,
      4,
      this.webgl.FLOAT,
      false,
      0,
      0
    );

    this.webgl.drawArrays(this.webgl.LINES, 0, 2 * this.lines.size);
  }

  #computeMatrix() {
    this.inverseMatrix = new Float32Array(
      matmul4(
        this.projectionMatrix,
        matmul4(
          this.invertCameraOrientationMatrix,
          this.invertCameraPositionMatrix
        )
      )
    );

    // console.info('Inverse view and projection matrix:')
    // printMat4(this.inverseMatrix);
  }

  #computeProjectionMatrix() {
    // Matrices are represented as arrays in column-major order!

    const a =
      (this.camera.parameters.zfar + this.camera.parameters.znear) /
      (this.camera.parameters.zfar - this.camera.parameters.znear);
    const b =
      (2 * this.camera.parameters.zfar * this.camera.parameters.znear) /
      (this.camera.parameters.zfar - this.camera.parameters.znear);

    this.projectionMatrix[0] =
      (2 * this.camera.parameters.f) / this.camera.parameters.width;
    this.projectionMatrix[1] = 0;
    this.projectionMatrix[2] = 0;
    this.projectionMatrix[3] = 0;

    this.projectionMatrix[4] = 0;
    this.projectionMatrix[5] =
      (2 * this.camera.parameters.f) / this.camera.parameters.height;
    this.projectionMatrix[6] = 0;
    this.projectionMatrix[7] = 0;

    this.projectionMatrix[8] = 0;
    this.projectionMatrix[9] = 0;
    this.projectionMatrix[10] = a;
    this.projectionMatrix[11] = -1;

    this.projectionMatrix[12] = 0;
    this.projectionMatrix[13] = 0;
    this.projectionMatrix[14] = b;
    this.projectionMatrix[15] = 0;

    // console.info('Projection matrix:')
    // printMat4(this.projectionMatrix);
  }

  #computeInvertCameraPositionMatrix() {
    this.invertCameraPositionMatrix[12] = -this.camera.position.x;
    this.invertCameraPositionMatrix[13] = -this.camera.position.y;
    this.invertCameraPositionMatrix[14] = -this.camera.position.z;

    // console.info('Inverse camera position matrix:')
    // printMat4(this.invertCameraPositionMatrix);
  }

  #computeInvertCameraOrientationMatrix() {
    // The columns of the camera orientation matrix consist of the unit vectors of the camera coordinate system:
    // | cxx cyx czx |
    // | cxy cyy czy |
    // | cxz cyz czz |
    const a11 = this.camera.orientation.vx.x;
    const a12 = this.camera.orientation.vy.x;
    const a13 = this.camera.orientation.vz.x;
    const a21 = this.camera.orientation.vx.y;
    const a22 = this.camera.orientation.vy.y;
    const a23 = this.camera.orientation.vz.y;
    const a31 = this.camera.orientation.vx.z;
    const a32 = this.camera.orientation.vy.z;
    const a33 = this.camera.orientation.vz.z;

    const det =
      a11 * a22 * a33 +
      a12 * a23 * a31 +
      a13 * a21 * a32 -
      a11 * a23 * a32 -
      a12 * a21 * a33 -
      a13 * a22 * a31;
    const i11 = (a22 * a33 - a32 * a23) / det;
    const i12 = -(a12 * a33 - a32 * a13) / det;
    const i13 = (a12 * a23 - a22 * a13) / det;
    const i21 = -(a21 * a33 - (a31 * a23) / det);
    const i22 = (a11 * a33 - a31 * a13) / det;
    const i23 = -(a11 * a23 - a21 * a13) / det;
    const i31 = (a21 * a32 - a31 * a22) / det;
    const i32 = -(a11 * a32 - a31 * a12) / det;
    const i33 = (a11 * a22 - a21 * a12) / det;

    this.invertCameraOrientationMatrix[0] = i11;
    this.invertCameraOrientationMatrix[1] = i21;
    this.invertCameraOrientationMatrix[2] = i31;
    this.invertCameraOrientationMatrix[3] = 0;

    this.invertCameraOrientationMatrix[4] = i12;
    this.invertCameraOrientationMatrix[5] = i22;
    this.invertCameraOrientationMatrix[6] = i32;
    this.invertCameraOrientationMatrix[7] = 0;

    this.invertCameraOrientationMatrix[8] = i13;
    this.invertCameraOrientationMatrix[9] = i23;
    this.invertCameraOrientationMatrix[10] = i33;
    this.invertCameraOrientationMatrix[11] = 0;

    // console.info('Inverse camera orientation matrix:')
    // printMat4(this.invertCameraOrientationMatrix);
  }

  addTriangle(triangle: Lib3dTriangle): Lib3dHandle {
    const handle = triangle.hashCode();
    this.triangles.set(handle, triangle);
    this.#updateTriangleBuffers();
    return handle;
  }

  removeTriangle(handle: Lib3dHandle): void {
    this.triangles.delete(handle);
  }

  addLine(line: Lib3dLine): Lib3dHandle {
    const handle = line.hashCode();
    this.lines.set(handle, line);
    this.#updateLineBuffers();
    return handle;
  }

  removeLine(handle: Lib3dHandle): void {
    this.lines.delete(handle);
  }

  reset() {
    this.triangles.clear();
    this.lines.clear();
    this.#updateTriangleBuffers();
    this.#updateLineBuffers();
  }

  setCameraPosition(v: Lib3dVertex) {
    this.camera.position = v;
    this.#computeInvertCameraPositionMatrix();
  }

  setCameraOrientation(o: Lib3dCameraOrientation) {
    this.camera.orientation = o;
    this.#computeInvertCameraOrientationMatrix();
  }

  setCameraParameters(p: Lib3dCameraParameters) {
    this.camera.parameters = p;
    this.#computeProjectionMatrix();
  }

  lookAt(p: Lib3dVertex) {
    const q = new Lib3dVertex({
      x: this.camera.position.x - p.x,
      y: this.camera.position.y - p.y,
      z: this.camera.position.z - p.z,
    });
    const vz = normalizeVertex(q);
    const vvx = crossVertex(new Lib3dVertex({ x: 0, y: 0, z: 1 }), vz);
    const vx = normalizeVertex(vvx);
    const vy = normalizeVertex(crossVertex(vz, vx));
    this.setCameraOrientation({
      vx: vx,
      vy: vy,
      vz: vz,
    });
  }

  draw() {
    this.#updateTriangleBuffers();
    this.#updateLineBuffers();

    this.#setupViewport();
    this.#computeMatrix();
    this.#drawTriangles();
    this.#drawLines();
  }

  #checkWebGlError() {
    const error = this.webgl.getError();
    if (error) {
      let errorStr = "WebGL error: ";
      switch (error) {
        case this.webgl.INVALID_ENUM:
          errorStr += "INVALID_ENUM";
          break;
        case this.webgl.INVALID_VALUE:
          errorStr += "INVALID_VALUE";
          break;
        case this.webgl.INVALID_OPERATION:
          errorStr += "INVALID_OPERATION";
          break;
        case this.webgl.INVALID_FRAMEBUFFER_OPERATION:
          errorStr += "INVALID_FRAMEBUFFER_OPERATION";
          break;
        case this.webgl.OUT_OF_MEMORY:
          errorStr += "OUT_OF_MEMORY";
          break;
        case this.webgl.CONTEXT_LOST_WEBGL:
          errorStr += "CONTEXT_LOST_WEBGL";
          break;
        default:
          errorStr += "unknown: " + error;
          break;
      }
      console.error(errorStr);
    }
  }
}
