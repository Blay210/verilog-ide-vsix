# F1D — 파형 구간별 계측 (2026-10-06)

## 목적과 구현

F1C의 host loop900.20ms를 parser 시간과 혼동하지 않고 구간별 비용을 확인했다. worker는 요청에 명시적인 profile=true가 있을 때만 open/stat/할당/read/restat/decode/parse/close 또는 verified hash 시간과 처리 total을 별도 응답 envelope에 넣는다. 원시 metadata·값·SHA·실패 후 unready 계약은 그대로다. 일반 클라이언트 요청과 화면에는 계측 항목을 추가하지 않는다.

tests/vscode/waveform-lifecycle.ts의 profile 모드는 기존 격리 Worker wrapper가 load 요청에만 계측을 붙인다. host에서는 send→receive, online event, 편집기 열기/값 조회/닫기와 warm idle의 구간별 event-loop를 기록한다. 같은 script의 일반 lifecycle 모드는 기존 계측 없이 유지한다. 새 suite flag는 RTL_WAVEFORM_PROFILE_TEST=1이다. 파일 해석은 계속 별도 worker에서 실행하며 cache·parser 자료구조·시뮬레이터 동작을 바꾸지 않았다.

**측정 경계:** worker total은 handle 시작부터 응답 게시 직전까지다. roundTrip−workerTotal에는 thread 시작/queue/scheduling/직렬화/전달이 섞이므로 순수 IPC라고 부르지 않는다. online event 역시 host scheduling을 포함한다. editor open은 workbench/custom-document 준비까지 포함하지만 canvas가 실제로 그려진 시각은 아니다. activation/초기 fixture 준비/첫 취소는 phase maximum에서 제외되며 이전 전체 loop 측정과 직접 동등하지 않다. 짧은 구간의 loop max=0은 표본이 없을 수 있어 지연0 보장이 아니다.

## 최종 검증과 측정

관련24 PASS/0 fail/skip, 최종 타입 검사·개발 빌드 exit0. 신규 실제 worker 시험은 profiling on/off metadata 동일성, verified SHA와 raw X/Z 값 유지, 정상 요청에서 profile 없음, 변조 거절 후 unready를 검사한다.

실제 VS Code1.140.0/Node24.21.0 **run-hA0nMr**, `.rtl/extension-test.json` passed=true/profileMode=true, host exit0. 합성4,096신호/786,432변화 두 custom editor4cycle, pending close/reopen·peer 조회·9/9 worker exit·원본 SHA 불변 유지. 이 시험의 값 조회는 fixture의 진단 요청이며 물리 버튼/캔버스 수용은 별도다.

| 측정 구간 | 관측 범위 |
|---|---:|
| 파일 read | 3.61–9.83ms |
| UTF-8 decode | 3.62–7.41ms |
| parse | 715.99–957.57ms |
| worker total | 734.76–971.62ms |
| roundTrip에서 worker total을 뺀 잔여 | 48.22–64.20ms |
| 편집기1개 open | 828.42–1118.35ms |
| 진단 peer value query | 2.67–5.26ms |
| 한 editor close + 실제 reader exit | 11.36–49.98ms |
| warm idle loop maximum | 23.10ms |
| 측정한 phase loop maximum | 41.88ms |

cycle 전체는2.36–2.57초(phase 후 표본 수집 대기 포함)였다. 이 조건에서 파형 열기의 대부분은 worker parse이고, host loop는 임시200ms 이내였다. **이전900ms는 재현되지 않았으며 원인을 규명/수정했다고 볼 수 없다.** 이번은 환경 변경/성능 개선을 입증하는 전후 benchmark가 아니다. phase 경계와 부하가 달라졌으므로900→42ms 개선율을 주장하지 않는다.

RSS 초기198.75MiB, 표본 peak488.92MiB, close 뒤422.46/445.79/423.31/447.86MiB, 최종 정리469.42MiB. threads 포함 extension-host RSS이며 강제GC/전체 workbench/worker live heap 측정은 아니다. 메모리 초기 회수 및 사용자 대표 설계 수용은 계속 열려 있다.

## 다음 단계

다음 F 작업은 현재 parse 비용의 CPU/할당과 살아 있는 reader의 heap을 관찰해 반복값·전이 저장 비용과 종료 후 allocator 잔류를 구분한다. 종료9/9 확인만으로 RSS 잔류를 누수라고 판단하거나 공유 cache를 도입하지 않는다. 이번 정상 phase 기준을 재현 가능한 비교 조건으로 사용하되900ms의 과거 기록을 없애지 않는다. renderer first paint/검색·정렬·zoom의 실제 성능, 대표 사용자 프로젝트, 실제 편집 프로필/기록 경계와 깨끗한 OS 환경 부재 보류도 남아 있다.

## 재현

기존 `.dev/waveform-scale-latest.json` fixture와 `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `RTL_DEV_HOME=D:/Dev/verilog_ide/.dev/rtl-dev`, `RTL_WAVEFORM_PROFILE_TEST=1`로 `node scripts/test-vscode.mjs`. 새 `.dev/vscode-tests/run-*/project/.rtl/extension-test.json`의 phases/loads를 읽는다. 기존 RTL_WAVEFORM_LIFECYCLE_TEST/다른 test mode flag와 함께 설정하지 않는다. 이 branch는 다른 semantic/native suite를 실행하지 않는다. VSIX 생성/설치와 사용자 examples/counter 수정 없음.
