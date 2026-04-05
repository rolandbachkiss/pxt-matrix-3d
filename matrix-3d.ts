/**
 * Integer 3D math, perspective projection and wireframe mesh rendering
 * for NeoPixel matrix panels.
 *
 * All arithmetic uses integer math (×1000 scaled intermediates) for
 * performance on micro:bit V2.
 *
 * Memory strategy: every data array is a Buffer (raw bytes), not a
 * number[] (boxed values). This cuts per-element cost from ~12 bytes
 * to 2 bytes and avoids error 841 (OOM) on the micro:bit heap.
 */
//% color="#7c3aed" icon="\uf1b2" weight=75
//% groups='["Trig", "Meshes", "Camera", "Advanced"]'
namespace matrix3D {

    // -----------------------------------------------------------------------
    // Integer sine table — stored as Int16 Buffer (2 bytes/entry, not ~12).
    // 91 entries covering 0°–90°, values ×1000.
    // Total: 182 bytes vs ~1092 bytes as number[].
    // -----------------------------------------------------------------------
    const SIN_TABLE = hex`00001100230034004600570069007a008b009c00ae00bf00d000e100f2000301140124013501460156016601770187019701a701b601c601d501e501f4010302120221022f023e024c025a0268027502830290029d02aa02b702c302cf02db02e702f302fe02090314031f03290333033d0347035003590362036b0373037b0383038a03920399039f03a603ac03b203b703bc03c103c603ca03ce03d203d603d903dc03de03e103e303e403e603e703e703e803e803`

    // Read one Int16LE value from SIN_TABLE by degree index (0..90)
    function sinTableAt(i: number): number {
        return SIN_TABLE.getNumber(NumberFormat.Int16LE, i * 2)
    }

    /**
     * Returns sin(deg) × 1000 using integer arithmetic.
     */
    export function sinDeg1000(deg: number): number {
        deg = deg % 360
        if (deg < 0) deg += 360
        if (deg <= 90)  return sinTableAt(deg)
        if (deg <= 180) return sinTableAt(180 - deg)
        if (deg <= 270) return -sinTableAt(deg - 180)
        return -sinTableAt(360 - deg)
    }

    /**
     * Returns cos(deg) × 1000 using integer arithmetic.
     */
    export function cosDeg1000(deg: number): number {
        return sinDeg1000(deg + 90)
    }

    // -----------------------------------------------------------------------
    // Public trig blocks
    // -----------------------------------------------------------------------

    /**
     * Returns sin of an angle in degrees, scaled ×1000 (integer result).
     * @param deg angle in degrees
     */
    //% blockId=matrix3d_sin block="sin of $deg degrees ×1000"
    //% group="Advanced" weight=20
    export function sinDeg(deg: number): number {
        return sinDeg1000(deg)
    }

    /**
     * Returns cos of an angle in degrees, scaled ×1000 (integer result).
     * @param deg angle in degrees
     */
    //% blockId=matrix3d_cos block="cos of $deg degrees ×1000"
    //% group="Advanced" weight=19
    export function cosDeg(deg: number): number {
        return cosDeg1000(deg)
    }

    // -----------------------------------------------------------------------
    // Camera / projection state  (plain scalars — no heap cost)
    // -----------------------------------------------------------------------

    let _viewerDist = 200
    let _fov = 128
    let _zOffset = 100

    /**
     * Set the camera (viewer) distance used for perspective projection.
     * @param d viewer distance, eg: 200
     */
    //% blockId=matrix3d_set_camera
    //% block="set camera distance $d"
    //% d.defl=200 d.min=50 d.max=500
    //% group="Camera" weight=90
    export function setCameraDistance(d: number): void {
        _viewerDist = d
    }

    /**
     * Set the field-of-view scale factor. Larger values zoom in.
     * @param f FOV scale factor, eg: 128
     */
    //% blockId=matrix3d_set_fov
    //% block="set field of view $f"
    //% f.defl=128 f.min=32 f.max=256
    //% group="Camera" weight=89
    export function setFOV(f: number): void {
        _fov = f
    }

