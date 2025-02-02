import {
  Lib3d,
  Lib3dCameraParameters,
  Lib3dColor,
  Lib3dHandle,
  Lib3dLine,
  Lib3dVertex,
} from "../../src/lib3d";
import { crossVertex, toRadians } from "../../src/matrix";
import { Lib3dOrigin, Lib3dSphere } from "../../src/primitives";
import { CameraMode, GyroAxisOrientation, State } from "./state";
import { rotationToHours } from "./util";

const CAMERA_PARAMETERS: Lib3dCameraParameters = {
  f: 1.5,
  width: 1.0,
  height: 1.0,
  zfar: 100,
  znear: 0.1,
};
const ORIGIN: Lib3dVertex = new Lib3dVertex({ x: 0, y: 0, z: 0 });
const SPHERE_RADIUS = 1;
const VIEWING_HEIGHT = 4;
const CAMERA_LONGITUDE_DEG = 0;
const GYRO_AXIS_LINE_LENGTH = 0.25;
const GYRO_AXIS_COLOR_1: Lib3dColor = {
  r: 235 / 255,
  g: 139 / 255,
  b: 14 / 255,
  a: 1,
};
const GYRO_AXIS_COLOR_2: Lib3dColor = {
  r: 153 / 255,
  g: 16 / 255,
  b: 227 / 255,
  a: 1,
};
const TIME_PER_REVOLUTION_MILLISECONDS = 24_000;

function getOverheadCameraPosition(
  rotationAngleRad: number,
  latitudeDeg: number
): Lib3dVertex {
  const surfacePoint = sphere.getSurfacePoint(
    latitudeDeg,
    CAMERA_LONGITUDE_DEG, // camera is always overhead the same meridian
    rotationAngleRad
  );
  return new Lib3dVertex({
    x: VIEWING_HEIGHT * surfacePoint.x,
    y: VIEWING_HEIGHT * surfacePoint.y,
    z: VIEWING_HEIGHT * surfacePoint.z,
  });
}

function getStaticCameraPosition(
  cameraLatitudeDeg: number,
  cameraRotationDeg: number
): Lib3dVertex {
  const surfacePoint = sphere.getSurfacePoint(
    cameraLatitudeDeg,
    CAMERA_LONGITUDE_DEG,
    toRadians(cameraRotationDeg) // camera does not rotate with the sphere
  );
  return new Lib3dVertex({
    x: VIEWING_HEIGHT * surfacePoint.x,
    y: VIEWING_HEIGHT * surfacePoint.y,
    z: VIEWING_HEIGHT * surfacePoint.z,
  });
}

let cameraPositionFunction: (t: number) => Lib3dVertex = (t) =>
  getStaticCameraPosition(
    state.getCameraPosition().latitudeDeg,
    state.getCameraPosition().rotationDeg
  );

const canvas = document.querySelector("canvas");
if (canvas === null) {
  throw new Error("could not find canvas element");
}
const lib3d = new Lib3d(
  canvas,
  CAMERA_PARAMETERS,
  Lib3d.DEFAULT_CAMERA_POSITION,
  Lib3d.DEFAULT_CAMERA_ORIENTATION
);
let lines: Lib3dHandle[] = [];

const sphere = new Lib3dSphere(lib3d, SPHERE_RADIUS);
const origin = new Lib3dOrigin(lib3d, 0.5);

const state = new State();

