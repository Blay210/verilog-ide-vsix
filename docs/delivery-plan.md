## 최신 실행 지점 — F1X 스터디 비공개 베타 (2026-10-06)

사용자 승인으로 0.3.1 VSIX/CLI/새 예제/안내 ZIP 배포를 준비했다. 정식 stable·독립 앱이 아니다. 전체184 PASS(초기 오래된 DOM 참조2 FAIL 수정)/타입 검사·build, 실제 VSIX 격리 설치 및 설치 폴더 native 편집/semantic/두 PASS/내장 파형·보존 구조 ready/host exit0, 배포 CLI check·두 PASS·hierarchy exit0와 GUI/CLI 결과 일치를 확인했다. 언어 빠른 재시작의 pending changes TypeError가 발견돼 알려진 제한으로 남긴다. 깨끗한Windows/대표사용설계·장시간/프로필·일부 실제입력 게이트는 유지한다. 다음은 스터디 설치·실사용 피드백 수집 → 언어 재시작 경쟁 및 중단 오류 우선 수정 → 0.3.x 회귀 검증이며, 후속 U12/독립 앱은 기존 순서를 따른다. [수용·발견 문제·재현](private-beta-acceptance.md), [설치 안내](private-beta-guide.md). 이전 VSIX 금지/미배포 기록은 당시 상태이며 이번 명시적 배포 요청이 우선한다.

> 2026-10-05 정리: 현재 구현 상태와 다음 실행 순서는 [제품 전체 로드맵](project-roadmap.md)이 기준이다. 아래 기존 체크포인트/계획은 날짜별 근거로 보존하며, 예전 '다음 작업' 문구는 최신 순서를 대체하지 않는다. 최신 작업은 [PROGRESS](../PROGRESS.md)를 확인한다.

# 통합 실행 계획 — 2026-09-30

## 최신 순서 — 2026-10-06

F1W 실제 progress Cancel 버튼 검증 통과(run-odiLDS): 테스트 전용20초 load dispatch 지연에서 native 클릭으로 target reader 종료·document 제거, 기존 peer 값 유지, 정상 재열기/값 복구·3/3worker exit/SHA/host exit0 확인. 관련4 PASS/타입 검사·개발 build 통과. [실제 조작·제한 조건](waveform-physical-cancel-acceptance.md). 제품 코드 변경 없음. 일반 parse 중 물리 취소 latency/전체 안정화 수용은 아니며 실제 입력/Escape·프로필 잔여 및 대표 설계·장시간/깨끗한Windows 게이트를 유지한다.

F1V 합성 중간 규모 취소·메모리 회복 검증: 4096신호 두 reader의 native loading중 닫기/peer 보존/4cycle/worker9개 종료/SHA 검증 통과. 최종15초 자연 idle 두 실행에서 RSS baseline221–222MiB→191–193MiB 회복을 재현했다. 초기3초 미회복도 보존한다. 독립8cycle16reader exit, 256RTL파일 분석·실행중 취소/재시도1 PASS, 관련23 PASS/타입 검사·개발 build 통과. [근거·측정조건·제한](waveform-memory-recovery-acceptance.md). 제품변경 없음. 다음 물리 Cancel 조작·취소 복구와 잔여 입력/프로필 수용, 실제 설계 경로 제공 시 대표 프로젝트 검증. 전체 규모·메모리 수용/깨끗한Windows 완료는 아니다.

F1U 기본 사용자 편집 설정과 설치된 Verilog HDL 1.29.0을 격리 복제해 editor/semantic native 검사 통과(run-22Vp8d), 실제 module/package/begin Tab 및 begin Enter의 내용·커서 검증 통과(run-MmeiXH), 두 host exit0. 11 lexical PASS/semantic unit7 SKIP/타입 검사·개발 build 통과, 원본 설정 SHA 유지. 외부 linter는 PATH의 실행 파일 미발견으로 동작하지 않았으므로 정상 외부 diagnostics 충돌은 미검증이다. [근거·범위·재현](editor-profile-acceptance.md). 다음 대표 규모·loading 취소·두 reader 메모리 복구, 편집 프로필 잔여는 별도로 유지한다.

F1T 보존 결과·구조·파형 경계 재검증: 관련 32 PASS/타입 검사·개발 build 통과. 실제 VS Code run-Mpz1Al에서 package/include를 포함한 두 시뮬레이션, 보존 소스/구조/값·양방향 커서·닫기/재열기·손상 차단/복구 통과, host exit0. 별도 generate/array/escaped·한글/공백 경로 Core/worker 실제 검사 1 PASS. 제품 변경 없이 late values 무효화 회귀를 추가했다. [근거·초기 대기·지원 범위](recorded-boundary-acceptance.md). 다음 실제 사용자 편집 프로필 충돌→대표 설계·loading 취소·두 reader 메모리 복구. 전체 안정화/배포 완료는 아니며 깨끗한 Windows 보류는 유지한다.

F1S 기본cursor 실제drag/zoom/pan/하단scroll·Reload/값/SHA/native exit0 확인. 다음 열린안정화3묶음중retained 구조·파형 연동경계→실제사용자프로필→대표규모·메모리복구. [제한된실제범위](waveform-cursor-physical-acceptance.md). viewport변경지연 및전체게이트유지.

F1R cursor-only 기본적용/혼합viewport·real/wide/zero/error 검증완료(42 PASS/typecheck/build/native8exit/SHA/latest/Reload복구). 다음 실제연속cursor·확대/이동 UI반응성 확인. [범위와남은게이트](waveform-cursor-reuse-acceptance.md). 아래후보미적용순서는과거다.

F1Q cursor-only 검증후보 및 동일fixture A/B 완료(41 PASS/3native 각각8exit/SHA/latest/Reload복구). 일반사용은아직원본경로. 다음 혼합viewport·resize/reorder 및real/wide/zero/error 경계검증 후기본채택판단. [근거·후보flag](waveform-cursor-reuse-candidate.md).

F1P 조회/전달계측 완료(40 PASS/typecheck/build/두native8exit/SHA). 다음 동일viewport cursor-only 제한재사용 후보를 원본과 비교하고 최신·Reload/취소·peer/값을 보존한다. [측정과후보계약](waveform-transport-profile.md). 전체성능/RSS/대표설계게이트유지.

F1O 제한된 native shortcut/overflow/폭 정렬·2분 이후 진단 수용 완료. 관련39 PASS/typecheck/build/native exit0. [실제 범위](waveform-native-layout-acceptance.md). 다음 dense query/전달 비용을 조사하며, 전체 안정화/대표설계/프로필/RSS 게이트는 유지한다. 아래 F1L native잔여 문구는 과거 순서다.

F1M 사용자교정의 절대시간눈금/긴값두줄을 적용, 관련6 PASS/타입 검사·빌드 exit0. 상대눈금은기본으로사용하지않는다. [계약](waveform-absolute-time.md). 다음실행은아래F1L native잔여→dense전달순서를유지한다.

F1L group/Esc/resize·DPR/rowcount bundled 회귀·host shortcut modifier guard 보완, 관련37 PASS/타입 검사·빌드 exit0. 실제 Shift그룹mouse이동/label앱zoom관찰·SHA/host exit0. 다음최종container Ctrl+-/일반shortcut·overflow/right-cursor resize native마무리 후dense query/전달계측. OS DPI/physical Esc/대표설계/RSS게이트유지. [미검증구분](waveform-interaction-regression.md). 아래 F1K는 이전 순서다.

F1K ruler/trace 동일scroll surface 정렬·큰원점 상대눈금·viewport paint 및reveal/Reload위치 복원 완료. 관련35 PASS/타입 검사·빌드 exit0, native8exit/latest/peer/SHA 및실제cursor/scroll/panel폭/Reload 확인. 다음그룹이동/Esc/overflow/resize·DPI 정렬 회귀와dense 전달비용. 전체성능/실제설계/RSS 게이트유지. [계약과초기실패](waveform-viewport-alignment.md). 아래 F1J는 이전 순서다.

F1J160행 실제 scroll/zoom/reorder/cursor/Reload 검증 완료. 32부모/128bit oracle·Reload 상태 equality/SHA/host exit0, 관련31 PASS/타입 검사·빌드 exit0. 다음 visible-row 비용 계측과 scroll/reveal/resize/Reload 안전한 후보 검증, Reload 세로위치/라벨 가독성 후속 개선. 물리 그룹이동/Esc/빠른 입력·실제 설계/RSS 게이트 유지. [재현](waveform-physical-ui.md). 아래 F1I는 이전 순서다.

F1I bounded 경계/좌표 재사용·query/draw subphase·20연속/Reload 중 닫기 복구 완료, 관련31 PASS/typecheck/build exit0/run-Qv9vJv8exit/peer/SHA/host exit0. 다음160행 물리 scroll/zoom/drag, 필요 시 visible-row/transport 비용 계측. offscreen 값과 reveal redraw/latest/Reload 복구 보존. dense 약239ms/RSS·실제 설계 게이트 유지. [근거](waveform-dense-recovery.md). 아래 F1H는 이전 순서다.

F1H 최대32부모+128bit/활동 범위·dense/zoom·Reload/peer/close 기능 검증 완료 및 draw1초 보완. 최종 run-a7v4rO draw45.9–188ms/모든 값·복원 equality/4exit/SHA/host exit0, 관련29 PASS/typecheck/build exit0. 다음 dense query200.2ms와 draw188ms 비용 분리·bounded 후보 비교, 연속 요청/Reload 중 취소/물리 조작 검증. RSS/실제 프로젝트 게이트 유지. [재현·한계](waveform-render-stress.md). 아래 F1G는 이전 순서다.

F1G actual webview request/draw/frame계측완료, 관련28 PASS/typecheck/build exit0/run-risLLx8editor/32sample/24probe/9exit/peer/SHA/host exit0. 기본8신호 querymedian7.75ms/draw4.65ms/firstframe기회62.1–97.7ms. 다음32부모+128bit/활동viewport·dense zoom·reload/close UI스트레스. 픽셀표시/물리조작/RSS회수/실제설계게이트는아직열림. [계측정의](waveform-render-profile.md). 아래 F1F는이전순서다.

F1F bounded short-value 공유 적용/원본후보24worker 동일digest·SHA/관련26 PASS/typecheck/build exit0. 반복자료31.6% 감소·parse중앙값+8.1% 절충, 실제 run-w4sxss4cycle/9exit/peer/SHA/host exit0. native RSS 초기 회수 미입증. 다음 renderer first-ready/canvas frame·실제 webview query RTT를 editor open/직접workerquery와 분리 계측한다. [범위·근거](waveform-value-reuse.md). 아래 F1E는 이전 순서다.

