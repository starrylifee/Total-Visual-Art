# 봄·봄·봄 통합 플랫폼 설계서

연구교사제 「인공지능 융합 봄·봄·봄 프로그램」의 활동 도구들을 이 프로젝트(Total Visual Art) 안에서 하나의 플랫폼으로 통합한다.
작업 규칙: **한 단계씩 진행하고, 항목이 완성되면 체크(`[x]`)한 뒤 중간 결과를 보여주고 다음으로 넘어간다.**

---

## 1. 확정된 결정사항

| 항목 | 결정 |
|---|---|
| 통합 방식 | C안 — 이 폴더(Total Visual Art)를 뼈대로 증축 |
| 학생 접속 | 활동코드 + 출석번호 + 비밀번호 (로그인·개인정보 없음) |
| 교사 접속 | 구글 로그인 (기존 유지) |
| 배포 | Vercel (GitHub 푸시 → 자동 배포). Firebase Hosting 사용 중단 |
| DB | Firebase Firestore, 무료 Spark 플랜 유지. Cloud Functions 사용 안 함(Blaze 필요) |
| AI 호출 | 전부 Vercel 서버리스 함수 경유 (API 키를 브라우저에 노출하지 않음) |
| 메타인지 유니콘 | 코드 통합 X. 링크만 — https://metacog-unicorn.vercel.app/ |
| 유니콘 이미지 생성 | **교사 화면에만** 링크 — https://metacog-unicorn-imagegen.vercel.app/ |
| 영상 생성 | 앱에서는 영상 프롬프트 작성까지만(비용 문제). 실제 생성은 교사가 KLING/FLOW에서 (AI 오퍼레이터 방식) |
| 판정 구조 | AI는 즉석 비계 + 초벌 채점, 교사가 최종 확정 |
| 복원 챌린지 범위 | 펠드만 1~2단계(서술·분석)까지만. 3~4단계(해석·판단)는 재창작 모듈로 |

미결(사용자 확인 필요):
- [ ] 플랫폼 이름 (가칭: 봄·봄·봄 스튜디오)
- [x] 연구 평가 모듈 포함 여부 → **포함 확정** (2026-07-17)

---

## 2. 전체 구조

### 교사 흐름 (구글 로그인)
학급 생성 → 활동 생성(모듈 선택 + 활동코드 자동 발급) → 수업 중 실시간 모니터링·승인 → 판정 확정 → 영상 프롬프트 모아서 외부 생성 → 갤러리/포트폴리오 관리

### 학생 흐름 (크롬북, 로그인 없음)
활동코드 입력 → 출석번호 선택 → 비밀번호 입력(최초 입장 때 4자리 숫자 직접 설정, 이후 재입장 시 확인, 교사가 초기화 가능) → 활동 수행

### 모듈 (활동 생성 시 교사가 선택)
1. **명화 감상** — 루브릭을 교사·학생이 함께 정함 → 1차 감상 → AI가 루브릭+1차 감상을 근거로 꼬리 질문(비계) → 2차 감상. 펠드만 단계 도달도 추적
2. **복원 챌린지** — 명화·친구 작품 관찰 글 → 프롬프트 변환 → 이중 승인 이미지 생성 → 원본과 비교 + AI "다른 점 2가지" 코멘트 → 관찰 글 수정 후 2차 도전
3. **보훈(인물 사진)** — 독립운동가 사진 감상(감정·상황·의상 분석) → '평범한 하루' 선물 영상 프롬프트 작성 → AI 코멘트로 프롬프트 수정 비계
4. **캐릭터 스토리보드** — 친구 작품(찰흙 캐릭터 등) 선택·감상 → 3~4컷 스토리보드 → 영상 프롬프트 완성
5. **성찰(내 작품)** — 내 작품 사진 업로드 → AI Vision이 루브릭 3기준 초벌 피드백 → 교사 확정 → 성장 다짐 기록
6. **연구 평가** — 서술형 5문항 사전·사후 검사 + AI 초벌 채점 + 교사 확정 + CSV 내보내기

