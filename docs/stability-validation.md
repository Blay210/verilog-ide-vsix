# 초기 베타 안정화 — A3/F

## 최신 F1L — 2026-10-06

group/Esc/resize·DPR/overflow형태 row-count bundled회귀 및 modifier host shortcut 충돌 보완, 관련37 PASS/타입 검사·빌드 exit0. native Shiftgroup mouse이동/labelzoom 관찰/SHA/host exit0. 다음finalcontainer Ctrl+-/일반shortcut·overflow/right-cursor resize native마무리. physical Esc/OS DPI/실제설계/RSS 보류유지. [근거](waveform-interaction-regression.md). 아래 F1K는 이전 기록이다.

## 최신 F1K — 2026-10-06

ruler/파형scrollbar폭 정렬·큰원점상대눈금·viewport plot/reveal/Reload위치 복원.35 PASS/타입 검사·빌드 exit0, run-T0BtBf8exit/전체값/latest/peer/SHA/host exit0, 실제마우스run-7uWK3q정렬/scroll/panel폭/Reload 및32/128oracle. 다음그룹/Esc/overflow/resize·DPI 회귀/dense전달. 전체성능/RSS/실제설계 게이트유지. [근거](waveform-viewport-alignment.md). 아래 F1J는 이전 기록이다.

## 최신 F1J — 2026-10-06

160행 물리scroll/zoom/reorder/cursor/Reload 및32/128값oracle·Reload상태equality/SHA/host exit0 확인. 수동harness최종준비/종료재검증·관련31 PASS/타입 검사·빌드 exit0. dense 수백ms와Reload scroll복구/라벨가독성은 다음개선. 실제설계/프로필/RSS/보존경계·물리group/Esc/resize/고속입력 게이트유지. [결과](waveform-physical-ui.md). 아래 F1I는 이전 기록이다.

## 최신 F1I — 2026-10-06

query/draw 비용 분리·bounded reuse·연속20요청/Reload 로딩 중 close-reopen·peer 복구 완료. run-Qv9vJv8exit/SHA/host exit0, 관련31 PASS/typecheck/build exit0. dense RTT111.4ms/draw127.1ms, 초기 폴링 관찰 실패는 event barrier로 보완. 물리 조작/visible-row·transport/RSS·대표 설계는 다음 게이트다. [계약과 미수용 범위](waveform-dense-recovery.md). 아래 F1H는 이전 기록이다.

## 이전 F1H — 2026-10-06

160행/활동 viewport/dense/zoom/두 Reload/peer/close 기능 검증·그리기1초 문제 보완. run-a7v4rO 부모32/bit128 모든 값·Reload equality/4exit/SHA/host exit0, 관련29 PASS/typecheck/build exit0. draw45.9–188ms로 관찰됐지만 dense 조회200.2ms+draw188ms 반응성/물리 조작/RSS는 아직 미수용이다. 다음 비용 분리·연속 요청/Reload 중 취소 스트레스. [증거·범위](waveform-render-stress.md). 아래 F1G는 이전 기록이다.

## 이전 F1G — 2026-10-06

dev/test 명시적renderer계측·관련28 PASS/typecheck/build exit0. run-risLLx8editor/32visible sample/24cursorprobe/9exit/peer/SHA/host exit0. querymedian7.75ms/draw4.65ms/firstframe기회62.1–97.7ms, phase loop52.36ms. 기본8신호에서frame기회를측정했으며최대행/물리pixel/실제설계/RSS회수는미수용. 다음32부모+128bit/활동viewport UI스트레스. [제약과재현](waveform-render-profile.md). 아래 F1F는이전기록이다.

## 이전 F1F — 2026-10-06

bounded short-value 공유 제품 적용.24worker 원본/후보 전체digest/SHA 동일, 반복자료 retained31.6% 감소/중앙값parse+8.1% 절충. 관련26 PASS/typecheck/build exit0, native run-w4sxss4cycle/9exit/peer/SHA/host exit0. RSS 초기206→close347–370/최종386MiB로 초기 회수는 미입증. 다음 renderer first-ready/frame·webview query 왕복 계측. [한계·재현](waveform-value-reuse.md). 아래 F1E는 이전 기록이다.

## 이전 F1E — 2026-10-06

