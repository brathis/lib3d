import { matmul4 } from './matrix'
import vertexShader from './vertex.glsl'
import fragmentShader from './fragment.glsl'

/**
 * Lib3d
 *
 * A graphics library for drawing triangles using WebGL
 * 
 */

export class Lib3dVertex {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class Lib3dColor {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
}

export class Lib3dCameraParameters {
    constructor(f, width, height, zfar, znear) {
        this.f = f;
        this.width = width;
        this.height = height;
        this.zfar = zfar;
        this.znear = znear;
    }
}

export class Lib3dCameraOrientation {
    constructor(vx, vy, vz) {
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
    }
}

export class Lib3dCamera {
    constructor(parameters, position, orientation) {
        this.parameters = parameters;
        this.position = position;
        this.orientation = orientation;
    }
}

export class Lib3dTriangle {
    constructor(v1, v2, v3, c) {
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        this.c = c;
    }
}

export class Lib3d {
    #createProgram(vertexShaderSource, fragmentShaderSource) {
        const shaders = [];
        for (const [shaderSource, shaderType] of [[vertexShaderSource, this.webgl.VERTEX_SHADER], [fragmentShaderSource, this.webgl.FRAGMENT_SHADER]]) {
            const shader = this.webgl.createShader(shaderType);
            this.webgl.shaderSource(shader, shaderSource);
            this.webgl.compileShader(shader);
            if (!this.webgl.getShaderParameter(shader, this.webgl.COMPILE_STATUS)) {
                throw new Error(`failed to compile shader: ${this.webgl.getShaderInfoLog(shader)}`);
            }
            shaders.push(shader);
        }
        const program = this.webgl.createProgram();
        for (const shader of shaders) {
            this.webgl.attachShader(program, shader);
        }
        this.webgl.linkProgram(program);
        if (!this.webgl.getProgramParameter(program, this.webgl.LINK_STATUS)) {
            throw new Error(`failed to compile program: ${this.webgl.getProgramInfoLog(program)}`);
        }
        const numberOfAttachedShaders = this.webgl.getProgramParameter(program, this.webgl.ATTACHED_SHADERS);
        const numberOfActiveAttributes = this.webgl.getProgramParameter(program, this.webgl.ACTIVE_ATTRIBUTES);
        const numberOfActiveUniforms = this.webgl.getProgramParameter(program, this.webgl.ACTIVE_UNIFORMS);
        console.info(`attached shaders: ${numberOfAttachedShaders}, active attributes: ${numberOfActiveAttributes}, active uniforms: ${numberOfActiveUniforms}`)

        return program;
    }