### 공통 기능 (기존 자산 재사용)
- 이중 승인 이미지 생성 큐 (프롬프트 승인 → 생성 → 이미지 승인 → 학생 전달)
- 교사 오퍼레이터 보드 (학생 영상 프롬프트 목록 + 복사 버튼 + 완성 영상 URL 등록 → 학생 공유)
- 3D 갤러리, PDF 포트폴리오, 뱃지, 발표 슬라이드쇼
- 외부 도구 링크 섹션 (유니콘 = 공용, 유니콘 이미지 생성 = 교사 전용)

---

## 3. 기술 방침

- **보안이 1순위 선행 작업**: 현재 Gemini API 키가 `VITE_` 변수로 학생 브라우저에 노출됨 → 모든 AI 호출을 `api/` (Vercel 서버리스)로 이전
- 학생 쓰기 작업(감상 제출, 프롬프트 제출 등)도 서버리스 API 경유 — 학생은 Firebase 계정이 없으므로 활동 세션 토큰으로 검증 (메타인지 유니콘 방식 참고)
- 생성 이미지는 base64를 Firestore에 저장 중(문서 1MB 한계) → 저장 전 리사이즈·압축
- 비밀번호는 해시로 저장, 학생 이름 등 개인정보는 저장하지 않음(출석번호만)
- 파비콘 + OG 이미지(카카오톡 공유용) 포함

### Firestore 구조(개요)
```
users/{uid}                         # 교사만 (role: teacher)
classes/{classId}                   # teacherId, 학급명
  students/{번호}                   # passwordHash, 뱃지, 최초입장일 (이름 저장 안 함)
  sessions/{sessionId}              # module, 활동코드, 루브릭, 참조자료, status
    submissions/{...}               # 감상문·관찰문·스토리보드·프롬프트 (단계별 기록)
    generationQueue/{...}           # 이중 승인 이미지 큐 (기존 재사용)
    videoRequests/{...}             # 영상 프롬프트 → 교사 오퍼레이터 → 영상 URL
```

---

## 4. 단계별 체크리스트

### 1주차 — 뼈대 공사
- [x] Vercel 배포 전환 (vercel.json, GitHub 자동 배포 연결, Firebase Hosting 설정 제거) — https://total-visual-art.vercel.app
- [x] AI 호출 서버리스 이전: `api/ai.js`(Gemini) + `api/ground.js`(그라운드) 생성, 클라이언트에서 API 키 완전 제거, 배포 번들 키 노출 없음 검증 완료. 모델도 최신화(gemini-2.5-flash / 2.5-flash-image). 작품 사진 전송·생성 이미지 저장 시 1024px 압축 적용
- [x] 학생 접속 체계 교체: 활동코드 + 출석번호 + 비밀번호(최초 설정/재입장 확인/교사 초기화) — `/join` 입장 UI + `api/student.js`(lookup/join/me) + 교사 대시보드 코드 발급·비밀번호 초기화
- [x] 학생용 세션 토큰 검증 구조 (서버리스에서 확인) — HMAC 서명 토큰 10시간, `verifyStudentToken` 헬퍼(`api/_lib.js`)를 이후 데이터 API가 공용 사용
- [x] Firestore 규칙 재작성 (교사 직접 접근 + 학생은 API 경유만) — 학생 직접 접근 조항 전부 제거, 교사=자기 학급만
- [x] 교사 대시보드 개편: 활동 생성 시 모듈 선택 UI + 활동코드 표시 + 학급 학생 수(출석번호 범위) 설정
- [x] 기존 기능(감상 루프·승인 큐·챗봇) 새 접속 체계에서 동작 확인 — `StudentWorkspace.jsx`(토큰 기반, 큐는 10초 폴링) + `api/student.js` 데이터 액션(queue-submit/queue-list/appreciation-submit) + `/api/ai` 인증 필수화(이미지 생성은 교사만)
- [x] 커밋 + 푸시 + 배포 확인

