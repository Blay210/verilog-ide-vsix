> 2026-10-06 저장소 준비: 루트 .gitignore를 정리했다. workspace dist/node_modules, .dev/.rtl, 생성 VSIX/notice, 환경 파일 등을 제외하고 소스·tests·docs·예제·lockfile·공유 .vscode 설정을 유지한다. 격리 Git 저장소에서 제외8/유지9 경로 확인. 실제 프로젝트 git init/업로드 및 배포 패키지 재생성은 하지 않았다.

## 최신 실행 지점 — F1X 스터디 비공개 베타 (2026-10-06)

사용자 승인으로 0.3.1 VSIX/CLI/새 예제/안내 ZIP 배포를 준비했다. 정식 stable·독립 앱이 아니다. 전체184 PASS(초기 오래된 DOM 참조2 FAIL 수정)/타입 검사·build, 실제 VSIX 격리 설치 및 설치 폴더 native 편집/semantic/두 PASS/내장 파형·보존 구조 ready/host exit0, 배포 CLI check·두 PASS·hierarchy exit0와 GUI/CLI 결과 일치를 확인했다. 언어 빠른 재시작의 pending changes TypeError가 발견돼 알려진 제한으로 남긴다. 깨끗한Windows/대표사용설계·장시간/프로필·일부 실제입력 게이트는 유지한다. 다음은 스터디 설치·실사용 피드백 수집 → 언어 재시작 경쟁 및 중단 오류 우선 수정 → 0.3.x 회귀 검증이며, 후속 U12/독립 앱은 기존 순서를 따른다. [수용·발견 문제·재현](docs/private-beta-acceptance.md), [설치 안내](docs/private-beta-guide.md). 이전 VSIX 금지/미배포 기록은 당시 상태이며 이번 명시적 배포 요청이 우선한다.

# 현재 진행현황

기준일: 2026-10-06. 전체 요구/구현 상태/다음 순서는 [제품 로드맵](docs/project-roadmap.md), 재시작은 [인수인계](docs/handoff.md)를 읽는다. 과거 작업 결과는 [진행 이력](PROGRESS-history.md)에 보존했다.

## 이번 작업

F1W 실제 progress Cancel 버튼 검증 통과(run-odiLDS): 테스트 전용20초 load dispatch 지연에서 native 클릭으로 target reader 종료·document 제거, 기존 peer 값 유지, 정상 재열기/값 복구·3/3worker exit/SHA/host exit0 확인. 관련4 PASS/타입 검사·개발 build 통과. [실제 조작·제한 조건](docs/waveform-physical-cancel-acceptance.md). 제품 코드 변경 없음. 일반 parse 중 물리 취소 latency/전체 안정화 수용은 아니며 실제 입력/Escape·프로필 잔여 및 대표 설계·장시간/깨끗한Windows 게이트를 유지한다.

F1V 합성 중간 규모 취소·메모리 회복 검증: 4096신호 두 reader의 native loading중 닫기/peer 보존/4cycle/worker9개 종료/SHA 검증 통과. 최종15초 자연 idle 두 실행에서 RSS baseline221–222MiB→191–193MiB 회복을 재현했다. 초기3초 미회복도 보존한다. 독립8cycle16reader exit, 256RTL파일 분석·실행중 취소/재시도1 PASS, 관련23 PASS/타입 검사·개발 build 통과. [근거·측정조건·제한](docs/waveform-memory-recovery-acceptance.md). 제품변경 없음. 다음 물리 Cancel 조작·취소 복구와 잔여 입력/프로필 수용, 실제 설계 경로 제공 시 대표 프로젝트 검증. 전체 규모·메모리 수용/깨끗한Windows 완료는 아니다.

F1U 기본 사용자 편집 설정과 설치된 Verilog HDL 1.29.0을 격리 복제해 editor/semantic native 검사 통과(run-22Vp8d), 실제 module/package/begin Tab 및 begin Enter의 내용·커서 검증 통과(run-MmeiXH), 두 host exit0. 11 lexical PASS/semantic unit7 SKIP/타입 검사·개발 build 통과, 원본 설정 SHA 유지. 외부 linter는 PATH의 실행 파일 미발견으로 동작하지 않았으므로 정상 외부 diagnostics 충돌은 미검증이다. [근거·범위·재현](docs/editor-profile-acceptance.md). 다음 대표 규모·loading 취소·두 reader 메모리 복구, 편집 프로필 잔여는 별도로 유지한다.

