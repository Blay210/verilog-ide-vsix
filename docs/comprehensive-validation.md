# 현재 구현 종합 검증 — 2026-10-04

판정: **현재 지원 범위의 자동 회귀·실제 도구·editor host 검증 통과. 물리 사용성·깨끗한 OS·실제 설계 수용은 미완료.** 새 D4/E 기능보다 남은 수용 항목을 먼저 처리한다. 독립 RTL IDE는 최종 목표이며 현재 extension 호스트에서 검증했다. VSIX 생성·설치·새 도구 설치는 수행하지 않았다.

이번 검증은 변경 부분만 확인하던 이전 검증을 확장하여 일반 전체 suite, 실제 slang 전체 suite, 실제 Verilator 전체 통합 suite, 전체 GUI·보존 GUI·도구 경로/다중 프로젝트 GUI·중간 파형 GUI, 같은 프로젝트의 CLI를 실행했다. 처음 발견한 실패도 아래에 남겼으며 최종 통과로 덮어 지우지 않았다.

## 구현·검증 표

| 영역 | 이번 확인 | 판정 / 남은 범위 |
|---|---|---|
| 설정·source 검색 | manifest 오류, glob/중복/순서, package 의존 순서, include, Windows 공백·한글 경로 | 지원 계약 통과. 중첩 프로젝트·top 최소 source graph는 별도 |
| lexical 편집 | module/package/case/class/fork 등 템플릿, begin Enter/Tab, closer·주석·문자열·들여쓰기·Undo | 일반+실제 editor API 통과. 물리 Tab/Enter 배정과 타 확장 충돌 미검증 |
| 의미 분석 | 미연결 포트·scope/package 추천, module/parameter/function/task 안내, 미저장 변경·scope 가림·테스트 문맥 분리·임시 파일 정리 | 실제 slang12 및 실제 host 통과. class/object/system call·모든 type/value 문맥은 범위 밖 |
| 분석 준비 상태 | 도구/설정/source 상태, 오류 후 갱신, restart | 실제 host/API 통과. 사용자 프로필의 실제 팝업 발견성 미검증 |
| 실행·결과 | 개별/전체/현재/tag/선택 대상, 제한된 병렬, 로그·이력·입력 지문, 실패/취소/timeout | 실제 native/GUI 통과. GUI7결과: 성공5·의도한 FAIL1·cancelled1 |
| 파형 생성 | VCD/FST/none, dump 누락, assertion/$fatal, 컴파일 오류 | 실제 native 통과. GTKWave 화면 조작은 이번에 재검증하지 않음 |
| 내장 파형 | reader 정확도/X/Z/큰 정수 시간·window/edge, malformed reload 차단·복구·취소, 실제 custom editor 정리 | 일반/worker/실제 host 통과.32MiB/1,000,000전이 제한, 내장 FST/live 미지원 |
| 테스트별 저장 보기 | 여러 보기·기본 지정·이름 변경·삭제·취소 보존·다른 run 재사용·손상 schema | 모델/host mock 통과, 실제 결과 preset key 연결 통과. 실제 저장 대화상자/프로필 재시작 수용 미검증 |
| 계층·구조 | parameter/generate/array/연결, 내부 탐색·경로·뒤로/앞으로/상위·소스 이동 | 실제 slang/GUI 통과. 실제 캔버스 가독성·큰 구조 탐색 수용 미검증 |
| 보존 실행·trace | 당시 source/package/configured literal include, manifest 없는 분석, readonly 소스, 정확한 port 매핑·커서 동기화·다른 run 격리·손상/복구·peer 닫기 | 실제 native/보존 GUI/CLI 통과. dynamic/외부/상대-only include·모든 내부 신호/FST 매핑은 별도 |
| GUI·CLI 일치 | 같은 프로젝트와 입력 지문에서 개별/all PASS, 실패 exit1, matching→changed, 보존 hierarchy/trace·파형 손상 exit1 | 최종 CLI receipt 통과. 물리 Ctrl+C의 CLI exit130은 이번 별도 검증 없음 |
| 도구·다중 workspace | 수동 도구 경로 A/B·검증 캐시, semantic 비활성 상태의 빌드, 중복 test 이름의 root 격리 | 실제 GUI3 PASS. 같은 기존 바이너리를 다른 경로로 접근했으며 다른 compiler 버전 교체는 아님 |
| 설치 오류·보존 | 로컬 HTTP 다운로드 취소/재시도·오류/해시 불일치 후 잠금 정리·승인 거절 모델 | 일반 suite 통과. 공식 네트워크 장애/새 OS에서 완전 GUI 설치 성공은 별도 |
| 중간 규모 | 생성 RTL256+top, VCD4,096 두 reader/8,192 한 reader, 반복8회/16 worker exit, 실제4,096 editor3회 | 합성 입력 자동 범위 통과. 실제 설계·메모리 회수 제품 수용 미완료 |
| 색상·아이콘 | grammar/언어/아이콘 기여 설정 관련 회귀 | 자동 구성 범위. 테마별 시각 수용·semantic token coloring은 미완료/미구현 |

