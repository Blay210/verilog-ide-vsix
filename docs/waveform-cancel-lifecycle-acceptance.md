# F1C — 현재 파형의 취소·두 reader 수명 (2026-10-06)

## 발견과 보완

U05 enum 준비 단계에서 trace가 이미 붙은 뒤 취소하면 worker는 종료되지만 document의 metadata와 ready cursor 연결이 남을 수 있었다. Reload 실패 화면에서는 값이 보이지 않아도 호스트 시간 명령이 종료된 reader의 연결을 사용할 수 있는 상태였다.

waveform.ts의 취소 정리는 metadata/trace를 지우고 해당 view를 dispose하며 generation을 갱신한다. 실제 session.dispose 완료까지 기다린 뒤 progress 구독을 정리한다. 이미 취소된 progress token도 시작 전에 검사한다. standalone load가 늦게 반환해도 abort를 검사한 후에만 metadata를 게시한다. 다른 view의 cursor group을 invalidate하지 않으며 Reload로 새로운 reader를 준비할 수 있다.

## 검증

관련26 PASS/0 fail/skip, 타입 검사·개발 빌드 exit0. 범위: 새 cancellation host2 + 기존 trace links/linked host/webview/enum presentation/raw VCD/worker 회귀. 새 시험은 취소된 enum 준비에서 metadata/link 제거, reader 종료 promise 대기, peer 시간 유지, 시간 명령 거절 및 재시도를 검사한다. standalone의 취소 뒤 늦은 정상 응답도 게시되지 않는다. 첫 집중3 PASS는 반복 실행이므로26에 합산하지 않는다.

실제 VS Code1.140.0/Node24.21.0 격리 profile **run-5rYxEQ**, `.rtl/extension-test.json` passed=true, host exit0:

- synthetic VCD4,096신호/786,432변화를 실제 custom editor에서 읽는 도중 tab API로 닫고 reader exit 및 document 제거를 확인했다. 이후 같은 데이터를 다시 열 수 있었다.
- 두 파일을4회 열고 닫았다. 한 reader 종료 후 다른 reader의 정확한 `zzzzzzzz` 값 조회가 유지됐다.
- 생성9개/종료9개 worker, 각 cycle 종료 시 모두 exit 확인. 파일 SHA 불변, standalone trace의 기록 실행 비혼입.

시험 fixture `tests/vscode/waveform-lifecycle.ts`는 격리 host의 node Worker 생성자를 잠시 감싸 실제 종료를 관찰한다. 진단 요청 ID로 actual reader에 값 조회를 보내며 일반 editor의 요청/응답 경로를 대체하지 않는다. 종료 후 원래 생성자를 복원한다. 제품 API나 worker 캐시를 추가하지 않았다. **물리 Cancel 클릭·파형 canvas 조작·실제 사용자 설계 수용·보존 enum의 실제 하위 프로세스 취소 시험은 아니다.** 보존 enum 준비 취소는 이번 host 회귀에서 검증했다. 사용자의 examples/counter 변경 없음, VSIX/설치 없음.

## 메모리·지연 관측과 열린 판정

강제GC 없이 extension-host RSS(threads 포함)를 관찰했다. 초기 약202MiB, 표본 peak 약443MiB, 각 cycle 종료 후 약403/338/412/410MiB, 최종 정리/파일 검증 후 약433MiB. 초기 수준으로 회수됐다고 볼 수 없다. 부모 heapUsed는 최종 약41MiB이며 worker heap이나 전체 workbench 메모리가 아니다.4개 표본만으로 누수 없음/지속적 증가 여부를 확정하지 않는다.

한 cycle의 전체 open2/값 조회/close2는19.23/33.53/15.86/26.43초였다. 개별 parser 시간으로 해석하지 않는다. host event-loop 최대 **900.20ms**는 기존 임시200ms 기준을 넘었다. receipt의 passed=true는 기능·정리 assertion 통과이며 성능 수용 PASS가 아니다. startup/builtin extension/IPC/fixture/reader 어느 단계의 지연인지 이번 전체 측정으로 분리하지 않았으며 환경 부하 탓이라고 단정하지 않는다.

다음 F 작업은 준비/파일 읽기·worker parse·metadata 게시·webview/IPC·종료 단계별 시간과 warm 상태 event-loop를 계측해900ms 지연을 재현·분리한다. 이유를 확인하기 전에 공유 cache나 parser 재작성으로 우회하지 않는다. 대표 수백 RTL/수천 신호의 사용자 설계·메모리 수용, 실제 편집 프로필, 기록 구조의 남은 경계와 깨끗한 Windows 보류는 계속 열려 있다.

## 재현과 인수인계

기존 `.dev/waveform-scale-latest.json` fixture가 필요하다(없으면 `node --expose-gc scripts/verify-waveform-scale.mjs`). 격리 test host에서 `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `RTL_DEV_HOME=D:/Dev/verilog_ide/.dev/rtl-dev`, `RTL_WAVEFORM_LIFECYCLE_TEST=1`로 `node scripts/test-vscode.mjs`를 실행한다. suite의 별도 branch이며 다른 semantic/native suite를 완료로 처리하지 않는다. 출력은 새 `.dev/vscode-tests/run-*/project/.rtl/extension-test.json`에 남는다.

회귀: `node node_modules/tsx/dist/cli.mjs --test tests/waveform-cancel-host.test.ts tests/waveform-link-host.test.ts tests/waveform-link-webview.test.ts tests/waveform-enum-webview.test.ts tests/waveform-enums.test.ts tests/trace-links.test.ts tests/waveform.test.ts`.
