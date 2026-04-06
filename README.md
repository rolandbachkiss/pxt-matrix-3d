# pxt-matrix-3d

Integer 3D math, perspective projection, and wireframe mesh rendering for NeoPixel matrix panels.

Depends on [pxt-matrix-core](https://github.com/rolandbachkiss/pxt-matrix-core) and [pxt-matrix-draw](https://github.com/rolandbachkiss/pxt-matrix-draw).

## Overview

- **Integer trigonometry** — sin/cos lookup table (×1000 scaled), no floating-point
- **Wireframe meshes** — up to 4 simultaneous meshes, all data in `Buffer` (no `number[]`)
- **Perspective projection** — tunable camera distance and field-of-view
- **Rotation** — X → Y → Z Euler angle rotation, set per mesh

All arithmetic uses integer math (×1000 scaled intermediates) for performance on micro:bit V2.

---

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

---

## API Reference

### Meshes

| Block | Description |
|-------|-------------|
| `create cube mesh size size` | Create a wireframe cube (returns mesh ID) |
| `set mesh id rotation x ax y ay z az` | Set rotation angles in degrees |
| `draw mesh id color c` | Rotate → project → draw all edges |

### Camera

| Block | Description |
|-------|-------------|
| `set camera distance d` | Viewer distance (default 200, larger = less distortion) |
| `set field of view f` | FOV scale factor (default 128, larger = more zoom) |

### Trig (Advanced)

| Block | Description |
|-------|-------------|
| `sin of deg degrees ×1000` | sin(deg) × 1000, integer result |
| `cos of deg degrees ×1000` | cos(deg) × 1000, integer result |
| `project 3D point x x y y z z` | Project a single 3D point to 2D |
| `last projected X` | Screen X from last projection |
| `last projected Y` | Screen Y from last projection |

---

## Cube Vertex Layout

```
v0: (-s, -s, -s)    v1: ( s, -s, -s)
v2: ( s,  s, -s)    v3: (-s,  s, -s)
v4: (-s, -s,  s)    v5: ( s, -s,  s)
v6: ( s,  s,  s)    v7: (-s,  s,  s)
```

12 edges: 4 front face, 4 back face, 4 connecting edges.

---

## Rotation Order

Rotation is applied in **X → Y → Z** order each time `drawMesh()` is called. The `setRotation()` block sets the angles; they are applied during the draw call, not stored as a transform matrix.

## Perspective Projection

```
z_effective = vz + zOffset + viewerDistance
screenX = centerX + (vx × fov) / z_effective
screenY = centerY + (vy × fov) / z_effective
```

---

## Memory Strategy

Every data array is a `Buffer` (raw bytes), not `number[]` (boxed values). This cuts per-element cost from ~12 bytes to 2 bytes and avoids OOM errors on the micro:bit heap. Grand total for all mesh data: ~160 bytes vs ~1500 bytes with `number[]`.

---

## Dependencies

- [pxt-matrix-core](https://github.com/rolandbachkiss/pxt-matrix-core) — centerX(), centerY()
- [pxt-matrix-draw](https://github.com/rolandbachkiss/pxt-matrix-draw) — lineRGB()

## License

MIT © Roland Bach Kiss
