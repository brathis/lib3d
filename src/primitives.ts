import {
  Lib3d,
  Lib3dColor,
  Lib3dHandle,
  Lib3dLine,
  Lib3dVertex,
} from "./lib3d";
import {
  matmul4,
  matvec4,
  rotX,
  rotY,
  rotZ,
  toRadians,
  toVertex,
} from "./matrix";

export class Lib3dSphere {
  // TODO: much of this should be configurable
  private static readonly ROTATION_X_DEG = 0;
  private static readonly ROTATION_Y_DEG = 0;
  private static readonly NUM_SEGMENTS = 50;
  private static readonly NUM_MERIDIANS = 24;
  private static readonly SEGMENT_INCREMENT = (2 * Math.PI) / this.NUM_SEGMENTS;
  private static readonly MERIDIAN_INCREMENT =
    (2 * Math.PI) / this.NUM_MERIDIANS;
  private static readonly PARALLELS = [60, 45, 30, 15, 0, -15, -30, -45, -60];
  private static readonly LINE_COLOR: Lib3dColor = {
    r: 0,
    g: 1,
    b: 1,
    a: 1,
  };
  private static readonly GREAT_CIRCLE_COLOR: Lib3dColor = {
    r: 0,
    g: 0.75,
    b: 1,
    a: 1,
  };

  private lib3d: Lib3d;
  private radius: number;
  private rotation: number[];
  private lineHandles: Lib3dHandle[];
  private triangleHandles: Lib3dHandle[];

  constructor(lib3d: Lib3d, radius: number) {
    this.lib3d = lib3d;
    this.radius = radius;

    this.lineHandles = [];
    this.triangleHandles = [];

    this.draw(0);
  }

