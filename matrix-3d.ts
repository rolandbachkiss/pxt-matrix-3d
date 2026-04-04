/**
 * Integer 3D math, perspective projection and wireframe mesh rendering
 * for NeoPixel matrix panels.
 *
 * All arithmetic uses integer math (×1000 scaled intermediates) for
 * performance on micro:bit V2.
 */
//% color="#7c3aed" icon="\uf1b2" weight=75
//% groups='["Trig", "Meshes", "Camera", "Advanced"]'
namespace matrix3D {

    // -----------------------------------------------------------------------
    // Integer sine table (degrees 0–90, values ×1000)
    // -----------------------------------------------------------------------
    const SIN_TABLE: number[] = [
        0, 17, 35, 52, 70, 87, 105, 122, 139, 156,
        174, 191, 208, 225, 242, 259, 276, 292, 309, 326,
        342, 358, 375, 391, 407, 423, 438, 454, 469, 485,
        500, 515, 530, 545, 559, 574, 588, 602, 616, 629,
        643, 656, 669, 682, 695, 707, 719, 731, 743, 755,
        766, 777, 788, 799, 809, 819, 829, 839, 848, 857,
        866, 875, 883, 891, 899, 906, 914, 921, 927, 934,
        940, 946, 951, 956, 961, 966, 970, 974, 978, 982,
        985, 988, 990, 993, 995, 996, 998, 999, 999, 1000,
        1000
    ]

    /**
     * Returns sin(deg) × 1000 using integer arithmetic.
     * Not exposed as a block — use sinDeg() for block access.
     */
    export function sinDeg1000(deg: number): number {
        deg = deg % 360
        if (deg < 0) deg += 360
        if (deg <= 90) return SIN_TABLE[deg]
        if (deg <= 180) return SIN_TABLE[180 - deg]
        if (deg <= 270) return -SIN_TABLE[deg - 180]
        return -SIN_TABLE[360 - deg]
    }

    /**
     * Returns cos(deg) × 1000 using integer arithmetic.
     * Not exposed as a block — use cosDeg() for block access.
     */
    export function cosDeg1000(deg: number): number {
        return sinDeg1000(deg + 90)
    }

    // -----------------------------------------------------------------------
    // Public trig blocks (Advanced group)
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
    // Camera / projection state
    // -----------------------------------------------------------------------

    let _viewerDist = 200   // perspective viewer distance (scaled)
    let _fov = 128          // field of view scale factor
    let _zOffset = 100      // Z offset to keep objects in front of viewer

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
    // 3D → 2D projection
    // -----------------------------------------------------------------------

    let _projX = 0
    let _projY = 0

    /**
     * Internal: projects a 3D point to 2D screen coordinates.
     * Results are stored in _projX and _projY.
     */
    function project(vx: number, vy: number, vz: number): void {
        const z = vz + _zOffset + _viewerDist
        if (z <= 0) { _projX = -999; _projY = -999; return }
        _projX = matrixCore.centerX() + (vx * _fov) / z
        _projY = matrixCore.centerY() + (vy * _fov) / z
    }

    // -----------------------------------------------------------------------
    // Mesh storage
    // -----------------------------------------------------------------------

    const MAX_MESHES = 4
    let _meshVertices: number[][] = []  // [mesh][vertex_flat_xyz]
    let _meshEdges: number[][] = []     // [mesh][edge_flat_ab]
    let _meshRotX: number[] = []        // current rotation angles (degrees)
    let _meshRotY: number[] = []
    let _meshRotZ: number[] = []
    let _meshCount = 0

    // -----------------------------------------------------------------------
    // Mesh creation
    // -----------------------------------------------------------------------

