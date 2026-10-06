# RTL Start 실행 버튼 실제 수용 — 2026-10-05

VS Code 1.140.0의 격리된 지속 저장 개발 프로필에서 computer-use의 실제 키·마우스로 실행했다. 기존 `.dev/rtl-dev` 도구를 재사용했고 새 설치·VSIX 생성은 하지 않았다. 자동 host 테스트나 CLI 실행으로 버튼 수용을 대신하지 않았다. 이번 범위에서 새 제품 결함은 발견되지 않았다.

## 환경과 재현

현재 사본은 `.dev/vscode-tests/run-execution-jP8yeV/project`, 실행 로그는 `.dev/execution-ui-host-final.log`, 요약은 `.dev/execution-ui-acceptance.json`이다. `RTL_MANUAL_ACCEPTANCE=1`, `RTL_MANUAL_PERSISTENT=1`, `RTL_MANUAL_RESUME_ROOT`로 기존 개발 실행기를 사용했다. persistent 모드에는 extensionTestsPath와 자동 수용 receipt가 없다.

현재 저장소 examples/counter는 사용자 변경이 있는 단일 .v 예제여서 덮어쓰지 않았다. Core createProject의 SystemVerilog 두 테스트 템플릿으로 별도 사본을 생성했다. 초기 단일 예제 창 run-execution-XFS3Rp는 실행 검증 전에 닫았으며 성공/실패 수에 포함하지 않는다.

의도적 실패에는 `initial $fatal(1, "Expected UI acceptance failure");`, 무한 실행에는 `initial forever #1;`를 사용했고 둘 다 timeunit 1ns/timeprecision 1ps를 선언했다. 무한 실행 제한은 처음 60초, 별도 Stop 수용 시 180초다. 전체 실행 전에 두 정상 테스트만 manifest에 남겼다. 네 테스트 설정 원본은 `.dev/execution-ui-four-tests.toml`에 보존했다. fixture 소스와 결과도 보존했다.

## 실제 화면 결과

| 흐름 | 실제 관측 |
|---|---|
| 선택 실행 | Select Tests and Run에서 basic/reset 두 체크박스를 선택하고 OK; 준비→순차 실행→Last run 2 passed |
| 결과 | Show Results로 결과 목록 접근; 결과의 Open Log로 run.log 열기 |
| 파형 | 결과 파형 버튼으로 내장 VCD 열기; 6신호/15전이/41ns 및 recorded run 식별 표시 |
| 재실행 | 결과의 Re-run Test 버튼으로 basic 새 실행 PASS |
| 단일 실행 | RTL Start 테스트를 선택하고 Run 행으로 의도적 실패/무한 실행/reset 실행 |
| 실패 | $fatal이 failed로 기록되고 원인 및 파형 미생성 안내 표시 |
| 시간 초과 | 60초 무한 실행이 timedOut으로 기록; 사본 경로 실행 프로세스가 남지 않음 |
| Stop | 180초 무한 실행이 시뮬레이션에 진입한 뒤 Stop 버튼 클릭; Stopping→Cancelled 표시, cancelled 결과; 사본 경로 실행 프로세스가 남지 않음 |
| 취소 후 복구 | reset 선택→Run→PASS |
| 전체 실행 | 두 정상 테스트의 Run All Tests 클릭→Running 1/2→Last run 2 passed; 새 결과 두 개 PASS |

첫 무한 실행에서 element-index Stop 입력은 이미 시간 초과되어 cached element 오류로 수행되지 않았다. 이를 취소 성공이나 제품 결함으로 세지 않는다. 새 상태를 관측한 뒤 제한을 늘린 별도 실행에서 실제 Stop 버튼 취소를 확인했다. 종료 프로세스 확인은 사본 경로의 ExecutablePath를 검사했으며 시스템 전체 프로세스 청소를 뜻하지 않는다.

## 보존된 native 결과

| 용도 | 테스트 | 상태 | runId | 시간(ms) |
|---|---|---|---|---:|
| 선택 실행 | counter_basic | passed | e758f959-a3c5-49e4-939c-59dde60aed97 | 20483 |
| 선택 실행 | counter_reset | passed | 3a9cae23-acc3-433a-b020-9cffe585b109 | 21696 |
| 결과 재실행 | counter_basic | passed | 728d43d6-f398-4cfd-879d-348c4ab5f0e1 | 20734 |
| 의도적 실패 | ui_expected_failure | failed | 92793a5c-f7f8-4a60-9bfd-29e09fe1944d | 20521 |
| 제한 시간 | ui_infinite | timedOut | 2422fa83-f7a4-42a7-a8cf-dceff52adb78 | 60371 |
| 실제 Stop | ui_infinite | cancelled | 736d8881-22b6-47d3-b588-a49ebabedffd | 71295 |
| 취소 후 복구 | counter_reset | passed | eb9e3d29-a801-4a5e-ab1f-df44828e448c | 20976 |
| 전체 실행 | counter_basic | passed | 675e8d02-4d69-4e6e-9430-64d30baad110 | 21074 |
| 전체 실행 | counter_reset | passed | 7230d37f-7231-45d5-941d-81066b1d40a7 | 21507 |

합계 정상6 PASS와 의도한 failed/timedOut/cancelled 각1이다. 산출물은 사본 `.rtl/runs/`에 모였고 `.rtl/` 외부에는 준비한 소스/manifest/README/.gitignore만 확인했다. typecheck 및 development build 통과. 이번 변경은 검증 사본과 문서이며 제품 코드는 바꾸지 않았다.

## 남은 범위와 다음 순서

전체 A3 완료는 아니다. 컴파일 오류의 물리 화면, 준비/빌드 중 Stop, F5·일반 사용자 프로필 충돌은 이번에 수용하지 않았다. 자동 검증 결과는 기존 종합 검증을 따르며 이번에 전체 suite를 다시 실행한 것으로 취급하지 않는다.

다음은 기존 closer/주석/문자열/Undo, implicit 포트 제외, parameter·function/task 인자 안내, package/scope 및 분석 상태의 실제 편집 화면 수용이다. 이어 구조·시간 연결/두 화면 수명과 다른 TB·프로젝트 저장 보기 격리, 사용자 프로필 및 실제 설계/메모리 수용을 진행한다. 별도 PC/VM 부재로 깨끗한 Windows 설치 종단은 계속 보류다. 새 D4/E 또는 베타 패키지 준비 완료로 넘어가지 않는다.
