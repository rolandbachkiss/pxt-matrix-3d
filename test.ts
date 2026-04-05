// ============================================================
// PHASE 3 DIAGNOSTIC — crash is in updateDisplay (CP 18 confirmed)
// The cube renders visibly on the NeoPixel panel, so lineRGB+setPixelBuf
// works fine. The crash is somewhere inside flushChanged() or right after.
//
// This test splits updateDisplay into its sub-operations manually
// so we can pinpoint: setPixelColor loop vs show() vs front.write()
//
// LED map: left-to-right, top-to-bottom, 5 per row
// ============================================================

let _cpIdx = 0
function cp(): void {
    led.plot(_cpIdx % 5, Math.idiv(_cpIdx, 5))
    _cpIdx++
    basic.pause(150)
}

// ── CP 1: started ────────────────────────────────────────────────────────
cp()

// ── CP 2: init ───────────────────────────────────────────────────────────
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()

// ── CP 3: create cube, draw it manually into back buffer ─────────────────
const cubeId = matrix3D.createCube(10)
const sx: number[] = []
const sy: number[] = []
const verts = [-10,-10,-10, 10,-10,-10, 10,10,-10, -10,10,-10,
               -10,-10,10,  10,-10,10,  10,10,10,  -10,10,10]
for (let i = 0; i < 8; i++) {
    const vz = verts[i * 3 + 2] + 300
    sx.push(matrixCore.centerX() + Math.idiv(verts[i * 3] * 128, vz))
    sy.push(matrixCore.centerY() + Math.idiv(verts[i * 3 + 1] * 128, vz))
}
const edges = [0,1, 1,2, 2,3, 3,0, 4,5, 5,6, 6,7, 7,4, 0,4, 1,5, 2,6, 3,7]
for (let e = 0; e < 12; e++) {
    const a = edges[e * 2]; const b = edges[e * 2 + 1]
    matrixDraw.lineRGB(sx[a], sy[a], sx[b], sy[b], 0, 200, 255)
}
cp()

// ── CP 4: back buffer is populated. Now split flushChanged manually. ──────
// Step A: how many pixels differ between back and front?
// (front is all zeros after init, back has the cube lines)
// Count changed pixels — no NeoPixel calls yet.
let changedCount = 0
const w = matrixCore.width()   // 16
const h = matrixCore.height()  // 16
const back = matrixCore.getBackBuffer()
const front = matrixCore.getFrontBuffer()
for (let i = 0; i < w * h; i++) {
    const off = i * 3
    if (back[off] !== front[off] || back[off+1] !== front[off+1] || back[off+2] !== front[off+2]) {
        changedCount++
    }
}
// Show count on screen briefly so we can see it
basic.showNumber(changedCount)
basic.pause(1000)
cp()

// ── CP 5: call setPixelColor for just ONE changed pixel (index 0 if changed) ──
// This tests whether the neopixel strip accepts setPixelColor at all.
const strip = neopixel.create(DigitalPin.P0, 256, NeoPixelMode.RGB)
strip.setBrightness(40)
cp()

// ── CP 6: setPixelColor on a known-good index ────────────────────────────
strip.setPixelColor(0, 0x0000FF)
cp()

// ── CP 7: strip.show() — the first real show() call ──────────────────────
strip.show()
cp()

// ── CP 8: strip.show() second time (empty) ───────────────────────────────
strip.show()
cp()

// ── CP 9: now call matrixCore.updateDisplay() for the first time ──────────
// The back buffer still has the cube. Front is still zeros.
// This will call setPixelColor for every changed pixel, then show().
matrixCore.updateDisplay()
cp()

// ── CP 10: second updateDisplay() (nothing changed — front==back now) ─────
matrixCore.updateDisplay()
cp()

// ── CP 11: clear and updateDisplay ───────────────────────────────────────
matrixCore.clear()
matrixCore.updateDisplay()
cp()

// ── CP 12: full drawMesh cycle with updateDisplay ─────────────────────────
matrixCore.clear()
matrix3D.setRotation(cubeId, 0, 0, 0)
matrix3D.drawMesh(cubeId, 0x00FFFF)
matrixCore.updateDisplay()
cp()

// ── CP 13–25: survived ───────────────────────────────────────────────────
for (let i = 0; i < 13; i++) cp()

basic.pause(500)
basic.showIcon(IconNames.Happy)