F1T 보존 결과·구조·파형 경계 재검증: 관련 32 PASS/타입 검사·개발 build 통과. 실제 VS Code run-Mpz1Al에서 package/include를 포함한 두 시뮬레이션, 보존 소스/구조/값·양방향 커서·닫기/재열기·손상 차단/복구 통과, host exit0. 별도 generate/array/escaped·한글/공백 경로 Core/worker 실제 검사 1 PASS. 제품 변경 없이 late values 무효화 회귀를 추가했다. [근거·초기 대기·지원 범위](docs/recorded-boundary-acceptance.md). 다음 실제 사용자 편집 프로필 충돌→대표 설계·loading 취소·두 reader 메모리 복구. 전체 안정화/배포 완료는 아니며 깨끗한 Windows 보류는 유지한다.

F1S 기본커서 재사용 실제drag/zoom/pan/하단scroll·Reload 확인완료. run-xbQA9K 모든관측32/128값 oracle·Reload equality/SHA/host exit0. cursor RTT3.3–4.5ms, viewport변경143.7–168.1ms는 남음. 외부전원알림에가린중앙품질은미검증. [근거·범위](docs/waveform-cursor-physical-acceptance.md). 제품코드변경없음. 다음 열린3묶음중retained 구조·파형 연동경계검증, 이후실제프로필/대표설계·RSS. 아래F1R다음UI문구는이전상태다.

F1R cursor-only 기본적용: 진행중values+resize/zoom/pan/pointer reorder·late응답/오류full복구 및real/128bit/zero/empty 검증. 오류시cache폐기 보완. 42 PASS/typecheck/build, 기본flag없는native run-lGGL2k8exit/값·latest/Reload-close·peer/SHA/host exit0. [범위·기본적용·남은게이트](docs/waveform-cursor-reuse-acceptance.md). 다음 실제연속cursor/확대혼합UI 반응성, 전체안정화게이트유지.

F1Q 검증전용 cursor-only 재사용 후보 구현/A/B: 동일viewport 최근1개+새raw값만조회, loading/init/latest/ID순서 guard. 관련41 PASS/typecheck/build, 원본1·후보2 native 각각8exit/값·X/Z·latest/Reload-close·peer/SHA/host exit0. 동일fixture cursor왕복 원본73.5–98.7ms→후보2.2–4.3ms, 신규payload1020bytes(기존923982). [근거·초기검사실패·범위](docs/waveform-cursor-reuse-candidate.md). 기본경로미활성화; 다음혼합viewport/resize/reorder/real·wide·zero/error 경계검증 후채택판단.

F1P 밀집조회/전달계측 추가: 명시dev/test host queue/window duration 및 실제payload post-lifecycle 복사벤치. 두 native run-ZPfvt9/run-qgFuCm 각각8exit/값·latest burst/Reload-close·peer/SHA/host exit0, 관련40 PASS/typecheck/build exit0. 두번째dense worker28.87ms/host39.65ms/full84ms/draw9.7ms, payload923982bytes. [측정의미·한계](docs/waveform-transport-profile.md). 다음 동일viewport cursor-only 제한재사용 후보A/B. 이번작업은 제품캐시/압축 채택이 아니며 RSS/대표설계 전체게이트유지.

F1O F1N 잔여 실제 창 검증 완료: 2분 이후 최신 cursor32부모/128bit 값 대조, 같은 창1→160행 overflow전환/최대화·복원/앱zoom 커서정렬, Ctrl+- 정확한범위유지 및 일반 확대·pan 확인. run-ljPKYm 원본SHA/host exit0, 관련39 PASS/타입검사·개발build exit0. [근거와 제한](docs/waveform-native-layout-acceptance.md). 다음 dense query/전달비용. OS DPI/physical Esc/대표설계·프로필/RSS 등 전체게이트유지.

F1N 실제 canvas 포커스 Ctrl+-/일반 minus·equal, 오른쪽 cursor 정렬/Signals 폭 변경 및 긴 절대시간 두 줄 표시를 관찰했다. 2분 뒤 진단이 새 결과를 거부하는 문제를 보완하고 관련39 PASS/타입 검사·개발 build exit0. 수정 후 native 창에서 사용자 물리 Escape로 중단되어 최종 장시간 프로필/overflow 검증은 남았다. [실제 범위와 재시작](docs/waveform-native-checkpoint.md). 절대시간 디자인은 추후 실제 사용 피드백에 따라 개선할 수 있다.