F1E CPU/할당·live worker heap 계측 완료.5worker exit/전체digest·SHA 보존/관련24 PASS/타입 검사·개발 빌드 exit0. retained 증가56.878MiB, 해석 후 값공유 진단17.937MiB 감소, 자료해제 기준선+0.117MiB. 제품 parser/worker 최적화는 아직 없고 native RSS/renderer 판정은 열려 있다. 다음 제한된 per-parse 값공유 후보를 원본·고유값 많은 wide 입력과 비교해 예산/속도/불변성을 검증한다. [근거·재현](waveform-parser-profile.md). 아래 F1D 순서는 이전 기록이다.

F1D 구간별 계측·관련24 PASS/타입 검사·개발 빌드 exit0. 실제 run-hA0nMr4cycle/9exit/원본 불변, read4–10ms/parse716–958ms/open828–1118ms/warm loop max41.88ms.900ms는 이번 미재현/원인 미규명, RSS 초기 회수 미입증. 다음은 F parse CPU/할당·live heap으로 저장 비용과 allocator 잔류를 구분한다. [범위와 다음 순서](waveform-phase-profile.md). 아래 F1C 직후 안내는 과거 기록이다.

F1C 취소 잔류 보완·관련26 PASS/타입 검사·개발 빌드 exit0. 실제 두 editor4cycle·9/9 worker exit·peer 조회/원본 불변·host exit0는 기능 정리 수용이다. 메모리 초기 회수와 host 지연900.20ms 수용은 미완료. 다음은 F의 구간별/warm 지연 분리 계측이다. [범위와 재개](waveform-cancel-lifecycle-acceptance.md). 아래 U05 직후 순서는 당시 기록이다.

U05 보존 enum 파형 표시 1차 구현, 관련52 PASS/native1 PASS/실제 화면 및 Reload 커서 보완 수용/타입 검사·개발 빌드 exit0. [범위와 미지원](waveform-enum-acceptance.md). 다음은 A3/F의 loading 취소/복구·두 reader 실제 host 메모리 관측부터 남은 대표 규모/사용자 프로필/기록 구조 경계를 검증한다. 큰 검증3묶음+깨끗한 Windows 별도 보류1 유지. U12 후보 탐색은 제안, D4/E/H/I는 미구현. 아래 오래된 순서를 최신 순서로 간주하지 않는다.

## 최신 체크포인트 — 버스 비트 펼치기·묶음 이동 수용

2026-10-05: 버스 ▸/▾로 개별 bit 표시, 선언 방향/인덱스·X/Z·정확한 시간 투영과 저장 보기/편집기 상태 복원을 구현했다. 32부모+최대128 추가 bit 행; 원본 worker 채널을 추가하지 않는다. 자식은 부모 아래 고정 순서이며 독립 정렬/Edge/스타일은 후속. 실제8bit 펼침/접힘, 두 신호 범위 선택(Shift+Space) 후 묶음 drag, 보기 저장·Reload 복원 및 cursor4.556ns 유지 확인. Ctrl/Shift+마우스는 자동 이벤트 범위.

관련32 PASS/0 fail/skip, 타입 검사·개발 빌드 통과, 격리 개발 창 exit0. [구현·제한·검증 이력](waveform-bits-acceptance.md). VSIX/설치 없음. 다음 구현 enum 상태 이름 표시 → RTL 실행 화면 UX → 기존 대표 설계/loading 취소/두 reader 메모리 등 안정화 검증 재개. 큰 검증3묶음+깨끗한 Windows 별도 보류1 유지; 전체A3/F 완료 아님.

## 최신 체크포인트 — 파형 UX 정렬·눈금 개선

2026-10-05: 사용자 피드백을 우선 반영해 파형 행 X/위아래 버튼을 제거했다. 신호 포함/제외는 Signals에 통일하고 Ctrl/Shift 선택·그룹 드래그, 좁은 이름 열, 1/2/5 간격 큰/작은 눈금을 구현했다. 기본 HTML drag는 실제 화면에서 이동되지 않아 pointer capture 경로를 보완했다. 실제 clk 마지막 이동 및 cursor 4.556ns/4신호 유지 확인. Ctrl/Shift 물리 조합·그룹 이동/재시작은 아직 자동 이벤트 검증 범위다.

관련29 PASS/0 fail/skip, 최종 타입 검사·개발 빌드 통과, 두 개발 창 exit0. 합성 VCD 화면 수용이며 native 실행 완료로 세지 않는다. VSIX/설치 없음. [7개 요구·수용·후속 설계](waveform-ux-plan.md). RTL Start 재배치·비트 펼치기·enum 이름 표시 미구현. 다음은 다중 선택 물리 수용 → 비트 펼치기 → enum → 실행 화면 UX, 이후 남은 대표 설계/loading 취소/두 reader 메모리 등 검증 재개. 큰 검증3묶음+깨끗한 Windows 별도 보류1 유지; 전체 A3/F 완료 아님.

## 최신 체크포인트 — 구조 상태 표시·보기 관리 취소 수용

2026-10-05: 실제 parser/mapTracePorts/renderStructure 기반 합성 개발 화면에서 X/Z·Not recorded·Ambiguous path·Width mismatch·Unsupported type 구분과 표의 전체 문구를 확인했다. 검증용 보기의 기본 지정/해제, 이름 입력 취소, 덮어쓰기 확인창 Cancel, 삭제 확인창 Cancel 후 원래 보기·두 신호·11ns 유지를 실제 확인했다. 구조 호스트의 정확한 X/Z 채널만 조회/잘못된 binding 미조회/손상 후 전체 Unavailable 회귀 및 보기 취소의 전체 storage 불변 assertion을 추가했다.

최종 관련28 PASS/0 fail/skip, 타입 검사·개발 빌드 및 최종 두 검증 창 exit0. 제품 코드/설치/VSIX 변경 없음. [범위·fixture 준비 실패 이력·증거](structure-states-management-acceptance.md). 합성 rendering 수용은 native/보존 archive 종단 X/Z 성공이 아니며 물리 삭제 확정은 실행하지 않았다.

남은 큰 검증3묶음: 기록 자료 기반 구조 종단/남은 세부 경계, 실제 사용자 프로필 충돌, 실제 대표 설계/loading 취소/두 reader 메모리 회수. 깨끗한 Windows는 별도 PC/VM 없음으로 보류1. 다음은 loading 취소·재열기와 두 reader 실제 호스트 메모리 관측이며 전체 A3/F 완료가 아니다. 검증 이후 파형 UX 사용자 피드백을 반영한다.


## 최신 체크포인트 — 구조 내부 탐색·파형 예외·보기 갱신 보완

2026-10-05: 실제 보존 run의 DUT 더블 클릭/Up 이동, 독립 합성 파형의 X/Z 표시와 보존 구조 시간 비혼입, 보기 이름 변경·누락 1개 안내·누락 상태 새 저장 뒤 두 신호 복원을 실제 확인했다. 다른 파형 탭에 새 보기 목록이 Reload까지 반영되지 않던 A3-WAVE-VIEW-SYNC-1을 보완했다. 같은 테스트의 열린 패널에 목록을 통지하며 현재 신호·커서·보기를 강제 변경하지 않는다. 수정 후 실제 두 탭에서 Reload 없는 새 보기 반영 및 두 신호/11ns 유지 확인.

최종 관련27 PASS/0 fail/skip, 타입 검사·개발 빌드 및 두 개발 창 exit0. 앞선25/집중7은 반복 실행으로 합산하지 않는다. [상세 수용·증거·재개](structure-wave-edge-ui-acceptance.md). VSIX/설치 없음.

남은 큰 검증3묶음: 구조 X/Z·미기록/모호한 연결과 관리 예외의 남은 물리 수용, 실제 사용자 프로필 충돌, 실제 대표 설계/loading 취소/두 reader 메모리 회수. 깨끗한 Windows 별도 보류1(PC/VM 없음). 독립 합성 파형 X/Z를 보존 구조 X/Z 수용으로 세지 않는다. 다음은 남은 구조·관리 경계이며 파형 UX 개선은 검증 후 사용자 피드백을 받는다. 전체 A3/F 완료가 아니다.


## 최신 체크포인트 — 탭/CRLF·파일 간 package·분석 상태 수용

2026-10-05: 격리 VS Code1.140.0 실제 입력으로 탭/CRLF begin Tab→Enter·각 Undo·직접 Enter, module 이름→포트→본문 Tab 이동을 확인하고 저장 바이트의 탭/CRLF 보존을 검사했다. 다른 파일의 미저장 EXPORTED→UPDATED 선언 변경이 consumer의 package 추천에 반영되고 Tab 수락/Ready 복구됨을 확인했다. 디스크 EXPORTED 보존 근거도 기록했다. Disabled/Tools missing 표시와 복구 메뉴, 기존 도구 경로 복원·Retry→Ready를 실제 확인했다.

관련 자동20 PASS/0 fail/skip, 타입 검사·개발 빌드 및 개발 창 exit0. 제품 코드/설치/VSIX 변경 없음. 설정 변경은 격리 fixture 파일에서 준비했으며 사용자 설정 토글 화면 수용으로 세지 않는다. [범위·근거·재개](editing-edge-ui-acceptance.md).

남은 큰 검증3묶음: 구조 X/Z·미기록/Up/double-click 및 저장 보기 관리/누락 신호 등 세부 예외, 실제 사용자 프로필 충돌, 대표 실제 설계/loading 취소/두 reader 메모리 회수. 깨끗한 Windows는 별도 환경 없음으로 보류1. 다음은 구조·저장 보기 예외의 실제 화면이며 파형 UX 개선은 검증 이후 사용자 피드백을 받는다. 전체 검증/A3/F 완료가 아니다.


## 최신 체크포인트 — 실행 예외 화면 수용·F5 연결 보완

2026-10-05: 격리 VS Code1.140.0 지속 저장 개발 창에서 컴파일 오류 FAIL/진단 로그 열기, 준비 중 도구 검증 Stop, g++ 빌드 중 Stop, 하위 프로세스0개 및 취소 후 F5 재실행 PASS를 확인했다. 등록된 TB에서 F5가 일반 디버거를 열던 A3-RUN-F5-1을 보완했다. 활성 파일/manifest 갱신으로 TB 컨텍스트를 계산하고 편집기에 초점이 있는 등록된 Verilog/SystemVerilog TB에만 연결한다. 일반 DUT에서 기존 디버거 안내 유지도 실제 확인했다.

관련 자동18 PASS/0 fail/skip(기존16+활성 파일/manifest 갱신·현재 TB 실행 경계2), 최종 타입 검사·개발 빌드 통과. 실제 정상 실행3 PASS, 의도한 컴파일 실패1, 준비/빌드 취소2. 빌드 Stop 두 번의 늦은 클릭은 PASS로 끝났으므로 취소 성공으로 세지 않는다. 수정 전후 개발 창 exit0. [상세 근거·남은 범위](execution-detail-ui-acceptance.md). VSIX/설치 없음.

