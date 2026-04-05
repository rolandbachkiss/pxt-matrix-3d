// ============================================================
// pxt-matrix-3d verification test
//
// Checkpoints are lit on the micro:bit 5×5 display left-to-right,
// top-to-bottom (25 total). A smiley face at the end = all passed.
//
// Tests:
//  CP 1  — static init (SIN_TABLE Buffer + scratch Buffers)
//  CP 2  — initNeoPixel Row1 (16×16)
//  CP 3  — createCube (no number[] heap spike)
//  CP 4  — drawMesh at zero rotation
//  CP 5  — updateDisplay
//  CP 6  — 10-frame spin loop (Row1)
//  CP 7  — 100-frame continuous spin (Row1)
//  CP 8  — initNeoPixel Grid2x2 (32×32)
//  CP 9  — drawMesh + updateDisplay on Grid2x2
//  CP 10 — 50-frame spin on Grid2x2
//  CP 11 — second cube (max 2 meshes simultaneously)
//  CP 12 — both cubes spinning simultaneously
//  CP 13..25 — padding (fill remaining LEDs)
//  Smiley — all tests passed
// ============================================================

let _cp = 0
function cp(): void {
    led.plot(_cp % 5, Math.idiv(_cp, 5))
    _cp++
    basic.pause(100)
}

cp()  // CP 1: static init OK

matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()  // CP 2: initNeoPixel Row1 OK

const cubeA = matrix3D.createCube(8)
cp()  // CP 3: createCube — no OOM

matrixCore.clear()
matrix3D.setRotation(cubeA, 0, 0, 0)
matrix3D.drawMesh(cubeA, 0x00FFFF)
cp()  // CP 4: drawMesh survived

matrixCore.updateDisplay()
cp()  // CP 5: updateDisplay survived

for (let f = 0; f < 10; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeA, f * 10, f * 15, f * 5)
    matrix3D.drawMesh(cubeA, 0x00FF00)
    matrixCore.updateDisplay()
}
cp()  // CP 6: 10-frame loop OK

for (let f = 0; f < 100; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeA, f * 2, f * 3, f)
    matrix3D.drawMesh(cubeA, 0x0000FF)
    matrixCore.updateDisplay()
    basic.pause(20)
}
cp()  // CP 7: 100-frame spin OK

matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Grid2x2)
cp()  // CP 8: Grid2x2 reinit OK

matrixCore.clear()
matrix3D.setRotation(cubeA, 30, 45, 15)
matrix3D.drawMesh(cubeA, 0xFF8800)
matrixCore.updateDisplay()
cp()  // CP 9: Grid2x2 drawMesh OK

for (let f = 0; f < 50; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeA, f * 3, f * 5, f * 2)
    matrix3D.drawMesh(cubeA, 0xFF00FF)
    matrixCore.updateDisplay()
    basic.pause(20)
}
cp()  // CP 10: 50-frame Grid2x2 spin OK

const cubeB = matrix3D.createCube(12)
cp()  // CP 11: second cube created OK

for (let f = 0; f < 50; f++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeA, f * 3, f * 5, f * 2)
    matrix3D.drawMesh(cubeA, 0xFF0000)
    matrix3D.setRotation(cubeB, f * 2, f * 7, f * 4)
    matrix3D.drawMesh(cubeB, 0x00FF88)
    matrixCore.updateDisplay()
    basic.pause(20)
}
cp()  // CP 12: dual cube spin OK

// CP 13..25: fill remaining LEDs
while (_cp < 25) cp()

basic.pause(500)
basic.showIcon(IconNames.Happy)
