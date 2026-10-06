# F1V 합성 중간 규모·취소·메모리 회복 검증 (2026-10-06)

F1U 이후 합성 중간 규모의 reader 수명과 자연 메모리 회복을 재검증했다. 사용자 실제 프로젝트 경로는 요청했으며 아직 제공되지 않았다. 따라서 대표 사용자 설계 검증 완료는 아니다. 제품 코드/캐시/파서 구조를 변경하지 않았고 검증 계측만 추가했다. VSIX 생성/설치와 examples/counter 변경은 없다.

## 검증 계측 변경

tests/vscode/waveform-lifecycle.ts에 RTL_WAVEFORM_MEMORY_TEST=1 진단을 추가했다. 로딩 중 닫기 이후의 baseline 및 두 reader를 닫은 각 cycle에서 0.25/1/3초 자연 idle 표본을 수집한다. 최종에는 1/5/15초 idle을 추가한다. 매 표본에서 실제 살아 있는 worker=0 및 custom document=0을 검사한다. host 강제 GC를 수행하지 않는다.

RSS는 extension-host와 worker threads를 포함하며 workbench 전체 메모리가 아니다. heapUsed는 부모 heap이다. fixture bytes와 진단 Worker 기록이 호스트에 남아 있고, 마지막 파일 SHA 확인도 새 파일 읽기 버퍼를 할당한다. 따라서 idle 표본과 최종 afterMemory를 섞어 해석하지 않는다.

rssReturnedWithin16MiBOfBaseline은 관측용 band이며 보편적인 출하 기준이 아니다. passed는 기능/정리 검사 결과다. 종료9/9만으로 메모리 누수가 없다고 단정하지 않는다.

## 실제 VS Code 실행

VS Code 1.140.0/extension-host Node24.21.0. 기존 4,096신호·786,432변화 VCD를 격리 프로젝트 .rtl에 복사하여 두 custom editor를 4회 열고 닫았다. 첫 파일은 loading 중 tab API로 닫은 뒤 동일 데이터를 재열었다. peer의 정확한 zzzzzzzz 값과 metadata/기록 실행 비혼입을 검사하고 모든 worker exit 및 원본 SHA를 확인했다. 물리 Cancel 버튼 검사는 아니다.

재현: VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe, RTL_DEV_HOME=D:/Dev/verilog_ide/.dev/rtl-dev, RTL_WAVEFORM_PROFILE_TEST=1, RTL_WAVEFORM_MEMORY_TEST=1, node scripts/test-vscode.mjs. 다른 검증용 모드 flag는 설정하지 않는다. 기존 .dev/waveform-scale-latest.json의 fixture가 필요하다.

초기 run-oCTg2m은 최종 15초 대기 추가 전 실행이다. 기능/정리 PASS/host exit0/9 worker exit/SHA 유지. baseline217.21MiB→마지막 cycle 3초 뒤309.85MiB로 약92.64MiB 높았다. baseline 회복 PASS가 아니다. 이 결과 때문에 최종 15초 표본을 추가했다.

최종 계측 첫 실행 run-3Vah4m: 기능/정리 PASS/host exit0/9 worker exit/SHA 유지. baseline221.30MiB, sample peak417.30MiB, 마지막 cycle 3초 뒤310.30MiB, 최종 5초310.30MiB→15초191.06MiB. 강제 GC 없이 baseline 아래로 회복했다. 부모 heap은 baseline51.11→최종41.29MiB. 이후 SHA 읽기를 포함한 afterMemory227.26MiB는 idle 표본과 별개다. open1개1.28–1.68초, close+exit38.1–62.1ms. 측정 phase loop max176.29ms이며 startup/cancellation setup을 제외한다. 이전900ms 원인을 해결한 근거는 아니다.

최종 계측 재현 run-IbaFF2도 기능/정리 PASS/host exit0/9 worker exit/SHA 유지. baseline222.17MiB→마지막 cycle 3초335.00MiB→최종5초335.00MiB→15초193.31MiB로 자연 회복을 재현했다. 부모 heap51.86→41.29MiB, phase loop max52.59ms. 두 최종 실행이 모두 관측 band 안으로 회복했지만 즉시 회복/영구 누수 부재/모든 부하 수용을 보장하지 않는다. 최초 3초만의 미회복 결과를 삭제하지 않는다.

각 native 근거는 .dev/vscode-tests/run-*/project/.rtl/extension-test.json의 idleMemorySamples/memoryRecovery, startedWorkers/exitedWorkers, pendingCloseRecovered 및 sourceHashPreserved다. 최종 15초 회복 두 실행은 총18 reader를 생성/종료했다. 초기 3초 검사는 별도9 reader 근거다. 독립 reader 검사와 수치를 합산하여 한 GUI 실행의 결과로 쓰지 않는다.

## 독립 reader 및 RTL 분석 검사

node --expose-gc scripts/verify-waveform-lifecycle.mjs: lifecycle-MmaqaA 8cycle, created16/exited16, correctness PASS/exit0/SHA 유지. 정상 재열기·손상 reload 후 unready/재시도·대기 window 요청 중 dispose·살아 있는 peer 값 유지 검사. 첫 종료 표본 이후 최종 RSS 증가0.98MiB, 부모 heap 증가259.82KiB. 이 harness는 부모 GC를 수행하지만 worker GC를 강제하지 않는다. VS Code 자연 회복과 같은 측정 조건으로 합산하지 않는다. 최종 RSS367.14MiB이며 initial baseline 회복을 보장하지 않는다.

RTL_SEMANTIC_PYTHON=D:/Dev/verilog_ide/.dev/rtl-dev/tools/slang-11.0.0-python-3.14.7/python.exe로 tests/semantic/scale.test.ts: 1 PASS/skip0/exit0. 생성 RTL256파일+top1파일/257instance, 한글·공백 경로, 실제 slang hierarchy1.410초, 미저장 width overlay1.299초, 진행 중 취소287.63ms, retry1.065초. saved input fingerprint 불변, semantic cache scratch cleanup 확인. 이 역시 합성 설계다.

관련 취소·연동·worker 회귀23 PASS/0fail/skip, TypeScript --noEmit 및 native 개발 build exit0. 회귀 파일: waveform-cancel-host, waveform-link-host, trace-links, waveform.test. 전체 테스트 갱신을 뜻하지 않는다.

## 다음 단계와 남은 판정

대표 사용자 설계/장시간 부하/전체 workbench RSS와 물리 Cancel은 별도 수용 조건이다. 실제 프로젝트가 제공되면 원본 수정 없이 복제한 입력으로 분석하고 출력은 격리 .rtl에 둔다. 프로젝트 경로 부재를 합성 통과로 대체하지 않는다.

자연 idle baseline 회복은 제한된 관측으로 기록하며 모든 종료 시점/장시간 반복에 동일하다고 보장하지 않는다. pan/zoom full-query 지연, 이전900ms 지연 원인, physical Esc/OS DPI, 외부 linter 정상 동작 시 diagnostics 충돌/사용자 snippets·추가 프로필, 깨끗한 Windows 보류도 유지한다. 새로운 큰 기능보다 이 잔여 수용 범위를 먼저 점검한다.
