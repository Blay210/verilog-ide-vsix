# A3 실제 입력·화면 수용 체크리스트

2026-10-04: 아래 표는 실제 수용 범위와 남은 절차를 구분한다. 1차 물리 입력은 격리 개발 프로필에서만 확인했다. 자동138개/실제 host 검증은 verification의 날짜별 근거다. 물리 입력 수용을 끝내기 전에 D4/E나 베타 준비 완료로 넘어가지 않는다. 별도 Windows PC/VM이 없다는 사용자 답변에 따라 깨끗한 OS 설치 수용은 별도 보류다.

## 개발 창 준비

VS Code에서 저장소 `D:/Dev/verilog_ide`를 열고 Run and Debug에서 **RTL Dev Extension** 실행 구성을 선택한 뒤 실행 버튼을 누른다. 기존 구성의 build task가 개발 확장을 만들고 예제 프로젝트를 연다. VSIX 생성·설치는 하지 않는다. 실제 입력을 수행하는 창이 **Extension Development Host**인지 확인한다.

도구가 없다고 나오면 RTL Start의 도구 상태/로그를 확인한다. 이번 검증의 기존 도구 저장소는 `D:/Dev/verilog_ide/.dev/rtl-dev`다. 설정에서 RTL Tools Directory를 지정하거나 실제 사용자 도구 경로를 유지하되 기록한다. 새 설치가 필요하면 사용자의 설치 승인을 기다린다. trust/security 요청은 사용자가 직접 판단하고 처리한다.

예제 사본은 `D:/Dev/verilog_ide/.dev/ui-stability/project`에 준비되어 있고 `rtl/ui-smoke.sv`는 입력 검증용 빈 파일이다. 사용자 RTL 파일을 검증 중 덮어쓰지 않는다. 개발 예제 대신 실제 설계를 사용할 때는 경로·규모와 사용한 도구를 기록한다.

## 순서대로 확인

