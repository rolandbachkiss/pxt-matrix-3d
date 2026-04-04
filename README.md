# pxt-matrix-3d

MakeCode micro:bit extension for integer 3D math, perspective projection, and wireframe mesh rendering on NeoPixel matrix panels.

## Overview

`pxt-matrix-3d` provides a complete pipeline for rendering 3D wireframe objects on micro:bit NeoPixel matrix displays. Every calculation uses **integer arithmetic** — no floating-point — making it fast and reliable on micro:bit V2 hardware.

## Integer Trigonometry

All trigonometric values are scaled by **×1000** and stored as plain integers. A pre-computed lookup table covers sin(0°)–sin(90°) at 1° resolution. All other quadrants are derived by symmetry:

| Range       | Formula                    |
|-------------|----------------------------|
| 0°–90°      | `SIN_TABLE[deg]`           |
| 91°–180°    | `SIN_TABLE[180 - deg]`     |
| 181°–270°   | `-SIN_TABLE[deg - 180]`    |
| 271°–359°   | `-SIN_TABLE[360 - deg]`    |

`cos(deg)` is computed as `sin(deg + 90)`, reusing the same table.

Public block functions `sinDeg(deg)` and `cosDeg(deg)` (group **Advanced**) expose these values to the block editor.

## Mesh Creation

Use `createCube(size)` (group **Meshes**) to create a wireframe cube with vertices at ±`size` on each axis. Up to 4 meshes can exist simultaneously. The function returns a **mesh ID** used by all other mesh operations.

### Cube vertex layout

```
v0: (-s, -s, -s)    v1: ( s, -s, -s)
v2: ( s,  s, -s)    v3: (-s,  s, -s)
v4: (-s, -s,  s)    v5: ( s, -s,  s)
v6: ( s,  s,  s)    v7: (-s,  s,  s)
```

12 edges connect these vertices: 4 for the front face, 4 for the back face, and 4 connecting edges.

## Rotation

`setRotation(id, ax, ay, az)` sets the rotation angles (in degrees) for a mesh. Rotation is applied in **X → Y → Z** order each time the mesh is drawn.

### Integer rotation formulas (×1000 scaled intermediates)

**Rotate around X:**
```
y' = (y × cos(ax) − z × sin(ax)) / 1000
z' = (y × sin(ax) + z × cos(ax)) / 1000
```

**Rotate around Y:**
```
x'' = (x × cos(ay) + z' × sin(ay)) / 1000
z'' = (−x × sin(ay) + z' × cos(ay)) / 1000
```

**Rotate around Z:**
```
x''' = (x'' × cos(az) − y' × sin(az)) / 1000
y''' = (x'' × sin(az) + y' × cos(az)) / 1000
```

Division by 1000 after each axis keeps all values in a manageable integer range without overflow on 32-bit hardware.

## Perspective Projection

After rotation, each vertex is projected from 3D to 2D screen coordinates:

```
z_effective = vz + zOffset + viewerDistance
screenX = centerX + (vx × fov) / z_effective
screenY = centerY + (vy × fov) / z_effective
```

Parameters are tunable via blocks:

| Block | Default | Description |
|---|---|---|
| `setCameraDistance(d)` | 200 | Viewer distance (larger = less perspective distortion) |
| `setFOV(f)` | 128 | Field-of-view scale (larger = more zoom) |

`centerX()` and `centerY()` come from `matrixCore`, automatically matching the connected panel size.

## Drawing

`drawMesh(id, color)` performs the full rotate → project → draw pipeline each frame. It calls `matrixDraw.lineRGB` for every visible edge, using the RGB components extracted from the passed colour value.

## Advanced Blocks

| Block | Description |
|---|---|
| `sinDeg(deg)` | sin × 1000 |
| `cosDeg(deg)` | cos × 1000 |
| `projectPoint(x, y, z, sx, sy)` | Project a single 3D point; read result with `lastProjX()` / `lastProjY()` |
| `lastProjX()` | Screen X from last projection |
| `lastProjY()` | Screen Y from last projection |

## Quick Start

```typescript
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Grid2x2)
const cubeId = matrix3D.createCube(10)
let frame = 0
basic.forever(function () {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, frame * 2, frame * 3, frame)
    matrix3D.drawMesh(cubeId, matrixCore.rgb(0, 200, 255))
    matrixCore.updateDisplay()
    basic.pause(70)
    frame++
})
```

## Dependencies

- [`pxt-matrix-core`](https://github.com/rolandbachkiss/pxt-matrix-core) — `width()`, `height()`, `centerX()`, `centerY()`
- [`pxt-matrix-draw`](https://github.com/rolandbachkiss/pxt-matrix-draw) — `lineRGB(x0, y0, x1, y1, r, g, b)`

## License

MIT