F1M 사용자 피드백에 따라 viewport-relative 눈금/Origin을 제거하고 절대 시간으로 복원했다. 짧은 값은 기존한줄, 긴소수값은 정수시각/나머지(source unit) 두줄이며 둘의합은 정확한 절대시각이다. shared scroll/gutter 커서정렬·viewport 그리기는 유지. 관련6 PASS/타입 검사·빌드 exit0, native픽셀재검증 없음. [표시결정과검증](docs/waveform-absolute-time.md). 다음F1L native잔여→dense전달 순서유지. 아래 F1L는 이전 기록이다.

F1L 그룹 이동/Esc 취소/폭·DPR 회귀를 bundled 실제 화면 코드에 추가했다. modifier 없는 zoom/pan만 가로채도록 보완해 Ctrl/Meta/Alt 편집기 단축키 충돌을 방지한다. 관련37 PASS/타입 검사·빌드 exit0. 실제 run-sGbRnL Shift 범위선택+두행 drag 순서/앱zoom 관찰/SHA/host exit0. 최종run-Pz50OV160행준비·종료/SHA/host exit0이나 사용자 입력과 겹쳐 최종container Ctrl+-는 물리 미검증. [범위와 남은 검사](docs/waveform-interaction-regression.md).

다음짧은native canvas포커스 Ctrl+-/일반shortcut·overflow/오른쪽cursor resize 확인 후dense query/전달 조사. VM Esc/DPR 통과를물리전체합격으로쓰지 않는다. 대표설계/프로필/RSS/기록경계보류 유지, VSIX/사용자예제 변경 없음. 아래 F1K는 이전 기록이다.

F1K 눈금/파형의 스크롤바 폭 차이를 없애려고 ruler와trace를 같은 scroll surface로 묶었다. 큰 원점은 기준시각+상대 눈금, viewport+43px만 plot/bit 투영, offscreen 값 갱신·scroll reveal/resize redraw·Reload 위치 복원 적용. [구현·초기 실패·검증](docs/waveform-viewport-alignment.md).

관련35 PASS/타입 검사·빌드 exit0, 최종native run-T0BtBf32/128값·20연속 요청·Reload-close/peer/재열기·8exit/SHA/host exit0. dense draw14.3ms/RTT99.6ms는 단일 관측이며 전체성능 수용 아님. 실제 run-7uWK3q 물리cursor/ruler클릭/scroll reveal/Reload 아래위치/Signals폭변경 정렬·32/128값 oracle/SHA/host exit0. 다음 그룹이동/Esc/overflow/resize·DPI 회귀, dense 전달 비용. 대표설계/실제프로필/RSS/보존경계 게이트유지. 아래 F1J는 이전 기록이다.

F1J 실제 Windows 마우스로160행 파형의 스크롤/범위 확대/행 재배치/커서 드래그/Reload를 확인했다. 32부모+128bit 값 전체 대조 및 Reload 순서·확장·범위·커서 equality/SHA/host exit0. 관련31 PASS/타입 검사·개발 빌드 exit0. 격리 수동 harness 준비 대기·프로필 관찰을 추가하고 최종 준비/종료도 native 재검증했다. [결과와 한계](docs/waveform-physical-ui.md).

밀집 왕복192–348ms/그리기182–268ms로 매끄러운 반응성은 미수용. Reload 스크롤 초기화/큰 절대 시간 라벨 가독성/재배치 대기 시 빈 plot을 후속 개선으로 기록했다. 다음 visible-row 비용 계측과 scroll/reveal 안전한 후보 검증. Ctrl/Shift 그룹·Esc·resize·빠른 물리 입력/실제 프로필/대표 설계/보존 경계/RSS 게이트 유지. 배포/사용자 예제 변경 없음. 아래 F1I는 이전 기록이다.

F1I dense 비용을 worker query/왕복과 renderer 준비·부모plot·bit투영·bitplot으로 분리했다. 인접 bucket 검색 결과와 현재 query 경계를 재사용하고, 그리기마다4096항목 이내 시간 좌표를 공유한다. 최종 run-Qv9vJv 밀집 요청111.4ms/그리기127.1ms, worker조회20.61ms(추가 burst35ms)로 관찰됐다. 단일 native 전후 측정이며 성능 비율/전체 수용을 주장하지 않는다.

