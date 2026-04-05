// ============================================================
// PHASE 2 DIAGNOSTIC — crash is inside drawMesh (confirmed CP 10)
// Now we drill into drawMesh step by step.
//
// LED map (col, row) — same as before, left-to-right top-to-bottom:
//   CP 1  (0,0)  CP 2  (1,0)  CP 3  (2,0)  CP 4  (3,0)  CP 5  (4,0)
//   CP 6  (0,1)  CP 7  (1,1)  CP 8  (2,1)  CP 9  (3,1)  CP 10 (4,1)
//   CP 11 (0,2)  CP 12 (1,2)  CP 13 (2,2)  CP 14 (3,2)  CP 15 (4,2)
//   CP 16 (0,3)  CP 17 (1,3)  CP 18 (2,3)  CP 19 (3,3)  CP 20 (4,3)
//   CP 21 (0,4)  CP 22 (1,4)  CP 23 (2,4)  CP 24 (3,4)  CP 25 (4,4)
// ============================================================

let _cpIdx = 0

function cp(): void {
    const row = Math.idiv(_cpIdx, 5)
    const col = _cpIdx % 5
    led.plot(col, row)
    _cpIdx++
    basic.pause(150)
}

// ── CP 1: program started ─────────────────────────────────────────────────
cp()

// ── CP 2: initNeoPixel with the SMALLEST layout ───────────────────────────
// Row1 = single 16×16 panel = 768 bytes back buffer
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()

// ── CP 3: createCube returned ────────────────────────────────────────────
const cubeId = matrix3D.createCube(10)
cp()

// ── CP 4: cubeId is 0 (valid) ────────────────────────────────────────────
// If cubeId is -1, MAX_MESHES was already hit — shouldn't happen on first call
const idOk = (cubeId === 0)
cp()

// ── CP 5: setRotation 0,0,0 ──────────────────────────────────────────────
matrix3D.setRotation(cubeId, 0, 0, 0)
cp()

// ── CP 6: matrixCore.clear() ─────────────────────────────────────────────
matrixCore.clear()
cp()

// ============================================================
// Now reproduce drawMesh manually, one sub-step at a time.
// We copy the logic from matrix-3d.ts so we can checkpoint
// between each stage without modifying the extension itself.
// ============================================================

// ── CP 7: read trig values for 0,0,0 rotation ────────────────────────────
const cosX = matrix3D.cosDeg(0)   // expect 1000
const sinX = matrix3D.sinDeg(0)   // expect 0
const cosY = matrix3D.cosDeg(0)
const sinY = matrix3D.sinDeg(0)
const cosZ = matrix3D.cosDeg(0)
const sinZ = matrix3D.sinDeg(0)
cp()

// ── CP 8: read cube vertex 0 directly via sinDeg/cosDeg (trig sanity) ────
// cubeId=0 so _meshVertices[0][0] = -10 (first x of v0)
// We can't access private arrays directly, so just verify trig values are sane
const trigOk = (cosX === 1000 && sinX === 0)
cp()

// ── CP 9: manual rotation of one vertex (vertex 0 = -10,-10,-10) ─────────
// Replicate exactly what drawMesh does for i=0
const ox = -10
const oy = -10
const oz = -10

// X-axis rotation
const ry0  = (oy * cosX - oz * sinX) / 1000
const rz1_0 = (oy * sinX + oz * cosX) / 1000
cp()

// ── CP 10: Y-axis rotation ───────────────────────────────────────────────
const rx2_0 = (ox * cosY + rz1_0 * sinY) / 1000
const rz2_0 = (-ox * sinY + rz1_0 * cosY) / 1000
cp()

// ── CP 11: Z-axis rotation ───────────────────────────────────────────────
const rx3_0 = (rx2_0 * cosZ - ry0 * sinZ) / 1000
const ry3_0 = (rx2_0 * sinZ + ry0 * cosZ) / 1000
cp()

// ── CP 12: project() — the sinDeg/cosDeg result feeds into division by z ─
// project() does:  z = vz + _zOffset(100) + _viewerDist(200) = -10+100+200 = 290
// _projX = centerX() + (vx * _fov) / z  →  7 + (-10 * 128) / 290  →  7 + (-4)  = 3
// centerX() on Row1 layout = (16-1)>>1 = 7
const projZ  = rz2_0 + 100 + 200  // expected ~290
const projX0 = matrixCore.centerX() + Math.idiv(rx3_0 * 128, projZ)
const projY0 = matrixCore.centerY() + Math.idiv(ry3_0 * 128, projZ)
cp()

// ── CP 13: allocate sx[] and sy[] arrays (heap allocation test) ───────────
const sx: number[] = []
const sy: number[] = []
cp()

// ── CP 14: push first vertex projection ──────────────────────────────────
sx.push(projX0)
sy.push(projY0)
cp()

// ── CP 15: push all 8 vertices manually ──────────────────────────────────
// (same math, all with 0,0,0 rotation so trivial)
const verts = [-10,-10,-10,  10,-10,-10,  10,10,-10,  -10,10,-10,
               -10,-10,10,   10,-10,10,   10,10,10,   -10,10,10]

for (let i = 1; i < 8; i++) {
    const vx = verts[i * 3]
    const vy = verts[i * 3 + 1]
    const vz = verts[i * 3 + 2]
    const pz = vz + 300
    if (pz <= 0) { sx.push(-999); sy.push(-999); continue }
    sx.push(matrixCore.centerX() + Math.idiv(vx * 128, pz))
    sy.push(matrixCore.centerY() + Math.idiv(vy * 128, pz))
}
cp()

// ── CP 16: matrixDraw.lineRGB for one edge (edge 0→1) ────────────────────
const r3d = 0
const g3d = 255
const b3d = 255
matrixDraw.lineRGB(sx[0], sy[0], sx[1], sy[1], r3d, g3d, b3d)
cp()

// ── CP 17: draw all 12 edges ─────────────────────────────────────────────
const edges = [0,1, 1,2, 2,3, 3,0, 4,5, 5,6, 6,7, 7,4, 0,4, 1,5, 2,6, 3,7]
for (let e = 0; e < 12; e++) {
    const a = edges[e * 2]
    const b = edges[e * 2 + 1]
    if (sx[a] === -999 || sx[b] === -999) continue
    matrixDraw.lineRGB(sx[a], sy[a], sx[b], sy[b], r3d, g3d, b3d)
}
cp()

// ── CP 18: updateDisplay ─────────────────────────────────────────────────
matrixCore.updateDisplay()
cp()

// ── CP 19: NOW call the real drawMesh (after we know manual steps work) ───
matrixCore.clear()
matrix3D.setRotation(cubeId, 0, 0, 0)
matrix3D.drawMesh(cubeId, 0x00FFFF)
cp()

// ── CP 20: drawMesh with rotation ────────────────────────────────────────
matrixCore.clear()
matrix3D.setRotation(cubeId, 45, 30, 15)
matrix3D.drawMesh(cubeId, 0xFF0000)
matrixCore.updateDisplay()
cp()

// ── CP 21–25: survived ───────────────────────────────────────────────────
cp()  // 21
cp()  // 22
cp()  // 23
cp()  // 24
cp()  // 25

basic.pause(500)
basic.showIcon(IconNames.Happy)
