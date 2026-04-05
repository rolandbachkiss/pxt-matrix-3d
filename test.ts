// ============================================================
// DIAGNOSTIC TEST — pxt-matrix-3d crash localisation
// Uses the micro:bit 5×5 LED matrix as 25 checkpoints.
// Each checkpoint lights one LED (row by row, left to right).
// When the micro:bit freezes, count the last lit LED to find
// which step crashed.
//
// Checkpoint map (row, col) — 0-indexed:
//   CP 1  → (0,0)   CP 2  → (0,1)   CP 3  → (0,2)   CP 4  → (0,3)   CP 5  → (0,4)
//   CP 6  → (1,0)   CP 7  → (1,1)   CP 8  → (1,2)   CP 9  → (1,3)   CP 10 → (1,4)
//   CP 11 → (2,0)   CP 12 → (2,1)   CP 13 → (2,2)   CP 14 → (2,3)   CP 15 → (2,4)
//   CP 16 → (3,0)   CP 17 → (3,1)   CP 18 → (3,2)   CP 19 → (3,3)   CP 20 → (3,4)
//   CP 21 → (4,0)   CP 22 → (4,1)   CP 23 → (4,2)   CP 24 → (4,3)   CP 25 → (4,4)
//
// After all 25 checkpoints pass, a smiley face is shown = ALL TESTS PASSED.
// ============================================================

let _cpIndex = 0  // 0..24

function cp(): void {
    // Light the next LED without clearing previous ones —
    // so you see the trail of all passed checkpoints.
    const row = Math.idiv(_cpIndex, 5)
    const col = _cpIndex % 5
    led.plot(col, row)
    _cpIndex++
    basic.pause(100)   // brief pause so the LED is visible before next step
}

// ============================================================
// STEP 0 — Baseline: does the micro:bit even start?
// If NO LEDs ever light up, the crash is in module-level
// static initialisers (the const arrays at the top of matrix-3d.ts).
// ============================================================
cp()  // CP 1 — program started

// ============================================================
// STEP 1 — sinDeg1000 table: boundary values that caused problems
// before (indices 0, 90, 180, 270, 359)
// ============================================================
const s0   = matrix3D.sinDeg1000(0)
const s90  = matrix3D.sinDeg1000(90)
const s180 = matrix3D.sinDeg1000(180)
const s270 = matrix3D.sinDeg1000(270)
const s359 = matrix3D.sinDeg1000(359)
cp()  // CP 2 — sinDeg1000 boundary values OK

const c0   = matrix3D.cosDeg1000(0)
const c90  = matrix3D.cosDeg1000(90)
const c180 = matrix3D.cosDeg1000(180)
cp()  // CP 3 — cosDeg1000 OK

// ============================================================
// STEP 2 — initNeoPixel (allocates framebuffers + strip)
// This is the first large heap allocation.  If this crashes,
// the NeoPixel strip is on the wrong pin, or the layout
// requests more RAM than is available.
// Using Row1 (single 16×16 panel, smallest possible).
// ============================================================
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()  // CP 4 — initNeoPixel Row1 OK

// ============================================================
// STEP 3 — createCube (builds vertex + edge arrays)
// ============================================================
const cubeId = matrix3D.createCube(10)
cp()  // CP 5 — createCube returned

// Check it returned a valid ID (0)
if (cubeId !== 0) {
    // Blink the last CP rapidly to signal bad return value
    for (let i = 0; i < 10; i++) {
        led.toggle((_cpIndex - 1) % 5, Math.idiv(_cpIndex - 1, 5))
        basic.pause(200)
    }
}
cp()  // CP 6 — cubeId check passed

// ============================================================
// STEP 4 — setRotation (pure array writes, no math)
// ============================================================
matrix3D.setRotation(cubeId, 0, 0, 0)
cp()  // CP 7 — setRotation(0,0,0) OK

matrix3D.setRotation(cubeId, 45, 45, 0)
cp()  // CP 8 — setRotation(45,45,0) OK

// ============================================================
// STEP 5 — matrixCore.clear() (fills back buffer with zeros)
// ============================================================
matrixCore.clear()
cp()  // CP 9 — clear OK

// ============================================================
// STEP 6 — drawMesh with rotation 0,0,0
// This exercises: trig lookup → rotation math → project() →
// sx[]/sy[] push → matrixDraw.lineRGB → setPixelBuf
// ============================================================
matrix3D.setRotation(cubeId, 0, 0, 0)
matrix3D.drawMesh(cubeId, 0x00FFFF)
cp()  // CP 10 — drawMesh(0,0,0) survived

// ============================================================
// STEP 7 — updateDisplay (pushes pixels to NeoPixel strip)
// If no strip is connected this is safe — strip.show() on an
// empty / disconnected strip does not crash.
// ============================================================
matrixCore.updateDisplay()
cp()  // CP 11 — updateDisplay OK

