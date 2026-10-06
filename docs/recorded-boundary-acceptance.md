# F1T 보존 결과·구조·파형 경계 재검증 (2026-10-06)

F1S 이후 보존된 실행 결과의 연결 경계를 재검증했다. 제품 코드는 변경하지 않았으며, 지원 중인 VCD/관측 포트 부분집합에 대한 결과다. 독립 IDE, 내부 연산 그래프, 클럭 재생 또는 전체 안정화 완료를 뜻하지 않는다.

## 변경과 관련 회귀

`tests/waveform-link-host.test.ts`의 무효화 경계 검사를 window와 values 두 응답에 각각 적용했다. 새 cursor-only 경로도 조회 중 기록이 무효화되면 늦은 응답을 게시하지 않아야 한다. Reload의 연결 token 교체, 오래된 token 거부, peer 시간 공유 및 dispose도 함께 검사한다.

관련 32개 회귀 PASS, TypeScript --noEmit exit0. 실행한 파일: trace-identity, recorded-source, trace-cursor, trace-links, trace-map, structure-host, structure-navigation, waveform-link-host, waveform-cancel-host, waveform-enum-webview, waveform-window-reuse. 전체 회귀를 새로 실행했다는 의미는 아니다. native launcher의 개발 build도 통과했다.

## 실제 VS Code + Verilator + semantic 검증

VS Code 1.140.0의 격리 프로필 `.dev/vscode-tests/run-Mpz1Al`. 기존 설치 도구를 재사용했으며 설치/시스템 PATH 변경/VSIX 패키징은 하지 않았다.

재현 설정:

- VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe
- RTL_DEV_HOME=D:/Dev/verilog_ide/.dev/rtl-dev (절대 경로)
- RTL_RECORDED_TEST=1
- RTL_RECORDED_INCLUDE_TEST=1
- node scripts/test-vscode.mjs

`examples/include-counter`를 격리 프로젝트로 복사하여 두 테스트를 실제 실행했다. counter_basic/counter_reset 모두 passed, inputSnapshot ready. package 자동 순서와 중첩 include가 포함된다. 사용자 수정 예제 examples/counter는 수정하지 않았다.

검증된 경계:

- 현재 testbench를 바꿔도 보존 소스는 실행 당시 내용으로 열리며 일반 입력으로 변경되지 않는다.
- 현재 manifest를 치우고 DUT/package/header를 손상시켜도 보존 입력의 구조/정의/읽기 전용 소스를 사용한다.
- 보존된 VCD와 구조의 count 포트 값이 독립 파싱 값과 일치한다.
- 구조→파형 및 파형→구조 커서 동기화, 한쪽 닫기/재열기와 살아 있는 peer 시간 복원을 확인했다.
- 파형 손상 시 관측 값 연결이 unavailable로 전환된다. 보존 구조가 유효하면 구조 자체를 손상으로 표시하지 않는다. 파일 복원 후 구조 refresh로 연결이 복구된다.
- 다른 실행으로 전환할 때 run identity가 바뀌며 이전 탐색 이력을 사용하지 않는다. 입력 snapshot 손상은 stale로 차단한다.
- 현재 소스와 보존 소스를 섞지 않으며 current mode에 보존 trace를 붙이지 않는다.

근거: `run-Mpz1Al/project/.rtl/extension-test.json`의 passed/recordedSources/recordedPackages/recordedIncludes/recordedTrace/recordedValues/sharedCursor/peerCloseReopen/traceInvalidation 모두 true. host 및 launcher exit0.

초기 `run-gDpWd6`는 상대 RTL_DEV_HOME으로 실행 전 도구 확인에서 대기하여 해당 격리 창만 종료했다. completion receipt 없이 launcher exit1이므로 성공에 포함하지 않는다. 이후 절대 경로 재실행이 통과했다. 이 증거만으로 상대 경로 도구 설정 일반 지원을 보장하지 않는다.

## 실제 Core/worker 추가 경계

RTL_INTEGRATION=1 및 같은 절대 RTL_DEV_HOME으로 `tests/integration/trace.test.ts` 실행: 1 PASS, skipped0, exit0.

한글·공백 경로의 격리 설계를 실제 빌드하고 manifest 제거/현재 RTL 손상 후 보존 입력으로 elaboration했다. 두 leaf, generate 두 개, instance array 두 개 및 escaped 이름의 실제 포트 값을 VCD와 대조했다. Core가 검증한 trace bytes/hash를 worker에 전달하여 values 결과를 다시 대조했고, 별도 프로젝트 cursor 격리·무효화·수정 파형 hash 거부도 확인했다.

근거: `.dev/d3a-native-receipt.json`, `.dev/d3b-foundation-native-receipt.json`의 최신 passed=true. 이 receipt는 재실행 때 덮어써지므로 해당 root/runId를 함께 확인한다. 이 검사는 실제 VS Code UI 시험과 구분한다.

## 다음 순서와 남은 한계

보존 입력/VCD/지원 관측 포트의 이번 종단·경계 재검증은 통과했다. 다음은 실제 사용자 편집 프로필 충돌 확인, 이어 대표 실제 설계 규모·loading 취소·두 reader 메모리 복구다. 사용자 설정은 먼저 읽고, 복제한 격리 프로필에서 시험하며 사용자 설정을 직접 변경하지 않는다.

이번에 physical Reload 버튼을 새로 조작한 것은 아니다. host mock Reload 및 F1S의 물리 Reload 근거와 이번 native 닫기/재열기를 구분한다. FST 내장 reader, 임의 설계의 모든 신호 매핑, 미기록 내부 연산, 전체 성능/RSS, physical Esc/OS DPI와 깨끗한 Windows는 수용 완료가 아니다. pan/zoom full-query 지연도 남아 있다. 깨끗한 Windows는 별도 PC/VM 부재로 보류한다.