### 2주차 — 감상 계열 모듈
- [x] 명화 16종 DB 구축 (저작권 만료작, 메타데이터: 작가·조형 요소·감상 포인트) — `src/data/masterpieces.js` 정적 파일, 이미지는 위키미디어 Special:FilePath(파일명 기반, width 축소판), 16종 URL 전수 검증 통과. 서양 12(르네상스~추상) + 한국 4(김홍도·신윤복·정선·민화)
- [x] 모듈 1: 루브릭 공동 설정 화면 (교사 초안 + 수업 중 학생 의견 반영 편집) — `RubricEditor.jsx`(기본 템플릿=펠드만 4단계, 전자칠판 모드로 학생과 공동 편집), 활동 생성 시 명화 16종 선택 그리드(`MasterpiecePicker.jsx`), 학생 감상 화면에 '우리 반 감상 약속'+작품 정보 표시
- [x] 모듈 1: 1차 감상 → AI 비계 질문(루브릭+1차 감상 근거) → 2차 감상 흐름 — 학생 '감상 쓰기' 탭(`DeepAppreciation.jsx`, features.deepAppreciation), `/api/ai` scaffold 액션(루브릭+명화 조형요소+1차 감상 → 질문 3개 JSON), `deepAppreciations/{sno}` 학생당 1문서로 재입장 복원. ※ firestore.rules에 deepAppreciations 교사 열람 추가 — 규칙 재배포 필요
- [x] 모듈 1: 펠드만 단계 도달도 추적 + 교사 모니터링 화면 — `AppreciationMonitor.jsx`(대시보드 '📊 감상 현황' 버튼): 출석번호 그리드(미시작/1차/2차, 30초 자동 갱신), AI 초벌 판정(`/api/ai` feldman 액션, 교사 전용, 순차 호출로 분당 한도 보호) → 교사 확정(1~4단계 버튼). 로컬 판정 검증: 서술만 글=1단계, 판단 글=4단계 정확
- [x] 모듈 2: 관찰 글 → 프롬프트 변환 → 이중 승인 생성 연결 — `RestoreChallenge.jsx`(기존 감상 루프 탭 대체): 관찰 글 → AI 변환(refine 재사용) → 학생 수정 → 기존 승인 큐 제출(kind=restore, round, 프롬프트에 '[복원 N차]' 라벨)
- [x] 모듈 2: 원본 vs 생성 이미지 비교 화면 + AI "다른 점 2가지" 코멘트 — `/api/ai` compare 액션: 서버가 세션 원본+본인 큐 이미지를 직접 읽어 비교(주소 위조·SSRF 차단), differences 2개+praise
- [x] 모듈 2: 2차 도전 (1차·2차 결과 나란히 성장 비교) — 다른 점 단서를 보며 관찰 보완 → round 2 제출 → 1차·2차·원본 3장 비교 + 성찰 저장. 진행 상태는 `restoreChallenges/{sno_N}` 문서로 재입장 복원
- [x] 커밋 + 푸시 + 배포 확인 + UX 자체 점검(교사/학생 흐름) — 운영 E2E 23/23 통과 (모듈2 포함: restore-save 화이트리스트, compare 미공개 거부, 다른 점 2가지 실호출)