개발용 CPU/할당·worker-local live heap 계측 완료, run-SvRWin5exit/SHA·전체digest·X/Z query·진단공유3회 불변성 통과, 관련24 PASS/타입 검사·개발 빌드 exit0. retained 증가56.878MiB, post-parse 공유17.937MiB 절감, 자료해제 기준선+0.117MiB. 제품 최적화/프로세스 RSS 회수/renderer 수용은 아직 아니다. 다음 제한된 per-parse 값공유 원본/후보 비교. [근거와 한계](waveform-parser-profile.md). 아래 F1D는 이전 기록이다.

## 이전 F1D — 2026-10-06

구간별 opt-in worker/격리 host 계측 추가, 관련24 PASS·타입 검사/개발 빌드 exit0. run-hA0nMr 실제4cycle/9exit/SHA 불변/host exit0. read3.61–9.83ms, parse715.99–957.57ms, editor open828.42–1118.35ms, warm phase loop max41.88ms. 이전900ms는 이번 조건에서 미재현이며 원인 해결/개선율을 입증하지 않는다. RSS 초기199→close422–448MiB/최종469MiB로 초기 회수 미입증. [경계·원시 receipt·재개](waveform-phase-profile.md). 다음은 parse CPU/할당·live worker heap·종료 후 잔류 구분이며 대표 프로젝트/물리 renderer 수용은 남는다.

## 최신 F1C — 2026-10-06

현재 enum 준비 중 취소의 ready link/metadata 잔류를 보완했다. 관련26 PASS/타입 검사·개발 빌드 exit0. 실제 run-5rYxEQ에서 로딩 중 tab 닫기/재열기·두 custom editor4회·다른 reader 정확한 조회·9/9 실제 worker exit·SHA 불변, receipt passed=true/host exit0. [재현·검증 한계](waveform-cancel-lifecycle-acceptance.md).

RSS 초기202MiB→닫은 뒤338–412MiB이며 최종433MiB로 초기 회수 미입증. host loop max900.20ms는 임시200ms를 넘었으므로 성능 수용 미완료. 다음은 startup/파일 read/parse/metadata/webview/종료 구간별 계측·warm 조건에서 지연 분리다. 전체 workbench·대표 사용자 설계·물리 Cancel을 완료로 표시하지 않는다. 아래 F1B는 이전 측정 근거다.

현재 제품 상태·실행 순서는 [전체 로드맵](project-roadmap.md), 최신 결과는 [PROGRESS](../PROGRESS.md)가 기준이다. 아래 기록의 날짜와 시험 범위를 유지하며 최신 기능 구현을 A3/F 전체 수용 완료로 간주하지 않는다.

갱신: 2026-10-04. 현재는 **F1 측정·F1B 자동 수명 검증 완료, A3/F 전체 수용 진행 중**이다. D3B2의 첫 integral module port/VCD GUI 범위는 구현했으며, 새 D4/E 기능보다 이 문서의 열린 조건을 우선한다. 최종 제품은 독립 RTL IDE이고 extension은 현재 검증 호스트다. 배포 VSIX 생성·설치는 사용자 준비 판단 후 별도 요청 때 진행한다.

## 최신 F1B — 반복 사용과 두 화면 닫기

중복/오류 경합의 `WaveformSession.dispose`를 수정했다. 첫 호출이 요청을 닫은 직후 두 번째 호출이 돌아가던 것을 같은 worker 종료 promise를 기다리도록 바꿨다. 실제 worker exit를 기다리는 회귀를 추가하여 일반138 PASS/0 fail/skip, typecheck/build 통과(.dev/f1-lifecycle-unit.log).

4,096신호 두 reader8회 반복에서 불량 reload/재시도, 조회가 대기 중인 상태에서 중복 닫기, 반대 reader의 값 조회/재읽기와 최종 종료를 확인했다.16/16 worker exit, 원본 SHA 불변, 종료 후 RSS 약522~525MiB로 첫 cycle 대비 마지막+0.94MiB, 부모 heap+0.28MiB였다. **누적 증가를 관측하지 않았지만 메모리가 처음의 약55MiB로 돌아온 것은 아니다.** allocator/GC와 실제 사용 환경의 수용 판단은 계속 열려 있다. 증거: .dev/f1-lifecycle.log, .dev/scale-tests/lifecycle-kCgJq7/report.json, .dev/waveform-lifecycle-latest.json.

실제 VS Code에서 파형 custom tab과 구조 webview를 각각 닫고 다시 열어 살아 있는 반대 view의 reader와 커서가 유지됨을 확인했다. run-N3IrdK receipt passed=true/peerCloseReopen=true, 기존 보존/include 값/손상/복원과 두 native PASS(.dev/f1-lifecycle-vscode-final.log).

