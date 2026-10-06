# 단일 파형 커서 — 구현과 수용

2026-10-05, 전체 로드맵 U01. 사용자 요청: A/B·B checkbox가 차지하는 행을 없애고 Cursor / Zoom range 선택만 남긴다.

## 구현

단일 시각 커서와 toolbar Time만 표시한다. B checkbox/별도 strip/Delta/B 색상/영구 B 상태/Shift로 B 생성하는 동작을 제거했다. 신호 행의 Ctrl/Shift 선택은 유지한다. Snap과 이전/다음 Edge는 어느 도구 모드에서든 단일 커서를 사용한다. Escape·focus loss·pointer 취소는 진행 중 조작을 복원한다. 구조 화면도 cursor A 대신 cursor라고 표시한다.

기존 편집기 상태의 a/선택 경로/스타일/보기 ID/확대 범위를 유지한다. b는 읽거나 복원하지 않으며 잘못된 옛 b 때문에 유효한 a를 초기화하지 않는다. 내부 DOM cursor-a와 상태 a는 호환성을 위해 유지하지만 두 번째 커서는 없다. TraceCursorHub의 실행 identity/token/revision 계약은 변경하지 않았다. 두 시각 간 차이 측정은 이번 단순화로 제거된 기능이다.

## 자동 검증

- `node node_modules/tsx/dist/cli.mjs --test tests/waveform*.test.ts`: 34 PASS, fail/cancel/skip 0. HTML 두 도구/중복 커서 요소 제거, 실제 bundle에서 legacy B 무시·Shift drag·Escape 복원·Zoom 범위·Snap·focus loss, 기존 공유 커서 늦은 token/revision 거절·echo 방지, 버스/정렬/저장 보기/worker 회귀 포함.
- `node node_modules/tsx/dist/cli.mjs --test tests/structure-view.test.ts`: 7 PASS, fail/cancel/skip 0. 구조 시간 표기 변경과 기존 recorded view 동작 검증.
- `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/build.mjs`: exit0.

현재 관련 시험 결과다. 과거 전체 suite 수를 합치거나 이번 전체 suite 실행이라고 쓰지 않는다.

## 실제 GUI 수용

Computer Use로 기존 격리 개발 프로필을 사용했다. VS Code1.140.0, `.dev/launch-execution-detail.mjs`, project-peer의 `.rtl/runs/ui-wave-ux/wave.vcd` 합성 4신호 fixture다.

저장 보기/신호 순서와 4.556ns가 복원됐고, toolbar 두 도구만 보이며 별도 A/B 행이 없는 것을 확인했다. Zoom range로 시간축 약10–20ns 구간을 드래그해 큰/작은 눈금과 네 신호를 유지한 확대를 확인했다. Cursor로 돌아와14.788ns를 클릭하니 valid/ready/clk=1, data=0x01로 갱신됐다. Snap으로10ns에 이동해 같은 커서와 값 기준이 적용됨을 확인했다. 검증 창 종료와 launcher exit0을 확인했다.

이는 합성 파형 GUI 수용이며 새 native 시뮬레이션이나 실제 사용자 프로필/대표 설계 시험이 아니다. 구조 양방향 시간 연동의 이번 증거는 자동 시험이며 기존 물리 수용을 다시 수행하지 않았다. 깨끗한 OS 설치, 대규모 loading 취소와 두 reader 복구 등 잔여 게이트는 유지한다. VSIX 생성/설치 없음.

다음 구현은 U02 Simulation 전용 Activity Bar다. 현재 RTL Start는 여전히 Explorer에 있으며 옮겨졌다고 기록하지 않는다.