| 흐름 | 입력/행동 | 기대 결과 | 현재 수용 상태 |
|---|---|---|---|
| module | 빈 SV파일 줄 시작에서 module 입력→Tab | 이름→포트→본문으로 Tab 필드 이동, endmodule 생성 | 격리 개발 창 실제 입력 통과 |
| package/case | package와 case를 각각 입력→Tab | 대응 closer·들여쓰기·필드 이동 | 격리 개발 창 실제 입력 통과 |
| begin | begin 입력→Tab→Enter, 다른 줄에서 begin→직접 Enter | 본문 줄로 이동하고 end가 중복되지 않음 | 격리 개발 창 두 경로 실제 입력 통과 |
| 기본 편집 | 기존 closer/주석/문자열 문맥에서 Tab/Enter·Undo | 일반 편집 동작 유지, if/always/for에 블록 강제 삽입 없음 | 기존 end 및 주석·문자열 Tab/Enter/Undo, if/always/for Enter 강제 블록 없음 확인; 탭/CRLF begin 두 경로·각 Undo·module 필드 이동 및 저장 바이트 확인; 사용자 설정 충돌 남음 |
| 포트 추천 | counter 인스턴스의 괄호 안에서 . 입력, 일부 포트 연결 후 다시 . | 미연결 포트 추천, implicit 연결도 중복 제외 | closer 있는 TB 및 새 모듈 EOF 확인; implicit .clk/.rst_n 제외 후 count만 실제 추천 확인 |
| 인자 안내 | 모듈의 포트/parameter 괄호·쉼표, 일반 function/task 호출 | 현재 인자·타입·방향을 표시 | 모듈 count 및 parameter WIDTH=8, function string/default, task output int 실제 안내 확인; 함수 ( 첫 인자·쉼표 두 번째 인자 자동 강조 확인; 모든 호출 형태 완료 아님 |
| package/scope | configured package의 pkg::, 현재 scope 식별자 | 지원된 선언 후보와 미저장 변경 반영 | pkg:: 콜론 자동 추천, 같은 파일 미저장 선언 갱신/원본 보존, import·중첩 scope 제외 확인; 다른 파일 미저장 EXPORTED→UPDATED 추천/수락·디스크 보존 확인; 사용자 프로필 남음 |
| 분석 상태 | 오류를 넣고 수정하거나 설정을 확인 | 준비/분석/오류 상태와 이유, 로그/재시도 접근 가능 | Source errors→Ready 및 상태 메뉴/Retry 실제 접근 확인; 로그 채널 열기 확인; Disabled/Tools missing 표시·원인/복구 메뉴·경로 복원/Retry→Ready 확인 |
| 실행 | RTL Start에서 테스트 선택→Run, 두 테스트 전체 실행 | 진행→결과→로그/파형으로 버튼 이동 가능 | 격리 창 실제 선택/단일/전체 실행·결과 로그/내장 VCD·재실행 통과; 정상6 PASS(이전); 추가 정상3 PASS 및 TB F5/일반 DUT 기본 디버거 보존 확인 |
| 취소/실패 | 실행 중 Stop, 실패 fixture 실행 | cancelled/FAIL/timeout 구분, 종료 후 재실행 가능 | 실제 $fatal FAIL/60초 timeout/실행 중 Stop cancelled·프로세스 정리·reset 복구 통과; 컴파일 오류 FAIL/로그, 준비·g++ 빌드 Stop 및 프로세스0개/정상 재실행도 실제 확인 |
| 저장 보기 | 테스트 결과 VCD에서 신호 선택→보기 저장·기본 지정→재실행 | 해당 TB 기본 보기와 다른 저장 보기 재사용 | 격리 지속 프로필 두 보기 재시작/전환·다른 TB/동명 프로젝트 비혼입·별도 기본 저장/재시작 확인; 새 CLI 결과 기본 복원은 이전 근거, 보기 rename·누락 안내·누락 상태 새 저장/두 신호 복원·다른 탭 목록 즉시 갱신 확인; 기본 지정/해제·rename/덮어쓰기/삭제 확인창 취소 실제 확인; 물리 삭제 확정은 자동 검증 근거와 구분 |
| 구조·시간 | 보존 결과 Explore Recorded Structure→내부 보기→Time/Go→Open linked waveform | 구조 포트 값과 cursor A 동기화, X/Z·미기록 상태 명확 | 보존 top→dut/Back/Forward,25ns·35ns 양방향 값 동기화/정의 소스 이동 실제 확인; DUT double-click/Up 실제 확인; 독립 합성 파형 X/Z·보존 구조 비혼입 확인; 합성 구조 X/Z·미기록/모호함/폭/타입 구분 화면 확인; 기록 자료 종단 수용과 구분 |
| 두 화면 수명 | 파형/구조를 각각 닫기·재열기 | 반대 화면 유지, 다른 run과 시간 혼동 없음 | 파형 닫기→구조15ns 조회→파형 복원, 구조 닫기→파형35ns 조회→계층 재열기/Refresh 복구 실제 확인; 다른 run5ns 변경에도 구조35ns 유지 |
| 중간 규모 화면 | 4,096신호 fixture 검색·선택·zoom/pan/edge/time | 응답성·가독성, loading/취소 중 UI 유지 | 격리 합성 파형의 검색/선택·확대/축소/좌우/드래그·시간/두 커서·오류 복구 확인; loading 취소·실제 설계/메모리 수용 남음 |

중간 파형 fixture는 `.dev/scale-tests/waveform-0PfKkS/signals-4096-steps-192.vcd`에 있다. 일반 파형 파일로 연다. 이 합성 파일은 실제 시뮬레이션 run에 연결된 결과가 아니므로 구조와 연결된 값으로 취급하지 않는다. 테스트별 보기 저장은 실제 테스트 결과의 파형으로 확인한다.

## 기록할 정보

통과/실패마다 날짜, 개발 host/실제 사용자 프로필, VS Code 버전, 언어 모드, 활성 타 확장, 관련 설정, 재현 입력과 기대/실제 결과를 기록한다. 불편함은 기능 실패와 별도로 적는다. 스크린샷·파일은 사용자가 공유해도 되는 범위만 남긴다. 먼저 격리 개발 창, 다음 실제 사용자 프로필 순으로 비교하며 자동 검증 통과로 표의 미검증을 바꾸지 않는다.

깨끗한 Windows 설치는 환경 확보 후 **승인/거절·실패/재시도·기존 도구 재사용→두 테스트→파형** 전체를 확인한다. 현재 PC의 새 tool store 검증은 이미 있지만 깨끗한 OS의 대체 증거는 아니다.

## 1차 근거와 전용 실행 모드

2026-10-04: computer-use의 실제 Windows 키 입력으로 격리된 VS Code 1.140.0 개발 창을 확인했다. module→Tab→이름→Tab→포트→Tab→본문, package/case 템플릿 필드 이동, begin→Tab(인라인)→Enter 및 begin→직접 Enter(들여쓴 본문/end)가 정상 동작했다. run-6ujQus의 .rtl/manual-input.json에 문서/커서 관측 기록이 있다. 사용자 중단 동안 이 창은 15분 제한으로 종료되어 완료 receipt가 없으며, 이를 수용 실패나 완료로 대신 해석하지 않는다.

재개한 run-bsLVeC에서는 설정된 counter_basic_tb의 미저장 .clk(clk), . 문맥에서 실제 점 키로 count/rst_n만 표시되고 이미 연결한 clk는 제외되는 팝업을 확인했다. Tab으로 count를 수락하고 인자 안내에서 output logic[7:0] count 강조를 확인했다. 이 실행은 정상 stop→exit0이며 extension-test.json의 manualHarness=true는 검증 창 종료만 뜻하고 acceptancePassed=false다. 이 실행 당시 recorder는 scratch만 기록하므로 TB 팝업 근거는 대화의 실제 screenshot/accessibility 관측이다. 이후 recorder를 격리 사본 안의 SV/V 문서로 확대하고 workspace 경로 검증/5,000건 제한을 추가했다.

발견한 제한 A3-EDIT-OPEN-1: 괄호/endmodule가 없는 EOF 작성 중에는 설정된 TB에서도 포트 추천을 관측하지 못했다. closer가 있는 동일 문맥에서는 동작한다. 또 현재 analyze는 manifest test top의 elaborated instance를 사용하므로 테스트에서 도달하지 않는 새 ui_probe 인스턴스는 추천 대상에 없었다. 실제 parser recovery/독립 모듈 편집 지원을 진단·회귀 검증한 뒤 보완할 것; 정규식으로 임의 시그니처를 추정하지 않는다.

개발 전용 RTL_MANUAL_ACCEPTANCE=1 idle harness를 추가했다(tests/vscode/manual.ts). 실행기가 창을 숨기는 원인을 찾아 수동 모드만 visible로 변경했고 자동 모드는 유지했다. 도구는 기존 .dev/rtl-dev, SystemVerilog/4-space lexical fixture, 다른 설치 확장 비활성화. 사용자 프로필 충돌·일반 function/task/parameter/package scope·저장 보기·중간 canvas·깨끗한 OS 수용까지 완료했다는 뜻이 아니다. typecheck 및 개발 build 통과, VSIX/설치 없음. 다음은 A3-EDIT-OPEN-1의 실제 slang 재현/보완 → 저장 보기/중간 파형의 물리 UI → 실제 설계/메모리 수용이다.


기존 scripts/test-vscode.mjs에 RTL_MANUAL_ACCEPTANCE=1을 지정하면 자동 편집/시뮬레이션 테스트 없이 빈 ui-smoke.sv를 연다. .rtl/manual-ready.json을 확인하고 실제 입력한다. 종료는 해당 사본의 .rtl/manual-stop.json에 {"finish":true}를 기록한다. 제한 시간은15분이며 관측은 .rtl/manual-input.json에 저장된다. completion receipt를 제품 수용 PASS로 세지 않는다.

## 최신 체크포인트 — A3-EDIT-OPEN-1 포트 추천 복구

2026-10-04: 미완성 인스턴스의 실제 slang 범위가 다음 source buffer로 넘어가 커서가 인스턴스 밖으로 처리되는 문제를 보완했다. 컴파일러가 확인한 인스턴스의 끝 범위를 원래 파일 EOF로 제한한다. 또 manifest test top에서 도달하지 않는 새 모듈은 모든 module의 기본 elaboration에서 누락된 source 위치만 추가한다. 실제 selected-top 시그니처는 우선 유지하고 generated/shared 위치의 서로 다른 타입은 기존 ambiguity 차단을 유지한다. 원본 파일/진단/계층/시뮬레이션 입력을 수정하지 않는다.

초기 관측 정정: 선택된 TB가 마지막 source buffer인 단순 EOF 문맥은 slang 자체가 이미 복구했다. 모든 EOF가 파서 실패였던 것은 아니다. 회귀 테스트에서 다음 파일로 넘어가는 end.file/end.offset을 직접 관측하여 원인을 확정했다. tests/semantic/recovery.test.ts는 closer 없음/괄호만 있음/endmodule 있음, parameter override, 한글·emoji UTF-16 offset, 미연결 제외, 새 모듈의 폭11과 .data( 인자 안내, 저장 소스 보존을 검사한다. tests/vscode/semantic.ts는 실제 LSP의 EOF . 추천·.tally( 안내를 추가 검증한다.

검증: 실제 slang13 PASS/0 fail/skip(.dev/port-recovery-semantic.log), 실제 editor/semantic/structure/waveform host run-qKTkGA receipt passed=true/editor=true/exit0(.dev/port-recovery-vscode.log), typecheck/development build 통과. 실제 키 검증 run-xtSwWB(VS Code1.140.0 격리 개발 프로필)에서 새 ui_probe의 닫는 구문 없는 EOF에 점 키를 눌러 count·rst_n Field 팝업과 output logic[7:0] 표시, 이미 연결한 clk 제외를 관측했다. .rtl/manual-input.json에 미저장 text/커서가 기록되어 있다. 정상 stop/exit0이며 manual receipt의 acceptancePassed=false는 전체 A3 수용 완료가 아님을 뜻한다.

다음 순서: 저장된 테스트별 파형 보기의 실제 UI/재시작 수용 →4,096신호 검색/선택/zoom/time 화면 → 사용자 프로필 충돌·실제 설계/메모리. parameter·function/task/package scope의 전체 물리 수용은 아직 남고, 깨끗한 Windows 종단은 별도 환경 없음으로 보류다. 이번에 전체 일반/Verilator/full-simulation suite를 재실행했다고 하지 않는다. VSIX/설치 없음. 새 큰 D4/E보다 남은 A3/F 수용을 먼저 진행한다.


## 저장 보기 실제 수용 추가 — 2026-10-05

지속 저장 개발 모드 및 실제 UI 결과는 [저장 보기 수용 기록](waveform-view-acceptance.md)을 따른다. extension test 모드는 메모리 저장소이므로 재시작 지속성 수용에 사용하지 않는다. 다음 물리 검증은 중간 규모 화면이다.

## 중간 규모 실제 화면 수용 추가 — 2026-10-05

[중간 파형 수용 기록](medium-waveform-acceptance.md)에 실제 조작/눈금 겹침 보완/Go 버튼 및24 PASS 근거를 기록했다. 일반 시간축 사본은 `.dev/medium-ui/signals-4096-steps-192.vcd`다. 다음은 테스트 선택/Run/Stop/결과 버튼의 실제 수용이다.


## 실행 버튼 실제 수용 추가 — 2026-10-05

[실행 버튼 수용 기록](execution-ui-acceptance.md)에 실제9회 native 결과와 정상 종료 exit0를 기록했다. 다음 물리 검증은 기본 편집/implicit 포트/parameter·function/task/package scope/분석 상태다. 전체 A3 및 깨끗한 OS 완료가 아니다.


## 편집 화면 실제 수용 추가 — 2026-10-05

[편집 화면 수용 기록](editing-ui-acceptance.md)에 인자/포트/package/상태와 기본 편집의 관측 범위를 기록했다. 표의 부분 수용을 전체 완료로 바꾸지 않는다. 다음은 남은 편집 세부 문맥, 이어 구조·시간/두 화면/저장 보기 격리다.


## 자동 안내·scope·Enter 추가 수용 — 2026-10-05

[세부 화면 수용 기록](editing-detail-ui-acceptance.md)에 주요 격리 편집 문맥을 추가했다. 다음 주 작업은 구조·시간 및 두 화면 수명, 저장 보기의 다른 TB·프로젝트 격리다. 탭/CRLF·실제 사용자 설정 충돌과 도구 상태 일부는 여전히 남는다.

## 보존 구조·파형 연동 추가 수용 — 2026-10-05

[구조 화면 수용 기록](structure-ui-acceptance.md)에 양방향 시간/값·독립 닫기/재열기·run 격리, 좁은 파형/신호 browser 숨김의 배치 결함 A3-WAVE-LAYOUT-1 보완과31 PASS를 기록했다. 구조를 계층에서 재열면 Refresh가 필요하다. 다음은 다른 TB·프로젝트 저장 보기 격리. 남은 큰 검증4묶음(저장 보기/세부 예외/사용자 프로필/실제 설계·메모리)과 깨끗한 OS 별도 보류1이며 개별 테스트 수로 해석하지 않는다.

## 저장 보기 격리 재개 완료 — 2026-10-05

[복원·격리 기록](waveform-isolation-acceptance.md)에 두 보기 재시작/전환·TB/동명 프로젝트 격리와5 PASS를 기록했다. 남은 큰 검증3묶음과 깨끗한 OS 별도 보류1. 다음 우선 작업은 새 비교 사본의 시간 제한/종료 지연 원인 점검이다.

## Windows 빌드 종료 보완 — 2026-10-05

[종료 검증](timeout-termination-validation.md): native 빌드 시간 초과·취소의 하위 프로세스 잔존 결함을 직접 binary 호출로 보완하고 시간/잔존 부재/재실행을 확인했다. GUI 준비·빌드 Stop와 F5는 아직 물리 수용 전이므로 실행/취소 표의 부분 상태를 유지한다. 다음은 해당 화면 검증이다.

## 실행 예외 추가 수용 — 2026-10-05

[상세 기록](execution-detail-ui-acceptance.md): 위 표에 컴파일 실패·준비/빌드 Stop·F5 수용을 반영했다. 앞의 미수용 표현은 해당 날짜의 이력이다. 전체 A3/F는 아직 미완료다.

## 편집 예외 추가 수용 — 2026-10-05

[상세 기록](editing-edge-ui-acceptance.md). 위 표에 탭/CRLF·다른 파일 package·분석 상태 수용을 반영했다. 이전 미수용 문구는 당시 이력이다. 설정 변경은 검증 파일로 준비했다. 전체 A3/F 미완료.

## 구조·파형 예외 추가 수용 — 2026-10-05

[상세 기록](structure-wave-edge-ui-acceptance.md). 구조 내부 이동, 독립 파형 X/Z, 보기 rename/누락 경로 보존을 반영했다. 같은 테스트의 열린 탭 목록 갱신 결함을 수정하고 실제 재확인했다. 전체 A3/F 미완료.

## 구조 상태·관리 취소 추가 수용 — 2026-10-05

[상세 기록](structure-states-management-acceptance.md). 합성 구조 상태 표시, 기본 지정/해제와 rename/덮어쓰기/삭제 취소 확인. 전체 검증 완료가 아니며 다음은 loading 취소와 메모리 관측이다.