  #getLineColor(latOrLonDeg: number): Lib3dColor {
    if (latOrLonDeg === 0) {
      return Lib3dSphere.GREAT_CIRCLE_COLOR;
    }
    return Lib3dSphere.LINE_COLOR;
  }

  #removeAll() {
    this.lineHandles.forEach((handle) => this.lib3d.removeLine(handle));
    this.lineHandles = [];
    this.triangleHandles.forEach((handle) => this.lib3d.removeTriangle(handle));
    this.triangleHandles = [];
  }

  draw(rotationAngleRad: number) {
    this.#removeAll();

    this.rotation = matmul4(
      rotX(toRadians(Lib3dSphere.ROTATION_X_DEG)),
      rotY(toRadians(Lib3dSphere.ROTATION_Y_DEG))
    );

    this.#drawMeridians(rotationAngleRad);
    this.#drawParallels();
  }

  getSurfacePoint(
    latDeg: number,
    lonDeg: number,
    rotationAngleRad: number
  ): Lib3dVertex {
    if (latDeg > 90 || latDeg < -90) {
      throw new Error(`invalid latitude: ${latDeg}°`);
    }
    if (lonDeg < -180 || lonDeg > 180) {
      throw new Error(`invalid longitude: ${lonDeg}°`);
    }
    // starting from (radius, 0, 0),
    // rotate latDeg degrees around the y-axis, then lonDeg degrees around the z-axis
    const rotLat = rotY(toRadians(-latDeg));
    const rotLon = rotZ(toRadians(lonDeg) + rotationAngleRad);
    return toVertex(
      matvec4(matmul4(this.rotation, matmul4(rotLon, rotLat)), [
        this.radius,
        0,
        0,
        1,
      ])
    );
  }

  #drawMeridians(rotationAngleRad: number) {
    for (let j = 0; j < Lib3dSphere.NUM_MERIDIANS / 2; ++j) {
      let rotationZ = rotZ(
        j * Lib3dSphere.MERIDIAN_INCREMENT + rotationAngleRad
      );
      let prev: number[] | null = null;
      let curr: number[] | null = null;
      let first: number[] | null = null;
      for (let i = 0; i < Lib3dSphere.NUM_SEGMENTS; ++i) {
        if (prev === null) {
          prev = matvec4(
            this.rotation,
            matvec4(rotationZ, [this.radius, 0, 0, 1])
          );
          first = prev;
          continue;
        }
        curr = matvec4(
          this.rotation,
          matvec4(rotationZ, [
            this.radius * Math.cos(i * Lib3dSphere.SEGMENT_INCREMENT),
            0,
            this.radius * Math.sin(i * Lib3dSphere.SEGMENT_INCREMENT),
            1,
          ])
        );
        this.lineHandles.push(
          this.lib3d.addLine(
            new Lib3dLine({
              v1: toVertex(prev),
              v2: toVertex(curr),
              c: this.#getLineColor(
                ((j * Lib3dSphere.MERIDIAN_INCREMENT) / Math.PI) * 180
              ),
            })
          )
        );
        prev = curr;
      }
      this.lineHandles.push(
        this.lib3d.addLine(
          new Lib3dLine({
            v1: toVertex(prev as number[]),
            v2: toVertex(first as number[]),
            c: this.#getLineColor(
              ((j * Lib3dSphere.MERIDIAN_INCREMENT) / Math.PI) * 180
            ),
          })
        )
      );
    }
  }

  #drawParallels() {
    for (let lat of Lib3dSphere.PARALLELS) {
      let height = this.radius * Math.sin(toRadians(lat));
      let circleRadius = this.radius * Math.cos(toRadians(lat));
      let prev: number[] | null = null;
      let curr: number[] | null = null;
      let first: number[] | null = null;
      for (let i = 0; i < Lib3dSphere.NUM_SEGMENTS; ++i) {
        if (prev === null) {
          prev = matvec4(this.rotation, [0, circleRadius, height, 1]);
          first = prev;
          continue;
        }
        curr = matvec4(this.rotation, [
          circleRadius * Math.sin(i * Lib3dSphere.SEGMENT_INCREMENT),
          circleRadius * Math.cos(i * Lib3dSphere.SEGMENT_INCREMENT),
          height,
          1,
        ]);
        this.lineHandles.push(
          this.lib3d.addLine(
            new Lib3dLine({
              v1: toVertex(prev),
              v2: toVertex(curr),
              c: Lib3dSphere.LINE_COLOR,
            })
          )
        );
        prev = curr;
      }
      this.lineHandles.push(
        this.lib3d.addLine(
          new Lib3dLine({
            v1: toVertex(prev as number[]),
            v2: toVertex(first as number[]),
            c: Lib3dSphere.LINE_COLOR,
          })
        )
      );
    }
  }
}

export class Lib3dOrigin {
  private readonly lib3d: Lib3d;
  private lines: Lib3dHandle[];
  private size: number;

  constructor(lib3d: Lib3d, size: number) {
    this.lib3d = lib3d;
    this.lines = [];
    this.size = size;

    this.draw();
  }

  #removeAll() {
    this.lines.forEach((handle) => this.lib3d.removeLine(handle));
    this.lines = [];
  }

  draw() {
    this.#removeAll();

    this.lines.push(
      this.lib3d.addLine(
        new Lib3dLine({
          v1: new Lib3dVertex({ x: 0, y: 0, z: 0 }),
          v2: new Lib3dVertex({ x: this.size, y: 0, z: 0 }),
          c: { r: 1, g: 0, b: 0, a: 1 },
        })
      )
    );
    this.lines.push(
      this.lib3d.addLine(
        new Lib3dLine({
          v1: new Lib3dVertex({ x: 0, y: 0, z: 0 }),
          v2: new Lib3dVertex({ x: 0, y: this.size, z: 0 }),
          c: { r: 0, g: 1, b: 0, a: 1 },
        })
      )
    );
    this.lines.push(
      this.lib3d.addLine(
        new Lib3dLine({
          v1: new Lib3dVertex({ x: 0, y: 0, z: 0 }),
          v2: new Lib3dVertex({ x: 0, y: 0, z: this.size }),
          c: { r: 0, g: 0, b: 1, a: 1 },
        })
      )
    );
  }
}
