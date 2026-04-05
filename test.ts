// ============================================================
// PHASE 5 — pinpoint exactly which allocation causes OOM 841
// We test each heap allocation in isolation before calling
// any matrix3D functions.
// ============================================================

let _cpIdx = 0
function cp(): void {
    led.plot(_cpIdx % 5, Math.idiv(_cpIdx, 5))
    _cpIdx++
    basic.pause(150)
}

cp()  // CP 1: program started — static initialisers done
// At this point SIN_TABLE (91 numbers) + all the empty [] arrays
// in matrix3D namespace are already allocated.

// ── CP 2: how much free heap do we have right now? ───────────────────────
// Allocate increasing buffers until we fail — gives us a floor.
// We use Buffer (not number[]) so we don't add to the problem.
// Show the result as a scrolling number (KB free).
let freeKb = 0
for (let kb = 1; kb <= 200; kb++) {
    // Try to allocate kb*1024 bytes as a Buffer
    // MakeCode doesn't expose try/catch but we can probe with a small helper:
    // just count how far we get before things break.
    // Actually we can't safely do this — skip and just log a marker.
    freeKb = kb
    if (kb > 10) break   // stop after 10 iterations, just a sanity marker
}
basic.showNumber(999)   // marker: we reached CP 2 without crash
basic.pause(1000)
cp()  // CP 2

// ── CP 3: initNeoPixel (allocates strip + two 768-byte buffers for Row1) ──
matrixCore.initNeoPixel(DigitalPin.P0, MatrixLayout.Row1)
cp()  // CP 3

// ── CP 4: allocate JUST the vertex array from createCube (24 numbers) ─────
const verts: number[] = [
    -10, -10, -10,
     10, -10, -10,
     10,  10, -10,
    -10,  10, -10,
    -10, -10,  10,
     10, -10,  10,
     10,  10,  10,
    -10,  10,  10
]
cp()  // CP 4: 24-element number[] allocated after initNeoPixel

// ── CP 5: allocate the edge array (24 numbers) ────────────────────────────
const edges: number[] = [
    0, 1,  1, 2,  2, 3,  3, 0,
    4, 5,  5, 6,  6, 7,  7, 4,
    0, 4,  1, 5,  2, 6,  3, 7
]
cp()  // CP 5: edges array allocated

// ── CP 6: allocate _sx and _sy equivalents (16 numbers each) ─────────────
const sx: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
const sy: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
cp()  // CP 6: projection scratch arrays allocated

// ── CP 7: now call createCube (allocates its OWN copies of verts+edges) ───
const cubeId = matrix3D.createCube(10)
cp()  // CP 7: createCube survived

// ── CP 8: drawMesh with the pre-fixed code ────────────────────────────────
matrixCore.clear()
matrix3D.setRotation(cubeId, 0, 0, 0)
matrix3D.drawMesh(cubeId, 0x00FFFF)
cp()  // CP 8: drawMesh survived

matrixCore.updateDisplay()
cp()  // CP 9: updateDisplay survived

// ── CP 10: try allocating verts as a Buffer instead ──────────────────────
// Buffer uses 1 byte per element — 24 bytes vs ~200 bytes for number[24]
// This is what we'll switch to in the real fix.
const vertsBuf = pins.createBuffer(24 * 2)  // 2 bytes per coord (int16)
vertsBuf.setNumber(NumberFormat.Int16LE, 0,  -10)
vertsBuf.setNumber(NumberFormat.Int16LE, 2,  -10)
vertsBuf.setNumber(NumberFormat.Int16LE, 4,  -10)
// ... just testing the allocation works
cp()  // CP 10: Buffer allocation works

for (let i = 0; i < 15; i++) cp()  // CP 11..25

basic.pause(500)
basic.showIcon(IconNames.Happy)
