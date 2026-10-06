# 계층형 RTL 다이어그램과 시각 시뮬레이션 방향

2026-10-05 UI 명확화: 사용자는 Vivado schematic처럼 자유 pan/zoom과 블록 내부 탐색이 가능한 별도 diagram 작업창을 원한다. 현재 Hierarchy tree/고정 SVG 연결도는 그 기반이며 최종 화면 완료가 아니다. [UI 구체안](ide-ux-direction.md)의 읽기 전용 canvas/배치와 module graph·합성 netlist 구분을 따른다. canvas 조작은 아직 미구현이다.

## 최신 체크포인트 — D3B2 보존 구조 값·파형 커서 연결

2026-10-04: 지원된 보존 실행의 integral module port/VCD 범위에서 D3B GUI 연결을 구현했다. 결과의 Explore Recorded Structure에서 카드/표의 포트 관측값을 보고 Time에 `5 ns`처럼 입력하여 Go/Enter로 이동한다. Open linked waveform은 내장 VCD를 명시적으로 열며 cursor A와 양방향으로 시각을 공유한다. current design에는 기록 값을 붙이지 않는다. missing/ambiguous/width-mismatch/unsupported는 추측값 대신 상태/이유를 표시하고 X/Z와 큰 정수 시간은 유지한다.

구현: VS Code API 없는 trace-links.ts가 Core 검증→같은 bytes의 worker SHA 확인→보존 입력 후검증을 조합하고 양쪽 host에 하나의 TraceCursorHub를 공급한다. run/보존 directory/source·trace 지문으로 격리, nonce/세대/값 요청 revision/파형 token으로 늦은 응답 차단, 최대200 표시 포트·32개 조회 batch, 30초 읽기 취소/닫기/reader 정리를 제공한다. 보존 inputs/metadata/파형/상위 디렉터리 watcher는 값을 무효화한다. trace만 손상되면 정상 구조/소스 탐색은 유지하며 파형은 Reload로 다시 열 수 있다. legacy/미지원 VCD는 일반 보기로 남고 FST는 기존 외부 경로다.

검증: 일반136 PASS/0 fail/skip, typecheck/development build 통과(.dev/d3b-gui-unit.log). 실제 보존/include VS Code 최종 .dev/d3b-gui-vscode-final.log / run-fSFRCq receipt passed=true, recordedValues/sharedCursor/traceInvalidation=true, exit0, native 2 PASS. 현재 manifest 없이 원본/package/header가 잘못된 상황의 값 조회·양방향 cursor·다른 실행 격리·파형 손상 차단/복원·기록 입력 손상·현재 모드 전환을 확인했다. 실제 full host .dev/d3b-full-vscode-final.log / run-6MUb5Z receipt passed=true/exit0, 성공5/의도한 실패1/취소1. 초기 full run-KrVsKg는 package preflight 중 취소하여 statuses=[]인데 fixture가 cancelled record를 요구해 실패했다. 시뮬레이션 시작 로그를 기다린 뒤 취소하도록 fixture를 보완한 최종 run은 통과했다. 물리 클릭/캔버스 시각 수용은 아니며 CLI/전체 native suite는 이번에 별도 재실행하지 않았다. VSIX/새 설치 없음.

다음은 합의한 A3/F 필수 안정화다. 새 D4/E 기능을 바로 늘리지 않고 실제 사용자 프로필의 키/추천/인자 팝업·버튼과 커서 시각 수용, 깨끗한 Windows GUI 승인 설치→실행→파형, 실패/취소/재시도와 대표 설계 응답성·메모리·데이터 보존을 점검한다. 아직 베타 패키징 gate 통과는 아니다. D3B의 첫 지원 범위 완료와 전체 제품 안정성을 구분하며 FST/내부 신호 전체/클럭 재생/실제 step/MAC/독립 host는 후속이다.

## 이전 체크포인트 — D3B1 분석·값·커서 기반

