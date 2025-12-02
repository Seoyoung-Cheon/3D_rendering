// WebGL (Native) 렌더링 설정
let webglCanvas, webglGl, webglProgram;
let webglRotation = 0;
let webglRotationEnabled = true;
let webglMouseX = 0, webglMouseY = 0;
let webglIsDragging = false;

function initWebGL() {
    webglCanvas = document.getElementById('webgl-canvas');
    webglGl = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl');

    if (!webglGl) {
        console.error('WebGL을 지원하지 않습니다.');
        return;
    }

    const width = webglCanvas.clientWidth;
    const height = webglCanvas.clientHeight;
    webglCanvas.width = width;
    webglCanvas.height = height;
    webglGl.viewport(0, 0, width, height);

    // Shader source
    const vertexShaderSource = `
        attribute vec3 a_position;
        attribute vec3 a_color;
        uniform mat4 u_matrix;
        varying vec3 v_color;
        
        void main() {
            gl_Position = u_matrix * vec4(a_position, 1.0);
            v_color = a_color;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        varying vec3 v_color;
        
        void main() {
            gl_FragColor = vec4(v_color, 1.0);
        }
    `;

    // Create shaders
    const vertexShader = createShader(webglGl, webglGl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(webglGl, webglGl.FRAGMENT_SHADER, fragmentShaderSource);

    // Create program
    webglProgram = createProgram(webglGl, vertexShader, fragmentShader);
    webglGl.useProgram(webglProgram);

    // Create a simple 3D cube
    const positions = [
        // Front face
        -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
        // Back face
        -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,
        // Top face
        -1, 1, -1, -1, 1, 1, 1, 1, 1, 1, 1, -1,
        // Bottom face
        -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
        // Right face
        1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1,
        // Left face
        -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
    ];

    const colors = [
        1, 0.5, 0.8, 1, 0.5, 0.8, 1, 0.5, 0.8, 1, 0.5, 0.8,
        0.8, 0.5, 1, 0.8, 0.5, 1, 0.8, 0.5, 1, 0.8, 0.5, 1,
        0.5, 0.8, 1, 0.5, 0.8, 1, 0.5, 0.8, 1, 0.5, 0.8, 1,
        1, 0.8, 0.5, 1, 0.8, 0.5, 1, 0.8, 0.5, 1, 0.8, 0.5,
        0.8, 1, 0.5, 0.8, 1, 0.5, 0.8, 1, 0.5, 0.8, 1, 0.5,
        1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5,
    ];

    const indices = [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
    ];

    // Create buffers
    const positionBuffer = webglGl.createBuffer();
    webglGl.bindBuffer(webglGl.ARRAY_BUFFER, positionBuffer);
    webglGl.bufferData(webglGl.ARRAY_BUFFER, new Float32Array(positions), webglGl.STATIC_DRAW);

    const colorBuffer = webglGl.createBuffer();
    webglGl.bindBuffer(webglGl.ARRAY_BUFFER, colorBuffer);
    webglGl.bufferData(webglGl.ARRAY_BUFFER, new Float32Array(colors), webglGl.STATIC_DRAW);

    const indexBuffer = webglGl.createBuffer();
    webglGl.bindBuffer(webglGl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    webglGl.bufferData(webglGl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), webglGl.STATIC_DRAW);

    // Store buffers
    webglCanvas.positionBuffer = positionBuffer;
    webglCanvas.colorBuffer = colorBuffer;
    webglCanvas.indexBuffer = indexBuffer;

    // Mouse controls
    webglCanvas.addEventListener('mousedown', (e) => {
        webglIsDragging = true;
        webglMouseX = e.clientX;
        webglMouseY = e.clientY;
    });

    webglCanvas.addEventListener('mousemove', (e) => {
        if (webglIsDragging) {
            const deltaX = e.clientX - webglMouseX;
            const deltaY = e.clientY - webglMouseY;
            webglRotation += deltaX * 0.01;
            webglMouseX = e.clientX;
            webglMouseY = e.clientY;
        }
    });

    webglCanvas.addEventListener('mouseup', () => {
        webglIsDragging = false;
    });

    // Resize handler
    window.addEventListener('resize', () => {
        const width = webglCanvas.clientWidth;
        const height = webglCanvas.clientHeight;
        webglCanvas.width = width;
        webglCanvas.height = height;
        webglGl.viewport(0, 0, width, height);
    });

    animateWebGL();
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader 컴파일 오류:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program 링크 오류:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function animateWebGL() {
    requestAnimationFrame(animateWebGL);

    if (webglRotationEnabled) {
        webglRotation += 0.01;
    }

    const width = webglCanvas.width;
    const height = webglCanvas.height;

    webglGl.viewport(0, 0, width, height);
    webglGl.clearColor(0.1, 0.1, 0.1, 1.0);
    webglGl.clear(webglGl.COLOR_BUFFER_BIT | webglGl.DEPTH_BUFFER_BIT);
    webglGl.enable(webglGl.DEPTH_TEST);

    webglGl.useProgram(webglProgram);

    // Set up attributes
    const positionLocation = webglGl.getAttribLocation(webglProgram, 'a_position');
    const colorLocation = webglGl.getAttribLocation(webglProgram, 'a_color');
    const matrixLocation = webglGl.getUniformLocation(webglProgram, 'u_matrix');

    // Bind position buffer
    webglGl.bindBuffer(webglGl.ARRAY_BUFFER, webglCanvas.positionBuffer);
    webglGl.enableVertexAttribArray(positionLocation);
    webglGl.vertexAttribPointer(positionLocation, 3, webglGl.FLOAT, false, 0, 0);

    // Bind color buffer
    webglGl.bindBuffer(webglGl.ARRAY_BUFFER, webglCanvas.colorBuffer);
    webglGl.enableVertexAttribArray(colorLocation);
    webglGl.vertexAttribPointer(colorLocation, 3, webglGl.FLOAT, false, 0, 0);

    // Create matrix
    const matrix = createProjectionMatrix(width, height);
    rotateX(matrix, webglRotation * 0.5);
    rotateY(matrix, webglRotation);
    translate(matrix, 0, 0, -5);

    webglGl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Draw
    webglGl.bindBuffer(webglGl.ELEMENT_ARRAY_BUFFER, webglCanvas.indexBuffer);
    webglGl.drawElements(webglGl.TRIANGLES, 36, webglGl.UNSIGNED_SHORT, 0);
}

function createProjectionMatrix(width, height) {
    const fov = Math.PI / 4;
    const aspect = width / height;
    const zNear = 0.1;
    const zFar = 100;

    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (zNear - zFar);

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (zNear + zFar) * rangeInv, -1,
        0, 0, zNear * zFar * rangeInv * 2, 0
    ];
}

function translate(matrix, x, y, z) {
    matrix[12] += matrix[0] * x + matrix[4] * y + matrix[8] * z;
    matrix[13] += matrix[1] * x + matrix[5] * y + matrix[9] * z;
    matrix[14] += matrix[2] * x + matrix[6] * y + matrix[10] * z;
    matrix[15] += matrix[3] * x + matrix[7] * y + matrix[11] * z;
}

function rotateY(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const m00 = matrix[0], m01 = matrix[1], m02 = matrix[2], m03 = matrix[3];
    const m20 = matrix[8], m21 = matrix[9], m22 = matrix[10], m23 = matrix[11];

    matrix[0] = c * m00 - s * m20;
    matrix[1] = c * m01 - s * m21;
    matrix[2] = c * m02 - s * m22;
    matrix[3] = c * m03 - s * m23;
    matrix[8] = c * m20 + s * m00;
    matrix[9] = c * m21 + s * m01;
    matrix[10] = c * m22 + s * m02;
    matrix[11] = c * m23 + s * m03;
}

function rotateX(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const m10 = matrix[4], m11 = matrix[5], m12 = matrix[6], m13 = matrix[7];
    const m20 = matrix[8], m21 = matrix[9], m22 = matrix[10], m23 = matrix[11];

    matrix[4] = c * m10 + s * m20;
    matrix[5] = c * m11 + s * m21;
    matrix[6] = c * m12 + s * m22;
    matrix[7] = c * m13 + s * m23;
    matrix[8] = c * m20 - s * m10;
    matrix[9] = c * m21 - s * m11;
    matrix[10] = c * m22 - s * m12;
    matrix[11] = c * m23 - s * m13;
}

function resetWebGLCamera() {
    webglRotation = 0;
}

function toggleWebGLRotation() {
    webglRotationEnabled = !webglRotationEnabled;
}

