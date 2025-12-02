// Three.js 렌더링 설정
let threeScene, threeCamera, threeRenderer, threeModel, threeMixer, threeClock;
let threeAnimationPlaying = true;

function initThreeJS() {
    const canvas = document.getElementById('threejs-canvas');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Scene
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x1a1a1a);

    // Camera
    threeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    threeCamera.position.set(0, 1, 5);

    // Renderer
    threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    threeRenderer.setSize(width, height);
    threeRenderer.setPixelRatio(window.devicePixelRatio);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    threeScene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    threeScene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 5, -5);
    threeScene.add(directionalLight2);

    // Load GLTF model
    const loader = new THREE.GLTFLoader();
    threeClock = new THREE.Clock();

    loader.load('./public/WEDDİNG DRESS TİP2_gltf_thick.gltf', (gltf) => {
        threeModel = gltf.scene;
        threeModel.scale.set(1, 1, 1);
        threeModel.position.set(0, 0, 0);
        threeScene.add(threeModel);

        // Animation mixer
        if (gltf.animations && gltf.animations.length) {
            threeMixer = new THREE.AnimationMixer(threeModel);
            gltf.animations.forEach((clip) => {
                threeMixer.clipAction(clip).play();
            });
        }

        animateThree();
    }, undefined, (error) => {
        console.error('Three.js 모델 로드 오류:', error);
    });

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        if (threeModel) {
            threeModel.rotation.y += deltaX * 0.01;
            threeModel.rotation.x += deltaY * 0.01;
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        threeCamera.position.z += e.deltaY * 0.01;
        threeCamera.position.z = Math.max(2, Math.min(10, threeCamera.position.z));
    });

    // Resize handler
    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        threeCamera.aspect = width / height;
        threeCamera.updateProjectionMatrix();
        threeRenderer.setSize(width, height);
    });
}

function animateThree() {
    requestAnimationFrame(animateThree);

    if (threeMixer && threeAnimationPlaying) {
        threeMixer.update(threeClock.getDelta());
    }

    if (threeModel && threeAnimationPlaying) {
        threeModel.rotation.y += 0.005;
    }

    threeRenderer.render(threeScene, threeCamera);
}

function resetThreeCamera() {
    if (threeCamera) {
        threeCamera.position.set(0, 1, 5);
    }
    if (threeModel) {
        threeModel.rotation.set(0, 0, 0);
    }
}

function toggleThreeAnimation() {
    threeAnimationPlaying = !threeAnimationPlaying;
}