function drawGyroAxis(t: number, latitudeDeg: number, gyroAxis: Lib3dVertex) {
  const surfacePoint = sphere.getSurfacePoint(
    latitudeDeg,
    CAMERA_LONGITUDE_DEG,
    t
  );
  const startVertex = new Lib3dVertex({
    x: surfacePoint.x - GYRO_AXIS_LINE_LENGTH * gyroAxis.x,
    y: surfacePoint.y - GYRO_AXIS_LINE_LENGTH * gyroAxis.y,
    z: surfacePoint.z - GYRO_AXIS_LINE_LENGTH * gyroAxis.z,
  });
  const endVertex = new Lib3dVertex({
    x: surfacePoint.x + GYRO_AXIS_LINE_LENGTH * gyroAxis.x,
    y: surfacePoint.y + GYRO_AXIS_LINE_LENGTH * gyroAxis.y,
    z: surfacePoint.z + GYRO_AXIS_LINE_LENGTH * gyroAxis.z,
  });
  lines.push(
    lib3d.addLine(
      new Lib3dLine({
        v1: startVertex,
        v2: surfacePoint,
        c: GYRO_AXIS_COLOR_1,
      })
    )
  );
  lines.push(
    lib3d.addLine(
      new Lib3dLine({
        v1: surfacePoint,
        v2: endVertex,
        c: GYRO_AXIS_COLOR_2,
      })
    )
  );
}

function resetScene() {
  lines.forEach((handle) => lib3d.removeLine(handle));
  lines = [];
}

function updateScene(
  rotationAngleRad: number,
  latitudeDeg: number,
  gyroAxis: Lib3dVertex
) {
  resetScene();
  lib3d.setCameraPosition(cameraPositionFunction(rotationAngleRad));
  lib3d.lookAt(ORIGIN);
  sphere.draw(rotationAngleRad);
  drawGyroAxis(rotationAngleRad, latitudeDeg, gyroAxis);
}

function draw(
  rotationAngleRad: number,
  latitudeDeg: number,
  gyroAxis: Lib3dVertex
) {
  updateScene(rotationAngleRad, latitudeDeg, gyroAxis);
  lib3d.draw();
}

function drawAndReschedule(timeMilliseconds: number) {
  if (state.isStopped()) {
    return;
  }
  let animationTimeOffset = state.getAnimationTimeOffset();
  if (animationTimeOffset === null) {
    state.setAnimationTimeOffset(timeMilliseconds);
    animationTimeOffset = timeMilliseconds;
  }
  const radiansPerMillisecond =
    (2 * Math.PI) / TIME_PER_REVOLUTION_MILLISECONDS;
  state.setRotationAngleRad(
    ((timeMilliseconds - animationTimeOffset) * radiansPerMillisecond) %
      (2 * Math.PI)
  );
  drawFromState();
  window.requestAnimationFrame(drawAndReschedule);
}

function drawFromState() {
  draw(
    state.getRotationAngleRad(),
    state.getLatitudeDeg(),
    state.getGyroAxis()
  );
}

const sliderInput = document.querySelector("#rotationInput");
const latitudeInput = document.querySelector("#latitudeInput");
const cameraModeInputs = document.querySelectorAll("input[name=cameraMode]");
const gyroAxisOrientationInput = document.querySelector(
  "#gyroAxisOrientationInput"
);
const startStopButton = document.querySelector("#startStopButton");
const staticCameraLatitudeInput = document.querySelector(
  "#staticCameraLatitudeInput"
);
const staticCameraRotationInput = document.querySelector(
  "#staticCameraRotationInput"
);

const rotationOutput = document.querySelector("#rotationOutput");
const timeOutput = document.querySelector("#timeOutput");

// sliderInput
if (sliderInput) {
  sliderInput.addEventListener("input", () => {
    state.setRotationAngleRad(
      (Number.parseInt((sliderInput as HTMLInputElement).value) / 1000) *
        2 *
        Math.PI
    );
  });
}
state.setCallback("rotationAngleRad", (angleRadians: number) => {
  if (latitudeInput != null) {
    (latitudeInput as HTMLInputElement).disabled = angleRadians != 0;
  }

  if (rotationOutput != null) {
    rotationOutput.innerHTML = Math.round((angleRadians / Math.PI) * 180)
      .toString()
      .padStart(3, "0");
  }

  if (timeOutput != null) {
    timeOutput.innerHTML = rotationToHours(angleRadians);
  }

  if (sliderInput != null) {
    (sliderInput as HTMLInputElement).value = (
      (angleRadians / (2 * Math.PI)) *
      1000
    ).toString();
  }

  drawFromState();
});