    // -----------------------------------------------------------------------
    // 3D → 2D projection  (results in plain scalars)
    // -----------------------------------------------------------------------

    let _projX = 0
    let _projY = 0

    function project(vx: number, vy: number, vz: number): void {
        const z = vz + _zOffset + _viewerDist
        if (z <= 0) { _projX = -999; _projY = -999; return }
        _projX = matrixCore.centerX() + Math.idiv(vx * _fov, z)
        _projY = matrixCore.centerY() + Math.idiv(vy * _fov, z)
    }

    // -----------------------------------------------------------------------
    // Mesh storage — Buffers only, no number[] arrays
    //
    // _meshVerts[id] : Buffer of Int16LE, 3 values per vertex (x, y, z)
    //                  cube = 8 verts × 3 × 2 bytes = 48 bytes
    // _meshEdges[id] : Buffer of UInt8,  2 indices per edge
    //                  cube = 12 edges × 2 × 1 byte  = 24 bytes
    // _meshRot       : single flat Buffer of Int16LE, 3 angles per mesh
    //                  4 meshes × 3 × 2 bytes = 24 bytes total
    //
    // Projection scratch: two Buffers of Int16LE, MAX_VERTS entries each
    //                  16 × 2 × 2 bytes = 64 bytes total
    //
    // Grand total for all mesh data: ~160 bytes vs ~1500 bytes with number[]
    // -----------------------------------------------------------------------

    const MAX_MESHES = 4
    const MAX_VERTS  = 16

    // Parallel arrays of Buffers — one slot per mesh
    // Initialised as empty; filled by createCube / future createMesh.
    let _meshVerts: Buffer[] = []
    let _meshEdges: Buffer[] = []
    let _meshCount = 0

    // Rotation angles: flat Buffer [ax0, ay0, az0, ax1, ay1, az1, ...]
    // Int16LE so angles up to ±32767° work fine.
    const _meshRot = pins.createBuffer(MAX_MESHES * 3 * 2)   // 24 bytes

    // Projection scratch buffers — allocated once, reused every frame
    const _sx = pins.createBuffer(MAX_VERTS * 2)   // Int16LE screen X
    const _sy = pins.createBuffer(MAX_VERTS * 2)   // Int16LE screen Y

    // -----------------------------------------------------------------------
    // Mesh creation
    // -----------------------------------------------------------------------

