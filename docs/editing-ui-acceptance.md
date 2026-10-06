# 편집 지원 실제 화면 수용 — 2026-10-05

VS Code1.140.0의 격리 지속 저장 개발 창에서 실제 키·마우스로 확인했다. 기존 실행 검증 사본 `.dev/vscode-tests/run-execution-jP8yeV/project`에 별도 editor-probe.sv, instance-probe.sv, lexical-probe.sv를 준비했다. 사용자 RTL과 예제는 수정하지 않았다. `RTL_MANUAL_ACCEPTANCE=1`, `RTL_MANUAL_PERSISTENT=1`, `RTL_MANUAL_RESUME_ROOT` 및 기존 `.dev/rtl-dev`를 사용했다. 실행 로그는 `.dev/editing-ui-host.log`다.

## 확인한 결과

| 항목 | 입력과 관측 | 판정 |
|---|---|---|
| function | calc(input int foo, input string boo="hi") 선언과 미저장 calc(1, "test") 호출; 두 번째 인자에서 안내 요청 | function int calc의 input string boo 및 기본값 "hi" 강조 확인 |
| task | emit_value(output int value) 호출에서 실제 ( 키 입력 | task emit_value(output int value) 팝업과 방향/타입 강조 확인 |
| parameter | ui_parameter #(.WIDTH(8))의 값 위치에서 안내 요청 | ui_parameter #(int WIDTH = 8) 팝업/활성 인자 확인 |
| implicit 포트 | dut (.clk, .rst_n, )의 미연결 위치에 실제 점 키 입력 | count만 추천, clk/rst_n 제외; output logic[7:0] 표시; Tab 수락 |
| package | 미저장 editor_pkg:: 문맥에서 추천 요청 | EXPORTED / helper / word_t 목록과 parameter int EXPORTED 표시; Tab 수락 |
| 상태 복구 | 초기 불완전 호출에서 Source errors, 함수/task/package 호출 완성 | RTL: Ready 및 Problems 오류0 관측; 분석 도구·프로젝트 경로 표시 |
| 상태 메뉴 | RTL Start Language Status 클릭 | Set Up Language Support, Retry Analysis, Tool Storage / Simulation Tools, Language Settings, Show Language Log 접근 메뉴 관측; Retry Analysis 클릭 |
| 기존 closer | 기존 end가 있는 initial begin 끝에서 Enter | 본문 8칸 들여쓰기, end 하나 유지; Ctrl+Z 한 번으로 복구 |
| 주석 | // begin 뒤에서 Tab | 4칸 공백 입력, snippet/end 생성 없음; 한 단계 Undo 복구 |
| 문자열 | $display("begin")의 begin 뒤에서 Tab | 일반 공백 입력, snippet/end 생성 없음; 한 단계 Undo 복구 |

function/task/parameter는 manifest test top에서 도달하지 않는 별도 모듈에서도 확인했다. 포트와 package는 실제 의미 분석 후보이며 키워드 snippet 검증으로 대체하지 않았다. Ctrl+Space로 요청한 package 목록과 Ctrl+Shift+Space로 요청한 function/parameter 안내는 명시적 요청 경로다. 이를 콜론/괄호의 모든 자동 트리거 수용 완료로 확대하지 않는다. task와 implicit 포트는 실제 괄호/점 키 트리거를 확인했다.

초기 인자 안내가 없는 즉시 화면은 분석 완료 후 후속 관측에서 정상 팝업으로 바뀌었다. 입력 직후 접근성 트리/화면의 지연도 관측했다. 이 경우는 재현된 제품 결함으로 세지 않는다. 검증 중 소스 편집 영역 포커스를 다시 잡고 호출 줄을 정리한 과정은 최종 결과와 구분한다. 이번 범위에서 제품 코드 변경은 없다.

## 근거와 보존 범위

최종 호출/인스턴스 소스는 `.dev/editing-ui-callable-after.sv`, `.dev/editing-ui-instance-after.sv`에도 보존했다. lexical 사본은 Undo 후 원본과 같은 상태다. 함수/task/package 입력은 미저장 상태에서 먼저 관측하고 검증 사본에만 저장했다. 화면 관측 근거는 해당 대화의 screenshot/accessibility 결과이며 자동 host receipt를 전체 수용 PASS로 사용하지 않는다. 요약은 `.dev/editing-ui-acceptance.json`이다. typecheck 및 개발 창 실행기의 development build 통과.

이 사본에 추가한 instance-probe는 의도적인 미완성/미선언 연결 및 시간 단위 진단을 포함한다. 이전 실행 수용의 native9 결과는 기존 입력 archive로 보존되며, 현재 사본 전체를 깨끗한 native 예제로 취급하지 않는다. 현재 파일을 수정해 과거 결과를 바꾸지 않았다.

## 남은 수용과 다음 실행 순서

기본 편집 행 전체가 끝난 것은 아니다. 주석/문자열의 Enter, if/always/for의 강제 begin 삽입 부재, 탭 들여쓰기/CRLF/타 확장과 사용자 키 설정 충돌은 물리 수용이 남는다. function 첫 인자/쉼표 자동 재트리거, package 콜론 자동 트리거·미저장 선언 이름 변경 반영, import/중첩 scope 후보도 남는다. 분석 상태의 오류→Ready와 메뉴/Retry 접근은 확인했지만 도구 누락·비활성화·로그 열기까지 실제 화면으로 완료한 것은 아니다.

다음은 위 세부 문맥을 마무리한 뒤 구조·시간 연결/두 화면 수명과 다른 TB·프로젝트의 저장 보기 격리를 확인한다. 사용자 프로필 및 실제 설계·메모리 수용, 별도 환경이 없는 깨끗한 Windows 설치 검증은 계속 열린 항목이다. 전체 A3/F 완료, 새 D4/E 진입 또는 배포 준비 완료를 뜻하지 않는다. VSIX/새 설치 없음.
