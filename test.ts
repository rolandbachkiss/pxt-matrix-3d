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