    /**
     * Create a wireframe cube mesh. Returns the mesh ID (0-based).
     * @param size half-size of the cube (vertices at ±size), eg: 10
     */
    //% blockId=matrix3d_create_cube
    //% block="create cube mesh size $size"
    //% size.defl=10 size.min=2 size.max=30
    //% group="Meshes" weight=100
    export function createCube(size: number): number {
        if (_meshCount >= MAX_MESHES) return -1
        const s = size

        // 8 vertices × 3 coords × 2 bytes = 48 bytes
        // Direct Buffer writes — no intermediate number[] allocation.
        const vb = pins.createBuffer(8 * 3 * 2)
        // vertex 0: -s,-s,-s
        vb.setNumber(NumberFormat.Int16LE,  0, -s); vb.setNumber(NumberFormat.Int16LE,  2, -s); vb.setNumber(NumberFormat.Int16LE,  4, -s)
        // vertex 1:  s,-s,-s
        vb.setNumber(NumberFormat.Int16LE,  6,  s); vb.setNumber(NumberFormat.Int16LE,  8, -s); vb.setNumber(NumberFormat.Int16LE, 10, -s)
        // vertex 2:  s, s,-s
        vb.setNumber(NumberFormat.Int16LE, 12,  s); vb.setNumber(NumberFormat.Int16LE, 14,  s); vb.setNumber(NumberFormat.Int16LE, 16, -s)
        // vertex 3: -s, s,-s
        vb.setNumber(NumberFormat.Int16LE, 18, -s); vb.setNumber(NumberFormat.Int16LE, 20,  s); vb.setNumber(NumberFormat.Int16LE, 22, -s)
        // vertex 4: -s,-s, s
        vb.setNumber(NumberFormat.Int16LE, 24, -s); vb.setNumber(NumberFormat.Int16LE, 26, -s); vb.setNumber(NumberFormat.Int16LE, 28,  s)
        // vertex 5:  s,-s, s
        vb.setNumber(NumberFormat.Int16LE, 30,  s); vb.setNumber(NumberFormat.Int16LE, 32, -s); vb.setNumber(NumberFormat.Int16LE, 34,  s)
        // vertex 6:  s, s, s
        vb.setNumber(NumberFormat.Int16LE, 36,  s); vb.setNumber(NumberFormat.Int16LE, 38,  s); vb.setNumber(NumberFormat.Int16LE, 40,  s)
        // vertex 7: -s, s, s
        vb.setNumber(NumberFormat.Int16LE, 42, -s); vb.setNumber(NumberFormat.Int16LE, 44,  s); vb.setNumber(NumberFormat.Int16LE, 46,  s)

        // 12 edges × 2 indices × 1 byte = 24 bytes
        // Direct byte writes — no intermediate number[] allocation.
        const eb = pins.createBuffer(12 * 2)
        // Front face
        eb[0]=0;  eb[1]=1;  eb[2]=1;  eb[3]=2;  eb[4]=2;  eb[5]=3;  eb[6]=3;  eb[7]=0
        // Back face
        eb[8]=4;  eb[9]=5;  eb[10]=5; eb[11]=6; eb[12]=6; eb[13]=7; eb[14]=7; eb[15]=4
        // Connecting edges
        eb[16]=0; eb[17]=4; eb[18]=1; eb[19]=5; eb[20]=2; eb[21]=6; eb[22]=3; eb[23]=7

        const id = _meshCount
        _meshVerts[id] = vb
        _meshEdges[id] = eb
        // Rotation angles default to 0
        _meshRot.setNumber(NumberFormat.Int16LE, id * 6,     0)
        _meshRot.setNumber(NumberFormat.Int16LE, id * 6 + 2, 0)
        _meshRot.setNumber(NumberFormat.Int16LE, id * 6 + 4, 0)
        _meshCount++
        return id
    }

    // -----------------------------------------------------------------------
    // Mesh rotation
    // -----------------------------------------------------------------------

    /**
     * Set the rotation angles (in degrees) for a mesh.
     * @param id mesh ID returned by createCube
     * @param ax rotation around X axis in degrees
     * @param ay rotation around Y axis in degrees
     * @param az rotation around Z axis in degrees
     */
    //% blockId=matrix3d_set_rotation
    //% block="set mesh $id rotation x $ax y $ay z $az"
    //% group="Meshes" weight=90
    export function setRotation(id: number, ax: number, ay: number, az: number): void {
        if (id < 0 || id >= _meshCount) return
        _meshRot.setNumber(NumberFormat.Int16LE, id * 6,     ax)
        _meshRot.setNumber(NumberFormat.Int16LE, id * 6 + 2, ay)
        _meshRot.setNumber(NumberFormat.Int16LE, id * 6 + 4, az)
    }

    // -----------------------------------------------------------------------
    // Mesh drawing
    // -----------------------------------------------------------------------

