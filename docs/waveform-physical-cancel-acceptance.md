# F1W 실제 파형 Cancel 버튼·복구 확인 (2026-10-06)

F1V 자동 tab-close 검증과 별도로, 실제 VS Code 알림의 Cancel 버튼을 native 마우스로 클릭했다. 제품 코드 변경 없이 격리 검증 harness를 추가했다. 원본 프로젝트/설정/시스템 PATH 변경이나 VSIX 생성·설치는 없다.

## 준비와 검증 경계

tests/vscode/waveform-physical-cancel.ts는 기존 합성4096신호/786432변화 VCD를 새 격리 프로젝트 .rtl에 두 파일로 복사한다. 첫 peer를 정상 로딩한 뒤 두 번째 파일의 첫 load 요청 전달만20초 늦춘다. 이는 실제 progress UI의 클릭 시간을 확보하는 진단 조건이다. 실제 worker는 생성되지만 두 번째 parse가 시작되기 전이다. 일반 parse 중 물리 Cancel이나 일반 취소 latency 검증으로 표현하지 않는다.

suite flag RTL_WAVEFORM_PHYSICAL_CANCEL=1 및 launcher의 해당 모드 visible window를 추가했다. 진단 Worker wrapper는 오직 이 격리 suite에서만 사용하며 exit 때 delay timer를 지우고 finally에서 원래 Worker 생성자를 복원한다. harness는 취소 함수/token을 호출하지 않는다. 정상 제품의30초 timeout보다 먼저 target exit 및 held=true를 요구한다. fixture start/finish 파일은 UI 조작을 대신하지 않는 준비/관찰 acknowledgement다.

## 실행과 물리 입력

VS Code1.140.0/Node24.21.0, run-odiLDS. VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe, RTL_DEV_HOME=D:/Dev/verilog_ide/.dev/rtl-dev, RTL_WAVEFORM_PHYSICAL_CANCEL=1로 node scripts/test-vscode.mjs. 기존 .dev/waveform-scale-latest.json fixture 필요. 다른 suite flag는 설정하지 않는다.

Computer Use 스킬의 Sky native 창 선택/관찰로 첫 파형 상태를 확인하고, Reading cancel-target.vcd 알림의 Cancel 버튼을 한 번 클릭했다. 반환 로그에 extension-host $acceptProgressCanceled 경로가 나타났으며 실제 대상 worker가 dispatch/timeout 전에 종료됐다. 총10,044ms는 요청 시작부터 관찰까지이며 사람이 버튼을 누르기 전 대기를 포함한다. 클릭→종료 latency로 사용하지 않는다.

검증기는 취소한 custom document가 host 목록에서 제거됐는지, peer가 종료되지 않고 정확한 zzzzzzzz 값을 조회하는지 확인했다. 이어 정상 vscode.openWith command로 target을 재열어4096신호/786432변화와 정확한 값을 확인했다. 재열기는 harness command이며 물리 Explorer double-click 시험은 아니다. 실제 재열린 정상 파형 화면을 별도로 관찰했다.

종료 시 생성3개/종료3개 actual worker 및 두 파일 SHA 불변을 확인했다. run-odiLDS/project/.rtl/extension-test.json의 passed/peerPreserved/cancelledDocumentRemoved/retryPassed/sourceHashPreserved=true, host/launcher exit0.

주의: receipt의 cancelledOpen.opened=true는 vscode.openWith command promise가 resolve했다는 뜻이다. VS Code는 custom editor open 실패를 자체 처리하고 command를 resolve할 수 있다. 이를 로딩 성공으로 판단하지 않는다. 실제 취소는 worker exit+metadata/document absence와 native progress 취소 로그로 확인했다. 해당 취소 로그의 오류 stack은 정상 취소 전달을 기록한 것으로, 이번에 제품 crash/worker 잔류는 관측하지 않았다.

## 관련 검증과 다음

TypeScript --noEmit 및 native 개발 build exit0. waveform-cancel-host/waveform-link-host 4 PASS/0fail/skip: 기록 enum 준비 취소 정리·peer 보존·Reload 재시도, standalone 늦은 응답 차단, window/values 무효화 후 응답 차단. 이전23개 검사를 이번 전체 PASS로 합산하지 않는다.

이번 버튼 검증은 제한 조건에서 완료했다. 무지연 실제 parse 중 물리 Cancel, 보존 enum 준비의 실제 하위 프로세스 취소, 실제 사용자가 파일을 재여는 동작, physical Escape/OS DPI는 별도 미검증이다. 정상 parse중 tab-close와 handler 회귀는 F1V/기존 F1C의 근거다.

다음은 잔여 실제 입력/Escape·프로필 충돌 범위를 먼저 정리하고 해당 지원 부분집합을 검증한다. 실제 대표 설계 경로가 제공되면 원본 수정 없는 격리 분석을 진행한다. 장시간 전체 workbench 메모리·정상 외부 linter diagnostics/사용자 snippets·추가 프로필·pan/zoom full-query 지연 및 이전900ms 원인도 남는다. 깨끗한 Windows는 별도 환경 부재로 계속 보류한다. 전체 안정화/초기 stable 배포 완료를 의미하지 않는다.
