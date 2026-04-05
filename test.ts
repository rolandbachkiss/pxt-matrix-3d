// test.ts — comprehensive visual tests for pxt-matrix-3d

// ---------------------------------------------------------------------------
// Step 1: Initialize the matrix
// ---------------------------------------------------------------------------
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Grid2x2)

const cyan = matrixCore.rgb(0, 200, 255)
const yellow = matrixCore.rgb(255, 255, 0)
const red = matrixCore.rgb(255, 0, 0)
const green = matrixCore.rgb(0, 255, 0)
const blue = matrixCore.rgb(0, 0, 255)
const white = matrixCore.rgb(255, 255, 255)

// ---------------------------------------------------------------------------
// Test 1: Basic spinning cube
// ---------------------------------------------------------------------------
const cube1 = matrix3D.createCube(10)
let frame = 0

for (let i = 0; i < 100; i++) {
    matrixCore.clear()
    matrix3D.setRotation(cube1, frame * 2, frame * 3, frame)
    matrix3D.drawMesh(cube1, cyan)
    matrixCore.updateDisplay()
    basic.pause(70)
    frame++
}
basic.pause(500)

// ---------------------------------------------------------------------------
// Test 2: Multiple cubes with different sizes
// ---------------------------------------------------------------------------
matrixCore.clear()
const cubeSmall = matrix3D.createCube(5)
const cubeLarge = matrix3D.createCube(14)

matrix3D.setRotation(cubeSmall, 30, 30, 0)
matrix3D.setRotation(cubeLarge, -30, -30, 0)

// Draw small cube on left
matrix3D.drawMesh(cubeSmall, red)
// Draw large cube on right
matrix3D.drawMesh(cubeLarge, blue)
matrixCore.updateDisplay()
basic.pause(2000)

// ---------------------------------------------------------------------------
// Test 3: Camera distance variation
// ---------------------------------------------------------------------------
const cube2 = matrix3D.createCube(8)
frame = 0

for (let dist = 100; dist <= 300; dist += 20) {
    matrixCore.clear()
    matrix3D.setCameraDistance(dist)
    matrix3D.setRotation(cube2, frame * 2, frame * 3, frame)
    matrix3D.drawMesh(cube2, yellow)
    matrixCore.updateDisplay()
    basic.pause(100)
    frame++
}
basic.pause(500)

// Reset camera
matrix3D.setCameraDistance(200)

// ---------------------------------------------------------------------------
// Test 3: Trig functions - draw sine wave
// ---------------------------------------------------------------------------
matrixCore.clear()
for (let x = 0; x < 32; x++) {
    const angle = x * 10
    const sinVal = matrix3D.sinDeg(angle) / 1000
    const y = 16 + Math.round(sinVal * 10)
    matrixCore.setPixel(x, y, red)
}
matrixCore.updateDisplay()
basic.pause(2000)

// ---------------------------------------------------------------------------
// Test 4: Rotation axis isolation
// ---------------------------------------------------------------------------
const cube4 = matrix3D.createCube(6)

// X axis rotation
for (let angle = 0; angle < 360; angle += 15) {
    matrixCore.clear()
    matrix3D.setRotation(cube4, angle, 0, 0)
    matrix3D.drawMesh(cube4, red)
    matrixCore.updateDisplay()
    basic.pause(50)
}

// Y axis rotation
for (let angle = 0; angle < 360; angle += 15) {
    matrixCore.clear()
    matrix3D.setRotation(cube4, 0, angle, 0)
    matrix3D.drawMesh(cube4, green)
    matrixCore.updateDisplay()
    basic.pause(50)
}

// Z axis rotation
for (let angle = 0; angle < 360; angle += 15) {
    matrixCore.clear()
    matrix3D.setRotation(cube4, 0, 0, angle)
    matrix3D.drawMesh(cube4, blue)
    matrixCore.updateDisplay()
    basic.pause(50)
}

// ---------------------------------------------------------------------------
// Test 5: Continuous spinning cube
// ---------------------------------------------------------------------------
const cube5 = matrix3D.createCube(9)
frame = 0

basic.forever(function () {
    matrixCore.clear()
    matrix3D.setRotation(cube5, frame * 1.5, frame * 2.5, frame * 0.5)
    matrix3D.drawMesh(cube5, white)
    matrixCore.updateDisplay()
    basic.pause(70)
    frame++
})