2026-10-04: D3B를 나누어 첫 기반 범위를 구현했다. WaveformSession.loadVerified는 Core가 검증한 Uint8Array를 worker에 복사하여 전달하고 worker가 같은 바이트의 SHA256을 다시 확인한 뒤 파싱한다. 파일 경로를 재개방하지 않는다. worker 요청을 순서대로 처리하고 새 load 실패 시 이전 데이터를 지워 과거 값 재사용을 차단한다. values/queryValues는 최대32개 신호의 지정 시간 관측값만 반환하며 전이/viewport를 전달하지 않는다. X/Z·alias·정확한 큰 정수 시간·end=0을 유지한다.

VS Code 독립 TraceCursorHub는 보존 directory(Windows host가 정규화)·run UUID·source fingerprint·trace SHA256이 모두 같은 view만 연결한다. 시간/end/timescale 검증, revision·dispose·invalidation·멤버/그룹 제한을 제공하며 손상으로 무효화된 이전 연결은 새 그룹을 되살릴 수 없다. 이것은 파일 검증/권한 계층이 아니다. host는 Core 검증과 보존 semantic 문맥을 공급하고 파일 변경·취소·늦은 응답을 별도로 처리해야 한다.

검증: 일반128 PASS/0 fail/skip, typecheck/build 통과(.dev/d3b-foundation-unit.log). 실제 Verilator+slang 관련2 tests PASS/0 skip(.dev/d3b-foundation-native.log), .dev/d3b-foundation-native-receipt.json passed=true: 현재 manifest 제거/원본 손상 후 검증 바이트를 worker로 읽어 7개 instance/generate/array/escaped-dot 포트 값 대조, 양방향 커서 모델·다른 프로젝트 격리·무효화 확인. 이번 GUI/CLI host suite/물리 UI는 재검증하지 않았다. D3A GUI/CLI는 이전 날짜 근거다. 새 패키징/설치 없음.

다음은 D3B2 GUI 연결: structure.ts의 보존 문맥에서만 Core loadRecordedInputs/loadRecordedTrace→worker.loadVerified→mapTracePorts로 관측값을 표시하고, waveform.ts와 같은 hub를 공유한다. stale/세대/nonce/revision/취소·닫기·trace/source watcher로 연결과 늦은 응답을 차단하고 missing/ambiguous/width-mismatch/unsupported를 명시한다. 보통/legacy/FST 파형 보기와 현재 구조는 유지한다. 현재 GUI에는 값이나 공유 커서가 아직 없다. D3B 전체 완료로 표시하지 않는다. D3B2 후 A3/F 필수 안정화→사용자 준비 판단 후 첫 베타 패키지→피드백 보완 순서를 유지한다.

## 이전 체크포인트 — D3A

D3A 첫 범위 완료 (2026-10-04): 새 실행은 source snapshot과 run ID에 연결된 waveform hash/size/format을 기록한다. 공통 Core가 변경·교체·다른 run·과거/미지원 trace를 검증하며 정상 로그/파형 보기는 유지한다. waveform의 VS Code 독립 mapTracePorts가 정확한 segmented instance/port 경로로 VCD를 연결한다. bare top/명시적 TOP wrapper, alias, generate/instance array, escaped dot를 지원하며 missing/ambiguous/width-mismatch/unsupported는 값을 추측하지 않는다. 현재 범위는 integral module ports와 ready snapshot의 VCD이며 내부 신호 전체/FST 매핑/GUI 값 표시는 아니다.

검증: 일반122/typecheck/build 통과(.dev/d3a-unit.log), 실제 Verilator VCD+slang hierarchy 관련2 native tests 통과(.dev/d3a-native.log 및 .dev/d3a-native-receipt.json). final native에서 동일 모듈 2개·generate 2개·array 2개·escaped dot의 경로와 값을 확인했다. actual recorded/include GUI run-jzzec5 receipt passed=true/recordedTrace=true/exit0(2 PASS), CLI .dev/d3a-cli-receipt.json은 두 기록 각3 port matched, 현재 manifest 없이 분석·파형 변경/다른 run/legacy 차단을 확인했다. 물리 UI 검증이 아니며 full native/full GUI suite 재실행은 이번에 하지 않았다.