남은 큰 검증3묶음: 편집/도구/구조·저장 보기 세부 예외, 실제 사용자 프로필 충돌, 대표 실제 설계/loading 취소/두 reader 메모리 회수. 깨끗한 Windows 별도 보류1(사용 가능한 PC/VM 없음). 다음은 탭/CRLF·파일 간 package 변경·분석 비활성화/도구 누락, 이어 구조 X/Z·미기록/Up/double-click와 저장 보기 관리 예외다. 전체 A3/F 또는 모든 검증 완료가 아니다. 파형 UX 개선은 검증 후 사용자 피드백을 받는다.


## 최신 체크포인트 — Windows 빌드 종료 지연 보완

2026-10-05: MSYS Perl/셸 경로에서 제한 신호가 제때 발생해도 빌드가 계속되는 결함을 계측 재현했다(1500ms 제한→16425ms, 빌드 취소→16215ms). Windows 도구 검색을 공식 verilator_bin.exe 직접 호출로 바꿨고 비교에서1819ms 시간 초과/406ms 취소 및 정상 PASS를 확인했다. 기존190465/229258ms의 전체 지연은 계측이 없으므로 단일 원인으로 단정하지 않는다. [재현·보완·한계](timeout-termination-validation.md).

검증: Core/프로세스10 PASS, 실제 native10 PASS, 종료 뒤 Windows 프로세스 잔존 검사 강화 회귀1 PASS(중복 실행), 모두0 fail/skip 및 exit0. typecheck/development build 통과. VCD/FST·무한 실행 취소/시간 초과·공백/한글 경로·reset 복구 정상. 전체 suite/slang/물리 GUI Stop 검증을 새로 완료한 것으로 세지 않는다. VSIX/설치 없음.

남은 큰 검증3묶음 및 깨끗한 Windows 별도 보류1 유지. 다음은 실제 GUI 컴파일 실패 결과·준비/빌드 중 Stop·F5, 이어 편집/도구/구조 세부 예외, 실제 사용자 프로필 충돌, 대표 실제 설계/loading 취소/두 reader 메모리 회수다. 전체 A3/F·베타 배포 준비 완료가 아니다.


## 최신 체크포인트 — 저장 보기 복원·격리 수용 완료

2026-10-05: 같은 지속 저장 개발 프로필의 실제 UI에서 원본 basic의 두 보기 재시작/전환(3신호·2신호), 다른 TB의 Custom-only 목록, 동명 프로젝트·테스트의 별도 기본 보기 저장 및 재시작(1신호), 원본 두 보기/기본 설정 비혼입을 확인했다. 두 개발 창 exit0. 관련 회귀5 PASS/0 fail/skip, typecheck/development build exit0. 제품 코드/VSIX/설치 변경 없음. [범위·근거·이전 중단 기록](waveform-isolation-acceptance.md).

남은 큰 검증3묶음: 세부 예외·실행 안정화, 실제 사용자 프로필 충돌, 대표 실제 설계/파형 loading 취소/두 reader 메모리 회수. 깨끗한 Windows 별도 보류1. 다음 우선 작업은 비교 사본 CLI의60000ms 제한 대비190465/229258ms timedOut 결과 기록 원인 재현과 종료 경로 점검이다(원인 미확정, 로그 보존). 관리 대화상자/모든 예외·전체 A3/F·배포 준비 완료로 확대하지 않는다. 아래 중단/4묶음 기록은 재개 전 이력이다.


## 최신 체크포인트 — 저장 보기 격리 검증 중단

2026-10-05: rQSqPW 지속 저장 프로필에서 기존 기본 카운터★/3신호 복원과 리셋과 결과/2신호 두 번째 보기 저장을 실제 확인했다. 다른 TB·프로젝트 격리와 두 보기 재시작 복원은 미완료. 비교용 새 사본의 CLI 두 테스트는60000ms 제한에 대해 실제190465/229258ms 후 timedOut/exit1; 원인은 미확정이며 실행 시간 제한/종료 재검증 필요. 비교 fixture를 이전 정상 native 실행 사본으로 전환하고 첫 개발 창 exit0 후 사용자 물리 Escape로 Computer Use가 중단되어 추가 GUI 조작을 멈췄다.

[중단 기록 및 재개 순서](waveform-isolation-acceptance.md). 재개 실행기 .dev/launch-wave-isolation.mjs, 다중 프로젝트 .dev/wave-isolation.code-workspace, 동일 기존 프로필. 제품 코드/VSIX/설치 변경 없음. 이번 새 typecheck/build/회귀 PASS 주장 없음. 남은 큰 검증4묶음과 깨끗한 Windows 별도 보류1은 유지한다.


## 최신 체크포인트 — 보존 구조·파형 연동 수용과 배치 보완

2026-10-05: VS Code1.140.0 격리 지속 저장 개발 창에서 보존 top→dut/Back/Forward·정의 소스 이동, 구조25ns↔파형35ns의 시간/포트 값 동기화, 두 화면 각각 닫기/재열기와 다른 run5ns의 시간 격리를 실제 키·마우스로 확인했다. 파형을 닫아도 구조15ns/count1 조회 유지, 구조를 닫아도 파형35ns/count3 조회 유지. 구조를 계층 목록에서 재열면 안내된 Refresh가 필요하며 재연결 후35ns 복구를 확인했다.

발견한 A3-WAVE-LAYOUT-1: 좁은 화면 또는 Signals 숨김에서 main이 폭0 grid 열에 자동 배치되어 파형이 사라짐. main을 두 번째 열/첫 행에 고정하고 실제 좁은 화면 및 넓은 화면의 browser 숨김에서 시간축/세 신호/값 표시를 재검증했다. 관련31 PASS/0 fail/skip, 최종 typecheck/development build 및 수정 전후 창 exit0, 주 VCD SHA256 일치. 새 native 실행/전체 suite/VSIX/설치 없음. [실제 수용 기록](structure-ui-acceptance.md).

남은 큰 검증4묶음: 다른 TB·프로젝트 저장 보기 격리/두 보기 재시작, 세부 예외(탭/CRLF·파일 간 package·도구 누락/비활성화·컴파일 오류/빌드 Stop/F5 및 구조 X/Z·미기록/Up/double-click), 실제 사용자 프로필 충돌, 대표 실제 설계/파형 loading 취소/두 reader 메모리 회수. 개별 테스트 개수 아님. 깨끗한 Windows는 별도 PC/VM 없음으로 별도 보류1. 다음 주 작업은 저장 보기 격리이며 전체 A3/F·배포 준비 완료 아님.


## 최신 체크포인트 — 자동 안내·scope·Enter 추가 수용