    /**
     * Rotate all vertices of mesh $id by its current rotation angles,
     * project them to 2D, then draw each edge using matrixDraw.lineRGB.
     * @param id mesh ID returned by createCube
     * @param c RGB colour (use the colour picker)
     */
    //% blockId=matrix3d_draw_mesh
    //% block="draw mesh $id color $c"
    //% c.shadow="colorNumberPicker"
    //% group="Meshes" weight=89
    export function drawMesh(id: number, c: number): void {
        if (id < 0 || id >= _meshCount) return

        const vb = _meshVerts[id]
        const eb = _meshEdges[id]
        const ax = _meshRot.getNumber(NumberFormat.Int16LE, id * 6)
        const ay = _meshRot.getNumber(NumberFormat.Int16LE, id * 6 + 2)
        const az = _meshRot.getNumber(NumberFormat.Int16LE, id * 6 + 4)

        const cosX = cosDeg1000(ax); const sinX = sinDeg1000(ax)
        const cosY = cosDeg1000(ay); const sinY = sinDeg1000(ay)
        const cosZ = cosDeg1000(az); const sinZ = sinDeg1000(az)

        const r = (c >> 16) & 0xff
        const g = (c >> 8)  & 0xff
        const b =  c        & 0xff

        const numVerts = Math.min(Math.idiv(vb.length, 6), MAX_VERTS)

        // Transform each vertex and store result in scratch Buffers
        for (let i = 0; i < numVerts; i++) {
            const ox = vb.getNumber(NumberFormat.Int16LE, i * 6)
            const oy = vb.getNumber(NumberFormat.Int16LE, i * 6 + 2)
            const oz = vb.getNumber(NumberFormat.Int16LE, i * 6 + 4)

            // Rotate X
            const ry  = Math.idiv(oy * cosX - oz * sinX, 1000)
            const rz1 = Math.idiv(oy * sinX + oz * cosX, 1000)
            // Rotate Y
            const rx2 = Math.idiv(ox * cosY + rz1 * sinY, 1000)
            const rz2 = Math.idiv(-ox * sinY + rz1 * cosY, 1000)
            // Rotate Z
            const rx3 = Math.idiv(rx2 * cosZ - ry * sinZ, 1000)
            const ry3 = Math.idiv(rx2 * sinZ + ry * cosZ, 1000)

            project(rx3, ry3, rz2)
            _sx.setNumber(NumberFormat.Int16LE, i * 2, _projX)
            _sy.setNumber(NumberFormat.Int16LE, i * 2, _projY)
        }

        // Draw each edge
        const numEdges = Math.idiv(eb.length, 2)
        for (let e = 0; e < numEdges; e++) {
            const a = eb[e * 2]
            const bv = eb[e * 2 + 1]
            const ax2 = _sx.getNumber(NumberFormat.Int16LE, a  * 2)
            const bx  = _sx.getNumber(NumberFormat.Int16LE, bv * 2)
            if (ax2 === -999 || bx === -999) continue
            const ay2 = _sy.getNumber(NumberFormat.Int16LE, a  * 2)
            const by  = _sy.getNumber(NumberFormat.Int16LE, bv * 2)
            matrixDraw.lineRGB(ax2, ay2, bx, by, r, g, b)
        }
    }

    // -----------------------------------------------------------------------
    // Advanced: project single point
    // -----------------------------------------------------------------------

    /**
     * Project a 3D point to 2D screen coordinates.
     * Read the result with "last projected X" and "last projected Y".
     * @param x 3D x coordinate
     * @param y 3D y coordinate
     * @param z 3D z coordinate
     * @param sx unused (reserved)
     * @param sy unused (reserved)
     */
    //% blockId=matrix3d_project_point
    //% block="project 3D point x $x y $y z $z screen-x %sx screen-y %sy"
    //% group="Advanced" weight=10
    export function projectPoint(x: number, y: number, z: number, sx: number, sy: number): void {
        project(x, y, z)
    }

    /**
     * Returns the screen X coordinate from the last projectPoint call.
     */
    //% blockId=matrix3d_last_proj_x block="last projected X"
    //% group="Advanced"
    export function lastProjX(): number { return _projX }

    /**
     * Returns the screen Y coordinate from the last projectPoint call.
     */
    //% blockId=matrix3d_last_proj_y block="last projected Y"
    //% group="Advanced"
    export function lastProjY(): number { return _projY }

} // namespace matrix3D