초기 native의 일반 경로는 통과했으나 escaped 이름은 pretty-print hierarchicalPath에 backslash/공백이 남아 missing이었다. semantic instancePath를 compiler symbol.name에서 만들고 array index만 실제 부모와 합쳐 재검증하여 matched로 통과했다. 기존 navigation id/표시 경로는 유지했다. hierarchy port에 기존 signal_type 모델도 공급한다. 매핑 모델 자체는 인증 계층이 아니므로 모든 소비자는 Core loadRecordedInputs/loadRecordedTrace와 archived hierarchy 검증을 거쳐야 한다.

다음은 D3B: 보존 구조의 port 관측값과 waveform 공유 cursor UX. worker가 실제 분석한 bytes와 검증한 trace hash를 일치시키고 current/recorded·run·세대/취소를 분리한다. source/trace 손상 시 값 연결을 차단하며 정상 구조/로그/파형을 가능한 범위에서 유지한다. 이후 새 기능 추가를 멈추고 A3/F 필수 안정화 검증→첫 베타 패키지→실사용 문제 보완→초기 안정 버전 판단 순서다(사용자 합의). 이번에는 VSIX/새 설치를 하지 않았다.


## 이전 체크포인트 — D2B3B

D2B3B configured literal include 보존 완료 (2026-10-04): 프로젝트 내부 `sources.include_dirs`의 순서와 전체 파일 트리를 실행 사본으로 옮기고 빈 configured root도 유지한다. standalone quoted literal include는 첫 configured 경로를 쓰며 하위 경로(`nested/width.svh`)도 지원한다. 사본 package 분석·빌드·기록 구조가 같은 include 사본을 사용한다. 원본 설정/헤더가 바뀌거나 없어도 검증된 보존 구조와 readonly 헤더를 열 수 있다.

지원 경계: 소스/헤더 옆 파일과 첫 configured 결과가 충돌하면 unavailable, configured 경로 없이 source-relative만으로 찾는 경우도 unavailable이다. dynamic/inline/매크로 본문/continued directive·absolute/`..`/backslash 경로·외부 source/include root·symlink/junction 경로는 보존 지원에서 제외하고 기존 실행+이유를 유지한다. 주석/일반 문자열 속 include 텍스트는 더 이상 일괄 차단하지 않는다. inactive includes와 전체 include tree는 보수적으로 관측하여 불필요한 파일도 비교/용량에 포함될 수 있다. 완전한 전처리기나 글로벌 atomic save/tool environment/runtime data 보존은 아니다.

검증: 일반117/typecheck/build, 실제 native 1 test(원본 baseline + VCD/FST 사본 2, 실제 slang hierarchy/port 8-bit 검증), actual VS Code run-rskbus(2 PASS·recordedIncludes=true·receipt passed=true/exit0), CLI 두 기록 matching→changed/현재 manifest 없는 hierarchy 통과. `.dev/d2b3-include-unit.log`, `d2b3-include-native.log`/`.dev/d2b3-include-native-receipt.json`, `d2b3-include-vscode.log`, `d2b3-include-cli.log`/`.dev/d2b3-include-cli-receipt.json`. 초기 native test는 hierarchy에 없는 signalType 필드를 검사해 실패했고, 실제 instance semantic 모델로 폭을 검증하여 통과했다. 물리 UI 수용/전체 native·full GUI suite 재실행과 구분한다.

새 예제: `examples/include-counter` (package 자동 정렬 + 두 configured root의 동일 이름 헤더 + nested include + 2 TB). 폭이 잘못 선택되면 `$fatal`로 실패한다. GUI 재현은 RTL_RECORDED_TEST=1와 RTL_RECORDED_INCLUDE_TEST=1, 기존 scripts/test-vscode.mjs. 다음은 D3A 보존 run/trace 식별·full instance path 매핑의 작은 범위다. ready snapshot이 없는 기존/미지원 실행은 현재 소스에 자동 결합하지 않는다. FST 내장 해석·클럭 재생·MAC 연산·독립 IDE 호스트는 후속이며 VSIX 배포·새 설치는 수행하지 않았다.


