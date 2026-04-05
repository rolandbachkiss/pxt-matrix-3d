// ============================================================
// PHASE 4 DIAGNOSTIC — crash is drawMesh() + updateDisplay() together
// Goal: confirm the heap-corruption theory by calling drawMesh
// WITHOUT any heap alloc inside it (pre-allocated sx/sy), then
// seeing if updateDisplay survives.
//
// We also test: does drawMesh alone crash (without updateDisplay)?
// ============================================================

let _cpIdx = 0
function cp(): void {
    led.plot(_cpIdx % 5, Math.idiv(_cpIdx, 5))
    _cpIdx++
    basic.pause(150)
}

// ── CP 1: started ────────────────────────────────────────────────────────
cp()

matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()  // CP 2

const cubeId = matrix3D.createCube(10)
cp()  // CP 3

// ── TEST A: drawMesh alone, NO updateDisplay ──────────────────────────────
// If this crashes, the problem is inside drawMesh itself.
// If this passes, drawMesh is fine but poisons the heap for updateDisplay.
matrixCore.clear()
matrix3D.setRotation(cubeId, 0, 0, 0)
matrix3D.drawMesh(cubeId, 0x00FFFF)
cp()  // CP 4 — drawMesh alone survived

// ── TEST B: updateDisplay alone (back buffer has cube from TEST A) ─────────
matrixCore.updateDisplay()
cp()  // CP 5 — updateDisplay after drawMesh survived

// ── TEST C: second drawMesh + updateDisplay cycle ─────────────────────────
matrixCore.clear()
matrix3D.setRotation(cubeId, 20, 30, 10)
matrix3D.drawMesh(cubeId, 0xFF0000)
cp()  // CP 6 — second drawMesh survived

matrixCore.updateDisplay()
cp()  // CP 7 — second updateDisplay survived

// ── TEST D: 10-frame loop ─────────────────────────────────────────────────
for (let f = 0; f < 10; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, f * 10, f * 15, f * 5)
    matrix3D.drawMesh(cubeId, 0x00FF00)
    matrixCore.updateDisplay()
}
cp()  // CP 8 — 10-frame loop survived

// ── TEST E: 50-frame loop ─────────────────────────────────────────────────
for (let f = 0; f < 50; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, f * 5, f * 7, f * 3)
    matrix3D.drawMesh(cubeId, 0x0000FF)
    matrixCore.updateDisplay()
    basic.pause(20)
}
cp()  // CP 9 — 50-frame loop survived

// ── TEST F: Grid2x2 (full 32×32, larger buffer) ───────────────────────────
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Grid2x2)
cp()  // CP 10 — Grid2x2 init survived

matrixCore.clear()
matrix3D.setRotation(cubeId, 30, 45, 15)
matrix3D.drawMesh(cubeId, 0xFF8800)
matrixCore.updateDisplay()
cp()  // CP 11 — Grid2x2 drawMesh+updateDisplay survived

// 30-frame loop on full grid
for (let f = 0; f < 30; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, f * 6, f * 9, f * 3)
    matrix3D.drawMesh(cubeId, 0xFF00FF)
    matrixCore.updateDisplay()
    basic.pause(30)
}
cp()  // CP 12 — 30-frame Grid2x2 loop survived

// ── ALL PASSED ────────────────────────────────────────────────────────────
for (let i = 0; i < 13; i++) cp()  // CP 13..25

basic.pause(500)
basic.showIcon(IconNames.Happy)