조회 중20연속 요청의 최종 값·Reload 로딩 중 닫기/peer 유지/재열기·8exit/SHA/host exit0. 최종 관련31 PASS/typecheck/build exit0. 짧은 요청을 놓치던 검증 폴링은 실제 시작 이벤트로 바꿨다. [초기 실패·최종 근거·한계](docs/waveform-dense-recovery.md). 밀집 전달/bit plot 비용과 물리 조작/RSS 회수는 남으며 VSIX/사용자 예제 변경 없음. 아래 F1H는 이전 기록이다.

F1H32부모+128bit/활동 구간·dense/확대·Reload·peer/닫기 스트레스를 검증했다. 160행 그리기1004–1236ms 문제를 찾아 크기/테마 읽기를 쓰기 전에 모으고, 같은 폭의 눈금 계산을 공유하도록 수정했다. 최종 run-a7v4rO 그리기45.9–188ms, 모든 부모/비트 값·Reload 범위/커서 복원·4exit/SHA/host exit0, 관련29 PASS/typecheck/build exit0.

dense32행 요청200.2ms+그리기188ms는 아직 반응성 개선 대상이다. host loop46.14ms를 renderer 지연으로 쓰지 않는다. RSS 초기227→최종330MiB로 회수 미입증. [발견·수정·최종 근거](docs/waveform-render-stress.md). VSIX/사용자 예제 변경 없음. 아래 F1G는 이전 기록이다.

F1G 실제 webview 요청왕복·canvas 그리기·프레임 기회 계측을 추가했다. Development/Test + 명시적 flag에서만 켜지고, nonce/샘플 한도·Reload 취소 보호·저장 보기 분리를 유지한다. 실제 run-risLLx8editor/32visible sample/24cursor probe·X/Z·9exit/peer/SHA/host exit0, 관련28 PASS/typecheck/build exit0.

기본8신호에서 query왕복 중앙값7.75ms, canvas그리기4.65ms, init수신→첫 doubleRAF62.1–97.7ms, renderer 관측 포함 phase host loop52.36ms. 실제 픽셀 표시/물리 조작 검증과는 다르다. RSS 초기204→최종403MiB로 회수 미입증. [정의·근거·한계](docs/waveform-render-profile.md). 다음 최대행/비트·활동 구간 확대·dense/reload UI 스트레스, VSIX/사용자 예제 변경 없음. 아래 F1F는 이전 결과다.

F1F 제한된 값 공유를 제품 파서에 적용했다. parse별4096항목/65536문자/64bit 이하만 공유하고 예산이 차면 그 parse의 조회를 중단한다. 원본/후보3종×4쌍24worker 비교에서 전체digest·SHA 동일. 반복8bit 자료56.871→38.878MiB(31.6% 감소), parse중앙값663.64→717.33ms(+8.1%) 절충이다. 고유16bit/256bit 중앙값 증가 없지만 편차가 있어 속도 개선으로 쓰지 않는다.

관련26 PASS/타입 검사·개발 빌드 exit0. 실제 run-w4sxss4cycle/9exit/로딩 중 닫기·재열기/peer 값·SHA 유지/host exit0, phase loop max41.75ms. RSS 초기206→close347–370/최종386MiB로 초기 회수는 미입증. [비교·지원·한계](docs/waveform-value-reuse.md). VSIX/사용자 예제 변경 없음. 아래 F1E는 이전 기록이다.

F1E CPU/할당·live worker heap 진단을 마쳤다. 새 개발용 계측 도구가 worker 내부에서 직접 GC/heap을 측정하고 CPU·할당 원본 profile을 보존한다. 중간 규모4096신호/786432전이에서 파형 자료의 retained 증가56.878MiB, 자료 해제 후 입력을 유지한 기준선 대비 잔여0.117MiB다. 프로세스 전체 RSS 회수 판정과는 다르다.

258종류의 값을 공유하는 **해석 후 진단 실험**은17.937MiB(자료 증가분의31.5%)를 줄이고 전체 시간/값 digest를 유지했다. 제품 파서에는 아직 적용하지 않았다. 최종 plain parse1.91–2.04s는 환경 통제 없는 진단이며 F1D와 속도를 비교하지 않는다.5worker exit/불변성 통과·관련24 PASS·타입 검사/개발 빌드 exit0. [근거·한계·재현](docs/waveform-parser-profile.md). VSIX/사용자 예제 변경 없음. 아래 F1D는 이전 결과다.