## 이전 체크포인트 — D2B3A

D2B3A package 보존 완료 (2026-10-04): 프로젝트 내부 package 파일도 실행 소스 사본으로 보존한다. 자동 순서는 원본 preflight 이후 사본에서 기존 package provider로 다시 분석하며, 실제 빌드 순서로 지문·result.sources를 기록한다. 사본 분석 실패/취소는 원본 재시도 없이 FAIL/cancelled다. manifest 수동 순서도 지원한다. 결과 GUI/CLI 구조 분석과 readonly package 소스 이동은 검증된 사본만 사용한다.

검증: 일반112/typecheck/build 통과, 실제 native 관련2 tests(3 PASS 실행·package 병렬2/명시적 소스1), 실제 package GUI run-WhaR8u receipt passed=true/recordedPackages=true/exit0(2 PASS), 실제 CLI matching→changed/현재 manifest 없이 두 보존 hierarchy 통과. `.dev/d2b3-package-unit.log`, `d2b3-package-native.log`, `d2b3-package-vscode.log`, `d2b3-package-cli.log`/`d2b3-package-cli-receipt.json`. 전체 native/full GUI suite 재실행은 이번에 하지 않았고, 이전 D2B2 full GUI는 과거 기준점이다. 물리 UI 수용 검증은 아니다.

실제 native 첫 검증에서 예제 package에 timeunit/timeprecision이 없어 slang MissingTimeScale로 구조 분석이 막혔다. examples/package-counter의 세 package에도 DUT/TB와 같은 시간 단위를 선언하고 native/GUI/CLI로 재검증했다. Windows 대소문자 파일명 매핑과 사본 분석 실패/취소도 일반 회귀에 추가했다.