    #setupViewport() {
        this.webgl.viewport(0, 0, this.webgl.canvas.width, this.webgl.canvas.height);
        this.webgl.enable(this.webgl.DEPTH_TEST);
    }

    constructor(canvas) {
        /** @type {WebGLRenderingContext} */
        this.webgl = canvas.getContext('webgl');
        if (!this.webgl) {
            throw new Error('WebGL not supported');
        }

        this.program = this.#createProgram(vertexShader, fragmentShader);

        // TODO: this has to be passed to the constructor
        this.camera = new Lib3dCamera(
            new Lib3dCameraParameters(1, 2, 2, 10, 0.1),
            new Lib3dVertex(0, 0, 0),
            new Lib3dCameraOrientation(
                new Lib3dVertex(1, 0, 0),
                new Lib3dVertex(0, 1, 0),
                new Lib3dVertex(0, 0, 1),
            )
        );
        this.#setupProgram();
        console.info('Lib3d initialized 🚀')
    }

    #setupProgram() {
        this.webgl.useProgram(this.program);

        const MAX_NUM_TRIANGLES = 100;

        this.trianglePositionBuffer = this.webgl.createBuffer();
        const positionAttributeLocation = this.webgl.getAttribLocation(this.program, 'a_position');
        console.info(`a_position is at attribute location ${positionAttributeLocation}`);
        this.webgl.enableVertexAttribArray(positionAttributeLocation);
        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.trianglePositionBuffer);
        this.webgl.bufferData(this.webgl.ARRAY_BUFFER, MAX_NUM_TRIANGLES * 3 * 4 * Float32Array.BYTES_PER_ELEMENT, this.webgl.STATIC_DRAW);
        this.webgl.vertexAttribPointer(
            positionAttributeLocation,
            4,
            this.webgl.FLOAT,
            false,
            0,
            0
        );

        this.triangleColorBuffer = this.webgl.createBuffer();
        const colorAttributeLocation = this.webgl.getAttribLocation(this.program, 'a_color');
        console.info(`a_color is at attribute location ${colorAttributeLocation}`);
        this.webgl.enableVertexAttribArray(colorAttributeLocation);
        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.triangleColorBuffer);
        this.webgl.bufferData(this.webgl.ARRAY_BUFFER, MAX_NUM_TRIANGLES * 3 * 4 * Float32Array.BYTES_PER_ELEMENT, this.webgl.STATIC_DRAW);
        this.webgl.vertexAttribPointer(
            colorAttributeLocation,
            4,
            this.webgl.FLOAT,
            false,
            0,
            0
        );

        this.uniformMatrixLocation = this.webgl.getUniformLocation(this.program, 'u_matrix');
        console.info(`u_matrix is ${this.uniformMatrixLocation}`)
        this.inverseMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        
        // // Bind the matrix to the vertex shader as a uniform
        // this.projectionMatrixLocation = this.webgl.getUniformLocation(program, 'u_projection_matrix');
        // console.info(`u_projection_matrix is at uniform location ${this.projectionMatrixLocation}`)
        this.projectionMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        // this.invertCameraPositionMatrixLocation = this.webgl.getUniformLocation(program, 'u_invert_camera_position_matrix');
        // console.info(`u_invert_camera_position_matrix is at uniform location ${this.invertCameraPositionMatrixLocation}`)
        this.invertCameraPositionMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        // this.invertCameraOrientationMatrixLocation = this.webgl.getUniformLocation(program, 'u_invert_camera_orientation_matrix');
        // console.info(`u_invert_camera_orientation_matrix is at uniform location ${this.invertCameraOrientationMatrixLocation}`)
        this.invertCameraOrientationMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);

        this.triangles = [];

        this.#setupViewport();
    }

    #computeAttributeBuffer() {
        // console.info(`drawing ${this.triangles.length} triangles`)

        let positionBufferContent = [];
        let colorBufferContent = [];
        for (const t of this.triangles) {
            for (const v of [t.v1, t.v2, t.v3]) {
                for (const coordinate of [v.x, v.y, v.z, 1]) {
                    positionBufferContent.push(coordinate);
                }
                for (const component of [t.c.r, t.c.g, t.c.b, t.c.a]) {
                    colorBufferContent.push(component);
                }
            }
        }

        // console.info('Position buffer:')
        // printElementBuffer(positionBufferContent, 4, 3);

        // console.info('Color buffer:')
        // printElementBuffer(colorBufferContent, 4, 3);

        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.trianglePositionBuffer);
        this.webgl.bufferData(this.webgl.ARRAY_BUFFER, new Float32Array(positionBufferContent), this.webgl.STATIC_DRAW);
        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.triangleColorBuffer);
        this.webgl.bufferData(this.webgl.ARRAY_BUFFER, new Float32Array(colorBufferContent), this.webgl.STATIC_DRAW);
    }

    addTriangle(triangle) {
        this.triangles.push(triangle);
        this.#computeAttributeBuffer();
    }

    #computeMatrix() {
        this.inverseMatrix = new Float32Array(matmul4(this.projectionMatrix, matmul4(this.invertCameraOrientationMatrix, this.invertCameraPositionMatrix)));

        // console.info('Inverse view and projection matrix:')
        // printMat4(this.inverseMatrix);

        this.webgl.uniformMatrix4fv(this.uniformMatrixLocation, false, this.inverseMatrix);
    }

    #computeProjectionMatrix() {
        // Matrices are represented as arrays in column-major order!

        const a = (this.camera.parameters.zfar + this.camera.parameters.znear) / (this.camera.parameters.zfar - this.camera.parameters.znear);
        const b = 2 * this.camera.parameters.zfar * this.camera.parameters.znear / (this.camera.parameters.zfar - this.camera.parameters.znear);

        this.projectionMatrix[0] = 2 * this.camera.parameters.f / this.camera.parameters.width;
        this.projectionMatrix[1] = 0;
        this.projectionMatrix[2] = 0;
        this.projectionMatrix[3] = 0;

        this.projectionMatrix[4] = 0;
        this.projectionMatrix[5] = 2 * this.camera.parameters.f / this.camera.parameters.height;
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

        this.#computeMatrix();
    }

    #computeInvertCameraPositionMatrix() {
        this.invertCameraPositionMatrix[12] = -this.camera.position.x;
        this.invertCameraPositionMatrix[13] = -this.camera.position.y;
        this.invertCameraPositionMatrix[14] = -this.camera.position.z;

        // console.info('Inverse camera position matrix:')
        // printMat4(this.invertCameraPositionMatrix);

        this.#computeMatrix();
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

        const det = a11 * a22 * a33 + a12 * a23 * a31 + a13 * a21 * a32 - a11 * a23 * a32 - a12 * a21 * a33 - a13 * a22 * a31;
        const i11 = (a22 * a33 - a32 * a23) / det;
        const i12 = - (a12 * a33 - a32 * a13) / det;
        const i13 = (a12 * a23 - a22 * a13) / det;
        const i21 = - (a21 * a33 - a31 * a23 / det);
        const i22 = (a11 * a33 - a31 * a13) / det;
        const i23 = - (a11 * a23 - a21 * a13) / det;
        const i31 = (a21 * a32 - a31 * a22) / det;
        const i32 = - (a11 * a32 - a31 * a12) / det;
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

        this.#computeMatrix();
    }

    setCameraPosition(v) {
        this.camera.position = v;
        this.#computeInvertCameraPositionMatrix();
    }

    setCameraOrientation(o) {
        this.camera.orientation = o;
        this.#computeInvertCameraOrientationMatrix();
    }

    setCameraParameters(p) {
        this.camera.parameters = p;
        this.#computeProjectionMatrix();
    }

    draw() {
        this.webgl.clearColor(1, 1, 1, 1);
        this.webgl.clearDepth(1.0);
        this.webgl.clear(this.webgl.COLOR_BUFFER_BIT | this.webgl.DEPTH_BUFFER_BIT);

        this.#computeAttributeBuffer();
        this.#computeMatrix();

        this.webgl.drawArrays(
            this.webgl.TRIANGLES,
            0,
            3 * this.triangles.length
        );
    }

    #checkWebGlError() {
        const error = this.webgl.getError();
        if (error) {
            let errorStr = "WebGL error: ";
            switch(error) {
                case this.webgl.INVALID_ENUM:
                    errorStr += 'INVALID_ENUM';
                    break;
                case this.webgl.INVALID_VALUE:
                    errorStr += 'INVALID_VALUE';
                    break;
                case this.webgl.INVALID_OPERATION:
                    errorStr += 'INVALID_OPERATION';
                    break;
                case this.webgl.INVALID_FRAMEBUFFER_OPERATION:
                    errorStr += 'INVALID_FRAMEBUFFER_OPERATION';
                    break;
                case this.webgl.OUT_OF_MEMORY:
                    errorStr += 'OUT_OF_MEMORY';
                    break;
                case this.webgl.CONTEXT_LOST_WEBGL:
                    errorStr += 'CONTEXT_LOST_WEBGL';
                    break;
                default:
                    errorStr += 'unknown: ' + error;
                    break;
            }
            console.error(errorStr);
        }
    }
}