F1D 구간별 계측을 추가했다. 일반 요청은 기존대로 두고 명시적 진단 요청에만 worker read/decode/parse/hash 시간을 반환한다. 격리 실제 host에서 warm editor open/query/close와 loop 지연을 분리했다. 관련24 PASS/0 fail/skip·타입 검사/개발 빌드 exit0, run-hA0nMr 실제4cycle/9exit/peer 값·SHA 보존/host exit0.

파일 read3.61–9.83ms, parse715.99–957.57ms, editor open828.42–1118.35ms, warm phase host loop max41.88ms. 이번 열기 비용은 주로 parse다. 이전900ms는 미재현/원인 미규명이며 성능 개선 전후 비교로 취급하지 않는다. RSS 초기199→close422–448/최종469MiB로 초기 회수 미입증. [측정 경계·receipt·재개](docs/waveform-phase-profile.md). VSIX/사용자 소스 변경 없음. 아래 F1C 등은 이전 결과다.

F1C 파형 안정화: enum 준비 중 취소 후 ready 커서/metadata가 남던 문제를 수정했다. 취소 시 연결·화면 자료를 비우고 worker 종료를 기다리며 늦은 standalone 응답을 게시하지 않는다. 다른 reader는 유지하고 Reload로 재시도할 수 있다.

관련26 PASS/0 fail/skip, 타입 검사·개발 빌드 exit0. 실제 run-5rYxEQ에서 loading tab 닫기→재열기·두 custom editor4회·다른 reader 정확한 조회·9/9 실제 worker exit·SHA 불변, receipt passed=true/host exit0. RSS 초기202MiB→close338–412MiB/최종433MiB, host 지연 max900.20ms로 임시200ms 초과. 기능 정리는 통과했지만 메모리 회수/성능 수용은 미완료다. [증거·제한·다음 계측](docs/waveform-cancel-lifecycle-acceptance.md). VSIX/사용자 예제 변경 없음. 아래 U05 등은 이전 작업 결과다.

U05 enum 파형 이름 1차 구현: Auto (enum names)에서 보존 실행의 IDLE/LOAD/DONE을 표시한다. 정확한 경로/폭·분석 전후 보존 입력 검증, X/Z·알 수 없는 값 숫자 fallback, 숫자 override·1bit enum/펼친 bit 분리를 유지한다. 현재 RTL 이름을 옛 파형에 섞지 않고 runtime을 자동 설치하지 않는다. array/struct/class·단독 VCD 타입 추정은 제외한다.

최종 관련52 PASS/0 fail/skip·실제 Verilator/slang 통합1 PASS(17.907s)·타입 검사/개발 빌드 exit0. 실제 VS Code에서 enum/Hex 전환을 확인했고 Reload 커서 초기화 문제를 발견·보완했다. 최종 run-enum-PiWgE4에서7.486ns LOAD 유지, receipt passed=true/enumNames=true/traceReady=true/sourceUnchanged=true/cursor7486·host exit0. [지원 범위·증거·이전 결함](docs/waveform-enum-acceptance.md). 전체 회귀/대표 규모/VSIX 없음. 아래 U04 등은 이전 작업 근거다.

U04 회로도 canvas 1차를 구현했다. 빈 공간 drag·포인터 중심 휠 zoom·+/−·Fit, scope별 camera 복원/resize, 기존 내부 탐색·소스·기록 값 경계 유지. 관련23 PASS·타입 검사/개발 빌드 exit0. 실제 VS Code에서101→124% 확대·drag·내부 진입/상위 복원·Fit·15ns 포트 값 확인, 최종 profile receipt passed=true/sourceUnchanged=true/traceReady=true와 host exit0. 초기 fixture 종료 실패와 재검증 범위는 [수용 문서](docs/structure-canvas-acceptance.md)에 기록했다. 노드 자유 배치/내부 연산은 미구현이며 새 native 실행/전체 회귀/VSIX 없음.

