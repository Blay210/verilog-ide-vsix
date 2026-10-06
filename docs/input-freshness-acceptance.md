# U03 테스트 입력 변경 표시 — 구현과 검증

2026-10-05. Simulation Tests 행에 저장 입력 비교 상태를 추가했다. PASS/FAIL은 이전 실행 결과로 유지하며 Outdated는 저장된 현재 입력의 불일치를 의미한다. 이번 범위는 Simulation 행이며 Explorer 파일 decoration은 후속이다.

## 동작과 경계

- 비교 중에는 Checking inputs, 저장본 불일치는 경고 아이콘과 Outdated, 비교 실패/legacy는 Inputs unknown으로 표시한다. 비교 이유를 tooltip으로 보여준다. 미저장 입력은 별도의 Unsaved edits이며 저장본 비교 상태와 동시에 표시할 수 있다.
- 대상별 최신 완료 결과를 기준으로 Core 입력 비교를 호출한다. 소스/설정이 원래와 같아지면 표시가 해제된다. 재실행 결과도 새 기준으로 비교한다. 지난 파형 버튼과 결과 상태를 변경하지 않는다.
- DUT/package/TB, 기록된 include와 configured include tree, define/top/backend/timing/waveform 설정을 기존 지문 범위로 비교한다. timeout/jobs/tag·도구 환경은 기존 입력 지문의 범위 밖이며 이 표시가 동일 환경 재현이나 파형/구조 연결을 보증하지 않는다.
- 자동 package 정렬 프로젝트의 표시 비교는 기록된 package 순열만 재사용한다. 동일 판정은 source membership·일반 RTL 순서·설정·모든 추적 파일의 해시 일치를 여전히 요구한다. 수동 순서는 재정렬하지 않는다. 의존성 변경은 파일 내용 불일치로 표시하며 실행용 정렬은 기존 semantic provider가 수행한다. watcher마다 slang을 실행하지 않는다.
- 저장 watcher는 300ms debounce로 manifest/glob을 다시 읽는다. .vh와 임의 확장자의 추적 include도 감시한다. text 편집 이벤트는 dirty 표시만 갱신하고 저장 시 비교를 예약한다. .rtl/.git/node_modules 출력은 제외한다.
- 비교 작업은 순차 실행하고 refresh/dispose 시 취소한다. 세대 검증으로 이전 결과가 새 manifest/결과 상태를 덮지 않는다. untrusted workspace는 비교 불가 상태다. 확인 작업에 설치나 자동 실행이 없다.

## 자동 검증

관련33 PASS / fail0 / cancelled0 / skipped0:

```text
node node_modules/tsx/dist/cli.mjs --test tests/input-freshness.test.ts tests/input-identity.test.ts tests/simulation-ui.test.ts tests/simulation-summary.test.ts tests/testbench-targets.test.ts tests/extension-ui.test.ts
```

자동 package 순열과 수동 순서, DUT/package 내용·define/top/waveform 설정 변화, 한글/공백 경로·include 범위, legacy/읽기 오류, refresh 취소·오래된 응답 차단·다른 프로젝트 ID·dispose, warning/PASS/파형 액션 유지, 기존 실행·승인·취소 회귀를 확인했다.

별도 보존 입력/파형 연결 회귀10 PASS:

```text
node node_modules/tsx/dist/cli.mjs --test tests/input-snapshot.test.ts tests/trace-identity.test.ts
```

타입 검사와 개발 빌드 exit0. 새 전체 suite 회귀를 수행한 것은 아니다.

## 실제 VS Code host와 Verilator 검증

격리 profile의 tests/vscode/freshness.ts를 RTL_FRESHNESS_TEST=1로 실행했다. scripts/test-vscode.mjs가 만든 새 프로젝트만 사용했으며 examples/counter와 사용자 창은 변경하지 않았다. `.dev/vscode-tests/run-C5lwZR/project/.rtl/extension-test.json`은 passed=true, freshness=true, nativeRuns=2다. host exit0.

- counter_basic PASS19.545s, run cb411e7e-e7b0-416f-bed7-ac55cf5794bc.
- counter_reset PASS19.155s, run 9cc79249-55b0-4162-9101-db104495ea10.
- 두 VCD 결과의 초기 matching, 저장 DUT 변경→두 행 changed/PASS 유지, 복원→matching.
- 실제 TextDocument 편집→해당 TB만 unsaved=true/저장본 matching 유지, 저장→해당 TB만 changed, 다른 TB matching 유지.
- TB 복원·저장→matching/dirty 해제, waveform 설정 VCD→FST→두 행 changed, 설정 복원→matching.

실제 host API/파일 감시/편집/실행 수용이다. 눈으로 확인하는 행 배치·색·hover 물리 수용이나 사용자 프로필 시험을 대신하지 않는다. 경고 아이콘·설명·tooltip은 tree-provider 자동 검증 범위다.

## 남은 제한과 다음 작업

현재 refresh는 활성 workspace의 최신 대상들을 순차 재비교한다. 변경 파일별 최소 대상 캐시나 여러 테스트의 해시 공유 최적화는 없다. 기존 bounded 입력 스캔과 보수적인 include-directory 전체 비교를 유지하므로 사용하지 않는 header 변화도 Outdated가 될 수 있다. 수백 파일/다수 테스트에서 비용은 대표 설계 게이트에서 측정해야 한다.

manifest 자체가 잘못되거나 필수 glob이 비면 기존 프로젝트 오류 경로로 처리되어 Tests 대상이 사라질 수 있다. 이런 구성 오류를 Outdated 배지 하나로 대신하지 않는다. 보존 archive의 외부 손상은 명시적 Refresh/재검사 시 확인하며 archive watcher 기반 파형 무결성 경계는 기존 구조/파형 계층에 남아 있다.

다음 구현은 U04 읽기 전용 schematic canvas pan/zoom/Fit. U05 enum, U12 프로젝트 자동 발견은 미구현이며 기존 안정화3묶음·깨끗한 Windows 보류1은 유지한다. VSIX/설치/배포 없음.