실제4,096신호 custom editor를3회 열고 닫아 신호/전이 수·큰 정수 종료 시간·unlinked standalone 경계·문서 정리·SHA 불변을 확인했다. run-rc8U1S receipt passed=true/mediumWaveform=true, 열기1.92/2.16/2.22초, host event-loop max31.69ms, 닫은 후 extension-host RSS328/326/356MiB(강제GC 없음). 전체 workbench 메모리/물리 zoom·pan·검색·캔버스 검증은 아니다. 첫 run-RpWAvM은 test cwd를 저장소로 가정하여 fixture를 못 찾았고, extensionPath 기준으로 보완한 최종 run이 통과했다(.dev/f1-medium-vscode-final.log).

computer-use 초기화/창 조회는 가능했으나 격리 개발 창을 제어 가능한 창으로 찾지 못했다. 실제 키 입력은 하지 않았고 사용자 창의 trust/security 설정도 변경하지 않았다. 검증 전용 숨은 개발 프로세스만 명령줄로 식별하여 정리했다. 사용자 답변: **현재 별도 Windows PC/VM 없음**. 깨끗한 OS 설치 종단은 환경 확보 전 보류/미검증이며 기존 도구 성공으로 대체하지 않는다. 다음 수용 절차는 [물리 입력·화면 체크리스트](manual-acceptance.md)를 따른다.

재현은 기존 규모 측정 후 `node --expose-gc scripts/verify-waveform-lifecycle.mjs`(또는 `npm run verify:waveform-lifecycle`)다. 실제 medium host는 기존 `VSCODE_EXECUTABLE` 설정과 `RTL_MEDIUM_WAVEFORM_TEST=1`로 `node scripts/test-vscode.mjs`를 실행한다. recorded 분기를 쓰는 경우 medium flag를 제거한다. medium 분기는 simulation/semantic suite를 대신하지 않는다.

## 사용자가 확정한 규모와 측정 범위

초기 베타는 **RTL 수백 파일·파형 신호 수천 개**를 기준으로 한다. 실제 사용자 설계 경로는 아직 제공되지 않았다. 이번 결과는 생성한 반복 가능한 입력과 실제 도구를 사용한 측정이다. 신호 개수만으로 규모를 보장하지 않는다. 전이 수·비트 폭·시간 길이·활성 view 수와 elaboration 복잡도가 비용을 결정한다. 복잡한 macro/include/package, 실제 전체 설계의 시뮬레이션 빌드 시간과 GUI 렌더링은 이 baseline에서 측정하지 않았다.

Windows x64, Intel i5-1155G7 2.50GHz에서 측정했다. 파형 Node v24.19.0, native suite Node v24.18.0, 기존 pyslang11.0.0/Python3.14.7 환경이다. 머신/실행 부하에 따라 숫자는 변하며 아래 시간은 단일 최종 실행의 관측값이다.

## F1 파형 reader 측정

| 신호 수 / 전이 수 | 동시 reader | 읽기 | 값 조회 p95 | window 조회 p95 | 최고 process RSS |
|---|---:|---:|---:|---:|---:|
| 256 / 16,384 | 1 | 123ms | 0.72ms | 3.90ms | 78.30MiB |
| 4,096 / 786,432 | 2 | 1,242ms | 2.77ms | 11.17ms | 640.95MiB |
| 8,192 / 983,040 | 1 | 1,350ms | 5.46ms | 9.82ms | 489.08MiB |

각 case는 별도 새 Node 프로세스에서 실행한다. 8-bit channel, X/Z, Number 안전 정수 범위를 넘는 시작 tick9007199254740993을 사용한다. 4,096 case는 구조/파형 두 reader를 동시에 사용하는 비용의 근사다. reader 수의 근사이지 두 webview를 실제 띄운 측정은 아니다. 값100회/window30회, 각32개 신호를 확인하며 width800px의 전체 구간과 정확한 cursor 값을 대조한다. 최대 window 응답은289,902bytes, host event-loop 최대 지연37.09ms였다.

RSS는 **부모+worker threads의 전체 프로세스 최고 값**이다. fixture 원본 Buffer, 조회 결과, 잘못된 reload와 정상 재시도의 이전/새 데이터 할당도 포함한다. fixture 생성 후 부모 GC를 한 번 수행해 생성 중 임시 문자열 영향을 줄였으며 worker GC는 강제하지 않는다. 부모 heapUsed는 worker heap이 아니다. VS Code 전체 메모리/두 view steady state/닫은 뒤 회수량으로 해석하지 않는다. RSS는10ms 간격 표본과 마지막 표본의 최고 값이므로 짧은 순간 peak를 놓칠 수 있다.

