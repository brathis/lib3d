import { Lib3d, Lib3dTriangle, Lib3dVertex, Lib3dColor, Lib3dCameraOrientation, Lib3dCameraParameters } from "../../src/lib3d";

const canvas = document.querySelector('canvas');
const lib3d = new Lib3d(canvas);

// Lib3d retains a reference to the triangle.
// When the user updates the shape or color of the triangle, Lib3d automatically applies these changes to the WebGL buffers.
const t1 = lib3d.addTriangle(
    new Lib3dTriangle(
        new Lib3dVertex(1., 1., -1.),
        new Lib3dVertex(1., 0., -1.),
        new Lib3dVertex(0., 1., -1.),
        new Lib3dColor(0.72, 0.13, 0.2, 1.0)
    ),
);
const t2 = lib3d.addTriangle(
    new Lib3dTriangle(
        new Lib3dVertex(1., 1., -1.),
        new Lib3dVertex(1., 1., 0.),
        new Lib3dVertex(0., 1., -1.),
        new Lib3dColor(0.82, 0.4, 0.35, 1.0)
    )
);
const t3 = lib3d.addTriangle(
    new Lib3dTriangle(
        new Lib3dVertex(1., 0., -1.),
        new Lib3dVertex(1., 1., 0.),
        new Lib3dVertex(0., 1., -1.),
        new Lib3dColor(0.95, 0.70, 0.55, 1.0)
    )
);
const t4 = lib3d.addTriangle(
    new Lib3dTriangle(
        new Lib3dVertex(1., 1., -1.),
        new Lib3dVertex(1., 0., -1.),
        new Lib3dVertex(1., 1., 0.),
        new Lib3dColor(0.96, 0.87, 0.85, 1.0))
);
lib3d.setCameraParameters(new Lib3dCameraParameters(
    1.0,
    1.0,
    1.0,
    100.,
    0.1,
));

function updateScene(t) {
    // Like with the triangles, the changes to the camera parameters are immediately reflected in the buffers.
    lib3d.setCameraPosition(new Lib3dVertex(
        0.5 -3 * Math.sin(t),
        0.75,
        -0.5 - 3 * Math.cos(t),
    ));
    lib3d.setCameraOrientation(
        new Lib3dCameraOrientation(
            new Lib3dVertex(
                -Math.cos(t),
                0,
                Math.sin(t),
            ),
            new Lib3dVertex(
                0,
                1,
                0,
            ),
            new Lib3dVertex(
                -Math.sin(t),
                0,
                -Math.cos(t),
            )
        )
    );
}

function draw(timeMilliseconds) {
    const timePerRevolutionMilliseconds = 3000;
    const radiansPerMillisecond = 2 * Math.PI / timePerRevolutionMilliseconds;
    updateScene((timeMilliseconds * radiansPerMillisecond) % (2 * Math.PI));

    // Finally, draw the scene!
    lib3d.draw();

    // request next draw
    window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
// draw(0);