### 3주차 — 창작·성찰 계열 모듈
- [x] 모듈 3: 인물 사진 감상 활동 (교사가 사진 등록, 감정·상황·의상 분석 입력 폼) — `PortraitStory.jsx`(features.portrait, 기본 off), 교사는 활동 생성 시 인물 사진 URL+이름+소개 등록(학생 사진 금지 안내 포함)
- [x] 모듈 3: '평범한 하루' 영상 프롬프트 작성 + AI 수정 코멘트 비계 — `/api/ai` video-coach 액션(칭찬 1+단서 질문 2, 대신 써 주지 않음), 제출 시 `videoPrompts/{sno_N}`에 status=submitted 저장(오퍼레이터 보드 대비), 교사가 videoUrl 등록하면 학생 화면에서 15초 폴링으로 감상
- [x] 모듈 4: 친구 작품 갤러리에서 선택 → 감상 → 3~4컷 스토리보드 편집기 — `StoryboardStudio.jsx`(features.storyboard, 기본 off): gallery-list(공개 작품 최신 30개, 번호만 노출) → 한 줄 감상 → 컷 편집기(3~4컷, 추가/삭제)
- [x] 모듈 4: 스토리보드 → 영상 프롬프트 완성 (AI 다듬기 비계) — `/api/ai` storyboard-polish(컷 내용 보존+장면 연결+카메라 표현, tip 질문 1개) → 학생 수정 → `videoPrompts/{sno}_sb` 제출 → 기존 오퍼레이터 보드 재사용(종류 배지로 인물의 하루/스토리보드 구분, 추가 규칙 배포 불필요)
- [x] 교사 오퍼레이터 보드: 프롬프트 목록·복사 → 영상 URL 등록 → 학생 공유 — `OperatorBoard.jsx`(대시보드 '🎬 영상 보드' 버튼): 학생별 카드(상태 배지: 작성 중/제출됨/영상 등록됨, 관찰 요약), 프롬프트 클립보드 복사, KLING/FLOW 바로가기, 영상 URL 등록(엔터 지원, https 검증) → 학생 화면 15초 폴링으로 자동 공유. 30초 자동 갱신
- [x] 모듈 5: 작품 사진 업로드 → AI Vision 루브릭 초벌 → 교사 확정 → 성장 다짐 — 학생 `ArtworkReview.jsx`(features.artReview, 기본 off): 업로드(1024px 압축) → artwork-review 액션(작품 루브릭 항목별 met+제안형 코멘트, 학생 즉석 표시) → 교사 `ArtReviewBoard.jsx`(코멘트+확정, 확정 전 다짐 서버 차단) → 성장 다짐. 작품 루브릭(artRubric)은 RubricEditor 재사용(fieldName 프롭 확장, 기본 4항목·칠판 모드 지원)
- [x] 커밋 + 푸시 + 배포 확인 + UX 자체 점검 — 운영 E2E 39/39 통과. UX 점검: (학생) 모든 모듈이 재입장 복원·폴링 지원 / (교사) 활동 카드의 관리 버튼이 5종까지 늘어 붐빔 — 4주차 화면 정리 때 관리 패널로 정돈 후보

### 4주차 — 마감·확산
- [ ] 3D 갤러리·PDF 포트폴리오를 새 모듈 산출물과 연결
- [ ] 외부 링크 섹션 (유니콘 공용 / 유니콘 이미지 생성 교사 전용)
- [ ] 파비콘 + OG 이미지 제작
- [ ] 전자칠판(스크롤 없는 한 화면)·크롬북(16:9) 화면 점검, 글씨 크게
- [ ] 키보드 UX: 엔터 진행, 입력 자동 포커스
- [ ] 앱뜰에 등록
- [ ] 연구 평가 모듈: 사전·사후 5문항 + AI 초벌 채점 + 교사 확정 + CSV 내보내기 (대조군 학급은 활동코드로 검사만 응시 가능하게)
- [ ] 최종 커밋 + 푸시 + 배포 확인

---

## 5. 진행 로그

