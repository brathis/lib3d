import { Lib3dVertex } from "../../src/lib3d";

export enum CameraMode {
  STATIC,
  OVERHEAD,
}

export interface CameraPosition {
  latitudeDeg: number;
  rotationDeg: number;
}

export enum GyroAxisOrientation {
  VERTICAL,
  HORIZONTAL,
}

export enum CallbackType {
  SINGLE_VALUE,
  MULTI_VALUE,
}

interface StateCallback {
  cb: (v: any | State) => void;
  type: CallbackType;
}

interface StateModel {
  rotationAngleRad: number;
  latitudeDeg: number;
  cameraMode: CameraMode;
  cameraPosition: CameraPosition;
  gyroAxisOrientation: GyroAxisOrientation;
  gyroAxis: Lib3dVertex;
  isStopped: boolean;
  animationTimeOffset: number | null;
}

export class State {
  private model: StateModel;
  private callbacks: { [key: string]: StateCallback[] };

  constructor() {
    this.model = {
      rotationAngleRad: 0,
      latitudeDeg: 45,
      cameraMode: CameraMode.STATIC,
      cameraPosition: { latitudeDeg: 45, rotationDeg: 50 },
      gyroAxisOrientation: GyroAxisOrientation.VERTICAL,
      gyroAxis: new Lib3dVertex({ x: 0, y: 0, z: 1 }),
      isStopped: true,
      animationTimeOffset: null,
    };
    this.callbacks = {};
  }

  private setValue(key: string, value: any): void {
    this.model[key] = value;
    const cbs = this.callbacks[key] || [];
    for (let callback of cbs) {
      if (callback.type === CallbackType.SINGLE_VALUE) {
        callback.cb(value);
      } else {
        callback.cb(this);
      }
    }
  }

  private getValue(key: string): any {
    return this.model[key];
  }

  setCallback(value: string, callback: (newValue: any) => void): void {
    let callbacks = this.callbacks[value];
    if (!callbacks) {
      callbacks = [];
    }
    callbacks.push({ cb: callback, type: CallbackType.SINGLE_VALUE });
    this.callbacks[value] = callbacks;
  }

  setMultiValueCallback(
    values: string[],
    callback: (state: State) => void
  ): void {
    for (const value of values) {
      let callbacks = this.callbacks[value];
      if (!callbacks) {
        callbacks = [];
      }
      callbacks.push({ cb: callback, type: CallbackType.MULTI_VALUE });
      this.callbacks[value] = callbacks;
    }
  }

  // This is a very gross hack because this very cheap state management cannot track dependencies
  // between state properties.
  invokeAllCallbacks(): void {
    for (const property in this.callbacks) {
      let cbs = this.callbacks[property];
      for (const cb of cbs) {
        if (cb.type === CallbackType.SINGLE_VALUE) {
          cb.cb(this.model[property]);
        } else {
          cb.cb(this);
        }
      }
    }
  }

  setRotationAngleRad(rotationAngleRad: number): void {
    this.setValue("rotationAngleRad", rotationAngleRad);
  }

  getRotationAngleRad(): number {
    return this.getValue("rotationAngleRad");
  }

  setLatitudeDeg(latitudeDeg: number): void {
    this.setValue("latitudeDeg", latitudeDeg);
  }

  getLatitudeDeg(): number {
    return this.getValue("latitudeDeg");
  }

  setCameraMode(cameraMode: CameraMode): void {
    this.setValue("cameraMode", cameraMode);
  }

  getCameraMode(): CameraMode {
    return this.getValue("cameraMode");
  }

  setCameraPosition(cameraPosition: CameraPosition): void {
    this.setValue("cameraPosition", cameraPosition);
  }

  getCameraPosition(): CameraPosition {
    return this.getValue("cameraPosition");
  }

  setGyroAxisOrientation(gyroAxisOrientation: GyroAxisOrientation): void {
    this.setValue("gyroAxisOrientation", gyroAxisOrientation);
  }

  getGyroAxisOrientation(): GyroAxisOrientation {
    return this.getValue("gyroAxisOrientation");
  }

  setGyroAxis(gyroAxis: Lib3dVertex): void {
    this.setValue("gyroAxis", gyroAxis);
  }

  getGyroAxis(): Lib3dVertex {
    return this.getValue("gyroAxis");
  }

  setStopped(paused: boolean): void {
    this.setValue("isStopped", paused);
  }

  isStopped(): boolean {
    return this.getValue("isStopped");
  }

  setAnimationTimeOffset(animationTimeOffset: number | null): void {
    this.setValue("animationTimeOffset", animationTimeOffset);
  }

  getAnimationTimeOffset(): number | null {
    return this.getValue("animationTimeOffset");
  }
}
