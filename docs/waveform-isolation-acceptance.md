# 저장 보기 복원·격리 수용 — 2026-10-05

## 재개 완료 — 저장 보기 복원·격리 실제 수용 (2026-10-05)

사용자의 재개 요청 후 VS Code 1.140.0의 같은 지속 저장 개발 프로필에서 실제 키·마우스로 확인했다. 원본 counter_basic에는 기본 카운터 ★(clk/rst_n/count 3신호)와 리셋과 결과(rst_n/count 2신호)가 재시작 후 모두 남았고 전환 시 선택이 복원됐다. 원본 counter_reset의 목록은 Custom뿐이었다. 이름이 같은 counter/counter_basic/top을 가진 다른 프로젝트의 목록도 처음에는 Custom뿐이었다.

다른 프로젝트에서 count만 선택해 다른 프로젝트 보기로 저장하고 기본 지정했다. 창 정상 종료(exit0) 후 같은 프로필을 다시 열어 해당 기본 보기와 1신호 복원을 관측했다. 원본 basic을 다시 열면 기본 카운터 ★/Default ✓/3신호가 유지되고 목록에는 Custom·기본 카운터·리셋과 결과만 있었다. 다른 프로젝트 보기의 혼입은 없었다. 최종 창도 exit0으로 종료했다. 이번에는 기존 정상 native 결과를 사용했으며 새 native 성공을 주장하지 않는다.

검증: 저장 보기 관련 회귀 5 PASS/0 fail/skip, TypeScript 검사와 개발 빌드 exit0. 로그 .dev/wave-isolation-regression.log, .dev/wave-isolation-ui-resume.log, .dev/wave-isolation-ui-restart.log; 관측 요약 .dev/wave-isolation-ui-acceptance.json. 제품 코드 수정 및 VSIX/설치 없음. 물리 화면 근거는 작업 대화의 스크린샷 관측이며 자동 host receipt로 대체하지 않는다.

남은 큰 검증은 3묶음: 세부 예외·실행 안정화(아래 시간 제한 지연 포함), 실제 사용자 프로필 충돌, 대표 실제 설계·loading 취소·두 reader 메모리 회수. 깨끗한 Windows는 별도 환경 없음으로 별도 보류 1이다. 다음 작업은 아래 60초 제한 대비 190~229초 결과 기록의 원인 재현·종료 경로 점검을 우선한다. 관리 대화상자/누락 신호 및 모든 예외까지 물리 수용 완료라는 뜻은 아니며 전체 A3/F·배포 준비 완료도 아니다.

## 이전 중단 기록 (재개 전 상태)

VS Code1.140.0 격리 지속 저장 프로필에서 기존 counter_basic 결과를 열어 `기본 카운터 ★`/Default ✓/3신호 복원을 확인했다. clk를 해제하고 `리셋과 결과`라는 두 번째 보기를 저장했으며 Saved view와 rst_n/count의2신호를 확인했다. 이는 기존 `.dev/vscode-tests/run-rQSqPW/profile`의 실제 GUI 관측이다. 두 보기 모두의 새 재시작 복원, 다른 TB·프로젝트 비교는 아직 완료하지 않았다.

비교용 Core 템플릿 사본 `run-rQSqPW/project-peer`에서 CLI test --all을 시도했으나 두 테스트 모두 시간 초과됐다: basic `074344e8-9be1-4ca7-9206-1a93d2362700` 190465ms, reset `3733b7e8-0333-4d89-86e0-26d8c0791b5f` 229258ms, 설정 제한60000ms, CLI exit1. 기존 정상 예제가 이번 실행에서 왜 시간 초과되고 실제 종료 시간이 제한을 크게 넘었는지는 미확정이다. 환경 부하 또는 제품 문제로 단정하지 않는다. 로그 `.dev/wave-isolation-peer-native.log`와 각 run.log를 보존한다. 안정화의 실행 시간 제한/프로세스 종료 재검증 항목으로 추가한다.

GUI 비교 fixture는 이미 정상 native 결과가 있는 `run-execution-jP8yeV/project`로 전환했다. `.dev/wave-isolation.code-workspace`는 Original counter=`run-rQSqPW/project`, Peer counter=`run-execution-jP8yeV/project`를 열며 프로젝트 이름/test name/top이 같다. `.dev/launch-wave-isolation.mjs`는 기존 rQSqPW 프로필을 사용해 extensionTestsPath 없는 개발 창을 연다. launch 로그 `.dev/wave-isolation-ui-host.log`, 첫 창 정상 종료 exit0. 작업 도중 user-input 경고 후 재관측했으며 마지막 창 목록 조회에서 사용자의 물리 Escape에 의해 Computer Use가 중단되어 추가 GUI 동작을 하지 않았다.

다음 담당자는 위 실행기로 재개하고 원본 basic의 두 보기 복원/전환→원본 reset의 비혼입→Peer basic의 비혼입/별도 저장→원본 basic 재확인→재시작 복원을 확인한다. 원본 basic 파형은 `.rtl/runs/counter_basic-70182969-45a4-4af8-a169-9df0c31c7802/wave.vcd`, 원본 reset은 `counter_reset-dea3276a-8baf-439b-99e2-a31874b39ac4/wave.vcd`, Peer basic은 `counter_basic-675e8d02-4d69-4e6e-9430-64d30baad110/wave.vcd`다.

제품 코드 변경 없음. 이번에 typecheck/build/회귀 suite를 새로 실행한 것으로 기록하지 않는다. VSIX/설치 없음. 남은 큰 검증은 여전히4묶음(저장 보기/세부 예외/사용자 프로필/실제 설계·메모리), 깨끗한 Windows 별도 보류1. 시간 제한 초과 관측은 세부 예외/안정화 항목에 포함한다. 전체 저장 보기 격리 PASS가 아니다.