### 2026-07-17
- 1주차 ①② 완료: Vercel 전환(https://total-visual-art.vercel.app, GitHub 푸시 자동 배포) + AI 키 서버리스 이전(`api/ai.js`, `api/ground.js`). 배포 번들 키 노출 없음 검증, 텍스트·이미지 생성 실제 테스트 통과. 커밋 2개 푸시 완료
- 삽질 기록: Vercel 환경변수를 PowerShell 파이프로 넣으면 BOM(U+FEFF)이 앞에 붙어 500 에러 발생 → cmd 리다이렉트로 재등록 + 서버 코드에 BOM 제거 방어 로직
- **다음 작업**: 학생 접속 체계 (활동코드 + 출석번호 + 비밀번호) — 1주차 3번째 항목부터
- **사용자 결정 대기**: 없음

### 2026-07-18
- 사용자 결정: Gemini API 키는 그대로 유지, Firebase Hosting은 끄기
- `firebase hosting:disable` 실행 → total-visual-art.web.app 접속 시 Site Not Found(404) 확인. API 키 노출된 옛 버전 완전 차단
- 1주차 ③④ 완료: 학생 접속 체계 + 세션 토큰
  - 서버: `api/student.js`(lookup/join/me), `api/_lib.js`(Admin SDK 초기화·HMAC 토큰·scrypt 비밀번호 해시). Firestore 접근은 Admin SDK만
  - 서비스 계정 키는 firebase CLI 로그인 토큰으로 IAM API에서 발급 → `FIREBASE_SERVICE_ACCOUNT_B64`, `STUDENT_TOKEN_SECRET` 환경변수(.env + Vercel production) 등록
  - 활동코드는 `joinCodes/{code}` 톱레벨 매핑(콜렉션그룹 인덱스 불필요). 세션 생성 시 자동 발급, 기존 세션은 대시보드에서 재발급 버튼
  - 학생 문서: `classes/{id}/students/{출석번호}` — 해시·솔트·입장 시각만, 이름 없음. 교사 초기화 = 문서 삭제
  - 검증: 로컬 13개 시나리오 + 운영(Vercel) 실 API 입장 흐름 통과. firestore.rules 배포 완료
  - 학생 입장 후 화면(`/student/session`)은 아직 게이트만 — 기존 활동 기능 연결은 다음 단계
- **다음 작업**: 1주차 ⑤~⑦ — Firestore 규칙 전면 재작성(학생 직접 접근 제거), 교사 대시보드 모듈 선택 UI, 기존 기능(감상 루프·승인 큐·챗봇)을 학생 토큰 기반 API로 연결(SessionWorkspace 개편)

### 2026-07-24
- 1주차 ⑤~⑦ 완료 (1주차 전체 마감):
  - Firestore 규칙 전면 재작성: 학생 직접 접근 조항(students/pendingStudents 멤버십, 학생의 큐·감상 직접 쓰기) 전부 제거. 교사는 자기 학급(teacherId 일치)만 읽기·쓰기, 학생 데이터는 서버리스 API(Admin SDK)만 대행
  - `/api/ai` 인증 필수화: 학생 토큰 또는 교사 ID 토큰 없으면 401 (무단 호출로 무료 한도 소모 방지). 이미지 생성 action은 교사 전용(승인 큐 구조상 교사 화면에서 실행됨) — `authenticateRequest`(`api/_lib.js`), 클라이언트는 `apiAuth.js`의 `authHeaders()`로 헤더 부착
  - `api/student.js`에 데이터 액션 추가: queue-submit(승인 요청, 1000자 제한), queue-list(내 요청만), appreciation-submit(감상 저장, 5000자 제한). 토큰 검증 + 세션 열림 확인(`requireStudent`). 학생 식별자는 `sno_{출석번호}`
  - 학생 화면 `StudentWorkspace.jsx` 신설: 감상 루프(4단계)·AI 그림(승인 큐)·작품 분석·표현 도우미·챗봇을 features 플래그로 탭 구성. 실시간 구독 대신 10초 폴링 + 수동 새로고침(학생은 Firestore 직접 구독 불가)
  - 구 접속 체계 잔재 제거: `StudentDashboard.jsx` 삭제, classService의 초대코드·승인 함수 삭제, 로그인 화면 교사 전용화(학생 카드는 /join 링크)
  - 학급 생성 시 학생 수(출석번호 범위 1~40) 입력 추가
- 배포 사고와 해결: `/api/ai`에 `api/_lib.js`를 연결하자 firebase-admin/auth → jwks-rsa가 ESM 전용 jose를 require 하다 Vercel 런타임에서 전 함수 크래시(FUNCTION_INVOCATION_FAILED). 교사 ID 토큰 검증을 Identity Toolkit REST(`accounts:lookup`)로 교체해 firebase-admin/auth 의존 제거로 해결. 로컬 Node 22.22에서는 require(ESM)이 허용돼 재현 안 됐음 — **api/ 수정 후에는 운영 URL 실호출 확인 필수**
- 운영 E2E 검증 11/11 통과: lookup→join(비번 설정/오류 거부)→me→queue-submit→queue-list→appreciation-submit, 위조 토큰 401, 닫힌 활동 403, 학생 토큰 AI refine 200, 학생의 image 생성 403
- firestore.rules 배포 완료(사용자가 직접 `firebase deploy --only firestore:rules` 실행) — 학생 직접 접근 차단 규칙 운영 반영됨
- **다음 작업**: 2주차 — 명화 16종 DB 구축부터 (모듈 1·2: 루브릭 공동 설정, 1차 감상→AI 비계→2차 감상, 복원 챌린지)

### 2026-07-24 (2주차)
- 2주차 모듈 1 완료 (명화 DB + 루브릭 + 감상 비계 + 모니터링):
  - 명화 16종 DB(`src/data/masterpieces.js`): 서양 12 + 한국 4, 조형 요소·감상 포인트 메타 포함. 이미지는 위키미디어 Special:FilePath(파일명 기반) + width 축소판. 이중섭은 2027년 저작권 만료라 제외
  - 루브릭 공동 설정(`RubricEditor.jsx`): 펠드만 4단계 기본 템플릿, 전자칠판 모드(글씨 크게, 수업 중 학생 의견 반영 편집), 세션 rubric 필드에 저장
  - 감상 비계 흐름(`DeepAppreciation.jsx`, features.deepAppreciation): 1차 감상 → AI 질문 3개(scaffold 액션: 루브릭+명화 조형요소+학생 글 인용) → 2차 감상 → 1·2차 비교. `deepAppreciations/{sno_N}` 학생당 1문서, 재입장 복원(deep-get)
  - 모니터링(`AppreciationMonitor.jsx`): 출석번호 그리드(미시작/1차/2차, 30초 자동 갱신), AI 초벌 판정(feldman 액션, 교사 전용, 1.2초 간격 순차 호출로 분당 한도 보호) → 교사 1~4단계 확정. 판정 프롬프트 로컬 검증: 서술만=1단계, 판단 포함=4단계 정확
  - firestore.rules: deepAppreciations 교사 read/update 추가 — 사용자가 규칙 배포 완료
- **다음 작업**: 2주차 모듈 2 — 관찰 글 → 프롬프트 변환 → 이중 승인 생성 연결(기존 감상 루프 탭을 복원 챌린지로 개편), 원본 vs 생성 비교 + AI '다른 점 2가지' 코멘트, 2차 도전
- 2주차 모듈 2 완료 (복원 챌린지, 2주차 전체 마감):
  - `RestoreChallenge.jsx`가 기존 감상 루프 탭 대체: 관찰(20자↑) → AI 변환(refine) → 학생 수정 → 승인 큐 제출('[복원 N차]' 라벨) → 대기(10초 폴링, 거절 시 재제출) → 원본 비교(AI 다른 점 2가지+칭찬) → 2차 도전 → 3장 비교+성찰. `restoreChallenges/{sno_N}`으로 재입장 복원
  - `/api/ai` compare: 이미지 주소를 클라이언트에서 받지 않고 세션 원본+본인 큐 문서를 서버가 직접 읽음(위조·SSRF 차단). 위키미디어 fetch는 User-Agent 필수(없으면 거부) — 삽질 기록
  - 운영 E2E 23/23. compare 품질: 1px 시드 이미지 vs 별이 빛나는 밤 비교에서 "여러 색깔이 보인다고 꼭 설명해 주세요" 등 다음 관찰에 쓸 단서를 정확히 제시
  - UX 자체 점검: (교사) 승인 큐에 '[복원 N차]' 라벨로 회차 구분됨. 복원 챌린지 전용 교사 현황판은 아직 없음(후보: 감상 현황처럼 그리드) / (학생) 챌린지는 학생당 1회 구조 — 초기화하려면 Firestore 콘솔에서 restoreChallenges 문서 삭제 필요. 교사 초기화 버튼은 추후 후보
  - firestore.rules에 restoreChallenges 교사 열람 추가 — **규칙 재배포 필요**
- **다음 작업**: 3주차 — 모듈 3(인물 사진 감상 + 영상 프롬프트), 모듈 4(스토리보드), 교사 오퍼레이터 보드, 모듈 5(AI Vision 루브릭 초벌)
- 3주차 모듈 3 완료: `PortraitStory.jsx`(감정·상황·의상 관찰 폼 → 영상 프롬프트 → AI 비계 코멘트 → 제출 → 교사 영상 URL 등록 시 감상, 15초 폴링). `/api/ai` video-coach(칭찬1+단서 질문2, 대신 안 써 줌). `videoPrompts/{sno_N}` 저장(오퍼레이터 보드가 이 컬렉션 사용 예정). 운영 E2E 27/27. 코멘트 품질: 관찰에 쓴 '굳센 표정·슬픈 눈빛'을 영상 설명에 반영하라는 단서 질문 정확
- 규칙 배포 완료(사용자 직접 실행): restoreChallenges 교사 열람 + videoPrompts 교사 열람/update 운영 반영
- **다음 작업**: 3주차 계속 — 교사 오퍼레이터 보드(프롬프트 목록·복사 → 영상 URL 등록 → 학생 공유)를 모듈 4보다 먼저(모듈 3 흐름 완결), 그 다음 모듈 4(스토리보드)
- 교사 오퍼레이터 보드 완료: `OperatorBoard.jsx` — 학생별 프롬프트 카드·복사·KLING/FLOW 바로가기·영상 URL 등록. 이로써 모듈 3 흐름(관찰→프롬프트→AI 비계→제출→교사 대리 생성→학생 감상) 완결. 배포 번들 교체 확인
- **다음 작업**: 모듈 4 — 친구 작품 갤러리에서 선택 → 감상 → 3~4컷 스토리보드 편집기 → 영상 프롬프트 완성(AI 다듬기 비계)
- 모듈 4 완료: `StoryboardStudio.jsx` — 갤러리 선택(공개 작품, 번호만) → 한 줄 감상 → 3~4컷 편집 → storyboard-polish(컷 보존+카메라 표현) → `videoPrompts/{sno}_sb` 제출 → 오퍼레이터 보드 재사용(종류 배지). 운영 E2E 33/33. polish 품질: 3컷을 순서 그대로 이으며 '카메라가 부드럽게 옆으로 이동' 등 연출 표현만 보탬, tip('어떤 소리가 나면 더 좋을까?') 적절
- **다음 작업**: 모듈 5 — 작품 사진 업로드 → AI Vision 루브릭 초벌 → 교사 확정 → 성장 다짐 (3주차 마지막)
- 모듈 5 완료 (3주차 전체 마감): 학생 `ArtworkReview.jsx` + 교사 `ArtReviewBoard.jsx` + artwork-review/save/get. 확정 전 다짐은 서버가 400으로 차단. 운영 E2E 39/39. 초벌 품질: 빈 이미지에 met=false + 나무라지 않는 제안형 코멘트("멋진 그림으로 이야기를 들려주면 어떨까요?") 확인
- 규칙 배포 완료(사용자 직접 실행): artworkReviews 교사 열람/update 운영 반영 — 이로써 미배포 규칙 없음
- **다음 작업**: 4주차 — 3D 갤러리·PDF 연결, 외부 링크 섹션, 파비콘+OG, 화면 점검(전자칠판·크롬북), 키보드 UX, 앱뜰 등록, 연구 평가 모듈(사전·사후 5문항+CSV)

## 6. 비용·제약 메모

- Gemini 무료 한도: 텍스트는 21명 동시 수업 무리 없음. 이미지 생성은 분당 한도가 있어 승인 큐가 속도 조절 역할
- 영상 생성 API 미사용 (회당 수백~수천 원 발생하므로 프롬프트까지만)
- Cloud Functions 미사용 → Spark 플랜 유지
- Firestore 문서 1MB 한계 → 이미지 압축 저장 필수