// latitudeInput
latitudeInput?.addEventListener("input", () => {
  state.setLatitudeDeg(
    Number.parseInt((latitudeInput as HTMLInputElement).value)
  );
});
state.setCallback("latitudeDeg", (latitudeDeg: number) => {
  drawFromState();
});

// cameraModeInputs
cameraModeInputs.forEach((element) => {
  element.addEventListener("input", (event) => {
    switch ((event.target as HTMLInputElement).value) {
      case "static":
        state.setCameraMode(CameraMode.STATIC);
        break;
      case "overhead":
        state.setCameraMode(CameraMode.OVERHEAD);
        break;
    }
  });
});
state.setMultiValueCallback(
  ["cameraMode", "cameraPosition", "latitudeDeg"],
  (st: State) => {
    const cameraPosition = st.getCameraMode();
    const latitudeDeg = st.getLatitudeDeg();
    switch (cameraPosition) {
      case CameraMode.STATIC:
        const cameraPosition = st.getCameraPosition();
        cameraPositionFunction = (t) =>
          getStaticCameraPosition(
            cameraPosition.latitudeDeg,
            cameraPosition.rotationDeg
          );
        break;
      case CameraMode.OVERHEAD:
        cameraPositionFunction = (t) =>
          getOverheadCameraPosition(t, latitudeDeg);
        break;
    }
    drawFromState();
  }
);

// gyroAxisOrientationInput
gyroAxisOrientationInput?.addEventListener("input", () => {
  switch ((gyroAxisOrientationInput as HTMLSelectElement).value) {
    case "vertical":
      state.setGyroAxisOrientation(GyroAxisOrientation.VERTICAL);
      break;
    case "horizontal":
      state.setGyroAxisOrientation(GyroAxisOrientation.HORIZONTAL);
      break;
  }
});
state.setMultiValueCallback(
  ["gyroAxisOrientation", "latitudeDeg"],
  (st: State) => {
    const gyroAxisOrientation = st.getGyroAxisOrientation();
    const latitudeDeg = st.getLatitudeDeg();
    switch (gyroAxisOrientation) {
      case GyroAxisOrientation.VERTICAL:
        state.setGyroAxis(
          sphere.getSurfacePoint(latitudeDeg, CAMERA_LONGITUDE_DEG, 0)
        );
        break;
      case GyroAxisOrientation.HORIZONTAL:
        // For now, horizontal means parallel to the surface and pointing at true north.
        // A nice extension would be to allow arbitrary orientations parallel to the surface.
        state.setGyroAxis(
          crossVertex(
            new Lib3dVertex({ x: 0, y: 1, z: 0 }),
            sphere.getSurfacePoint(latitudeDeg, CAMERA_LONGITUDE_DEG, 0)
          )
        );
        break;
    }
    drawFromState();
  }
);

// playPauseButton
startStopButton?.addEventListener("click", () => {
  state.setStopped(!state.isStopped());
});
state.setCallback("isStopped", (isStopped: boolean) => {
  (startStopButton as HTMLButtonElement).innerHTML = isStopped
    ? "Start"
    : "Stop";
  (sliderInput as HTMLInputElement).disabled = !isStopped;

  if (isStopped) {
    state.setRotationAngleRad(0);
    state.setAnimationTimeOffset(null);
  } else {
    window.requestAnimationFrame(drawAndReschedule);
  }
});

// staticCameraLatitude & staticCameraRotation
staticCameraLatitudeInput?.addEventListener("input", () => {
  const cameraPosition = state.getCameraPosition();
  state.setCameraPosition({
    latitudeDeg: Number.parseInt(
      (staticCameraLatitudeInput as HTMLInputElement).value
    ),
    rotationDeg: cameraPosition.rotationDeg,
  });
});
staticCameraRotationInput?.addEventListener("input", () => {
  const cameraPosition = state.getCameraPosition();
  state.setCameraPosition({
    latitudeDeg: cameraPosition.latitudeDeg,
    rotationDeg: Number.parseInt(
      (staticCameraRotationInput as HTMLInputElement).value
    ),
  });
});

state.invokeAllCallbacks();
window.requestAnimationFrame(drawAndReschedule);