2026-10-05: 격리 VS Code1.140.0 실제 키로 pkg:: 자동 추천, 미저장 EXPORTED→UPDATED 후보 갱신/디스크 보존, 안쪽 scope_arg/inner/local 및 바깥 inner 제외, wildcard import 후보를 확인했다. 함수 ( 첫 인자 및 쉼표 두 번째 인자 자동 강조, if/always/for·주석/문자열 Enter의 블록 강제 삽입 부재와 각 Undo, 상태 메뉴의 RTL Language 로그 열기를 확인했다.

제품 코드 변경/확정 새 결함 없음; typecheck/development build 및 창 exit0. [세부 화면 수용 기록](editing-detail-ui-acceptance.md). 기본4칸/LF 격리 범위이며 탭/CRLF·타 확장/사용자 설정·별도 파일 package 변경·도구 누락/비활성화 화면은 열린 항목이다. 다음 주 작업은 보존 구조 내부 탐색/시간과 파형 동기화→두 화면 독립 수명→다른 TB·프로젝트 저장 보기 격리, 이어 사용자 프로필 및 실제 설계·메모리. 전체 A3/F 완료 아님; 깨끗한 OS 보류, VSIX/설치 없음.



## 최신 체크포인트 — 인자·package·기본 편집 화면 수용

2026-10-05: 격리 VS Code1.140.0 지속 저장 개발 창에서 function 두 번째 인자의 string/default, task output int, parameter int WIDTH=8 안내를 실제 화면으로 확인했다. implicit .clk/.rst_n 제외 후 count만 추천, package EXPORTED/helper/word_t 추천 및 Tab 수락을 확인했다. Source errors→Ready 복구, Language Status 메뉴/Retry 접근과 기존 end 중복 없는 Enter/한 단계 Undo, 주석·문자열의 일반 Tab/Undo도 확인했다. 초기 팝업 부재는 분석 완료 후 정상 표시되어 제품 결함으로 확정하지 않았다.

제품 코드 변경/새 결함 없음; typecheck/development build 통과, 개발 창 exit0. 근거는 [편집 화면 수용 기록](editing-ui-acceptance.md). 함수/parameter와 package는 명시적 안내 요청, task/implicit 포트는 실제 괄호/점 자동 트리거다. 모든 자동 트리거 완료로 확대하지 않는다. 다음은 if/always/for·주석/문자열 Enter·미저장 package 변경/import/중첩 scope 및 나머지 상태 화면, 이어 구조·시간/두 화면·저장 보기 격리와 실제 사용자 프로필/설계·메모리. 전체 A3/F 완료 아님; 깨끗한 Windows 보류, VSIX/새 설치 없음.



## 최신 체크포인트 — RTL Start 실행·취소 버튼 실제 수용

2026-10-05: VS Code1.140.0 격리 지속 저장 개발 창에서 테스트 선택/선택 실행/단일 Run/전체 Run All, 결과 로그·내장 VCD 열기 및 결과 재실행을 실제 키·마우스로 확인했다. native 정상6 PASS와 의도한 failed/timedOut/cancelled 각1을 기록했다. 실제 Stop 후 사본 경로의 하위 프로세스 부재 및 reset 재실행 PASS를 확인했다. 첫 Stop 시도는 입력 전에 시간 초과됐으므로 별도 취소 성공으로 세지 않았다.

새 제품 결함/제품 코드 변경 없음. 사용자 변경 예제를 보존하고 Core 템플릿으로 사본을 준비했다. typecheck/development build 통과, 개발 창 정상 종료 exit0, 생성물 사본 .rtl/ 내 확인. 근거는 [실행 버튼 수용 기록](execution-ui-acceptance.md). 전체 A3 완료 아님; 컴파일 실패 화면/준비·빌드 중 Stop/F5·사용자 프로필은 미수용. 다음은 남은 기본 편집/implicit 포트/parameter·function/task/package scope/분석 상태의 물리 화면, 이어 구조·시간/다른 TB·프로젝트 저장 보기 격리 및 실제 설계·메모리. 깨끗한 Windows는 별도 환경 없음으로 보류; 새 D4/E·VSIX/설치 없음.



## 최신 체크포인트 — 4,096신호 화면 수용·눈금 가독성 보완

2026-10-05: 격리 지속 저장 개발 창에서 4,096신호/786,432전이의 검색·마지막 신호 선택, 큰 정수 시간 이동/Edge, 확대·축소·좌우 이동·드래그 구간 확대, 두 커서 Δ, 범위 밖 시간 오류/복구를 실제 키·마우스로 확인했다. A3-WAVE-RULER-1의 긴 눈금 글자 겹침을 측정 폭 기반 배치로 보완하고 시간 입력에 Go 버튼을 추가했다. 정확한 BigInt 시간/원본 SHA와 기존 조회·저장 보기 경계를 유지한다.

검증: 관련24 PASS/0 fail/skip, typecheck/development build 통과; 수정 전후 개발 창 exit0. 합성 standalone 화면의 부분 수용이며 전체 A3/F·실제 설계/메모리·사용자 프로필 완료 아님. 근거/열린 항목은 [중간 파형 수용 기록](medium-waveform-acceptance.md). 다음은 RTL Start의 테스트 선택/Run/Stop/결과/재실행 버튼 실제 수용, 이어 남은 편집·저장 보기 격리/구조 연결 및 사용자 프로필. 깨끗한 Windows는 별도 환경 부재로 보류; 새 D4/E·VSIX/설치 없음.


## 최신 체크포인트 — 테스트별 파형 보기 저장·재시작 수용

2026-10-05: 격리 개발 창에서 한글 이름의 두 보기 저장/전환, 기본 지정, 선택 변경 표시를 실제 키·마우스로 확인했다. 지속 저장 개발 프로필에서 기본 보기 3신호가 창 재시작 및 새 CLI native 실행 결과에서도 복원됐다. extension test 모드의 메모리 저장 제한을 확인하여 실행기에 RTL_MANUAL_PERSISTENT/RTL_MANUAL_RESUME_ROOT를 추가했다. 제품 파형/Core 변경 없이 검증 실행기를 보완했다.

검증: typecheck/development build 및 관련 회귀5 PASS, native 예제 총5 PASS. 검증용 창 정상 종료 exit0. 전체 suite/전체 A3 완료 아님; 두 보기 모두의 재시작·다른 TB/프로젝트 물리 격리·GUI Run/Stop 수용은 남는다. 근거와 재현은 [저장 보기 수용 기록](waveform-view-acceptance.md). 다음은 4,096신호 실제 검색/선택/zoom/time 화면, 이어 남은 편집·실행/사용자 프로필 및 실제 설계/메모리 수용. 깨끗한 Windows는 별도 환경 없음으로 보류; VSIX/설치 없음.


## 최신 체크포인트 — A3-EDIT-OPEN-1 포트 추천 복구

2026-10-04: 미완성 인스턴스의 실제 slang 범위가 다음 source buffer로 넘어가 커서가 인스턴스 밖으로 처리되는 문제를 보완했다. 컴파일러가 확인한 인스턴스의 끝 범위를 원래 파일 EOF로 제한한다. 또 manifest test top에서 도달하지 않는 새 모듈은 모든 module의 기본 elaboration에서 누락된 source 위치만 추가한다. 실제 selected-top 시그니처는 우선 유지하고 generated/shared 위치의 서로 다른 타입은 기존 ambiguity 차단을 유지한다. 원본 파일/진단/계층/시뮬레이션 입력을 수정하지 않는다.

초기 관측 정정: 선택된 TB가 마지막 source buffer인 단순 EOF 문맥은 slang 자체가 이미 복구했다. 모든 EOF가 파서 실패였던 것은 아니다. 회귀 테스트에서 다음 파일로 넘어가는 end.file/end.offset을 직접 관측하여 원인을 확정했다. tests/semantic/recovery.test.ts는 closer 없음/괄호만 있음/endmodule 있음, parameter override, 한글·emoji UTF-16 offset, 미연결 제외, 새 모듈의 폭11과 .data( 인자 안내, 저장 소스 보존을 검사한다. tests/vscode/semantic.ts는 실제 LSP의 EOF . 추천·.tally( 안내를 추가 검증한다.

검증: 실제 slang13 PASS/0 fail/skip(.dev/port-recovery-semantic.log), 실제 editor/semantic/structure/waveform host run-qKTkGA receipt passed=true/editor=true/exit0(.dev/port-recovery-vscode.log), typecheck/development build 통과. 실제 키 검증 run-xtSwWB(VS Code1.140.0 격리 개발 프로필)에서 새 ui_probe의 닫는 구문 없는 EOF에 점 키를 눌러 count·rst_n Field 팝업과 output logic[7:0] 표시, 이미 연결한 clk 제외를 관측했다. .rtl/manual-input.json에 미저장 text/커서가 기록되어 있다. 정상 stop/exit0이며 manual receipt의 acceptancePassed=false는 전체 A3 수용 완료가 아님을 뜻한다.

다음 순서: 저장된 테스트별 파형 보기의 실제 UI/재시작 수용 →4,096신호 검색/선택/zoom/time 화면 → 사용자 프로필 충돌·실제 설계/메모리. parameter·function/task/package scope의 전체 물리 수용은 아직 남고, 깨끗한 Windows 종단은 별도 환경 없음으로 보류다. 이번에 전체 일반/Verilator/full-simulation suite를 재실행했다고 하지 않는다. VSIX/설치 없음. 새 큰 D4/E보다 남은 A3/F 수용을 먼저 진행한다.


## 최신 체크포인트 — A3 실제 키 입력 1차 확인

2026-10-04: computer-use의 실제 Windows 키 입력으로 격리된 VS Code 1.140.0 개발 창을 확인했다. module→Tab→이름→Tab→포트→Tab→본문, package/case 템플릿 필드 이동, begin→Tab(인라인)→Enter 및 begin→직접 Enter(들여쓴 본문/end)가 정상 동작했다. run-6ujQus의 .rtl/manual-input.json에 문서/커서 관측 기록이 있다. 사용자 중단 동안 이 창은 15분 제한으로 종료되어 완료 receipt가 없으며, 이를 수용 실패나 완료로 대신 해석하지 않는다.

재개한 run-bsLVeC에서는 설정된 counter_basic_tb의 미저장 .clk(clk), . 문맥에서 실제 점 키로 count/rst_n만 표시되고 이미 연결한 clk는 제외되는 팝업을 확인했다. Tab으로 count를 수락하고 인자 안내에서 output logic[7:0] count 강조를 확인했다. 이 실행은 정상 stop→exit0이며 extension-test.json의 manualHarness=true는 검증 창 종료만 뜻하고 acceptancePassed=false다. 이 실행 당시 recorder는 scratch만 기록하므로 TB 팝업 근거는 대화의 실제 screenshot/accessibility 관측이다. 이후 recorder를 격리 사본 안의 SV/V 문서로 확대하고 workspace 경로 검증/5,000건 제한을 추가했다.

발견한 제한 A3-EDIT-OPEN-1: 괄호/endmodule가 없는 EOF 작성 중에는 설정된 TB에서도 포트 추천을 관측하지 못했다. closer가 있는 동일 문맥에서는 동작한다. 또 현재 analyze는 manifest test top의 elaborated instance를 사용하므로 테스트에서 도달하지 않는 새 ui_probe 인스턴스는 추천 대상에 없었다. 실제 parser recovery/독립 모듈 편집 지원을 진단·회귀 검증한 뒤 보완할 것; 정규식으로 임의 시그니처를 추정하지 않는다.

개발 전용 RTL_MANUAL_ACCEPTANCE=1 idle harness를 추가했다(tests/vscode/manual.ts). 실행기가 창을 숨기는 원인을 찾아 수동 모드만 visible로 변경했고 자동 모드는 유지했다. 도구는 기존 .dev/rtl-dev, SystemVerilog/4-space lexical fixture, 다른 설치 확장 비활성화. 사용자 프로필 충돌·일반 function/task/parameter/package scope·저장 보기·중간 canvas·깨끗한 OS 수용까지 완료했다는 뜻이 아니다. typecheck 및 개발 build 통과, VSIX/설치 없음. 다음은 A3-EDIT-OPEN-1의 실제 slang 재현/보완 → 저장 보기/중간 파형의 물리 UI → 실제 설계/메모리 수용이다.


## 최신 체크포인트 — 현재 구현 종합 재검증

2026-10-04: 사용자 요청에 따라 새 D4/E 작업 전에 현재 지원 범위 전체를 재검증했다. 일반138/실제 slang12/실제 Verilator13 모두 PASS·fail/skip0, 최종 typecheck/development build 통과. 실제 전체 GUI 최종 run-krwREi(성공5/의도 FAIL1/취소1), 보존/include run-deQoAI(native2), 경로·중복 이름 다중 프로젝트 host-JdlchZ(native3),4,096신호 editor3회 run-uv8IAh 모두 receipt passed=true/exit0. 같은 전체 GUI fixture의 CLI check/개별/all/입력 비교/실패 exit1/manifest 없는 보존 hierarchy·trace/파형 손상 차단도 최종 통과(.dev/audit/cli-receipt.json: 같은 입력 지문·PASS3/의도FAIL1 추가).

발견/보완: AUD-FIXTURE-TS-1 — 전체 GUI fixture의 두 package에 시간 단위가 없어 GUI simulation은 성공했지만 후속 CLI 보존 hierarchy가 MissingTimeScale로 실패했다. fixture에 동일 timeunit/timeprecision을 추가하고 GUI package 실행 후 보존 구조 roots/trace-ready assertion을 넣어 새 run에서 GUI/CLI로 재검증했다. 초기 run-qblct1/CLI 실패는 보존하며 기존 archive나 사용자 소스/진단을 수정하지 않았다. AUD-HELP-2 — 구현된 rtl trace가 기본 도움말에 빠져 usage를 추가하고 build/실제 출력 확인.

중간 규모 reader와 반복8회/16 worker exit·원본 SHA 보존도 재검증했다(waveform-SPMS7L/lifecycle-YK4poq). 동시 GUI/native 부하 조건의 로컬 측정이며 이전 단독 측정과 성능 비율로 비교하지 않는다. 종료 후 높은 RSS의 제품 수용·실제 사용자 설계는 계속 열려 있다. 실제 키 입력/팝업/버튼/타 확장 충돌·캔버스·저장 보기 대화상자/재시작 수용은 자동 host로 대체 완료하지 않는다. 사용자 답변상 별도 PC/VM이 없어 깨끗한 OS 종단은 보류다. 종합 표/전체 근거/발견 문제는 [종합 검증](comprehensive-validation.md), 다음 실제 수용은 [체크리스트](manual-acceptance.md). VSIX/새 설치 없음.

다음 담당자는 이번 전체 suite를 이유 없이 다시 반복하지 말고 **A3 실제 사용자 프로필·중간 규모 화면 및 보기 저장 경험 → 실제 설계/메모리 수용 → 별도 환경 확보 후 깨끗한 Windows 종단**을 진행한다. 아직 첫 베타 준비/전체 제품 안정화 완료는 아니며 큰 D4/E 확장은 위 조건을 먼저 정리한다.

## 이전 체크포인트 — F1B 반복 수명·두 화면 닫기 안정화

2026-10-04: WaveformSession의 중복 dispose가 실제 worker 종료를 기다리지 않던 경합을 수정했다. error로 요청이 먼저 닫힌 경우에도 같은 종료 promise를 기다린다. 4,096신호 두 reader를8회 열기/닫기·불량 reload/재시도·queued 조회 중 닫기로 검증하여16/16 worker exit, 살아 있는 peer의 값/재읽기 및 원본 SHA 보존을 확인했다. 종료 후 process RSS는 약522~525MiB로 plateau였고 첫 cycle 대비 마지막+0.94MiB, 부모 heap+0.28MiB였다. 이는 누적 증가 미관측이며 초기55MiB 수준으로 메모리 회수가 완료됐다는 뜻은 아니다.

검증: 일반138 PASS/0 fail/skip 및 typecheck/build(.dev/f1-lifecycle-unit.log). .dev/scale-tests/lifecycle-kCgJq7/report.json passedCorrectness=true. 실제 보존/include GUI 최종 run-N3IrdK receipt passed=true/peerCloseReopen=true, native2 PASS: 실제 파형 탭과 구조 패널을 각각 닫고 다시 열어 peer reader/커서가 유지됨을 확인했다(.dev/f1-lifecycle-vscode-final.log). 실제4,096신호 custom editor3회 여닫기 run-rc8U1S receipt passed=true/mediumWaveform=true, 열기1.92~2.22초·host event-loop max31.69ms·원본 보존(.dev/f1-medium-vscode-final.log). 최초 medium run-RpWAvM은 테스트 cwd 경로 가정으로 fixture를 못 찾아 실패했고 확장 경로 기준으로 수정해 통과했다.

사용자는 별도 Windows PC/VM이 현재 없다고 답했다. 깨끗한 OS 승인 설치 종단은 환경 확보 전 **보류/미검증**이다. computer-use 초기화/창 관측을 시도했으나 격리 개발 창을 제어 가능한 창으로 찾지 못해 실제 키/캔버스 수용은 미완료다. 개인 프로필 신뢰 설정은 변경하지 않았으며 테스트 전용 숨은 개발 프로세스는 식별 후 정리했다. 다음은 **A3 일반 개발 실행의 물리 입력/추천·팝업·버튼 및 중간 규모 화면 수용**, 실제 프로젝트·메모리 회수 판단이다. F 전체/베타 준비 완료로 표시하지 않는다. CLI/full GUI/all-semantic은 이번에 재실행하지 않았고 VSIX/새 설치도 없다. 상세는 [안정화 검증](stability-validation.md).

## 이전 체크포인트 — F1 중간 규모 측정·취소/복구 기반

2026-10-04: 사용자가 초기 베타 대상 규모를 **RTL 수백 파일·파형 신호 수천 개**로 확정했다. 합의한 A3/F 필수 안정화에 진입했다. 재현 가능한 합성 VCD(256/4,096/8,192신호, 최대983,040전이)와 실제 slang의 생성 RTL256파일+top을 측정하고, 파형의 같은 시각 문자열을 공유하도록 중복 변환/저장을 줄였다. 미저장 폭 변경·진행 중 분석/파형 읽기 취소·실패 후 복구·원본 지문 보존을 확인했다. F1 전체/실제 사용자 설계/베타 수용 완료는 아니다.

최종 근거: 일반137 PASS/0 fail/skip 및 typecheck/development build; 실제 semantic 관련2 PASS/0 skip(.dev/f1-semantic-scale.log); 실제 보존/include VS Code run-bkh3j8 receipt passed=true, native 2 PASS, recordedValues/sharedCursor/traceInvalidation=true(.dev/f1-recorded-vscode.log). 파형 최종 .dev/scale-tests/waveform-0PfKkS/report.json: 4,096신호 두 reader 읽기1.24초·값p95 2.77ms·window p95 11.17ms·최고process RSS640.95MiB. 동일 격리 조건의 변경 전은1.47초/700.57MiB(.dev/f1-waveform-before.json). RSS는 부모+worker·실패 재시도 포함이며 VS Code 전체/worker heap/steady state 메모리가 아니다. 시간 목표는 로컬 임시 기준이다.

다음 순서: **반복 열기/닫기·메모리 회수와 두 view 자원 검증 → 실제 사용자 프로필 A3 입력/팝업/버튼·중간 규모 화면 수용 → 깨끗한 Windows 승인 설치 종단 → 사용자 준비 판단 후 베타 패키지**. 현재 환경으로 깨끗한 OS를 대신하거나 자동 host API로 물리 UI 수용을 대신하지 않는다. CLI/full GUI/전체 native는 이번에 별도 재실행하지 않았고 이전 날짜 근거를 유지한다. 새 설치/VSIX 없음. 재현 방법·전체 측정 표·열린 항목은 [안정화 검증](stability-validation.md)을 먼저 읽는다.

## 이전 체크포인트 — D3B2 보존 구조 값·파형 커서 연결

2026-10-04: 지원된 보존 실행의 integral module port/VCD 범위에서 D3B GUI 연결을 구현했다. 결과의 Explore Recorded Structure에서 카드/표의 포트 관측값을 보고 Time에 `5 ns`처럼 입력하여 Go/Enter로 이동한다. Open linked waveform은 내장 VCD를 명시적으로 열며 cursor A와 양방향으로 시각을 공유한다. current design에는 기록 값을 붙이지 않는다. missing/ambiguous/width-mismatch/unsupported는 추측값 대신 상태/이유를 표시하고 X/Z와 큰 정수 시간은 유지한다.

구현: VS Code API 없는 trace-links.ts가 Core 검증→같은 bytes의 worker SHA 확인→보존 입력 후검증을 조합하고 양쪽 host에 하나의 TraceCursorHub를 공급한다. run/보존 directory/source·trace 지문으로 격리, nonce/세대/값 요청 revision/파형 token으로 늦은 응답 차단, 최대200 표시 포트·32개 조회 batch, 30초 읽기 취소/닫기/reader 정리를 제공한다. 보존 inputs/metadata/파형/상위 디렉터리 watcher는 값을 무효화한다. trace만 손상되면 정상 구조/소스 탐색은 유지하며 파형은 Reload로 다시 열 수 있다. legacy/미지원 VCD는 일반 보기로 남고 FST는 기존 외부 경로다.

검증: 일반136 PASS/0 fail/skip, typecheck/development build 통과(.dev/d3b-gui-unit.log). 실제 보존/include VS Code 최종 .dev/d3b-gui-vscode-final.log / run-fSFRCq receipt passed=true, recordedValues/sharedCursor/traceInvalidation=true, exit0, native 2 PASS. 현재 manifest 없이 원본/package/header가 잘못된 상황의 값 조회·양방향 cursor·다른 실행 격리·파형 손상 차단/복원·기록 입력 손상·현재 모드 전환을 확인했다. 실제 full host .dev/d3b-full-vscode-final.log / run-6MUb5Z receipt passed=true/exit0, 성공5/의도한 실패1/취소1. 초기 full run-KrVsKg는 package preflight 중 취소하여 statuses=[]인데 fixture가 cancelled record를 요구해 실패했다. 시뮬레이션 시작 로그를 기다린 뒤 취소하도록 fixture를 보완한 최종 run은 통과했다. 물리 클릭/캔버스 시각 수용은 아니며 CLI/전체 native suite는 이번에 별도 재실행하지 않았다. VSIX/새 설치 없음.

다음은 합의한 A3/F 필수 안정화다. 새 D4/E 기능을 바로 늘리지 않고 실제 사용자 프로필의 키/추천/인자 팝업·버튼과 커서 시각 수용, 깨끗한 Windows GUI 승인 설치→실행→파형, 실패/취소/재시도와 대표 설계 응답성·메모리·데이터 보존을 점검한다. 아직 베타 패키징 gate 통과는 아니다. D3B의 첫 지원 범위 완료와 전체 제품 안정성을 구분하며 FST/내부 신호 전체/클럭 재생/실제 step/MAC/독립 host는 후속이다.

## 이전 체크포인트 — D3B1 분석·값·커서 기반

2026-10-04: D3B를 나누어 첫 기반 범위를 구현했다. WaveformSession.loadVerified는 Core가 검증한 Uint8Array를 worker에 복사하여 전달하고 worker가 같은 바이트의 SHA256을 다시 확인한 뒤 파싱한다. 파일 경로를 재개방하지 않는다. worker 요청을 순서대로 처리하고 새 load 실패 시 이전 데이터를 지워 과거 값 재사용을 차단한다. values/queryValues는 최대32개 신호의 지정 시간 관측값만 반환하며 전이/viewport를 전달하지 않는다. X/Z·alias·정확한 큰 정수 시간·end=0을 유지한다.

VS Code 독립 TraceCursorHub는 보존 directory(Windows host가 정규화)·run UUID·source fingerprint·trace SHA256이 모두 같은 view만 연결한다. 시간/end/timescale 검증, revision·dispose·invalidation·멤버/그룹 제한을 제공하며 손상으로 무효화된 이전 연결은 새 그룹을 되살릴 수 없다. 이것은 파일 검증/권한 계층이 아니다. host는 Core 검증과 보존 semantic 문맥을 공급하고 파일 변경·취소·늦은 응답을 별도로 처리해야 한다.

검증: 일반128 PASS/0 fail/skip, typecheck/build 통과(.dev/d3b-foundation-unit.log). 실제 Verilator+slang 관련2 tests PASS/0 skip(.dev/d3b-foundation-native.log), .dev/d3b-foundation-native-receipt.json passed=true: 현재 manifest 제거/원본 손상 후 검증 바이트를 worker로 읽어 7개 instance/generate/array/escaped-dot 포트 값 대조, 양방향 커서 모델·다른 프로젝트 격리·무효화 확인. 이번 GUI/CLI host suite/물리 UI는 재검증하지 않았다. D3A GUI/CLI는 이전 날짜 근거다. 새 패키징/설치 없음.

다음은 D3B2 GUI 연결: structure.ts의 보존 문맥에서만 Core loadRecordedInputs/loadRecordedTrace→worker.loadVerified→mapTracePorts로 관측값을 표시하고, waveform.ts와 같은 hub를 공유한다. stale/세대/nonce/revision/취소·닫기·trace/source watcher로 연결과 늦은 응답을 차단하고 missing/ambiguous/width-mismatch/unsupported를 명시한다. 보통/legacy/FST 파형 보기와 현재 구조는 유지한다. 현재 GUI에는 값이나 공유 커서가 아직 없다. D3B 전체 완료로 표시하지 않는다. D3B2 후 A3/F 필수 안정화→사용자 준비 판단 후 첫 베타 패키지→피드백 보완 순서를 유지한다.

## 이전 체크포인트 — D3A

D3A 첫 범위 완료 (2026-10-04): 새 실행은 source snapshot과 run ID에 연결된 waveform hash/size/format을 기록한다. 공통 Core가 변경·교체·다른 run·과거/미지원 trace를 검증하며 정상 로그/파형 보기는 유지한다. waveform의 VS Code 독립 mapTracePorts가 정확한 segmented instance/port 경로로 VCD를 연결한다. bare top/명시적 TOP wrapper, alias, generate/instance array, escaped dot를 지원하며 missing/ambiguous/width-mismatch/unsupported는 값을 추측하지 않는다. 현재 범위는 integral module ports와 ready snapshot의 VCD이며 내부 신호 전체/FST 매핑/GUI 값 표시는 아니다.

검증: 일반122/typecheck/build 통과(.dev/d3a-unit.log), 실제 Verilator VCD+slang hierarchy 관련2 native tests 통과(.dev/d3a-native.log 및 .dev/d3a-native-receipt.json). final native에서 동일 모듈 2개·generate 2개·array 2개·escaped dot의 경로와 값을 확인했다. actual recorded/include GUI run-jzzec5 receipt passed=true/recordedTrace=true/exit0(2 PASS), CLI .dev/d3a-cli-receipt.json은 두 기록 각3 port matched, 현재 manifest 없이 분석·파형 변경/다른 run/legacy 차단을 확인했다. 물리 UI 검증이 아니며 full native/full GUI suite 재실행은 이번에 하지 않았다.

초기 native의 일반 경로는 통과했으나 escaped 이름은 pretty-print hierarchicalPath에 backslash/공백이 남아 missing이었다. semantic instancePath를 compiler symbol.name에서 만들고 array index만 실제 부모와 합쳐 재검증하여 matched로 통과했다. 기존 navigation id/표시 경로는 유지했다. hierarchy port에 기존 signal_type 모델도 공급한다. 매핑 모델 자체는 인증 계층이 아니므로 모든 소비자는 Core loadRecordedInputs/loadRecordedTrace와 archived hierarchy 검증을 거쳐야 한다.

다음은 D3B: 보존 구조의 port 관측값과 waveform 공유 cursor UX. worker가 실제 분석한 bytes와 검증한 trace hash를 일치시키고 current/recorded·run·세대/취소를 분리한다. source/trace 손상 시 값 연결을 차단하며 정상 구조/로그/파형을 가능한 범위에서 유지한다. 이후 새 기능 추가를 멈추고 A3/F 필수 안정화 검증→첫 베타 패키지→실사용 문제 보완→초기 안정 버전 판단 순서다(사용자 합의). 이번에는 VSIX/새 설치를 하지 않았다.


## 이전 체크포인트 — D2B3B

D2B3B configured literal include 보존 완료 (2026-10-04): 프로젝트 내부 `sources.include_dirs`의 순서와 전체 파일 트리를 실행 사본으로 옮기고 빈 configured root도 유지한다. standalone quoted literal include는 첫 configured 경로를 쓰며 하위 경로(`nested/width.svh`)도 지원한다. 사본 package 분석·빌드·기록 구조가 같은 include 사본을 사용한다. 원본 설정/헤더가 바뀌거나 없어도 검증된 보존 구조와 readonly 헤더를 열 수 있다.

지원 경계: 소스/헤더 옆 파일과 첫 configured 결과가 충돌하면 unavailable, configured 경로 없이 source-relative만으로 찾는 경우도 unavailable이다. dynamic/inline/매크로 본문/continued directive·absolute/`..`/backslash 경로·외부 source/include root·symlink/junction 경로는 보존 지원에서 제외하고 기존 실행+이유를 유지한다. 주석/일반 문자열 속 include 텍스트는 더 이상 일괄 차단하지 않는다. inactive includes와 전체 include tree는 보수적으로 관측하여 불필요한 파일도 비교/용량에 포함될 수 있다. 완전한 전처리기나 글로벌 atomic save/tool environment/runtime data 보존은 아니다.

검증: 일반117/typecheck/build, 실제 native 1 test(원본 baseline + VCD/FST 사본 2, 실제 slang hierarchy/port 8-bit 검증), actual VS Code run-rskbus(2 PASS·recordedIncludes=true·receipt passed=true/exit0), CLI 두 기록 matching→changed/현재 manifest 없는 hierarchy 통과. `.dev/d2b3-include-unit.log`, `d2b3-include-native.log`/`.dev/d2b3-include-native-receipt.json`, `d2b3-include-vscode.log`, `d2b3-include-cli.log`/`.dev/d2b3-include-cli-receipt.json`. 초기 native test는 hierarchy에 없는 signalType 필드를 검사해 실패했고, 실제 instance semantic 모델로 폭을 검증하여 통과했다. 물리 UI 수용/전체 native·full GUI suite 재실행과 구분한다.

새 예제: `examples/include-counter` (package 자동 정렬 + 두 configured root의 동일 이름 헤더 + nested include + 2 TB). 폭이 잘못 선택되면 `$fatal`로 실패한다. GUI 재현은 RTL_RECORDED_TEST=1와 RTL_RECORDED_INCLUDE_TEST=1, 기존 scripts/test-vscode.mjs. 다음은 D3A 보존 run/trace 식별·full instance path 매핑의 작은 범위다. ready snapshot이 없는 기존/미지원 실행은 현재 소스에 자동 결합하지 않는다. FST 내장 해석·클럭 재생·MAC 연산·독립 IDE 호스트는 후속이며 VSIX 배포·새 설치는 수행하지 않았다.


## 이전 체크포인트 — D2B3A

D2B3A package 보존 완료 (2026-10-04): 프로젝트 내부 package 파일도 실행 소스 사본으로 보존한다. 자동 순서는 원본 preflight 이후 사본에서 기존 package provider로 다시 분석하며, 실제 빌드 순서로 지문·result.sources를 기록한다. 사본 분석 실패/취소는 원본 재시도 없이 FAIL/cancelled다. manifest 수동 순서도 지원한다. 결과 GUI/CLI 구조 분석과 readonly package 소스 이동은 검증된 사본만 사용한다.

검증: 일반112/typecheck/build 통과, 실제 native 관련2 tests(3 PASS 실행·package 병렬2/명시적 소스1), 실제 package GUI run-WhaR8u receipt passed=true/recordedPackages=true/exit0(2 PASS), 실제 CLI matching→changed/현재 manifest 없이 두 보존 hierarchy 통과. `.dev/d2b3-package-unit.log`, `d2b3-package-native.log`, `d2b3-package-vscode.log`, `d2b3-package-cli.log`/`d2b3-package-cli-receipt.json`. 전체 native/full GUI suite 재실행은 이번에 하지 않았고, 이전 D2B2 full GUI는 과거 기준점이다. 물리 UI 수용 검증은 아니다.

실제 native 첫 검증에서 예제 package에 timeunit/timeprecision이 없어 slang MissingTimeScale로 구조 분석이 막혔다. examples/package-counter의 세 package에도 DUT/TB와 같은 시간 단위를 선언하고 native/GUI/CLI로 재검증했다. Windows 대소문자 파일명 매핑과 사본 분석 실패/취소도 일반 회귀에 추가했다.

다음은 D2B3B literal include 보존 계약이다. includeDirs/모든 `include 문자열(주석 포함)/외부 경로는 아직 unavailable fallback이며 일반 실행은 유지한다. include 탐색 우선순위·shadowing·nested relative 해석을 두 adapter와 일치시키기 전 지원 확대를 선언하지 않는다. D3 trace 값/클럭/MAC는 미구현이다. 배포 패키징·새 도구 설치는 수행하지 않았다.


상태: 제안된 다음 실행 순서. 이 문서 작성으로 아래 기능이 구현된 것은 아니다. 다음 담당자의 시작점은 [최신 인수인계](handoff.md)다. [원문 25항목](original-product-ideas.md), [실제 점검표](product-audit.md), [시각 디버깅 설계](visual-debugging-roadmap.md), [검증 기록](verification.md)을 함께 유지한다.

## 이전 실행 위치 기록

D2B2 보존 실행 GUI 구조 탐색 완료 (2026-10-04): 결과 메뉴 Explore Recorded Structure가 특정 run의 검증된 Project/TestTarget을 기존 SlangProvider에 전달한다. 현재 manifest/미저장 overlay를 읽지 않고 화면·tree·탐색 이력을 current/recorded 및 run ID로 구분한다. 현재 원본 변경은 보존 view를 덮지 않으며 보존 입력 변경/손상은 stale·재검증 실패로 이동을 차단한다.

최신 검증: 일반108/typecheck/build 통과. 실제 보존 GUI run-A2LYPy(2 PASS + archived 구조/readonly 정의/손상 차단/현재 전환) 및 전체 GUI run-gQnoQ5(성공5/의도한 실패1/취소1) receipts passed=true/exit0. `.dev/d2b2-final-unit.log`, `.dev/d2b2-final-recorded-vscode.log`, `.dev/d2b2-full-vscode.log`. 실제 host API 검증이며 물리 UI 수용은 아니다. Compiler/runner/CLI 동작은 바꾸지 않았고 이전 native11/CLI receipts는 과거 근거로 유지한다.

보존 구조의 instance/definition/port/parameter source 링크는 공통 recorded-source host를 통해 당시 사본의 정확한 위치를 readonly 문서로 연다. Core가 검증한 sourceMappings 외의 파일은 열지 않고 URI는 run directory까지 포함해 중복 ID/다중 프로젝트를 분리한다. Explore current design은 명시적으로 현재 문맥으로 돌아간다. 다음은 D2B3 include/package 보존 계약; 값/클럭/trace 연결은 여전히 후속이다.

D2B1 보존 소스 첫 범위 (2026-10-04): Verilator가 프로젝트 안의 명시적 소스 사본을 `.rtl/runs/<run>/inputs/`에서 빌드한다. 원본이 컴파일 직전 바뀌어도 결과와 사본의 연결이 유지된다. include 디렉터리·include 문자열·package 그룹·외부 경로는 아직 보존을 지원하지 않으며 기존 입력으로 실행하고 inputSnapshot=unavailable/이유를 기록한다. 기존 backend는 capability opt-in 없이 사본으로 전환하지 않는다.

최신 근거: 일반105/typecheck/build, native11, 보존 GUI run-VwRA80 receipt(2 PASS/readonly type 경로), CLI d2b-cli-receipt(2 PASS/현재 manifest 없이 archive hierarchy) 통과. 초기 전체 host run-xSyxi3에서 취소가 정리 지연 중 timedOut으로 바뀌는 문제를 발견해 timer 우선순위를 수정했고 final unit에 slow-cleanup 회귀를 추가했다. 실제 전체 suite 재검증 최종 근거는 verification 상단을 따른다. 초기 WorkspaceEdit 기반 readonly 테스트는 실패했으며 사용자 type 경로의 최종 테스트만 수용 근거다.

최종 전체 VS Code도 통과: `.dev/d2b-final-vscode.log`, run-XDlo5D receipt passed=true/exit0, 성공5/의도한 실패1/취소1. 취소 결과는 cancelled로 유지됐고 이번 fixture의 정리는 756ms였다. MSYS2 지연 전체를 해결했다고 확대하지 않는다. 일반105·native11·보존 GUI2 PASS·CLI2 PASS와 함께 verification 상단을 최신 기준으로 사용한다.

Core loadRecordedInputs는 run/result·원래 설정·파일 해시·경로/심볼릭링크·추가 파일을 검증하여 같은 top/defines/waveform의 Project/TestTarget을 반환한다. CLI hierarchy --run RUN_ID는 이 입력을 기존 SlangProvider에 전달하며 현재 rtl.toml 없이도 동작한다. GUI 결과의 Open Recorded Source는 당시 첫 테스트벤치 사본을 rtl-recorded 읽기 전용 문서로 보여준다. 현재 구조와 파형의 자동 결합은 아직 하지 않는다. 다음은 D2B2 보존 실행의 GUI 구조 탐색 및 include/package 지원 계약이다.

D2A 입력 식별 첫 범위 구현 (2026-10-04): 공통 Core runner가 runId와 versioned SHA256 입력 지문을 결과에 저장한다. 저장된 sources/packages/test sources·include 경로/트리와 literal include 의존성·defines·top·backend/timing/waveform을 추적하고 실행 전후 변경을 구분한다. 결과 메뉴 Check Source Version 및 CLI history --verify-inputs가 같은 비교 모델을 사용한다. 과거/미지원 identity는 로그·파형을 보존하면서 legacy/unavailable로 안내한다. 미저장 입력은 GUI에 별도 안내하며 자동 저장하지 않는다.

최신 검증: 일반100/typecheck/build, 실제 Verilator 통합10, 실제 VS Code 전체 suite(성공5/의도한 실패1/취소1), 실제 CLI 두 테스트와 일치→변경 비교 모두 통과. `.dev/d2-final-unit.log`, `.dev/d2-integration.log`, `.dev/d2-vscode.log`/run-mskgxC receipt, `.dev/d2-cli.log`/d2-cli-receipt.json. 실제 host는 API 기반이며 물리 UI 수용은 아니다.

지문은 원자적 compiler snapshot이 아니다. 동적/찾을 수 없는 include·symlink·크기 제한은 unavailable, 실행 중 변경은 changed-during-run이다. 전후 관측 사이 변경 후 원복/도구 환경/모든 implicit backend 입력은 보장하지 않는다. matching은 과거 trace와 현재 diagram 결합 허가가 아니다. 다음은 D2B 불변 입력과 semantic/run 문맥 일치 계약이며 D3는 아직 시작하지 않는다.

2026-10-04 D1 첫 범위 완료: 내부 보기/더블클릭, 전체 경로, 뒤로/앞으로/상위, generate/array 부모 관계, 문맥 변경 이력 초기화, refresh fallback 및 stale/nonce 보호. 일반94·최종관련12·typecheck/build와 실제 VS Code 전체 suite 통과. 다음 신규 구현은 D2 run/source identity다. 파형값/클럭/MAC는 D2 이후 순서를 따른다. 아래 기록의 '다음 D1'은 과거 체크포인트다. 물리 UI/깨끗한 OS/완전 GUI 설치 수용은 계속 열려 있다.

2026-10-04 설치 검증 재개 완료: fresh-tools 실제 독립 설치/RTL smoke, fresh compiler native 10개, 실제 VS Code 전체 suite, CLI check/개별/all 및 기존→새 설치 전환/다중 workspace PASS 3개 통과. 사용자 설치 승인 대기는 해소했다. 다음 새 기능은 D1이며 물리 UI/깨끗한 OS/완전 GUI 설치 수용은 verification 상단의 미검증 경계를 따른다.

2026-10-04 추가 검증: 일반 85개, 실제 호스트 경로 A→B/다중 workspace PASS 3개, 다운로드 중 취소·재시도/설치 오류 잠금 정리/기존 GTKWave 재사용 통과. 새 도구 저장소 설치와 실제 RTL smoke 검증은 사용자 재개 요청 후 통과했다. 물리 입력/깨끗한 Windows OS 검증은 미완료다. 아래 감사 보완은 이미 완료했으며 다음 새 기능은 D1. verification 상단과 handoff의 최신 설치 검증 결과을 기준으로 인수한다.

2026-10-04: AUD-CACHE-1/AUD-CLI-1 보완 완료. 수동 경로 변경 및 검증/설치 중 변경 회귀, 실행 중 도구 보존, 설치 거절 후 이전 캐시 재사용 방지, CLI VCD/FST 안내를 확인했다. 일반 82개·typecheck/build 및 실제 VS Code 전체 suite 통과. 근거는 verification 상단 기준. 다음 구현은 D1이며 A3 수용은 별도로 열려 있다. 아래 10-03 감사의 미수정 표현은 당시 상태다.

2026-10-03 전체 재검증: 일반 76개/slang 11개/Verilator 통합 10개와 실제 VS Code·CLI 통과. [감사 피드백](current-validation.md)의 AUD-CACHE-1(수동 toolsDirectory 변경 후 verified 캐시 무효화 누락)과 AUD-CLI-1(내장 VCD를 반영하지 못한 안내)을 발견했다. 코드 경로 검토 사항이며 아직 수정하지 않았다. D1 새 기능 전에 이를 보완·회귀 검증하는 작은 체크포인트를 추가한다. A3 물리 입력/시각 수용은 계속 열려 있다.

2026-10-03: C1/C2 기반에 이어 C3 실행 UI 첫 범위 구현. RTL Start에서 대상 선택/선택 대상 Run/진행·취소 가능 상태/마지막 결과를 표시하고 기존 Core·Testing API를 사용한다. 일반 76개와 실제 VS Code+Verilator 실행·실패·취소 검증을 수행했다. 준비 중 취소/설치 거절/다중 프로젝트 대상 ID도 검증했다. 다음은 D1 계층 탐색이다. C3 단계 세분화/선택 저장, enum 기존 항목 보충, class semantic, A3 물리 입력·사용자 프로필 수용은 열린 후속 항목이다.

최신 담당자 시작점은 [handoff.md](handoff.md), 루트 요약은 [PROGRESS.md](../PROGRESS.md)다.

## 목표와 순서 변경 이유

최종 제품은 엔지니어가 RTL 설계에 집중할 수 있는 독립 VS Code/Code-OSS 기반 설계·시뮬레이션 IDE다. 확장은 초기 호스트이며, 전용 simulator/compiler와 파형 기술도 장기 목표다. 사용자는 명령어보다 버튼·직관적인 흐름을 원한다.

기존 1~4단계와 5A/5B 일부는 기반 구현을 마쳤지만 전체 요구의 완료가 아니다. 새 기능을 쌓기 전에 사용자가 실제로 겪은 편집 기능 부재를 해결한다. 다음으로 핵심 누락인 signature help를 완성하고, 정적 구조 → 기록 파형 연동 → 연산 내부 시각화 순서로 진행한다. 상용 backend 전부 또는 모든 OS 지원을 독립 IDE의 선행 조건으로 삼지 않는다.

일정은 날짜보다 통과 조건으로 관리한다. 각 단계는 아래 작업 단위로 나누어 구현·검증·문서 갱신한다. 단계 하나의 성공을 전체 제품 완료로 확대하지 않는다.

## 단계별 실행 계획

| 단계 | 사용자에게 생기는 변화 | 작업 단위 | 다음 단계 진입 조건 |
|---|---|---|---|
| A 편집 신뢰성 복구 | 왜 추천이 안 되는지 알 수 있고 기본 입력이 예측대로 작동 | A1 포트 결함, A2 언어 준비 상태, A3 실제 입력 수용 검증 | 사용자와 동등한 실행 경로에서 핵심 편집 흐름 확인; 재현 안 된 문제는 미해결로 남김 |
| B 핵심 인자 안내 | 모듈 파일을 오가며 포트를 외우지 않아도 됨 | B1 모듈/parameter signature, B2 function/task signature | 미저장·다른 파일·named/positional·parameter override에서 현재 인자와 타입이 맞음 |
| C 설계·검증 UX 보강 | 연결할 신호 선택·반복 코드·테스트 실행이 쉬워짐 | C1 연결 신호 순위, C2 semantic code actions, C3 실행 상태/대상 UI | Core 공유 유지, 사용자 소스 변경은 명시적 액션+Undo, 기존 시뮬레이션 회귀 없음 |
| D 계층과 파형 연결 | top에서 내부로 내려가며 선택 시각/클럭의 값을 확인 | D1 탐색, D2 run/소스 식별, D3 trace 매핑, D4 클럭 재생 | 인스턴스·run 혼동 없음, 파형과 값 일치, 다중 클럭·미기록/X/Z 처리 명확 |
| E 내부 연산 시각화 | MAC 내부에서 입력→연산→레지스터를 따라감 | E1 제한된 연산 모델, E2 pipeline 예제 및 값 연결 | 폭/부호/잘림/reset/enable과 trace 대조; 지원 못 하는 코드는 명확히 표시 |
| F 실제 규모·제품 안정화 | 큰 설계에서도 응답성과 데이터 보존을 신뢰 | F1 측정/증분 분석, F2 trace indexing/FST, F3 설정·이력·설치 수용 | 합의한 실제 설계로 성능 측정, 취소·복구·저장 호환성, 깨끗한 Windows 흐름 확인 |
| G 구조 작성 | 모듈을 배치·연결해서 structural RTL 생성 | G1 library/연결, G2 생성 경계·재생성 | 사용자 RTL 보존, 생성 diff/Undo, 기존 runner로 compile/test 통과 |
| H 독립 IDE 전환 | 전용 시작 화면·RTL 동작·단축키·설치 경험 | H1 전환 조사/선택, H2 얇은 Code-OSS 호스트 | 동일 Core 회귀 및 작업 공간/설정/보기 이전, 유지보수·라이선스·업데이트 경로 검토 |
| I 전용 시뮬레이션 기술 | 실제 pause/step/live debug 및 전용 backend | I1 capability/실행 제어, I2 별도 compiler/simulator 검증 프로젝트 | 지원 언어·timing/4-state/assertion 의미 명시, reference simulator 대비 회귀 |

기본 제품 개발 순서는 A→B→C→D→E다. F의 측정/응답성 작업은 C부터 병행할 수 있지만 새 대형 trace 기능은 측정 후 추진한다. H의 전환 타당성 검토는 D와 F의 핵심 Windows 수용 조건이 통과하면 시작할 수 있다. G·추가 OS/backend·I 전체 완성을 기다릴 필요는 없다. 실제 앱 전환 시점과 배포는 사용자가 결정한다. 각 단계의 동시 개발을 요구하는 지시는 아니며 담당자는 한 작업 단위를 끝내고 검증한다.

## A: 초기 실행 범위와 남은 수용 검증

**A1 포트 추천 결함:** `queries.ts`의 `.name(` 전용 사용 포트 집계와 점 바로 뒤 접두어 조건을 개선한다. `.clk` implicit 연결도 제외하고 `. │`, `. cl│`도 처리한다. 현재 편집 중인 포트는 불필요하게 제거하지 않는다. `.*`, named parameter `#(...)`, 접속 표현식의 객체 멤버 `.`, 중첩 함수 호출, 주석·문자열, 불완전 괄호를 구분한다. 지원 불가능한 모호성은 잘못된 후보 대신 명확한 제한으로 둔다.

**A2 준비 상태:** 파일/프로젝트별 의미 분석 상태를 표시한다. 예: 준비됨, 분석 중, 도구 없음, 신뢰 필요, 설정 꺼짐, 프로젝트 설정 오류, source 밖, 분석 실패. 실제 상태 소유 계층에서 보고하며 UI가 추측하지 않는다. 설치 위치/현재 파일의 소속 프로젝트와 ‘설정/재시도/로그’ 액션을 제공한다. 설치는 승인 후에만 수행한다. 개발 전용 `.dev` 경로를 제품 기본값으로 박아 넣지 않는다. 별도 code action 팝업보다 기존 RTL Start/상태 UI를 우선 활용한다. 중첩 프로젝트는 자동 지원하거나 지원되지 않는 이유를 표시하며 조용히 비활성화하지 않는다.

**A3 수용:** 일반 Ctrl+F5 실행과 격리된 테스트 실행의 설정 차이를 재현한다. module Tab의 이름→포트→본문, begin Tab→Enter 및 직접 Enter, case, 실제 타이핑의 dot/package 추천을 확인한다. 설치 누락/거절 시 편집이 유지되고 상태가 설명돼야 한다. 수동 입력 도구 접근이 안 되면 API 테스트 통과로 대체 완료하지 않고 제한을 기록한다.

초기 실행 순서는 A1→A2/A3였다. 현재 A1/A2 및 B/C의 지원 범위 구현은 완료했고 A3 물리 입력 수용은 열려 있다. 이 과거 순서로 돌아가 이미 완료한 구현을 반복하지 않는다. 다음 작업은 상단 최신 체크포인트와 handoff의 A3/F 필수 안정화를 따른다.

## B와 C: 편집 요구를 끝내는 범위

B1은 모듈 parameter/포트 목록, direction/type/elaborated width, 현재 인자 강조를 제공한다. `#(`와 포트 `(`, 쉼표와 named 인자를 구분하고 닫힘/문맥 이탈 시 종료한다. 미완성 구문에서도 가능한 문맥을 복구하되 여러 elaboration이 충돌하면 임의 인스턴스를 고르지 않는다. SemanticProvider 모델과 LSP signatureHelp를 확장하고 VS Code 전용 분석을 만들지 않는다. B2는 일반 function/task의 인자명·타입·방향과 현재 인자다. 기본값·패키지 함수·중첩 호출 지원 범위를 명시하고 테스트한다. class method는 후속 범위로 구분한다.

C1은 `.port(` 안에서 scope-visible 신호를 추천하며 타입·폭·부호·이름 유사성을 근거로 순위를 제공한다. 합법적인 다른 표현식을 차단하거나 자동 연결하지 않는다. C2는 enum case 생성, 선택형 closing label, class/fork 템플릿을 각각 독립 작업으로 한다. class 템플릿이 class semantic 지원을 뜻하지 않는다. fork는 join/join_any/join_none 의도를 사용자에게 선택하게 한다. 기존 소스와 주석을 보존하고 자동으로 if/always/for 블록을 강제하지 않는다.

C3은 테스트 대상·진행 상태·실행/취소·결과·파형을 한 흐름에서 찾기 쉽게 만든다. 기존 Testing API와 Core를 재사용한다. 전용 체크박스 대시보드는 필요성이 확인될 때 추가하며 중복 실행 상태를 만들지 않는다. 현재 extension에서 F5를 강제로 빼앗지 않는다.

## 첫 베타와 초기 안정 버전 진입 조건 — 사용자 합의

D3A→D3B 구현 후 새 기능 추가를 잠시 멈추고 A3/F의 필수 안정화 체크포인트를 수행한다. 사용자 환경의 실제 입력/추천/인자 안내/버튼 실행, 깨끗한 Windows GUI 승인 설치→실행→파형, 다른 run/instance 값 혼동 차단, 실패/취소/복구 및 대표 설계의 응답성·메모리·데이터 보존을 확인한다. 이 조건을 통과하면 첫 제한된 VS Code 호스트 베타 패키지를 시험하고 실사용 피드백을 수정한 뒤 초기 안정 버전을 판단한다. 단계 도달만으로 안정성을 선언하지 않는다.

D4 클럭 재생·E 연산 모델·추가 OS/backend·G 구조 작성·자체 compiler 전체 완성을 기다리지 않는다. H 독립 IDE 전환은 공통 기능/UX와 핵심 수용 조건이 안정된 후 별도 host 단계로 진행한다. 현재는 개발 build/검증이며 아직 패키징 gate에 도달하지 않았다.

## 다음 D3 작업 분할

D3A는 지원된 ready snapshot의 보존 hierarchy와 VCD에 대해 run/trace 식별 및 full instance path/alias 매핑을 먼저 검증한다. trace 교체/손상·TOP wrapper·동일 모듈 다중 instance·generate/array·누락/폭 불일치/모호성에서 임의 값 결합을 막는다. D3B는 이 모델로 선택 시각의 구조 값과 waveform cursor UX를 연결한다. 이후 D4 clock/edge replay, E 연산 모델을 따른다. source-relative-only/dynamic/external include 일반화는 별도 제한 backlog이며 configured literal subset은 D2 계약을 통과했다. 상세 시작점은 handoff의 다음 작업이다.

## D와 E: 다이어그램의 실질적 가치

D1은 현재 자식 이름 클릭을 더블클릭/내부 보기·경로·뒤로·상위 이동으로 보강하고 testbench/DUT 선택을 구분한다. D2는 실행 당시 sources/includes/defines/parameters와 결과 식별의 계약을 먼저 만든다. 최소 fingerprint로 불일치를 막을지 소스 snapshot을 보존할지 저장 비용을 검토한다. 과거 결과는 migration/unsupported 안내로 다루며 조용히 현재 소스와 결합하지 않는다.

D3은 full instance path와 trace alias를 연결한다. source/run이 다르거나 신호가 기록되지 않으면 추측값을 표시하지 않는다. D4는 사용자가 고른 clock/edge로 기록 파형을 재생한다. 같은 시각 마지막 값만 보존하는 현재 VCD 모델의 한계를 표시하고 delta-cycle 디버깅/실제 simulator stepping이라고 부르지 않는다.

E는 지원한 RTL 부분집합만 연산 그래프로 만든다. arbitrary procedural RTL을 완전한 하드웨어 회로라고 그리지 않는다. 중간값이 dump에 없으면 계산한 추정값을 실제 관측값으로 표시하지 않는다. instrumentation이 필요하면 원본 보존과 별도 승인/실행 경계를 설계한다. 두 MAC 인스턴스, parameter 폭, pipeline, reset/enable, 잘림/overflow로 검증한다. 자세한 수용 조건은 [별도 설계](visual-debugging-roadmap.md)를 따른다.

## 나머지 누락 항목의 배정 — 잊지 않기 위한 백로그

‘후속’은 요구를 삭제했다는 뜻이 아니다. 지금 반드시 구현할 범위와 시점 미정 항목을 구분한다.

| 잔여 요구/제한 | 배정 | 완료/결정 기준 |
|---|---|---|
| class body/member, pkg::class::, 모든 package symbol 종류 | C 이후 semantic 확장 | compiler lookup 근거, 미저장·visibility 검증; 기본 타입/enum부터 범위 명시 |
| 모든 문법 위치의 type/value 필터·fuzzy completion | C/F | 유용성·오추천·지연 측정 후 채택 |
| 동일 소스의 여러 elaboration 문맥 선택 | B/D | 현재 테스트/instance 선택에 일관된 포트 타입 |
| interface/modport wiring 상세 | D/E 확장 | 실제 elaboration과 방향·연결 일치 |
| top 기준 최소 source graph | F 후속 | glob 전체 입력과 다르며 macro/include 순서 보존; 필요 시 opt-in |
| 복잡한 package/class shadow·macro 순서 | F 후속 | manifest 수동 순서 유지, 잘못된 자동 정렬 방지 |
| coverage 옵션 | F/추가 backend 작업 | 표준 결과 모델·capability·GUI 결과까지 설계; schema만 추가하지 않음 |
| 설치 상태·업데이트·새 Windows VM | A/F | A는 readiness, F는 업데이트 실패/롤백과 깨끗한 환경 종단 |
| 내장 FST·대형 trace·live trace | F/I | FST/indexing은 reader 범위, live는 simulator/stream 계약 별도 |
| 파형 보기 공유/import/export/그룹·동시 창 충돌 | F | 버전 schema·검증·원자 저장; 현재 profile-local 보기 보존 |
| 실행 이력 보존/정리·소스 식별 | D2/F | D2 식별 먼저, F 삭제/용량 UX; 무단 데이터 정리 금지 |
| semantic highlighting·문법 완전성·테마/접근성 | C/F/H | 기존 lexical grammar/아이콘 보존, 대표 디자인과 테마 검증 |
| 추가 backend (Icarus/Questa/ModelSim/Xcelium/XSim) | 별도 확장 경로 | 사용자 수요에 따라 하나씩, 실제 도구/라이선스 이용 가능 시 검증 |
| Linux/macOS | 별도 확장 경로 | host/process/설치/provider 종단 검증 후 지원 표기 |
| 임의 RTL↔diagram 양방향 sync | G 이후 연구 | 초기 G 제외; 보존/round-trip 보장 전 제품 기능 선언 금지 |
| 독립 IDE F5·branding·설치/업데이트 | H | 사용자 동의하에 제품 키 정책, Code-OSS 배포 검토 |
| 전용 compiler/simulator/파형 포맷 | I/장기 | 범위 제한한 별도 proof부터; 기존 adapter와 동일 fixture 비교 |

## 완료 보고 규칙

각 작업 후 동작 변화, 실제 검증과 미검증, 남은 제한을 기록한다. unit/native/editor-host/physical-UI 테스트를 구분한다. 기존 ‘57/9/10 통과’는 날짜가 있는 기준점이지 영구 보증이 아니다. 소스 변경에 맞는 검사만 반복하고 무관한 긴 검증은 불필요하게 반복하지 않는다. 사용자가 배포를 요청하기 전까지 build/검증만 하고 VSIX 생성·설치는 하지 않는다.