// ============================================================
// STEP 8 — drawMesh with a 45° rotation (all trig paths active)
// ============================================================
matrixCore.clear()
matrix3D.setRotation(cubeId, 45, 30, 15)
matrix3D.drawMesh(cubeId, 0xFF0000)
matrixCore.updateDisplay()
cp()  // CP 12 — drawMesh(45,30,15) OK

// ============================================================
// STEP 9 — draw 5 frames in a loop (heap stress test)
// This is the most likely crash site: repeated []/{}.push()
// inside drawMesh allocates fresh arrays each call.
// If it crashes here but not at CP 12, the bug is heap
// exhaustion / GC fragmentation from repeated allocations.
// ============================================================
for (let frame = 0; frame < 5; frame++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, frame * 20, frame * 30, frame * 10)
    matrix3D.drawMesh(cubeId, 0x00FF00)
    matrixCore.updateDisplay()
    basic.pause(50)
}
cp()  // CP 13 — 5-frame loop survived

// ============================================================
// STEP 10 — 36 frames (full trig sweep, every 10°)
// This is a longer heap stress.  Each drawMesh call allocates
// two number[] of length 8 (sx, sy) plus pushes.
// Expect crash here if heap is the culprit.
// ============================================================
for (let frame = 0; frame < 36; frame++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, frame * 10, frame * 10, 0)
    matrix3D.drawMesh(cubeId, 0x0000FF)
    matrixCore.updateDisplay()
    basic.pause(30)
}
cp()  // CP 14 — 36-frame sweep survived

// ============================================================
// STEP 11 — second cube (tests MAX_MESHES limit and a second
// set of vertex/edge arrays being alive at the same time)
// ============================================================
const cube2 = matrix3D.createCube(6)
cp()  // CP 15 — second createCube OK

// ============================================================
// STEP 12 — draw both cubes alternating for 20 frames
// ============================================================
for (let frame = 0; frame < 20; frame++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, frame * 15, frame * 10, 0)
    matrix3D.drawMesh(cubeId, 0xFFFF00)
    matrix3D.setRotation(cube2, 0, frame * 20, frame * 5)
    matrix3D.drawMesh(cube2, 0xFF00FF)
    matrixCore.updateDisplay()
    basic.pause(50)
}
cp()  // CP 16 — two-cube 20-frame loop survived

// ============================================================
// STEP 13 — camera distance variation
// ============================================================
matrix3D.setCameraDistance(50)
matrixCore.clear()
matrix3D.setRotation(cubeId, 20, 20, 0)
matrix3D.drawMesh(cubeId, 0xFFFFFF)
matrixCore.updateDisplay()
cp()  // CP 17 — setCameraDistance(50) + drawMesh OK

matrix3D.setCameraDistance(300)
matrixCore.clear()
matrix3D.drawMesh(cubeId, 0xFFFFFF)
matrixCore.updateDisplay()
cp()  // CP 18 — setCameraDistance(300) + drawMesh OK

// Reset to default
matrix3D.setCameraDistance(200)
cp()  // CP 19 — camera reset OK

// ============================================================
// STEP 14 — 100-frame continuous spin (the real workload)
// If this passes, the extension is stable enough for demos.
// ============================================================
for (let frame = 0; frame < 100; frame++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, frame * 2, frame * 3, frame)
    matrix3D.drawMesh(cubeId, 0x00FFFF)
    matrixCore.updateDisplay()
    basic.pause(30)
}
cp()  // CP 20 — 100-frame spin survived

// ============================================================
// STEP 15 — Grid2x2 layout (larger framebuffer, more RAM)
// Re-init to the full 32×32 setup.
// ============================================================
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Grid2x2)
cp()  // CP 21 — re-init Grid2x2 OK

matrixCore.clear()
matrix3D.setRotation(cubeId, 30, 45, 10)
matrix3D.drawMesh(cubeId, 0x00FFFF)
matrixCore.updateDisplay()
cp()  // CP 22 — drawMesh on Grid2x2 OK

// 50-frame spin on full grid
for (let frame = 0; frame < 50; frame++) {
    matrixCore.clear()
    matrix3D.setRotation(cubeId, frame * 3, frame * 2, frame)
    matrix3D.drawMesh(cubeId, 0xFF8800)
    matrixCore.updateDisplay()
    basic.pause(30)
}
cp()  // CP 23 — 50-frame spin on Grid2x2 survived

// ============================================================
// STEP 16 — trig edge cases: negative angles, >360°
// ============================================================
const sNeg = matrix3D.sinDeg1000(-90)
const sBig = matrix3D.sinDeg1000(720)
const cNeg = matrix3D.cosDeg1000(-180)
cp()  // CP 24 — negative/overflow angle trig OK

// ============================================================
// ALL TESTS PASSED
// ============================================================
cp()  // CP 25 — reached the end

basic.pause(500)
// Show smiley = all passed
basic.showIcon(IconNames.Happy)