    /**
     * Create a wireframe cube mesh. Returns the mesh ID used by other blocks.
     * @param size half-size of the cube (vertices at ±size), eg: 10
     */
    //% blockId=matrix3d_create_cube
    //% block="create cube mesh size $size"
    //% size.defl=10 size.min=2 size.max=30
    //% group="Meshes" weight=100
    export function createCube(size: number): number {
        if (_meshCount >= MAX_MESHES) return -1

        const s = size

        // 8 vertices: flat array [x0,y0,z0, x1,y1,z1, ...]
        const verts: number[] = [
            -s, -s, -s,  // v0
             s, -s, -s,  // v1
             s,  s, -s,  // v2
            -s,  s, -s,  // v3
            -s, -s,  s,  // v4
             s, -s,  s,  // v5
             s,  s,  s,  // v6
            -s,  s,  s   // v7
        ]

        // 12 edges: flat array [a0,b0, a1,b1, ...]
        const edges: number[] = [
            0, 1,  1, 2,  2, 3,  3, 0,  // front face
            4, 5,  5, 6,  6, 7,  7, 4,  // back face
            0, 4,  1, 5,  2, 6,  3, 7   // connecting edges
        ]

        const id = _meshCount
        _meshVertices[id] = verts
        _meshEdges[id] = edges
        _meshRotX[id] = 0
        _meshRotY[id] = 0
        _meshRotZ[id] = 0
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
        _meshRotX[id] = ax
        _meshRotY[id] = ay
        _meshRotZ[id] = az
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

        const verts = _meshVertices[id]
        const edges = _meshEdges[id]
        const ax = _meshRotX[id]
        const ay = _meshRotY[id]
        const az = _meshRotZ[id]

        // Pre-compute trig values (×1000) for all three axes
        const cosX = cosDeg1000(ax)
        const sinX = sinDeg1000(ax)
        const cosY = cosDeg1000(ay)
        const sinY = sinDeg1000(ay)
        const cosZ = cosDeg1000(az)
        const sinZ = sinDeg1000(az)

        // Decompose colour into R, G, B components
        const r = (c >> 16) & 0xff
        const g = (c >> 8) & 0xff
        const b = c & 0xff

        const numVerts = verts.length / 3

        // Build array of projected 2D screen positions
        const sx: number[] = []
        const sy: number[] = []

        for (let i = 0; i < numVerts; i++) {
            const ox = verts[i * 3]
            const oy = verts[i * 3 + 1]
            const oz = verts[i * 3 + 2]

            // --- Rotate around X axis ---
            // y' = (y * cosX - z * sinX) / 1000
            // z' = (y * sinX + z * cosX) / 1000
            const ry = (oy * cosX - oz * sinX) / 1000
            const rz1 = (oy * sinX + oz * cosX) / 1000

            // --- Rotate around Y axis ---
            // x'' = (x * cosY + z' * sinY) / 1000
            // z'' = (-x * sinY + z' * cosY) / 1000
            const rx2 = (ox * cosY + rz1 * sinY) / 1000
            const rz2 = (-ox * sinY + rz1 * cosY) / 1000

            // --- Rotate around Z axis ---
            // x''' = (x'' * cosZ - y' * sinZ) / 1000
            // y''' = (x'' * sinZ + y' * cosZ) / 1000
            const rx3 = (rx2 * cosZ - ry * sinZ) / 1000
            const ry3 = (rx2 * sinZ + ry * cosZ) / 1000

            project(rx3, ry3, rz2)
            sx[i] = _projX
            sy[i] = _projY
        }

        // Draw each edge
        const numEdges = edges.length / 2
        for (let e = 0; e < numEdges; e++) {
            const a = edges[e * 2]
            const b = edges[e * 2 + 1]
            // Skip edges whose endpoints projected off-screen
            if (sx[a] === -999 || sx[b] === -999) continue
            matrixDraw.lineRGB(sx[a], sy[a], sx[b], sy[b], r, g, b)
        }
    }

    // -----------------------------------------------------------------------
    // Advanced: project single point blocks
    // -----------------------------------------------------------------------

    /**
     * Project a 3D point to 2D screen coordinates.
     * Read the result with "last projected X" and "last projected Y".
     * @param x 3D x coordinate
     * @param y 3D y coordinate
     * @param z 3D z coordinate
     * @param sx unused parameter (reserved for future out-variable syntax)
     * @param sy unused parameter (reserved for future out-variable syntax)
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
    export function lastProjX(): number {
        return _projX
    }

    /**
     * Returns the screen Y coordinate from the last projectPoint call.
     */
    //% blockId=matrix3d_last_proj_y block="last projected Y"
    //% group="Advanced"
    export function lastProjY(): number {
        return _projY
    }

} // namespace matrix3D
