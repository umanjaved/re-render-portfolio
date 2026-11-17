// ColorBends WebGL Shader Background Renderer (Vanilla WebGL)
function initColorBends(canvas, options = {}) {
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'high-performance' }) ||
               canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vert = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
            vUv = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const frag = `
        #ifdef GL_ES
        precision highp float;
        #endif

        #define MAX_COLORS 8
        uniform vec2 uCanvas;
        uniform float uTime;
        uniform float uSpeed;
        uniform vec2 uRot;
        uniform int uColorCount;
        uniform vec3 uColors[MAX_COLORS];
        uniform int uTransparent;
        uniform float uScale;
        uniform float uFrequency;
        uniform float uWarpStrength;
        uniform vec2 uPointer;
        uniform float uMouseInfluence;
        uniform float uParallax;
        uniform float uNoise;
        uniform int uIterations;
        uniform float uIntensity;
        uniform float uBandWidth;
        varying vec2 vUv;

        void main() {
            float t = uTime * uSpeed;
            vec2 p = vUv * 2.0 - 1.0;
            p += uPointer * uParallax * 0.1;
            vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
            vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
            q /= max(uScale, 0.0001);
            q /= 0.5 + 0.2 * dot(q, q);
            q += 0.2 * cos(t) - 7.56;
            vec2 toward = (uPointer - rp);
            q += toward * uMouseInfluence * 0.2;

            for (int j = 0; j < 5; j++) {
                if (j >= uIterations - 1) break;
                vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
                q += (rr - q) * 0.15;
            }

            vec3 col = vec3(0.0);
            float a = 1.0;

            if (uColorCount > 0) {
                vec2 s = q;
                vec3 sumCol = vec3(0.0);
                float cover = 0.0;
                for (int i = 0; i < MAX_COLORS; ++i) {
                    if (i >= uColorCount) break;
                    s -= 0.01;
                    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
                    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
                    float kBelow = clamp(uWarpStrength, 0.0, 1.0);
                    float kMix = pow(kBelow, 0.3);
                    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
                    vec2 disp = (r - s) * kBelow;
                    vec2 warped = s + disp * gain;
                    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
                    float m = mix(m0, m1, kMix);
                    float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
                    sumCol += uColors[i] * w;
                    cover = max(cover, w);
                }
                col = clamp(sumCol, 0.0, 1.0);
                a = uTransparent > 0 ? cover : 1.0;
            } else {
                vec2 s = q;
                for (int k = 0; k < 3; ++k) {
                    s -= 0.01;
                    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
                    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
                    float kBelow = clamp(uWarpStrength, 0.0, 1.0);
                    float kMix = pow(kBelow, 0.3);
                    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
                    vec2 disp = (r - s) * kBelow;
                    vec2 warped = s + disp * gain;
                    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
                    float m = mix(m0, m1, kMix);
                    col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
                }
                a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
            }

            col *= uIntensity;

            if (uNoise > 0.0001) {
                float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
                col += (n - 0.5) * uNoise;
                col = clamp(col, 0.0, 1.0);
            }

            vec3 rgb = (uTransparent > 0) ? col * a : col;
            gl_FragColor = vec4(rgb, a);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vert);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]), gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uCanvas = gl.getUniformLocation(program, 'uCanvas');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uRot = gl.getUniformLocation(program, 'uRot');
    const uColorCount = gl.getUniformLocation(program, 'uColorCount');
    const uTransparent = gl.getUniformLocation(program, 'uTransparent');
    const uScale = gl.getUniformLocation(program, 'uScale');
    const uFrequency = gl.getUniformLocation(program, 'uFrequency');
    const uWarpStrength = gl.getUniformLocation(program, 'uWarpStrength');
    const uPointer = gl.getUniformLocation(program, 'uPointer');
    const uMouseInfluence = gl.getUniformLocation(program, 'uMouseInfluence');
    const uParallax = gl.getUniformLocation(program, 'uParallax');
    const uNoise = gl.getUniformLocation(program, 'uNoise');
    const uIterations = gl.getUniformLocation(program, 'uIterations');
    const uIntensity = gl.getUniformLocation(program, 'uIntensity');
    const uBandWidth = gl.getUniformLocation(program, 'uBandWidth');

    // Parse hex to Vec3
    function hexToRgb(hex) {
        const h = hex.replace('#', '').trim();
        const v = h.length === 3
            ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
            : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        return [v[0] / 255, v[1] / 255, v[2] / 255];
    }

    const hexColors = options.colors && options.colors.length ? options.colors : ["#EF4444", "#DC2626", "#991B1B"];
    const parsedColors = hexColors.map(hexToRgb);

    // Uniform colors array
    for (let i = 0; i < 8; i++) {
        const loc = gl.getUniformLocation(program, `uColors[${i}]`);
        if (i < parsedColors.length) {
            gl.uniform3f(loc, parsedColors[i][0], parsedColors[i][1], parsedColors[i][2]);
        } else {
            gl.uniform3f(loc, 0, 0, 0);
        }
    }
    gl.uniform1i(uColorCount, parsedColors.length);

    const rotation = options.rotation !== undefined ? options.rotation : 90;
    const speed = options.speed !== undefined ? options.speed : 0.2;
    const scale = options.scale !== undefined ? options.scale : 1.0;
    const frequency = options.frequency !== undefined ? options.frequency : 1.0;
    const warpStrength = options.warpStrength !== undefined ? options.warpStrength : 1.0;
    const mouseInfluence = options.mouseInfluence !== undefined ? options.mouseInfluence : 1.0;
    const parallax = options.parallax !== undefined ? options.parallax : 0.5;
    const noise = options.noise !== undefined ? options.noise : 0.15;
    const iterations = options.iterations !== undefined ? options.iterations : 1;
    const intensity = options.intensity !== undefined ? options.intensity : 1.5;
    const bandWidth = options.bandWidth !== undefined ? options.bandWidth : 6.0;
    const transparent = options.transparent !== undefined ? options.transparent : false;

    gl.uniform1f(uSpeed, speed);
    gl.uniform1i(uTransparent, transparent ? 1 : 0);
    gl.uniform1f(uScale, scale);
    gl.uniform1f(uFrequency, frequency);
    gl.uniform1f(uWarpStrength, warpStrength);
    gl.uniform1f(uMouseInfluence, mouseInfluence);
    gl.uniform1f(uParallax, parallax);
    gl.uniform1f(uNoise, noise);
    gl.uniform1i(uIterations, iterations);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uBandWidth, bandWidth);

    // Mouse pointer interaction
    let pointerTargetX = 0, pointerTargetY = 0;
    let pointerCurrentX = 0, pointerCurrentY = 0;

    window.addEventListener('pointermove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        pointerTargetX = x;
        pointerTargetY = y;
    });

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uCanvas, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();

    const startTime = performance.now();
    function render(now) {
        const elapsed = (now - startTime) / 1000;
        gl.uniform1f(uTime, elapsed);

        // Rotation matrix
        const rad = (rotation * Math.PI) / 180;
        gl.uniform2f(uRot, Math.cos(rad), Math.sin(rad));

        // Smooth pointer lerp
        pointerCurrentX += (pointerTargetX - pointerCurrentX) * 0.05;
        pointerCurrentY += (pointerTargetY - pointerCurrentY) * 0.05;
        gl.uniform2f(uPointer, pointerCurrentX, pointerCurrentY);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('colorbends-canvas') || document.getElementById('darkveil-canvas');
    if (canvas) {
        canvas.id = 'colorbends-canvas';
        initColorBends(canvas, {
            colors: ["#ff0000", "#cc0000", "#550000"],
            rotation: 90,
            speed: 0.18,
            scale: 1,
            frequency: 1,
            warpStrength: 1,
            mouseInfluence: 0.8,
            noise: 0.0, // Zero noise/grain for a ultra-clean pitch black background
            parallax: 0.4,
            iterations: 1,
            intensity: 0.8,
            bandWidth: 14.0,
            transparent: false
        });
    }
});
