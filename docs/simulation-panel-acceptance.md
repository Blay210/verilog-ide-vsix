# Simulation 전용 화면·TB 파일 실행

2026-10-05. 로드맵 U02 구현, U11 부분 대안/자체 IDE 후속.

## 구현과 동작

Activity Bar의 Simulation(`rtl-simulation`)에 기존 rtl.start를 Tests로, rtl.results를 Run History로 옮겼다. Explorer에는 RTL Hierarchy만 남는다. Tests 행은 manifest 대상만 보여 주고 클릭은 선택, ▶는 단일 실행, pulse는 그 프로젝트/테스트의 가장 최근 완료 결과 파형, 소스 버튼은 첫 test source 열기다. 최신 결과에 파형이 없으면 아이콘을 숨기며 이전 PASS 파형으로 자동 대체하지 않는다. tooltip은 project root/top/실행 시각, description은 project/top/status/duration, 현재 실행은 entry ID로 구분한다.

제목 toolbar: Run All, Run Selected Tests, Stop. Ctrl/Shift 다중 선택 후 선택 실행; 선택이 없으면 기존 다중 선택 picker를 연다. 설정/언어 지원/Refresh는 overflow이며 샘플·프로젝트 생성은 빈 Tests 안내에만 둔다. 빈 view.message는 undefined로 두어 welcome이 표시된다. 상태 표시줄과 view.message는 기존 공통 execution callbacks를 표시한다. 독립 runner나 결과 모델을 추가하지 않았다. 사용자 저장 layout을 강제로 변경하지 않는다.

rtl.runFile은 Explorer에서 전달받은 URI를 우선 사용한다. 현재 편집기가 DUT여도 요청한 TB를 실행한다. 현재 manifest를 다시 읽고 file scheme/test.sources만 매칭한다. 공유 TB 여러 설정은 프로젝트/top/root가 있는 picker에서 하나를 고르고, 취소·미등록·보존 소스는 실행하지 않는다. 편집기 상단 ▶도 같은 명령을 사용한다. 기존 F5와 Testing API는 유지한다.

사용자 U11은 tb/의 **실제 파일 행 hover ▶**다. 이 정확한 기능은 미구현이며 기본 Explorer 공개 API 제약 때문에 현재 우클릭 실행이 대안이다. 자체 IDE H의 workbench 개선으로 추적한다. [요구와 근거](ide-ux-direction.md). Simulation 행 inline ▶를 U11 완료로 간주하지 않는다.

## 자동 검증

`node node_modules/tsx/dist/cli.mjs --test tests/simulation-ui.test.ts tests/simulation-summary.test.ts tests/testbench-targets.test.ts tests/extension-ui.test.ts`: 최종24 PASS, fail/cancel/skip0.

같은 project/test 표시 이름의 서로 다른 identity·독립 running, 행 선택의 무실행, 결과 상태/시간/파형 context, 다중 선택 IDs와 선택한 대상만 실행/삭제된 대상 거절, file action 전달 URI/한글·공백/Windows case 처리/보존·DUT 제외, 여러 설정 picker 취소·선택한 구성만 실행, 승인/거절/재시도/도구 캐시/취소 회귀를 포함한다. container ID는 host 정규식 ^[a-zA-Z0-9_-]+$도 검증한다. `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/build.mjs` exit0.

## 실제 GUI/native 수용

Computer Use, VS Code1.140.0, `.dev/launch-execution-detail.mjs`, 기존 격리 profile/project-peer를 사용했다. 첫 렌더 확인에서 점이 들어간 container ID 때문에 Explorer fallback 경고를 발견해 `rtl-simulation`으로 수정하고 재시작하여 Simulation 아이콘·Tests/Run History 분리를 확인했다. 임시 격리 profile에서 View Reset View Locations도 수행했지만 사용자 profile은 변경하지 않았다.

행 클릭은 대상 선택만 했고 실행하지 않았다. ▶를 클릭하여 실제 counter_basic **PASS16.052s**, Verilator5.050, $finish41ns, run **5b618c80-a0b2-4068-b76f-3de548455961**을 기록했다. 결과는 project-peer/.rtl/runs 아래에 생성됐으며 사용자 examples/counter는 변경하지 않았다. 같은 행 파형 액션에서 새 run의 VCD와 기록 ID/6신호/단일 커서를 확인했다. 소스 버튼에서 현재 TB 파일과 편집기 상단 ▶ 확인. Explorer TB 우클릭에 Run RTL Testbench 표시, DUT counter.sv에는 이 항목이 없는 것을 확인했다.

이번 native 수용은 단일 행 실행이다. 새 toolbar Run All/다중 선택 실행/Stop의 물리 조합·빈 폴더 welcome·사용자 기존 layout 이동 수용은 아직 별도 확인 범위다. 자동 routing/선택과 기존 execution 취소 시험은 통과했다. 깨끗한 Windows 설치/대표 규모/전체 회귀/VSIX를 수행한 것은 아니다. 큰 잔여 게이트3묶음+별도 OS 보류1 유지.

다음은 U03 입력 변경 상태다. 현재 tests 행에 상시 outdated 배지가 구현됐다고 쓰지 않는다.

마지막 격리 개발 창은 열어 두었다. 최종 창 종료/exit0을 이번 완료 증거에 추가하지 않는다.
