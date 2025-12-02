// ============================================
// WebGL 렌더링 설정 (Three.js WebGL Renderer 사용)
// ============================================

let webglScene, webglCamera, webglRenderer, webglModel, webglMixer, webglClock;
let webglAnimationPlaying = true;
let webglRotation = 0;
let webglRotationEnabled = true;
let webglMouseX = 0, webglMouseY = 0;
let webglIsDragging = false;

// ============================================
// WebGL 초기화 함수
// ============================================
function initWebGL() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) {
        console.error('Canvas를 찾을 수 없습니다.');
        return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // ============================================
    // 씬(Scene) 설정
    // ============================================
    webglScene = new THREE.Scene();
    webglScene.background = new THREE.Color(0x808080);  // 배경색: 회색톤

    // ============================================
    // 기본 라이팅 설정 (천 질감 최적화: 반사 제거)
    // ============================================
    // 환경광 위주: 강한 빛 제거하여 반사 없애기
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);  // 밝은 환경광으로 전체 조명
    webglScene.add(ambientLight);

    // ============================================
    // 부드러운 방향광 (약한 빛으로 soft shadow만)
    // ============================================
    // 매우 약한 방향광: 입체감만 살리기 (반사 유발 안 함)
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight1.position.set(3, 10, 10);
    directionalLight1.castShadow = true;  // Soft shadow 활성화
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 50;
    webglScene.add(directionalLight1);

    // 매우 약한 보조광: 그림자 대비만
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.15);
    directionalLight2.position.set(-3, 5, -5);
    directionalLight2.castShadow = true;
    webglScene.add(directionalLight2);

    // ============================================
    // 카메라 설정
    // ============================================
    webglCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    webglCamera.position.set(0, 1, 3);  // 카메라 위치: (X: 좌우, Y: 상하, Z: 앞뒤) - 더 가까이

    // ============================================
    // WebGL Renderer 설정
    // ============================================
    // Three.js의 WebGL Renderer 사용 (네이티브 WebGL 기반)
    webglRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    webglRenderer.setSize(width, height);
    webglRenderer.setPixelRatio(window.devicePixelRatio);
    webglRenderer.shadowMap.enabled = true;  // Soft shadow 활성화
    webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 부드러운 그림자

    // ============================================
    // GLTF 모델 로드
    // ============================================
    webglClock = new THREE.Clock();
    const loader = new THREE.GLTFLoader();

    // 에셋 경로 확인 - 여러 경로 시도
    const modelPaths = [
        './public/Princess/scene.gltf',
        'public/Princess/scene.gltf',
        '/public/Princess/scene.gltf'
    ];

    let modelLoaded = false;
    let pathIndex = 0;

    function tryLoadModel() {
        if (pathIndex >= modelPaths.length) {
            console.error('모든 경로에서 모델을 찾을 수 없습니다.');
            return;
        }

        const modelPath = modelPaths[pathIndex];
        console.log('WebGL 모델 로드 시도:', modelPath);

        loader.load(
            modelPath,
            // ============================================
            // 모델 로드 성공 콜백
            // ============================================
            (gltf) => {
                console.log('WebGL 모델 로드 성공:', modelPath);
                modelLoaded = true;
                webglModel = gltf.scene;

                // ============================================
                // 드레스 모델 크기 설정
                // ============================================
                webglModel.scale.set(1, 1, 1);  // 스케일: (X, Y, Z)

                // ============================================
                // 드레스 모델 위치 설정
                // ============================================
                webglModel.position.set(0, 0, 0);  // 화면 중앙에 배치

                // ============================================
                // 머티리얼 보정 (드레스 질감 설정 - 천 질감 강조)
                // ============================================
                webglModel.traverse((obj) => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;

                        if (obj.material) {
                            const mat = obj.material;

                            // ============================================
                            // 기본 속성 설정 (텍스처만 활용)
                            // ============================================
                            // 텍스처 색공간 확인 및 설정 (sRGB로 설정하여 색 변질 방지)
                            // Diffuse(BaseColor) 맵: 색상 감마 보정
                            if (mat.map) {
                                mat.map.colorSpace = THREE.SRGBColorSpace;  // sRGB 색공간 설정
                            }

                            // 다른 색상 텍스처 맵도 sRGB로 설정
                            if (mat.emissiveMap) {
                                mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                            }

                            // Normal 맵: 입체감 표현 (이미 GLTF에 포함되어 있으면 자동 사용)
                            // Normal 맵은 선형 색공간 사용 (색상이 아닌 방향 데이터)
                            if (mat.normalMap) {
                                mat.normalMap.colorSpace = THREE.NoColorSpace;  // Normal 맵은 색공간 불필요
                            }

                            // ============================================
                            // 색상 보정: 밝기 조정 (눈부심 방지)
                            // ============================================
                            // 머티리얼 기본 색상 설정 (밝기 낮춤)
                            if (mat.color) {
                                mat.color.set(0xd0d0d0);  // 어두운 회색 (밝기 낮춤)
                            }

                            // 텍스처가 있으면 원본 색상을 더 활용하도록 약간만 밝게
                            if (mat.map) {
                                // 텍스처 색상에 약한 필터 적용 (원본 색상 유지)
                                mat.color.set(0xd8d8d8);  // 약간 밝은 회색 (원본 색상 보존, 눈부심 방지)
                            }

                            // ============================================
                            // PBR 머티리얼 기본 속성 (천 질감: 반사 제거)
                            // ============================================
                            // 거칠기: 1로 설정하여 반사 거의 없음
                            if (mat.roughness !== undefined) {
                                mat.roughness = 1.0;  // 완전히 거칠게 = 반사 없음
                            }

                            // 금속성: 완전히 0으로 설정 (금속성 완전 제거)
                            if (mat.metalness !== undefined) {
                                mat.metalness = 0.0;  // 완전 비금속
                            }

                            // 환경 반사 강도: 0으로 설정하여 반사 완전 제거
                            if (mat.envMapIntensity !== undefined) {
                                mat.envMapIntensity = 0.0;  // 반사 없음
                            }

                            // ============================================
                            // Specular/Glossiness 제거
                            // ============================================
                            // Specular 제거 (반사 없애기)
                            if (mat.specular !== undefined) {
                                mat.specular.set(0x000000);  // 반사 없음
                            }

                            // Glossiness 제거 (광택 없음)
                            if (mat.glossiness !== undefined) {
                                mat.glossiness = 0.0;
                            }

                            // Clearcoat 제거 (광택 층 제거)
                            if ('clearcoat' in mat) {
                                mat.clearcoat = 0.0;
                            }

                            // Sheen 제거 (천 광택 제거)
                            if ('sheen' in mat) {
                                mat.sheen = 0.0;
                            }
                        }
                    }
                });

                webglScene.add(webglModel);

                // ============================================
                // 애니메이션 설정
                // ============================================
                if (gltf.animations && gltf.animations.length) {
                    webglMixer = new THREE.AnimationMixer(webglModel);
                    gltf.animations.forEach((clip) => {
                        webglMixer.clipAction(clip).play();
                    });
                }

                animateWebGL();
            },
            // 로딩 진행률
            (progress) => {
                if (progress.lengthComputable) {
                    const percentComplete = (progress.loaded / progress.total) * 100;
                    console.log('WebGL 로딩 진행률:', percentComplete.toFixed(2) + '%');
                }
            },
            // 로드 실패
            (error) => {
                console.error('WebGL 모델 로드 오류 (경로:', modelPath, '):', error);
                pathIndex++;
                tryLoadModel();
            }
        );
    }

    tryLoadModel();

    // ============================================
    // 마우스 컨트롤 설정
    // ============================================
    canvas.addEventListener('mousedown', (e) => {
        webglIsDragging = true;
        webglMouseX = e.clientX;
        webglMouseY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (webglIsDragging && webglModel) {
            const deltaX = e.clientX - webglMouseX;
            webglRotation += deltaX * 0.01;
            webglMouseX = e.clientX;
            webglMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', () => {
        webglIsDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        webglCamera.position.z += e.deltaY * 0.01;
        webglCamera.position.z = Math.max(2, Math.min(10, webglCamera.position.z));
    });

    // ============================================
    // 윈도우 리사이즈 핸들러
    // ============================================
    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        webglCamera.aspect = width / height;
        webglCamera.updateProjectionMatrix();
        webglRenderer.setSize(width, height);
    });

    // 초기 렌더링 시작
    animateWebGL();
}

// ============================================
// 애니메이션 루프 함수
// ============================================
function animateWebGL() {
    requestAnimationFrame(animateWebGL);

    // 애니메이션 믹서 업데이트
    if (webglMixer && webglAnimationPlaying) {
        webglMixer.update(webglClock.getDelta());
    }

    // 드레스 자동 회전
    if (webglModel && webglRotationEnabled && webglAnimationPlaying) {
        webglModel.rotation.y += 0.005;
    }

    // 씬 렌더링
    if (webglRenderer && webglScene && webglCamera) {
        webglRenderer.render(webglScene, webglCamera);
    }
}

// ============================================
// 카메라 리셋 함수
// ============================================
function resetWebGLCamera() {
    if (webglCamera) {
        webglCamera.position.set(0, 1, 3);  // 더 가까이
    }
    if (webglModel) {
        webglModel.rotation.set(0, 0, 0);
    }
    webglRotation = 0;
}

// ============================================
// 회전 토글 함수
// ============================================
function toggleWebGLRotation() {
    webglRotationEnabled = !webglRotationEnabled;
}
