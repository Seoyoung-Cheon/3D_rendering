// ============================================
// Three.js 렌더링 설정
// ============================================

// 전역 변수 선언
let threeScene;        // 3D 씬 (모든 객체가 들어가는 공간)
let threeCamera;       // 카메라 (뷰포인트)
let threeRenderer;     // 렌더러 (화면에 그리는 역할)
let threeModel;        // 드레스 모델 객체
let threeMixer;        // 애니메이션 믹서
let threeClock;        // 시간 추적용 클럭
let threeAnimationPlaying = true;  // 애니메이션 재생 여부

// ============================================
// Three.js 초기화 함수
// ============================================
function initThreeJS() {
    // 캔버스 요소 가져오기
    const canvas = document.getElementById('threejs-canvas');
    if (!canvas) {
        console.error('Canvas를 찾을 수 없습니다.');
        return;
    }

    // 캔버스 크기 가져오기
    const width = canvas.clientWidth;   // 캔버스 너비
    const height = canvas.clientHeight;  // 캔버스 높이

    // ============================================
    // 씬(Scene) 설정
    // ============================================
    threeScene = new THREE.Scene();
    // 피팅룸 느낌의 어두운 회색 배경
    threeScene.background = new THREE.Color(0x333333);

    // ============================================
    // 기본 라이팅 설정 (천 질감 최적화: 반사 제거)
    // ============================================
    // 부드러운 피팅룸 조명: 약한 환경광
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    threeScene.add(ambientLight);

    // ============================================
    // 부드러운 방향광 (위쪽에서 내려오는 스튜디오 라이트)
    // ============================================
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(1.5, 4, 2);
    directionalLight1.castShadow = true;  // Soft shadow 활성화
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 50;
    threeScene.add(directionalLight1);

    // 매우 약한 보조광: 뒤에서 살짝 채워주는 라이트
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.25);
    directionalLight2.position.set(-2, 3, -2);
    directionalLight2.castShadow = true;
    threeScene.add(directionalLight2);

    // ============================================
    // 피팅룸 공간 구성 (바닥, 벽, 거울)
    // ============================================
    // 바닥(연한 회색 카펫 느낌)
    const floorGeometry = new THREE.PlaneGeometry(6, 6);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 1.0,
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -1.0);
    floor.receiveShadow = true;
    threeScene.add(floor);

    // 좌우 벽(어두운 회색 패널)
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2b2b2b,
        roughness: 1.0,
        metalness: 0.0
    });
    const sideWallGeometry = new THREE.PlaneGeometry(6, 4);

    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-1.8, 2, -1.0);
    leftWall.rotation.y = Math.PI / 6;
    threeScene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(1.8, 2, -1.0);
    rightWall.rotation.y = -Math.PI / 6;
    threeScene.add(rightWall);

    // 뒷벽(살짝 더 밝은 톤)
    const backWallGeometry = new THREE.PlaneGeometry(4, 4.5);
    const backWallMaterial = new THREE.MeshStandardMaterial({
        color: 0x404040,
        roughness: 1.0,
        metalness: 0.0
    });
    const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
    backWall.position.set(0, 2, -2.5);
    threeScene.add(backWall);

    // 거울 패널(뒷벽 중앙, 살짝 밝은 회색으로 표현)
    const mirrorGeometry = new THREE.PlaneGeometry(1.4, 3.0);
    const mirrorMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.3,   // 약간 매끈
        metalness: 0.0
    });
    const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
    mirror.position.set(0.9, 2.0, -2.49);
    threeScene.add(mirror);

    // ============================================
    // HDRI 환경 맵 설정 (선택적 - 로드 성공 시 추가)
    // ============================================
    // HDRI: 고해상도 환경 이미지로 실사적인 반사와 조명 효과 제공
    if (typeof THREE.RGBELoader !== 'undefined') {
        const rgbeLoader = new THREE.RGBELoader();
        rgbeLoader.load(
            'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
            (texture) => {
                // 성공 시: HDRI를 환경 맵과 배경으로 설정
                texture.mapping = THREE.EquirectangularReflectionMapping;
                threeScene.environment = texture;  // 반사 환경
                threeScene.background = texture;   // 배경 이미지
            },
            undefined,
            (error) => {
                // 실패 시: 기본 라이팅 사용 (이미 위에서 추가됨)
                console.warn('HDRI 로드 실패, 기본 라이팅 사용:', error);
            }
        );
    }

    // ============================================
    // 카메라 설정
    // ============================================
    // 원근 카메라: 시야각 75도, 가까운 거리 0.1, 먼 거리 1000
    threeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    threeCamera.position.set(0, 1, 1);  // 카메라 위치: (X: 좌우, Y: 상하, Z: 앞뒤)
    // Z 값이 클수록 드레스에서 멀어짐 (현재: 3 - 더 가까이)

    // ============================================
    // 렌더러 설정
    // ============================================
    threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    threeRenderer.setSize(width, height);  // 렌더러 크기 설정
    threeRenderer.setPixelRatio(window.devicePixelRatio);  // 고해상도 디스플레이 지원
    threeRenderer.shadowMap.enabled = true;  // Soft shadow 활성화
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 부드러운 그림자

    // ============================================
    // GLTF 모델 로드
    // ============================================
    threeClock = new THREE.Clock();  // 애니메이션 시간 추적용
    const loader = new THREE.GLTFLoader();  // GLTF 파일 로더

    // 에셋 경로 확인 - 여러 경로 시도 (서버 환경에 따라 경로가 다를 수 있음)
    const modelPaths = [
        './public/Princess/scene.gltf',  // 상대 경로 1
        'public/Princess/scene.gltf',    // 상대 경로 2
        '/public/Princess/scene.gltf'    // 절대 경로
    ];

    let modelLoaded = false;  // 모델 로드 완료 여부
    let pathIndex = 0;        // 현재 시도 중인 경로 인덱스

    // ============================================
    // 모델 로드 함수 (여러 경로 시도)
    // ============================================
    function tryLoadModel() {
        // 모든 경로를 시도했는데 실패한 경우
        if (pathIndex >= modelPaths.length) {
            console.error('모든 경로에서 모델을 찾을 수 없습니다.');
            return;
        }

        const modelPath = modelPaths[pathIndex];

        loader.load(
            modelPath,
            // ============================================
            // 모델 로드 성공 콜백
            // ============================================
            (gltf) => {
                modelLoaded = true;
                threeModel = gltf.scene;  // GLTF 씬 가져오기

                // ============================================
                // 드레스 모델 크기 설정
                // ============================================
                threeModel.scale.set(1, 1, 1);  // 스케일: (X, Y, Z) - 1이 원본 크기
                // 값이 1보다 크면 확대, 작으면 축소
                // 예: (1.5, 1.5, 1.5) = 1.5배 확대

                // ============================================
                // 드레스 모델 위치 설정
                // ============================================
                threeModel.position.set(0, 0.35, -0.55);  // 카메라 앞에 배치 (원점)
                // 위치: (X: 좌우, Y: 상하, Z: 앞뒤)
                // X: 양수=오른쪽, 음수=왼쪽
                // Y: 양수=위, 음수=아래
                // Z: 양수=뒤, 음수=앞 (카메라 기준)
                // 카메라가 Z=3에 있으므로 모델을 Z=0에 배치하면 카메라 앞에 위치

                // ============================================
                // 머티리얼 보정 (드레스 질감 설정)
                // ============================================

                // ============================================
                // 각 레이어별 기본 색상 설정 (현재 색상을 유지하기 위한 값)
                //  - 필요할 때 여기 숫자만 바꾸면 됨
                // ============================================
                const layerColors = {
                    'Dress_Layer_1': 0xF0F0F0,  // 드레스 레이어 1 (한 단계 더 밝게)
                    'Dress_Layer_2': 0xE8E8E8,  // 드레스 레이어 2 (한 단계 더 밝게)
                    'Dress_Layer_5': 0xE8E8E8,  // 레이어 5 (망사/허리/망토 계열, 한 단계 더 밝게)
                    'Dress_Layer_6': 0xE8E8E8,  // 레이어 6 (망사/허리/망토 계열, 한 단계 더 밝게)
                    'Flowers': 0xFFDEE1,        // 꽃 장식 (조금 더 푸른 톤)
                    'default': 0xF0F0F0        // 기본 (한 단계 더 밝게)
                };

                // 허리/망토 영역을 더 세밀하게 나누기 위한 별도 색상 설정
                //  - 지금은 둘 다 같은 색으로 두고, 나중에 필요하면 숫자만 바꾸면 됨
                const areaColors = {
                    cape: 0xDCDCDC,   // 망토(어깨에서 내려오는 망사, 한 단계 더 밝게)
                    waist: 0xDCDCDC   // 허리춤 망사 (한 단계 더 밝게)
                };

                // 망토(어깨 쪽 망사)로 확인된 메시 이름들
                //  - 사용자 입력: Object_10, Object_12 가 망토 역할
                const capeMeshes = ['Object_10', 'Object_12'];

                // 텍스처를 비활성화할 레이어 (순수 색상만 사용)
                const disableTextureLayers = ['Dress_Layer_5', 'Dress_Layer_6'];

                threeModel.traverse((obj) => {
                    // 모든 메시 객체를 순회
                    if (obj.isMesh) {
                        // 그림자 설정
                        obj.castShadow = true;      // 그림자 생성
                        obj.receiveShadow = true;   // 그림자 받기

                        // 머티리얼 처리 (배열일 수도 있음)
                        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

                        materials.forEach((mat) => {
                            if (!mat) return;  // 머티리얼이 없으면 스킵

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
                            // 레이어/영역별 색상 적용
                            // ============================================
                            const materialName = mat.name || '';
                            const meshName = obj.name || '';

                            // 디버깅: 모든 머티리얼 정보 출력
                            console.log(`메시: "${meshName}", 머티리얼: "${materialName}"`);

                            const isLayer5 = materialName.includes('Dress_Layer_5');
                            const isLayer6 = materialName.includes('Dress_Layer_6');

                            // 망토: 사용자가 알려준 Object_10 / Object_12 + 레이어 5/6
                            const isCape =
                                (isLayer5 || isLayer6) &&
                                capeMeshes.includes(meshName);

                            // 허리춤 망사: 망토(Object_10, Object_12)가 아닌 나머지 드레스 메시 전체 중에서
                            // 일단 사용자가 직접 확인하기 쉽도록, Object_4 / Object_8 을 허리 후보로 지정
                            const waistMeshCandidates = ['Object_4', 'Object_8'];
                            const isWaist =
                                waistMeshCandidates.includes(meshName) &&
                                !isCape;  // 망토와 겹치지 않도록

                            // 디버깅: 각 조건 확인
                            console.log(`  → isLayer5: ${isLayer5}, isLayer6: ${isLayer6}`);
                            console.log(`  → 망토 여부(isCape): ${isCape}, 허리 여부(isWaist): ${isWaist}`);

                            let layerColor = layerColors.default;  // 기본 색상
                            let shouldDisableTexture = false;

                            // 1) 허리/망토 우선 처리
                            if (isCape) {
                                layerColor = areaColors.cape;
                                shouldDisableTexture = true;  // 망토는 텍스처 끄고 순색만
                                console.log(`  → 망토로 인식됨, 색상: 0x${layerColor.toString(16)}`);
                            } else if (isWaist) {
                                layerColor = areaColors.waist;
                                shouldDisableTexture = true;  // 허리도 텍스처 끄고 순색만
                                console.log(`  → 허리춤 망사로 인식됨, 색상: 0x${layerColor.toString(16)}`);
                            } else {
                                // 2) 일반 레이어 이름으로 색상 결정
                                let matchedLayer = 'default';
                                for (const layerName in layerColors) {
                                    if (layerName !== 'default' && materialName.includes(layerName)) {
                                        layerColor = layerColors[layerName];
                                        matchedLayer = layerName;
                                        if (disableTextureLayers.includes(layerName)) {
                                            shouldDisableTexture = true;
                                        }
                                        break;
                                    }
                                }
                                if (matchedLayer !== 'default') {
                                    console.log(`  → 레이어 "${matchedLayer}"로 매칭, 색상: 0x${layerColor.toString(16)}`);
                                } else {
                                    console.log(`  → 기본 색상 사용: 0x${layerColor.toString(16)}`);
                                }
                            }

                            // 텍스처 비활성화 및 색상 강제 적용 (순수 색상만 사용하는 레이어)
                            if (shouldDisableTexture) {
                                // 텍스처 완전히 제거
                                if (mat.map) {
                                    mat.map = null;
                                }
                                // 모든 텍스처 맵 제거
                                mat.alphaMap = null;
                                mat.aoMap = null;
                                mat.bumpMap = null;
                                mat.displacementMap = null;
                                mat.emissiveMap = null;
                                mat.lightMap = null;
                                mat.metalnessMap = null;
                                mat.normalMap = null;
                                mat.roughnessMap = null;

                                // 색상 강제 적용
                                if (mat.color) {
                                    mat.color.setHex(layerColor);  // setHex로 명시적 색상 설정
                                }

                                // 머티리얼 업데이트 강제
                                mat.needsUpdate = true;
                            } else {
                                // 일반 레이어: 색상만 적용 (텍스처는 유지)
                                if (mat.color) {
                                    mat.color.setHex(layerColor);  // setHex로 명시적 색상 설정
                                }
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
                        });
                    }
                });


                // 씬에 모델 추가
                threeScene.add(threeModel);

                // ============================================
                // 드레스 아래 단상 (원기둥) 추가
                // ============================================
                const pedestalGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);  // 반지름 0.4, 높이 0.3
                const pedestalMaterial = new THREE.MeshStandardMaterial({
                    color: 0xE8E8E0,  // 크림색 단상
                    roughness: 0.8,
                    metalness: 0.0
                });
                const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
                // 드레스 모델 위치(0, 0.35, -0.55) 아래에 배치
                pedestal.position.set(0, 0.35 - 0.15, -0.55);  // 드레스 높이의 절반 아래
                pedestal.receiveShadow = true;
                pedestal.castShadow = true;
                threeScene.add(pedestal);

                // ============================================
                // 애니메이션 설정
                // ============================================
                if (gltf.animations && gltf.animations.length) {
                    threeMixer = new THREE.AnimationMixer(threeModel);
                    // 모든 애니메이션 클립 재생
                    gltf.animations.forEach((clip) => {
                        threeMixer.clipAction(clip).play();
                    });
                }

                // 애니메이션 루프 시작
                animateThree();
            },
            // ============================================
            // 로딩 진행률 콜백
            // ============================================
            (progress) => {
                // 로딩 진행률 추적 (필요시 사용)
            },
            // ============================================
            // 로드 실패 콜백
            // ============================================
            (error) => {
                console.error('모델 로드 오류 (경로:', modelPath, '):', error);
                pathIndex++;  // 다음 경로 시도
                tryLoadModel();
            }
        );
    }

    // 모델 로드 시작
    tryLoadModel();

    // ============================================
    // 마우스 컨트롤 설정
    // ============================================
    let isDragging = false;  // 드래그 중인지 여부
    let previousMousePosition = { x: 0, y: 0 };  // 이전 마우스 위치

    // 마우스 버튼 누름: 드래그 시작
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // 마우스 이동: 드래그 중이면 드레스 회전
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || !threeModel) return;

        // 마우스 이동 거리 계산
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        // 드레스 회전 (Y축: 좌우 회전, X축: 상하 회전)
        threeModel.rotation.y += deltaX * 0.01;  // 좌우 회전 속도
        threeModel.rotation.x += deltaY * 0.01;  // 상하 회전 속도

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // 마우스 버튼 놓음: 드래그 종료
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // 마우스 휠: 줌 인/아웃
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        // 카메라 Z 위치 변경 (휠 위로=가까이, 아래로=멀리)
        threeCamera.position.z += e.deltaY * 0.001;  // 줌 속도 증가
        // 최소 거리: 0.3 (더 가까이 확대 가능), 최대 거리: 15으로 제한
        threeCamera.position.z = Math.max(0.3, Math.min(15, threeCamera.position.z));
    });

    // ============================================
    // 윈도우 리사이즈 핸들러
    // ============================================
    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        threeCamera.aspect = width / height;  // 카메라 종횡비 업데이트
        threeCamera.updateProjectionMatrix();  // 카메라 행렬 업데이트
        threeRenderer.setSize(width, height);  // 렌더러 크기 업데이트
    });

    // 초기 렌더링 시작 (모델 로드 전에도 배경이 보이도록)
    animateThree();
}

