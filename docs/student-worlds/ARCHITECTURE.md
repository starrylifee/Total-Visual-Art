# 다른 프로젝트로 확장하기

공통 탐험 기능은 `src/features/student-worlds/`가 정본이다. 새 그림마다 이동·카메라·점프를 복제하지 않는다. 현재는 여름방학 프로젝트 하나이며, 다른 프로젝트의 실제 콘텐츠는 아직 만들지 않았다.

## 연결 구조

- `projectRegistry.js`: 프로젝트 등록, 기본 프로젝트, 설정 검증, 장면 지연 로딩.
- `worldCatalog.js`, `worldConfigs.js`, `summerScenes.jsx`, `worlds/`: 현재 여름방학 콘텐츠 묶음.
- `StudentWorlds.jsx`: 선택한 프로젝트의 목록·작품 이동·원본 비교·공통 입력.
- `ExploreScene.jsx`, `Character.jsx`, `platformPhysics.js`, `platformSurfaces.js`: 프로젝트에 독립적인 렌더·인물·물리. ExploreScene은 config와 Scene을 전달받는다.

## 새 테마 추가

1. 고유한 프로젝트 ID를 정한다. 예: `our-neighborhood`.
2. 별도 카탈로그와 설정 파일을 만든다. 작품 ID는 프로젝트 안에서만 고유하면 된다. 다른 프로젝트도 `01`을 사용할 수 있다.
3. 원본은 `public/student-worlds/our-neighborhood/01/start.jpg`처럼 프로젝트별 폴더에 보관한다. 기존 여름방학 URL은 호환성을 위해 유지한다. 공개 허락 범위를 먼저 확인한다.
4. 장면 컴포넌트들을 `{ sceneKey: Component }` 형태의 default export로 묶는다.
5. `defineDrawingProject({ id, title, worlds, configs, loadScenes: () => import('./새장면묶음.jsx'), description, featuredDescription })`로 정의하고 `drawingProjects` 배열에 추가한다. lazy 컴포넌트는 렌더 중 새로 만들지 않는다.
6. `/worlds?project=our-neighborhood&world=01`로 연결한다. 프로젝트가 둘 이상이면 목록 화면에 프로젝트 선택 메뉴가 자동 표시된다. 기존 `/worlds?world=08`은 여름방학으로 연결된다.

각 설정에는 `spawn`(x, z, height, 선택 yaw), `bounds`(minX/maxX/minZ/maxZ), `floorAt(x,z)`, `isSwimming(player)`, `map` 배열, `heading`, `guide`를 제공한다. 물이 없으면 isSwimming은 false를 반환한다. 배경·안개·물 영역·흐름·카메라 초점 높이는 기존 worldConfigs를 참고한다. 고정 발판에만 walkable을 지정하고 사람·움직이는 장식은 nonSolid로 구분한다.

## 별도 저장소에서 재사용

공통 기능 폴더와 CSS를 옮기고 React, React Router, Three.js, React Three Fiber, drei를 연결한다. 라우터 안에 StudentWorlds를 배치하고 프로젝트 등록을 교체한다. 현재는 독립 npm 패키지가 아니며, 원본 파일과 여름방학 콘텐츠까지 자동 이전되는 것은 아니다. 새 콘텐츠마다 원본 비교와 실제 조작 검수를 별도로 수행한다.

## 검증

`node --test src/features/student-worlds/*.test.mjs`와 `npm run build`를 실행한다. 원본 바이트 대조는 `STUDENT_DRAWINGS_SOURCE_ROOT` 환경 변수로 원본 폴더를 지정했을 때만 실행한다. 미지정 시 그 검사만 skip하며, 공개 이미지 존재 검사는 계속 실행한다. 현재 20개 전용 무결성 테스트는 여름방학 회귀 검사이므로 새 프로젝트 테스트는 별도로 추가한다.

프로젝트 선택 → 입장 → 이동/시선/점프 → 원본 비교 → 초기화 → 목록 복귀를 브라우저에서 확인한다. 자동 테스트의 단순화 메시 검사는 실제 모든 목적지 왕복 검수를 대신하지 않는다.

2026-09-05 확장 작업 검증: 원본 경로 지정 시 자동 검사 34개 통과, 프로덕션 빌드 통과. 로컬 브라우저에서 여름방학 목록, 해변 입장, 실제 방향 버튼 이동(0.0/11.0 → 0.0/10.6), 초기화(0.0/11.0), 원본 비교 모달을 확인했다. 새 프로젝트의 정의·ID 독립성·설정 누락은 단위 검사로 확인했으며, 실제 두 번째 콘텐츠를 등록한 UI 검수는 다음 프로젝트 제작 시 수행한다. 카탈로그 상태는 전체 목적지 검수가 남아 있어 prototype으로 표시한다.

## 아바타와 시점 (2026-09-06)

- 탐험 캐릭터는 `Character.jsx`의 관절 뼈대를 그대로 쓰고, `avatar` 속성으로 `avatarSkins.jsx`의 마스코트 몸체(신곰이·신답이·용석핑)를 갈아 끼운다. 걷기·수영·2단 점프 애니메이션은 공통이다. 새 마스코트는 `avatarCatalog.js`에 항목을 추가하고 스킨 컴포넌트에서 bodyRef·headRef·eyesRef와 hip/knee/arm/elbow 8개 관절 ref를 모두 연결하면 된다.
- `/worlds` 첫 방문에는 `AvatarPicker`가 셋 중 하나를 고르게 하고 localStorage(`student-worlds-avatar`)에 저장한다. 목록 상단과 탐험 도구모음의 "아바타 바꾸기"로 언제든 바꿀 수 있다. 원본 참고 이미지는 저장소에 넣지 않았다.
- 시점은 기본 3인칭이고 도구모음 버튼 또는 V키로 1인칭과 전환한다(`student-worlds-view`). 1인칭에서는 아바타와 발밑 표식을 숨기고 눈높이 1.5(수영 시 0.75)에서 바라본다.
- `/worlds?avatarPreview=singom&spin=0`은 마스코트 정면 확인용 개발 화면이다. `yaw=90`(도 단위 회전), `zoom=1.6`(카메라 거리 배율), `walk=1`(걷기 자세), `behavior=wave`를 붙여 각도·크기·동작을 바꿔 볼 수 있다. 백그라운드 탭에서는 프레임이 멈춰 비어 보일 수 있다.