읽기30초, values p95 100ms, window p95 250ms, host event-loop 최대200ms, window payload4MiB를 **임시 로컬 관찰 기준**으로 기록했으며 이번에는 모두 이 범위였다. 제품의 확정 SLA/다른 PC의 CI 시간 제한/메모리 수용 판정은 아니다. `passedCorrectness`는 기능 assertion, `withinProvisionalTargets`는 이 임시 시간/전달량 기준으로 나눴다.

개선: VCD parser가 매 신호마다 같은 BigInt 시간을 문자열로 만들던 것을 시간 marker마다 한 번 만들어 공유하도록 변경했다. 선행0 정규화, 같은 tick 최종 값과 불필요한 edge 제거, dumpvars tick0, 큰 시간의 정확성을 일반 회귀로 검증했다. 동일 격리 조건의 변경 전4,096/two-reader는1,472ms/700.57MiB였다. 변경 후 반복 관측은 약1.20~1.24초/633~641MiB였다. 고정 비율 개선 보장은 아니며 **현재641MiB peak의 수용성과 반복 회수 검증은 열려 있다**.

잘못된 내용의 정상 SHA reload는 실패하고 이전 값 조회도 차단됐다. 정상 bytes 재시도로 X/Z와 값이 복원됐다. 최대 case를 별도 reader에서 세 번 읽다가150ms 후 dispose했고, 매번 pending 상태임을 확인했다. 취소 완료 최대13.64ms, 종료 후 조회는 closed 오류이며 파형 SHA는 그대로였다. 특정 parser 지점에 도달했다는 증거나 물리 Stop 버튼 검증은 아니다. 매우 빠른 머신에서150ms 전에 완료하면 pending assertion이 실패하므로 취소 지연을 조정하되 성공 완료를 취소로 기록하지 않는다.

## 실제 언어 도구 측정

`tests/semantic/scale.test.ts`는 서로 다른 parameter 폭을 가진256개 RTL파일과 top, 총257 source/instance를 생성한다. 한국어·공백 경로를 사용하고 저장 소스와 미저장 overlay를 실제 slang으로 분석한다.

| 동작 | 최종 관측 | 기능 확인 |
|---|---:|---|
| 저장 설계 hierarchy | 1,113ms | 256자식, 마지막 포트32bit, error 없음 |
| 다른 파일 미저장 overlay 분석 | 1,015ms | 해당 포트16bit, 저장 파일 불변 |
| pending provider job 취소 | 285ms | reject, scratch cache 비움 |
| 취소 후 재시도 | 843ms | 저장 기준32bit 복원 |

pre-aborted 요청도 확인했다. 진행 중 취소는100ms 후에도 provider promise가 pending인 것을 확인한 뒤 abort한다. 실제 native parse instruction 도달 여부를 계측하지 않는다. 최종 재시도 후 입력 지문이 처음과 같고 임시 semantic job directory가 남지 않았음을 확인한다. provider spawn/입력 복사/출력 변환까지 포함하는 시간이며 compiler 내부 시간이나 자동 추천 팝업 응답 시간이 아니다. **증분 분석·persistent compiler·semantic cache를 새로 구현한 것은 아니다.**

## 검증 근거와 재현

- 일반137 PASS/0 fail/skip: `.dev/f1-unit.log`; TypeScript check/development build 통과.
- 파형: `.dev/f1-waveform-final.log`, `.dev/waveform-scale-latest.json`, `.dev/scale-tests/waveform-0PfKkS/report.json` 및 case JSON/VCD. `passedCorrectness=true`.
- 변경 전 격리 비교: `.dev/f1-waveform-before.json`, `.dev/f1-waveform-baseline.log`, `.dev/scale-tests/waveform-py5g5i/report.json`. 초기 누적 프로세스의 waveform-ObK4IK는 탐색 기록으로만 유지하며 비교표에 사용하지 않는다.
- 실제 slang 관련2 PASS/0 skip: `.dev/f1-semantic-scale.log`, `.dev/semantic-scale-latest.json`, 생성 프로젝트 `.dev/scale-tests/semantic-한글 gHOVer`.
- 실제 보존/include VS Code: `.dev/f1-recorded-vscode.log`, `.dev/vscode-tests/run-bkh3j8/project/.rtl/extension-test.json`: passed=true, 두 native runs PASS/ready, recordedValues/sharedCursor/traceInvalidation 및 source/package/include/trace flags 모두true, host exit0. 기존 보존 구조 값/커서·손상 차단/복원을 parser 수정 후 확인했다. 작은 GUI fixture이며 중간 규모 화면 수용은 아니다.
- 이번 CLI/full GUI/all-native suite는 별도 재실행하지 않았다. 이전 날짜 근거는 verification의 D3B2 등에 유지한다. 새 도구 설치·다운로드·VSIX 생성 없음.