다음은 D2B3B literal include 보존 계약이다. includeDirs/모든 `include 문자열(주석 포함)/외부 경로는 아직 unavailable fallback이며 일반 실행은 유지한다. include 탐색 우선순위·shadowing·nested relative 해석을 두 adapter와 일치시키기 전 지원 확대를 선언하지 않는다. D3 trace 값/클럭/MAC는 미구현이다. 배포 패키징·새 도구 설치는 수행하지 않았다.


## 최신 추가 — D2B2

D2B2 보존 실행 GUI 구조 탐색 완료 (2026-10-04): 결과 메뉴 Explore Recorded Structure가 특정 run의 검증된 Project/TestTarget을 기존 SlangProvider에 전달한다. 현재 manifest/미저장 overlay를 읽지 않고 화면·tree·탐색 이력을 current/recorded 및 run ID로 구분한다. 현재 원본 변경은 보존 view를 덮지 않으며 보존 입력 변경/손상은 stale·재검증 실패로 이동을 차단한다.

최신 검증: 일반108/typecheck/build 통과. 실제 보존 GUI run-A2LYPy(2 PASS + archived 구조/readonly 정의/손상 차단/현재 전환) 및 전체 GUI run-gQnoQ5(성공5/의도한 실패1/취소1) receipts passed=true/exit0. `.dev/d2b2-final-unit.log`, `.dev/d2b2-final-recorded-vscode.log`, `.dev/d2b2-full-vscode.log`. 실제 host API 검증이며 물리 UI 수용은 아니다. Compiler/runner/CLI 동작은 바꾸지 않았고 이전 native11/CLI receipts는 과거 근거로 유지한다.

보존 구조의 instance/definition/port/parameter source 링크는 공통 recorded-source host를 통해 당시 사본의 정확한 위치를 readonly 문서로 연다. Core가 검증한 sourceMappings 외의 파일은 열지 않고 URI는 run directory까지 포함해 중복 ID/다중 프로젝트를 분리한다. Explore current design은 명시적으로 현재 문맥으로 돌아간다. 다음은 D2B3 include/package 보존 계약; 값/클럭/trace 연결은 여전히 후속이다.

## 최신 추가 — D2B1

D2B1 보존 소스 첫 범위 (2026-10-04): Verilator가 프로젝트 안의 명시적 소스 사본을 `.rtl/runs/<run>/inputs/`에서 빌드한다. 원본이 컴파일 직전 바뀌어도 결과와 사본의 연결이 유지된다. include 디렉터리·include 문자열·package 그룹·외부 경로는 아직 보존을 지원하지 않으며 기존 입력으로 실행하고 inputSnapshot=unavailable/이유를 기록한다. 기존 backend는 capability opt-in 없이 사본으로 전환하지 않는다.

최신 근거: 일반105/typecheck/build, native11, 보존 GUI run-VwRA80 receipt(2 PASS/readonly type 경로), CLI d2b-cli-receipt(2 PASS/현재 manifest 없이 archive hierarchy) 통과. 초기 전체 host run-xSyxi3에서 취소가 정리 지연 중 timedOut으로 바뀌는 문제를 발견해 timer 우선순위를 수정했고 final unit에 slow-cleanup 회귀를 추가했다. 실제 전체 suite 재검증 최종 근거는 verification 상단을 따른다. 초기 WorkspaceEdit 기반 readonly 테스트는 실패했으며 사용자 type 경로의 최종 테스트만 수용 근거다.

최종 전체 VS Code도 통과: `.dev/d2b-final-vscode.log`, run-XDlo5D receipt passed=true/exit0, 성공5/의도한 실패1/취소1. 취소 결과는 cancelled로 유지됐고 이번 fixture의 정리는 756ms였다. MSYS2 지연 전체를 해결했다고 확대하지 않는다. 일반105·native11·보존 GUI2 PASS·CLI2 PASS와 함께 verification 상단을 최신 기준으로 사용한다.

Core loadRecordedInputs는 run/result·원래 설정·파일 해시·경로/심볼릭링크·추가 파일을 검증하여 같은 top/defines/waveform의 Project/TestTarget을 반환한다. CLI hierarchy --run RUN_ID는 이 입력을 기존 SlangProvider에 전달하며 현재 rtl.toml 없이도 동작한다. GUI 결과의 Open Recorded Source는 당시 첫 테스트벤치 사본을 rtl-recorded 읽기 전용 문서로 보여준다. 현재 구조와 파형의 자동 결합은 아직 하지 않는다. 다음은 D2B2 보존 실행의 GUI 구조 탐색 및 include/package 지원 계약이다.

## 현재 위치 — D2A

D2A 입력 식별 첫 범위 구현 (2026-10-04): 공통 Core runner가 runId와 versioned SHA256 입력 지문을 결과에 저장한다. 저장된 sources/packages/test sources·include 경로/트리와 literal include 의존성·defines·top·backend/timing/waveform을 추적하고 실행 전후 변경을 구분한다. 결과 메뉴 Check Source Version 및 CLI history --verify-inputs가 같은 비교 모델을 사용한다. 과거/미지원 identity는 로그·파형을 보존하면서 legacy/unavailable로 안내한다. 미저장 입력은 GUI에 별도 안내하며 자동 저장하지 않는다.

최신 검증: 일반100/typecheck/build, 실제 Verilator 통합10, 실제 VS Code 전체 suite(성공5/의도한 실패1/취소1), 실제 CLI 두 테스트와 일치→변경 비교 모두 통과. `.dev/d2-final-unit.log`, `.dev/d2-integration.log`, `.dev/d2-vscode.log`/run-mskgxC receipt, `.dev/d2-cli.log`/d2-cli-receipt.json. 실제 host는 API 기반이며 물리 UI 수용은 아니다.

지문은 원자적 compiler snapshot이 아니다. 동적/찾을 수 없는 include·symlink·크기 제한은 unavailable, 실행 중 변경은 changed-during-run이다. 전후 관측 사이 변경 후 원복/도구 환경/모든 implicit backend 입력은 보장하지 않는다. matching은 과거 trace와 현재 diagram 결합 허가가 아니다. 다음은 D2B 불변 입력과 semantic/run 문맥 일치 계약이며 D3는 아직 시작하지 않는다.

사용자가 2026-09-30 명시한 장기 요구를 기록한다. **아래 단계는 설계 방향이며 구현 완료 선언이 아니다.** Unreal Blueprint처럼 직관적으로 탐색하되 RTL 소스가 원본이다. 전용 simulator가 생기기 전에도 기록 파형을 활용해 가치를 제공한다.

## 현재 구현 위치 — 2026-10-04

D1 첫 범위는 모듈 내부 보기/더블클릭·키보드 동작, 전체 인스턴스 경로, 뒤로·앞으로·상위, test top/모듈 인스턴스 선택을 구현했다. actual hierarchy의 generate/array 부모를 사용하며 테스트 문맥 전환 시 이력을 초기화한다. 아직 정적 포트 연결 탐색이며 source/run identity, 클럭 재생과 MAC 연산/관측값은 D2 이후다. 검증 결과와 물리 UI 미수용 범위는 verification 상단을 따른다.

## 사용자가 원하는 경험

1. 테스트벤치를 선택해 실행하고 DUT top의 모듈 연결도를 연다. testbench 자체와 DUT top을 구분해 선택할 수 있다.
2. 모듈 블록을 더블클릭하거나 ‘내부 보기’ 버튼으로 들어간다. 상단 경로와 뒤로/상위 이동으로 부모 구조로 돌아온다. 트리에서 자식 노드를 펼치는 것과 같은 문맥을 유지한다.
3. 파형과 동일한 시간 커서를 사용한다. 선택한 클럭의 이전/다음 edge 버튼이나 재생으로 이동하면 포트·연결선·레지스터의 값이 함께 바뀐다.
4. MAC 등의 내부로 내려가면 입력, 곱셈, 덧셈, 누산 레지스터와 enable/reset을 볼 수 있다. 예컨대 어느 사이클에 들어온 피연산자가 몇 사이클 뒤 누산 결과에 반영되는지 따라간다.
5. 파형은 계속 제공한다. 다이어그램에서 신호를 선택하면 파형에 추가하고, 파형 신호에서 해당 계층/소스로 이동한다. 명령어를 외우지 않고 버튼과 문맥 메뉴로 탐색한다.

## 현재와의 차이

현재 `DesignHierarchy`는 slang elaboration의 instance/generate/array, parameter, port binding을 보관한다. RTL Structure는 자식 블록 이름 클릭으로 해당 노드에 진입할 수 있다. 소스 위치도 연결돼 있다. 하지만 전용 더블클릭/경로 탐색 UX, 모듈 내부 연산 그래프, 시간/클럭 값 표시, waveform 동기화, 실제 simulator pause/step은 없다.

현재 VCD 모델은 같은 시각의 마지막 값을 남긴다. 따라서 delta-cycle 순서나 nonblocking assignment 전후의 모든 미세 이벤트를 복원할 수 없다. 파형 재생을 실제 시뮬레이터 단일 스텝이라고 부르면 안 된다. 데이터 선의 변화만으로 연산 원인이나 실제 하드웨어 지연을 추론하지 않는다.

## 순차 구현 단계와 진입 조건

| 단계 | 구현할 경험 | 완료 조건 |
|---|---|---|
| V1 정적 탐색 개선 | top/DUT 선택, 내부 보기, 경로·뒤로·상위 버튼, 트리/그림 선택 동기화 | parameter/generate/instance array에서 같은 instance 문맥 유지, 소스 수정 시 stale 표시, 일반 키보드 접근성 |
| V2 기록 파형 연결 | 실행 결과 선택, 인스턴스/신호 경로 매핑, 시간 커서 값, 파형 추가 | 같은 모듈의 서로 다른 인스턴스 분리, X/Z·미기록 신호 표시, source/run 불일치 차단, 파형과 값 일치 |
| V3 클럭 기준 재생 | 사용자가 클럭과 edge 선택, 이전/다음/재생/정지, 변화 강조 | 다중 클럭을 하나로 가정하지 않음, clock edge 직후 정착값 정책 명시, 큰 시간 정밀도 보존, cycle 번호가 선택 클럭 기준임을 표시 |
| V4 내부 연산 보기 | 제한된 조합식/레지스터/멀티플렉서/연산 노드, MAC pipeline | 폭·signedness·잘림·enable/reset·NBA 동작을 보존, native simulator trace와 대조, 지원하지 않는 절차 코드는 소스 블록으로 표시 |
| V5 실제 실행 제어 | backend가 지원할 경우 pause/step/breakpoint/live values | 실행 제어와 기록 재생 UI 구분, capability/취소/오류 처리 검증, 기존 Verilator 기록 재생 계속 지원 |
| V6 구조 작성 | library drag/drop, 포트 연결, structural RTL 생성 | 생성 영역·파일 소유권 명시, 사용자 RTL 보존, 재생성 diff와 컴파일 검증. 임의 기존 RTL 양방향 변환은 별도 검토 |

V1 전에 [핵심 편집 신뢰성 및 signature help](product-audit.md)의 P0 항목을 먼저 해결한다. 단계를 통째로 구현했다고 선언하지 않고 각 완료 조건의 증거를 남긴다.

## 모델과 책임의 경계

- SemanticProvider: 구체화된 구조, 소스 위치, 향후 제한된 연산 모델. 시뮬레이션을 실행하지 않는다.
- SimulatorBackend: compile/run 및 장기적으로 명시적인 실행 제어 capability. 현재 인터페이스에 미래 기능용 빈 메서드를 미리 만들지 않는다.
- Waveform 계층: 시간·값 조회, trace reader. VCD/FST/미래 전용 포맷을 시각화 UI와 분리한다.
- 미래 trace-structure 연결 모델: run ID, 테스트/top, 전체 elaborated instance 경로, 신호 식별자, timescale과 소스 식별 정보로 연결한다. module 이름만으로 연결하지 않는다. dump alias·generate 이름·최적화/미기록 신호를 다룬다.
- UI: 트리/그림/파형의 선택 인스턴스와 시간 문맥을 공유한다. 도구 설치와 backend 교체에 종속된 그래프 모델을 만들지 않는다.

현재 결과에 소스 snapshot/fingerprint가 충분히 보존되지 않으므로, V2에서 이를 먼저 설계해야 한다. 지금 소스의 hierarchy를 과거 파형과 무조건 결합하면 안 된다. 생성된 run metadata는 `.rtl/` 아래, 공유 도구/캐시는 프로젝트 밖에 둔다.

## 시각 디자인 원칙과 검증 예제

값·변경 강조·선택 상태의 의미를 일관되게 유지한다. 모든 신호를 한 화면에 뿌리지 않고 선택한 계층/관심 신호를 중심으로 보인다. 색상만으로 X/Z·오류·변경을 구분하지 않고 텍스트/모양을 함께 제공한다. 크고 복잡한 구조는 접고 검색하며, 사용자 관점의 ‘내부 보기/상위로/이전 클럭/다음 클럭’ 같은 액션을 제공한다.

검증 설계는 parameter 폭이 다른 두 MAC 인스턴스, 곱셈→합산→누산 pipeline, reset/enable 정지, overflow/truncation, X 전파와 다중 클럭을 포함한다. 먼저 정적 탐색을 검증하고, 기록 trace의 지정 시간에서 값과 파형을 대조한다. 신호를 기록하지 않은 경우 추측값 대신 ‘기록 없음’을 보여준다. 소스가 바뀐 실행 결과는 다시 실행하거나 보존된 소스 문맥을 선택하도록 안내한다.

독립 IDE와 전용 compiler/simulator는 최종 제품 방향을 유지하되 이 시각 디버깅 기능의 즉시 선행 조건으로 삼지 않는다. 배포 준비는 사용자의 별도 결정 후 진행한다.
