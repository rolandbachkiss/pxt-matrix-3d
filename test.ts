// ============================================================
// VERIFICATION TEST — Buffer-based rewrite of matrix-3d.ts
// All number[] replaced with Buffer. Should eliminate error 841.
//
// LED map: left-to-right, top-to-bottom, 5 per row.
// Smiley = all passed.
// ============================================================

let _cpIdx = 0
function cp(): void {
    led.plot(_cpIdx % 5, Math.idiv(_cpIdx, 5))
    _cpIdx++
    basic.pause(150)
}

cp()  // CP 1: static init (SIN_TABLE Buffer + scratch Buffers) OK

matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()  // CP 2: initNeoPixel Row1 OK

// ── CP 3: createCube — previously crashed with 841 here ──────────────────
const cubeId = matrix3D.createCube(10)
cp()  // CP 3: createCube survived

// ── CP 4: drawMesh — previously crashed with 841 here ────────────────────
matrixCore.clear()
matrix3D.setRotation(cubeId, 0, 0, 0)
matrix3D.drawMesh(cubeId, 0x00FFFF)
cp()  // CP 4: drawMesh survived

matrixCore.updateDisplay()
cp()  // CP 5: updateDisplay survived

// ── CP 6: 10-frame loop ───────────────────────────────────────────────────
for (let f = 0; f < 10; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, f * 10, f * 15, f * 5)
    matrix3D.drawMesh(cubeId, 0x00FF00)
    matrixCore.updateDisplay()
}
cp()  // CP 6: 10-frame loop survived

// ── CP 7: 100-frame continuous spin ──────────────────────────────────────
for (let f = 0; f < 100; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, f * 2, f * 3, f)
    matrix3D.drawMesh(cubeId, 0x0000FF)
    matrixCore.updateDisplay()
    basic.pause(30)
}
cp()  // CP 7: 100-frame spin survived

// ── CP 8: Grid2x2 layout ──────────────────────────────────────────────────
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Grid2x2)
cp()  // CP 8: Grid2x2 init survived

matrixCore.clear()
matrix3D.setRotation(cubeId, 30, 45, 15)
matrix3D.drawMesh(cubeId, 0xFF8800)
matrixCore.updateDisplay()
cp()  // CP 9: Grid2x2 drawMesh+updateDisplay survived

// ── CP 10: 50-frame spin on full 32×32 ───────────────────────────────────
for (let f = 0; f < 50; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, f * 3, f * 5, f * 2)
    matrix3D.drawMesh(cubeId, 0xFF00FF)
    matrixCore.updateDisplay()
    basic.pause(30)
}
cp()  // CP 10: 50-frame Grid2x2 spin survived

for (let i = 0; i < 15; i++) cp()  // CP 11..25

basic.pause(500)
basic.showIcon(IconNames.Happy)