개발자 재현용이며 사용자 IDE 작업 흐름에 명령 입력을 요구한다는 뜻은 아니다. 파형 측정은 먼저 build한다.

```powershell
node scripts/build.mjs
node scripts/verify-waveform-scale.mjs
# npm을 사용할 수 있으면 build 후 npm run verify:waveform-scale
```

이미 설치된 언어 도구의 경로를 지정한다. 테스트는 없으면 skip하므로 실제 native 검증은 skip0을 확인한다.

```powershell
$env:RTL_SEMANTIC_PYTHON="$PWD/.dev/rtl-dev/tools/slang-11.0.0-python-3.14.7/python.exe"
node node_modules/tsx/dist/cli.mjs --test tests/semantic/scale.test.ts tests/semantic/hierarchy.test.ts
```

생성 fixture/보고서는 개발 저장소의 `.dev/`에 남겨 비교와 재현에 사용한다. 테스트용 RTL 프로젝트 안의 semantic scratch는 `.rtl/semantic-cache`에만 생성되고 성공/취소 후 비워진다. 실제 사용자 프로젝트를 수정하거나 임의 이력을 정리하지 않는다.

## 남은 gate와 다음 실행 순서

| 항목 | 현재 상태 | 다음 확인 |
|---|---|---|
| F1 재현 가능한 중간 규모 reader/native 기반 | 첫 범위 완료 | 실제 대표 설계의 복잡도/전이/폭을 별도 기록 |
| F1/F2 메모리·반복 수명 | 자동 첫 범위 통과, 회수 수용 열림 | 두 reader8회/16 exit·peer 유지·실제 두 화면 닫기 통과; 높은 post-close RSS의 실제 프로젝트 수용 판단 |
| A3 실제 사용자 프로필 | 미완료 | 일반 개발 실행에서 module/package/case Tab, begin Tab→Enter/직접 Enter, dot 포트·인자 팝업, RTL Start Run/Stop/결과, 두 화면 Time/Go/커서 이동 |
| F 중간 규모 GUI 수용 | 실제 editor lifecycle 통과, 물리 화면 미완료 | 4,096신호3회 실제 여닫기 통과; 신호 검색/선택·zoom/pan/edge·시간 이동, 구조 탐색/값 전달, 가독성 |
| F 원본·저장 호환성 | 부분 검증 | 합성 입력 지문 보존·기존 손상/복구 회귀 통과; 실제 프로젝트 보기 preset/이력/설정의 반복 보존과 업그레이드 수용은 별도 |
| F3 깨끗한 Windows GUI 설치 | 환경 없음, 보류/미검증 | 사용자는 별도 PC/VM이 현재 없다고 답함. 확보 후 승인/거절·네트워크 실패/재시도·기존 도구 재사용→두 테스트→파형, PATH 변경 없음 |
| 첫 베타 패키징 | 아직 진입 전 | 위 필수 gate 통과와 사용자 준비 판단 후 요청에 따라 진행 |

다음 담당자는 A3 실제 입력/팝업/버튼 및 중간 규모 화면 수용을 진행한다. 자동 수명 검증을 반복 확대하려면 새 결함/실제 설계 차이 등 이유를 먼저 기록한다. 공유 parsed trace를 고려할 때는 Core 검증 bytes/hash, run/input/trace identity, ref-counted 종료, 손상 broadcast, 새/늦은 응답 차단을 그대로 보존해야 한다. RSS가 즉시 줄지 않는 것만으로 leak이라고 판단하지 않고 종료 worker 수와 live heap/반복 추이를 함께 확인한다. 깨끗한 OS는 별도 환경 확보 후 확인하며 격리된 자동 API 검증을 물리/깨끗한 OS 완료 근거로 대체하지 않는다.

D4 클럭 재생, E MAC/연산 모델, FST 내장 reader, 독립 host/자체 compiler 전체는 이 gate 이후 로드맵을 따른다. 현재 기능의 beta 안정성 확보가 다음 우선순위다.
