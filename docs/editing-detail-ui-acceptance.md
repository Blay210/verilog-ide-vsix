# 자동 안내·scope·기본 편집 추가 수용 — 2026-10-05

기존 [편집 화면 수용](editing-ui-acceptance.md)의 미확인 문맥을 VS Code1.140.0 격리 지속 저장 개발 창에서 실제 키·마우스로 확인했다. 사용자 파일과 제품 코드를 바꾸지 않았다. 기존 `.dev/rtl-dev`를 재사용했고 개발 build/typecheck 통과, 검증 창 정상 종료 exit0다. 전체 suite/native 실행은 이번에 재실행하지 않았다. VSIX/설치 없음.

## 실제 관측

| 항목 | 입력 | 결과 |
|---|---|---|
| package 자동 트리거 | scope_pkg 뒤에 콜론 두 번을 실제 키로 입력 | 별도 추천 명령 없이 EXPORTED 팝업 표시 |
| 미저장 package 변경 | 선언 EXPORTED를 UPDATED로 변경하고 저장 전 같은 pkg::에서 추천 요청 | UPDATED만 표시; 당시 디스크에는 EXPORTED 유지 |
| 안쪽 scope | named begin 블록의 scope_에서 추천 요청 | scope_arg, scope_inner, scope_local 표시 |
| 바깥 scope | 블록 밖 같은 scope_에서 추천 요청 | scope_arg, scope_local만 표시; scope_inner 제외 |
| wildcard import | import scope_pkg::*가 있는 함수에서 UP 추천 요청 | 미저장 UPDATED 선언 후보 표시 |
| function 자동 안내 | calc 뒤에 실제 ( 키 입력 | input int foo 강조 팝업 자동 표시 |
| 쉼표 재트리거 | 첫 인자 1 다음 실제 쉼표 키 입력 | input string boo="hi" 강조로 자동 전환 |
| if/always/for | 각 줄 끝에서 실제 Enter | 일반 줄바꿈/들여쓰기 유지, begin/end 강제 생성 없음; 각각 한 단계 Undo 복구 |
| 주석 Enter | // begin 끝에서 Enter | 일반 줄바꿈, end 생성 없음; 한 단계 Undo 복구 |
| 문자열 Enter | "begin" 안에서 Enter | 일반 줄바꿈, end 생성 없음; 한 단계 Undo 복구 |
| 분석 로그 | Language Status→Show Language Log | Output 패널 RTL Language 채널 열림; 관측 당시 로그 본문은 비어 있음 |

## 근거와 재현

사본은 `.dev/vscode-tests/run-execution-jP8yeV/project`이며 실행기는 RTL_MANUAL_ACCEPTANCE/RTL_MANUAL_PERSISTENT/RTL_MANUAL_RESUME_ROOT를 사용했다. 로그 `.dev/editing-detail-ui-host.log`, 요약 `.dev/editing-detail-ui-acceptance.json`에 범위를 기록했다. scope-probe.sv에는 package/import 및 두 scope 조회 문맥, control-probe.sv에는 세 제어문과 주석/문자열, call-probe.sv에는 인자 두 개를 가진 함수가 있다. 최종 관측 이후에만 scope/call 사본을 저장했다. 저장 전 디스크 EXPORTED 유지 확인을 최종 저장 이후 결과와 혼동하지 않는다. control 사본은 Undo 후 원본 상태다.

실제 screenshot/accessibility가 화면 근거이며 자동 host receipt로 물리 수용을 대신하지 않는다. 불완전한 제어문/조회 접두사 등의 의도적인 진단은 fixture 상태다. 이 사본을 native 실행용 정상 예제로 취급하지 않는다. 이전 native 결과는 별도 archive 입력을 유지한다. 제품 결함은 새로 확정되지 않았다.

## 다음 순서와 남은 범위

기본 네 칸 들여쓰기·LF 격리 프로필의 주요 편집 문맥 확인을 마쳤다. 탭 들여쓰기/CRLF, 타 확장·사용자 키 설정 충돌, 별도 파일 간 미저장 package 변경, 도구 누락/비활성화 상태 화면은 아직 실제 수용하지 않았다. 모든 SV 호출 형태나 모든 편집 문맥의 완료를 뜻하지 않는다.

다음 주 작업은 보존 결과의 구조 내부 탐색·Time/Go와 파형 cursor A 동기화, 두 화면을 각각 닫고 재열 때의 run/시간 유지, 다른 TB·프로젝트의 저장 보기 격리다. 이후 실제 사용자 프로필과 대표 설계·메모리를 검증한다. 깨끗한 Windows는 별도 환경 부재로 보류한다. 전체 A3/F 완료나 새 D4/E·배포 준비 완료로 확대하지 않는다.