통과는 위에 적은 지원 범위다. 일반+native+editor API 통과를 사용자의 물리 키 입력/캔버스/깨끗한 OS 통과로 표시하지 않는다. 자료 저장은 `.rtl/`로 유지했으며 CLI 검증의 임시 manifest 이동·source/trace 변경은 finally에서 복원했고 복원 상태도 확인했다. simulator는 사용자 RTL의 임의 외부 파일 쓰기까지 격리하는 sandbox가 아니다.

## 발견한 문제와 보완

| ID | 발견 내용 | 보완 / 최종 확인 |
|---|---|---|
| AUD-FIXTURE-TS-1 | 전체 GUI fixture가 생성한 base_pkg/count_pkg에 시간 단위가 없었다. Verilator 실행은 성공했지만 같은 실행의 CLI 보존 hierarchy는 slang MissingTimeScale로 exit1/roots=[]였다. 이전 전체 GUI에는 package 실행 후 보존 구조 확인이 없었다. | tests/vscode/suite.ts의 두 package에 DUT/TB와 같은 timeunit1ns/timeprecision1ps 추가. package 성공 실행 후 보존 구조 roots/trace ready assertion 추가. 새 전체 GUI 및 같은 지문의 CLI 보존 분석 최종 통과. 잘못된 옛 archive는 변경하지 않음. 실제 사용자 소스 자동 수정/진단 억제도 없음 |
| AUD-HELP-2 | 구현된 rtl trace 명령이 CLI 기본 도움말에서 누락 | 도움말에 usage 추가, 새 build의 직접 CLI 출력 확인(.dev/audit-cli-help.log). 낮은 영향의 안내 수정이며 simulator/Core 동작 변경 없음 |

첫 전체 GUI run-qblct1 자체는 성공5/의도한 FAIL1/취소1로 통과했지만 후속 CLI 보존 분석이 위 fixture 결함을 드러냈다. `.dev/audit-cli.log`, `.dev/audit/cli-receipt-before-fix.json`의 실패를 유지한다. 수정된 새 run-krwREi의 최종 GUI와 CLI를 완료 근거로 사용한다.

## 실제 실행 근거

| 검증 | 최종 결과 | 근거 |
|---|---|---|
| TypeScript / development build | 통과 | build와 최종 typecheck; VSIX 없음 |
| 일반 전체 | 138 PASS, fail/skip0 | .dev/audit-unit.log |
| 실제 slang 전체 | 12 PASS, fail/skip0 | .dev/audit-semantic.log |
| 실제 Verilator 전체 | 13 PASS, fail/skip0 | .dev/audit-integration.log(8 subtests 포함) |
| 전체 editor host 최종 | receipt passed=true/exit0, GUI7결과 | .dev/audit-full-vscode-final.log / .dev/vscode-tests/run-krwREi/project/.rtl/extension-test.json |
| 보존/include host | receipt passed=true/exit0, native2 PASS | .dev/audit-recorded-vscode.log / run-deQoAI/project/.rtl/extension-test.json, recordedValues/sharedCursor/traceInvalidation/peerCloseReopen 모두true |
| 경로·다중 workspace host | receipt passed=true/exit0, native3 PASS | .dev/audit-tools-vscode.log / .dev/remaining-validation/host-JdlchZ/project-a/.rtl/extension-test.json |
| 중간 규모 editor host | receipt passed=true/exit0, 실제3회 여닫기 | .dev/audit-medium-vscode.log / run-uv8IAh/project/.rtl/extension-test.json |
| CLI GUI 대조 | passed=true, 같은 입력 지문·새 PASS3/의도한 FAIL1 | .dev/audit-cli-final.log / .dev/audit/cli-receipt.json |
| 파형 규모 / 반복 수명 | passedCorrectness=true,16/16 exit·원본 SHA 보존 | .dev/audit-waveform-scale.log / waveform-SPMS7L/report.json, .dev/audit-lifecycle.log / lifecycle-YK4poq/report.json(둘 다 .dev/scale-tests 아래) |