U03 Simulation 테스트 입력 변경 표시를 구현했다. Outdated 경고와 Checking inputs/Inputs unknown/Unsaved edits를 구분하며 이전 PASS/FAIL·파형은 유지한다. 자동 package 순열의 기록 비교를 Core에 추가하여 변경 감시마다 semantic 분석을 실행하지 않는다. 취소·세대 검증으로 과거 응답의 덮어쓰기를 차단한다.

관련33 PASS + 보존 입력/trace 회귀10 PASS, 타입 검사·개발 빌드 exit0. 실제 격리 VS Code에서 native2 PASS(counter_basic19.545s/counter_reset19.155s), DUT 변경/복원·dirty TB·저장 후 해당 대상 격리·설정 변경/복원, receipt passed=true/host exit0 확인. [정확한 범위·미검증·제한](docs/input-freshness-acceptance.md). 시각 물리 수용/전체 회귀/대표 설계 완료 아님. VSIX 없음.

U12 가벼운 프로젝트/테스트벤치 자동 탐색 요구를 검토하고 [설계 제안](docs/project-discovery-direction.md)을 기록했다. 권장은 후보 자동 탐색 + 사용자가 실행한 top/설정 기억 + 모호한 입력만 GUI 선택이다. 현재 glob 추적/package 순서와 미구현 후보 발견/최소 source graph를 구분했다. 코드 변경·추가 실행 시험 없음. 기존 U03 다음 순서를 이번 논의만으로 변경하지 않는다.

U02 Simulation 전용 Activity Bar를 구현했다. Tests/Run History, Run All·다중 선택 실행·Stop, 테스트 행 ▶/파형/소스 액션. 설정은 제목 overflow, 샘플은 빈 화면 안내에 둔다. 기존 Core/Testing API를 재사용한다. 등록 TB의 Explorer 우클릭/편집기 상단 실행을 추가했다. **U11 요청의 파일 행 hover ▶ 자체는 미구현**이며 독립 IDE workbench 항목으로 보존한다.

관련24 PASS/0 fail/cancel/skip, 타입 검사·개발 빌드 exit0. 실제 VS Code1.140.0에서 Simulation 분리·행 선택·소스·최근 파형 열기와 native counter_basic PASS16.052s/새 VCD를 확인했다. TB 우클릭 메뉴 표시·DUT 제외 확인. [정확한 수용·제한](docs/simulation-panel-acceptance.md). 새 전체 회귀/대표 설계 수용/VSIX 없음.

기존 25개 아이디어·6단계·delivery A–I·최근 UI 제안을 대조해 하나의 상태표로 통합했다. hierarchy는 탐색 기반이다. 현재 Structure는 고정 배치 연결도에 camera 이동/확대를 제공하며 노드 자유 배치와 내부 연산 그래프는 남아 있다.

U01 단일 커서를 구현했다. Cursor/Zoom range 두 도구, toolbar 현재 시각, B/Delta/별도 strip 제거. 기존 B 상태를 무시하고 저장 보기·구조 공유 커서 계약을 유지한다. 관련 waveform 34 PASS + structure-view 7 PASS, 타입 검사·개발 빌드 통과. 격리 VS Code1.140.0에서 두 도구 표시·구간 확대·14.788ns 값 조회·10ns Snap 확인, host exit0. [정확한 시험 범위](docs/waveform-cursor-acceptance.md). 전체 회귀/대표 설계 수용을 다시 수행한 것은 아니다.

## 다음 순서

다음은160행 물리 scroll/zoom/drag 반응을 확인하고, 필요하면 visible-row 그리기와 전달/serialization 비용을 측정한다. offscreen 값을 유지하고 scroll/reveal 재그리기·latest request·Reload/취소 복구를 보장한 뒤에만 최적화한다. bit bucket은 부모 활동 근사값이므로 정확한 bit edge를 추측하지 않는다. 대표 규모/실제 편집 프로필/보존 구조 경계와 native RSS 회수는 열려 있다. U12 자동 발견은 제안, U04 노드 자유 배치와 U11 Explorer 파일 행 hover ▶는 후속이다. Core/Testing API 재사용과 읽기 전용 구조 경계를 유지한다.

## 열린 검증

보존 데이터 구조 종단/경계, 사용자 편집 프로필, 대표 실제 프로젝트·loading 취소·두 reader 복구의 큰 3묶음. 깨끗한 Windows는 별도 환경 부재로 보류 1건. 전체 안정화 완료 아님; VSIX/배포 없음.