// ============================================
// 애니메이션 루프 함수
// ============================================
function animateThree() {
    requestAnimationFrame(animateThree);  // 다음 프레임 요청

    // 애니메이션 믹서 업데이트 (GLTF 애니메이션 재생)
    if (threeMixer && threeAnimationPlaying) {
        threeMixer.update(threeClock.getDelta());  // 시간 델타로 애니메이션 진행
    }

    // 드레스 자동 회전 (Y축 기준)
    if (threeModel && threeAnimationPlaying) {
        threeModel.rotation.y += 0.001;  // 매 프레임마다 약간씩 회전
    }

    // 씬 렌더링
    if (threeRenderer && threeScene && threeCamera) {
        threeRenderer.render(threeScene, threeCamera);
    }
}

// ============================================
// 카메라 리셋 함수
// ============================================
function resetThreeCamera() {
    // 카메라 위치를 초기 위치로 복원
    if (threeCamera) {
        threeCamera.position.set(0, 1, 1);  // 초기 카메라 위치 (더 가까이)
    }
    // 드레스 회전을 초기 상태로 복원
    if (threeModel) {
        threeModel.rotation.set(0, 0, 0);  // 회전 초기화
    }
}

// ============================================
// 애니메이션 토글 함수
// ============================================
function toggleThreeAnimation() {
    threeAnimationPlaying = !threeAnimationPlaying;  // 재생/정지 토글
}