CLI 최종 실행 승인 검토가 한 번 시간 초과되어 실행되지 않았고 허용된 한 번의 재시도 후 실행/검증을 완료했다. 안전성 거절이나 미완료 승인으로 남아 있지 않다.

중간 규모 수치는 합성 설계의 로컬 관측이다. 실제 GUI/native 검증과 일부 동시에 실행하여 부하가 있으므로 이전 단독 측정과 개선/퇴행 비율로 비교하지 않는다.4,096/two-reader 읽기2.09초·값p95 5.98ms·host event-loop max68.35ms·peak process RSS637MiB,8,192 읽기2.04초/494MiB, 로컬 임시 시간 기준 모두 통과. 반복8회 후 RSS 첫 cycle 대비 마지막+3.78MiB, 부모 heap+272,472bytes; 초기 수준으로 메모리 복귀를 증명하지 않는다. 실제4,096 custom editor 열기1.99/1.85/1.89초·host event-loop max72.22ms, 종료 후 host RSS317/346/321MiB(강제GC 없음). 전체 VS Code와 worker heap을 이 숫자로 혼동하지 않는다.

## 남은 조건과 다음 순서

1. **A3 실제 사용자 프로필**: module/package/case Tab, begin Tab→Enter/직접 Enter, dot·package 추천·인자 팝업, RTL Start Run/Stop/결과의 물리 동작과 타 확장 충돌. [체크리스트](manual-acceptance.md)에 아직 미검증으로 남아 있다.
2. **실제 화면과 설계 수용**: 중간 설계의 검색/선택·zoom/pan/edge·구조 내부 탐색·값 가독성, 대표 trace의 전이·폭·길이에 따른 한계와 높은 post-close RSS 수용 판단. 자동 editor lifecycle은 이 단계를 대신하지 않는다.
3. **설정/보기의 사용자 경험**: 실제 저장/기본 보기 대화상자와 앱 재시작 후 복원, 사용자 테마의 색/아이콘·접근성. 모델 보존 검증과 분리한다.
4. **깨끗한 Windows GUI 설치**: 사용자는 별도 PC/VM이 없다고 답함. 환경 확보 전 보류/미검증이며 새 tool store의 과거 성공은 대체 증거가 아니다.
5. 위 필수 조건과 사용자 준비 판단 후 첫 베타 패키지를 별도 요청에 따라 준비한다. 다음 큰 기능인 D4 기록 클럭 재생/E 제한된 내부 연산 모델은 검증 결함을 보완하고 남은 수용을 정리한 뒤 진행한다.

중대한 새 제품 실행 결함은 이번 자동 회귀 범위에서 발견하지 않았다. 그러나 전체 안정화/실사용 품질을 완료로 선언하지 않는다. 메모리 plateau와 실제 사용자 설계·물리 화면은 계속 검증해야 한다.

## 개발자 재현

```powershell
node node_modules/typescript/bin/tsc --noEmit
node scripts/build.mjs
node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
$env:RTL_DEV_HOME="$PWD/.dev/rtl-dev"
$env:RTL_SEMANTIC_PYTHON="$PWD/.dev/rtl-dev/tools/slang-11.0.0-python-3.14.7/python.exe"
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/semantic/*.test.ts
$env:RTL_INTEGRATION='1'
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/integration/*.test.ts
```

GUI suite 실행 전 medium/recorded/include/package/toolpath/editor-only flag를 제거하여 의도한 분기를 명시한다. `VSCODE_EXECUTABLE`에 기존 Code.exe 경로를 지정하고 scripts/test-vscode.mjs(전체/recorded/medium), scripts/test-vscode-tools.mjs(경로/다중 프로젝트)를 사용한다. 세부 branch 설정은 stability-validation과 이전 handoff에 있다.

CLI 대조는 **종료된 전체 GUI fixture에만** `node scripts/verify-cli-regression.mjs .dev/vscode-tests/<새 run>/project`를 사용한다. helper는 격리 fixture 경로만 허용하며 의도한 테스트/manifest/파형 변경을 복원한다. 최초 GUI 결과를 기준으로3 PASS+의도한 FAIL1을 추가하므로 매번 새 전체 GUI fixture를 사용한다. 실제 사용자 프로젝트에 이 검증용 변경을 적용하지 않는다.
