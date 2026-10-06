> 2026-10-06 저장소 준비: 루트 .gitignore를 정리했다. workspace dist/node_modules, .dev/.rtl, 생성 VSIX/notice, 환경 파일 등을 제외하고 소스·tests·docs·예제·lockfile·공유 .vscode 설정을 유지한다. 격리 Git 저장소에서 제외8/유지9 경로 확인. 실제 프로젝트 git init/업로드 및 배포 패키지 재생성은 하지 않았다.

## 최신 실행 지점 — F1X 스터디 비공개 베타 (2026-10-06)

사용자 승인으로 0.3.1 VSIX/CLI/새 예제/안내 ZIP 배포를 준비했다. 정식 stable·독립 앱이 아니다. 전체184 PASS(초기 오래된 DOM 참조2 FAIL 수정)/타입 검사·build, 실제 VSIX 격리 설치 및 설치 폴더 native 편집/semantic/두 PASS/내장 파형·보존 구조 ready/host exit0, 배포 CLI check·두 PASS·hierarchy exit0와 GUI/CLI 결과 일치를 확인했다. 언어 빠른 재시작의 pending changes TypeError가 발견돼 알려진 제한으로 남긴다. 깨끗한Windows/대표사용설계·장시간/프로필·일부 실제입력 게이트는 유지한다. 다음은 스터디 설치·실사용 피드백 수집 → 언어 재시작 경쟁 및 중단 오류 우선 수정 → 0.3.x 회귀 검증이며, 후속 U12/독립 앱은 기존 순서를 따른다. [수용·발견 문제·재현](private-beta-acceptance.md), [설치 안내](private-beta-guide.md). 이전 VSIX 금지/미배포 기록은 당시 상태이며 이번 명시적 배포 요청이 우선한다.

> 2026-10-05 정리: 현재 구현 상태와 다음 실행 순서는 [제품 전체 로드맵](project-roadmap.md)이 기준이다. 아래 기존 체크포인트/계획은 날짜별 근거로 보존하며, 예전 '다음 작업' 문구는 최신 순서를 대체하지 않는다. 최신 작업은 [PROGRESS](../PROGRESS.md)를 확인한다.

## 현재 재시작 지점 — 잔여 실제 입력·프로필 수용 (2026-10-06)

F1W 실제 progress Cancel 버튼 검증 통과(run-odiLDS): 테스트 전용20초 load dispatch 지연에서 native 클릭으로 target reader 종료·document 제거, 기존 peer 값 유지, 정상 재열기/값 복구·3/3worker exit/SHA/host exit0 확인. 관련4 PASS/타입 검사·개발 build 통과. [실제 조작·제한 조건](waveform-physical-cancel-acceptance.md). 제품 코드 변경 없음. 일반 parse 중 물리 취소 latency/전체 안정화 수용은 아니며 실제 입력/Escape·프로필 잔여 및 대표 설계·장시간/깨끗한Windows 게이트를 유지한다.

## 이전 재시작 지점 — 실제 Cancel·잔여 수용 검증 (2026-10-06)

F1V 합성 중간 규모 취소·메모리 회복 검증: 4096신호 두 reader의 native loading중 닫기/peer 보존/4cycle/worker9개 종료/SHA 검증 통과. 최종15초 자연 idle 두 실행에서 RSS baseline221–222MiB→191–193MiB 회복을 재현했다. 초기3초 미회복도 보존한다. 독립8cycle16reader exit, 256RTL파일 분석·실행중 취소/재시도1 PASS, 관련23 PASS/타입 검사·개발 build 통과. [근거·측정조건·제한](waveform-memory-recovery-acceptance.md). 제품변경 없음. 다음 물리 Cancel 조작·취소 복구와 잔여 입력/프로필 수용, 실제 설계 경로 제공 시 대표 프로젝트 검증. 전체 규모·메모리 수용/깨끗한Windows 완료는 아니다.

## 이전 재시작 지점 — 대표 규모·메모리 복구 검증 (2026-10-06)

F1U 기본 사용자 편집 설정과 설치된 Verilog HDL 1.29.0을 격리 복제해 editor/semantic native 검사 통과(run-22Vp8d), 실제 module/package/begin Tab 및 begin Enter의 내용·커서 검증 통과(run-MmeiXH), 두 host exit0. 11 lexical PASS/semantic unit7 SKIP/타입 검사·개발 build 통과, 원본 설정 SHA 유지. 외부 linter는 PATH의 실행 파일 미발견으로 동작하지 않았으므로 정상 외부 diagnostics 충돌은 미검증이다. [근거·범위·재현](editor-profile-acceptance.md). 다음 대표 규모·loading 취소·두 reader 메모리 복구, 편집 프로필 잔여는 별도로 유지한다.

## 이전 재시작 지점 — 실제 편집 프로필 검증 (2026-10-06)

F1T 보존 결과·구조·파형 경계 재검증: 관련 32 PASS/타입 검사·개발 build 통과. 실제 VS Code run-Mpz1Al에서 package/include를 포함한 두 시뮬레이션, 보존 소스/구조/값·양방향 커서·닫기/재열기·손상 차단/복구 통과, host exit0. 별도 generate/array/escaped·한글/공백 경로 Core/worker 실제 검사 1 PASS. 제품 변경 없이 late values 무효화 회귀를 추가했다. [근거·초기 대기·지원 범위](recorded-boundary-acceptance.md). 다음 실제 사용자 편집 프로필 충돌→대표 설계·loading 취소·두 reader 메모리 복구. 전체 안정화/배포 완료는 아니며 깨끗한 Windows 보류는 유지한다.

## 이전 재시작 지점 — 보존 결과·구조·파형 경계 검증 (2026-10-06)

최신F1S [기본cursor 물리drag/zoom/pan/하단scroll·Reload](waveform-cursor-physical-acceptance.md). run-xbQA9K32/128값 oracle·Reload equality/SHA/host exit0. 제품변경없음/기존42회귀를신규실행으로세지않음. 다음retained 구조/파형 연동 종단경계, 이후실제편집프로필/대표규모·RSS게이트. pan/zoom fullquery 지연, 외부알림가림, physicalEsc/DPI 제한유지. 아래F1R UI다음은과거기록.

최신F1R [혼합경계 검증·기본채택](waveform-cursor-reuse-acceptance.md). 42 PASS/typecheck/build/run-lGGL2k8exit/SHA/latest/Reload/peer/값. normal init cursorReuse=true, dev diagnostic env0만baseline. error도entryclear한다. 다음 실제 연속cursor/zoom·pan UI체감검증 및 남은대표설계·프로필·retained/RSS 게이트. 아래F1Q 검증전용/미활성 문구는 과거상태다.

최신 F1Q: [구현/A-B/재현/다음경계](waveform-cursor-reuse-candidate.md). 41 PASS/typecheck/build, 원본run-ES1vGB/후보run-ajHhJd·WXK22A 모두8exit/SHA/latest/Reload-close/peer/값일치. 후보flag RTL_WAVEFORM_CURSOR_REUSE_TEST=1 +render dev/test만활성; 일반경로원본유지. 다음cursor/pan/zoom/resize/reorder 교차·real/wide/zero/error복구검증 후기본채택판단. 기존전체게이트유지. 아래F1P 후보미구현문구는 과거기록이다.

최신 F1P: [조회·전달계측 및 다음 후보 계약](waveform-transport-profile.md)을 먼저 읽는다. dev/test-only hostTiming(queue/window)와 post-lifecycle 실제payload 복사벤치. 40 PASS/typecheck/build, 두native 각각8exit/값·latest·Reload-close/peer/SHA/host exit0. 다음 같은viewport cursor-only 제한재사용 원본/후보 비교; 아직 cache/codec 제품채택없음. clock잔여를pureIPC라하지않고 payload보관RSS를baseline수용으로쓰지않는다. 아래native검증문구는 과거체크포인트다.

최신 F1O: [장시간 진단·실제 창 정렬 수용](waveform-native-layout-acceptance.md). run-ljPKYm 132초 이후 새cursor32/128값 oracle, overflow1→160/실제최대화복원/앱zoom, Ctrl+- 범위보존·일반확대pan/SHA/host exit0. 관련39 PASS/typecheck/build exit0. 다음 dense query/전달비용 계측. 아래 F1N 미완료 문구는 이전 기록이다. OS DPI/물리Esc/대표설계·프로필/RSS게이트는 여전히 미완료.

최신 F1N: [실제 관찰·진단 수정·중단 및 다음 순서](waveform-native-checkpoint.md)를 먼저 읽는다. 관련39 PASS/typecheck/build exit0. 2분 이후 init 경과시간 진단 상한을 query latency와 분리했다. 최종 native UI는 사용자 Escape로 중단되었으므로 장시간 최신 프로필/overflow 확인이 다음 작업이다.

최신F1M 사용자교정: viewport-relative/Origin 제거. formatRulerTime은16문자초과 소수절대시각만 정수부+source-unit나머지 두줄, 합은절대tick이며 viewport와독립. canvas두줄폭max측정/baseline13,28·짧은값기존22. sharedscroll/gutter정렬은유지한다. 관련6 PASS/typecheck/build exit0, native재검증없음. [표시계약](waveform-absolute-time.md). 기본상대시간으로다시바꾸지말것. 아래F1L native잔여순서는유효하다.

F1L bundled DOM handlers로Ctrl비연속/Shift범위 group drag·bits/cursor보존·row/cursor/zoom Esc 및late up/response·폭96/333/801×DPR1/1.25/2·160→1→160/height reveal 회귀 추가. 실제render코드 #traces keydown에 ctrl/meta/alt guard 추가, host shortcut을 가로채지 않음. 관련37 PASS/타입 검사·빌드 exit0. [검증정의](waveform-interaction-regression.md).

run-sGbRnL native Shift+Enter 범위선택 후18,19→21뒤 mouse group drag/순서JSON 및label포커스 앱zoom 관찰/SHA/host exit0. guard수정전세션이다. 최종run-Pz50OV준비·종료/SHA/host exit0이나 사용자input으로foreground변경, 최종container Ctrl+- 입력하지않음. 이전8reader stress 근거를이번실행으로표현하지않는다.

다음canvas클릭→Ctrl+-와일반파형shortcut/overflow변화/오른쪽cursor resize·appzoom native마무리 후dense query/전달비용. physical Esc중간취소/Ctrl비연속mouse/OS DPI 미검증, VM통과와구분. 대표설계/프로필/보존경계/RSS/900ms/깨끗한OS보류 유지. VSIX/examples/counter 수정금지. 아래 F1K는 이전 기록이다.

## 이전 재시작 지점 — F 그룹/overflow·resize 정렬 회귀 (2026-10-06)

F1K 완료: sticky ruler와 #trace-rows를 #traces 안으로 이동해 동일 scrollbar gutter/폭 확보. 기존 #traces.children 행 조회는 #trace-rows.children으로 변경(진단 포함). 큰원점 상대눈금/footer Origin, 현재 viewport+43px만 canvas plot/bit projection, 모든 label 갱신, scroll RAF/reveal 및 resize observer, Reload/행 rebuild scroll 복원. [계약·근거](waveform-viewport-alignment.md). worker/query/Core 변경 없음.

관련35 PASS/타입 검사·빌드 exit0. initial run-lhbEyc 진단집계가 old컨테이너를 참조해0rows 실패, 수정 후 run-T0BtBf32/128전체값·latest burst/Reload-close/peer/재열기·8exit/SHA/host exit0. dense14.3ms draw/99.6ms RTT 단일관측. run-7uWK3q 실제물리cursor/ruler click/scroll reveal/Reload아래위치/panel폭변경 정렬·32/128oracle/SHA/host exit0. 전체DPI/resize/60fps 합격아님.

다음Ctrl/Shift 그룹이동/Esc/overflow 변화/실제resize·DPI/zoom 정렬 회귀 후 dense query/전달비용 조사. draw는rect/layout read-before-write를 유지하고 mismatch/latest/loading guard를 존중한다. offscreen DOM/value는 유지하고 그리기만skip한다. 세로scroll은 Reload동안만 보존, 영구view에 저장하지 않음. 대표설계/실제프로필/보존경계/RSS/900ms·깨끗한OS보류/VSIX금지 유지. 아래 F1J는 이전 기록이다.

## 이전 재시작 지점 — F visible-row 비용·스크롤 복구 (2026-10-06)

F1J160행 실제 물리 scroll/zoom/행 reorder/cursor/Reload 완료. [재현과 관찰](waveform-physical-ui.md). manual.ts RTL_MANUAL_DENSE=1 + MANUAL_ACCEPTANCE=1 + WAVEFORM_RENDER_TEST=1, suite는manual우선. 원본 fixture는격리 .rtl에만 생성. 최종manual-dense-ready는32부모/128bit 응답 대기·20초 실패, manual-render는기존16sample프로필 관찰. 자동receipt acceptancePassed:false를전체UI합격으로 쓰지 않는다.

run-lC8P9t물리조작: port22→port24뒤 이동, Reload cursor/rows/details equality, narrow cursor tick 원점+452의32/128전체값 oracle 일치/SHA/host exit0. 최종harness run-KuVyAh160행 준비·종료/SHA/host exit0, 물리재검증 아님. 관련31 PASS/타입 검사·빌드 exit0. 제품동작 변경 없음.

다음 visible-row plot 비용 계측/scroll reveal·resize 복구를 포함한 후보 비교. 밀집 draw182–268ms/왕복192–348ms는 성능수용 아님. Reload scroll위치 초기화, 긴절대시간눈금/잘린bus값, rebuild 응답대기 빈plot이 발견돼 후속UX대상. offscreen values/latest/Reload/cancel 유지. Ctrl/Shift그룹/Esc/resize/빠른물리입력·대표설계/실제프로필/보존경계/RSS/900ms·깨끗한OS보류 유지. VSIX/examples/counter 수정 금지. 아래 F1I는 이전 기록이다.

## 이전 재시작 지점 — F 물리 조작/visible-row·전달 비용 (2026-10-06)

F1I query/draw 비용 분리·bounded 재사용·연속 요청/Reload-close 복구 완료. [계약·초기 실패·재현](waveform-dense-recovery.md). query.ts 경계는 query-local, 인접 rightIndex를 다음leftIndex로 써 bucket당 검색3→1; webview 좌표는 draw-local4096항목, BigInt truncation 동일. worker profile=true window에만 queryMs, renderer response draw 안에서만4subphases; normal 결과/저장뷰 동일.

최종 관련31 PASS/typecheck/build exit0. 실제 run-Qv9vJv20요청 최종값/Reload 로딩 중 닫기·peer·재열기/8exit/SHA/host exit0. native 테스트중단 실패 run-Vxxd0c는 짧은 pending 폴링 누락; Worker postMessage event barrier로 최종 재검증했다. dense RTT111.4ms/draw127.1ms, worker20.61ms(뒤 burst34–35ms); bitplot80.3ms/전달 잔여가 다음 조사 대상. 전후 통제A/B 아님. hostloop54.95ms와 renderer를 섞지 않는다. RSS224→352MiB 초기 회수 미입증.

다음160행 물리 scroll/zoom/drag와 빠른 조작을 확인하고 visible-row/transport 비용을 측정한다. offscreen skip만 하지 말고 scroll/reveal 다시그리기·값 유지·latest/Reload/cancel을 보장한다. 대표 설계/실제 프로필/보존 경계·RSS/900ms 원인·깨끗한 OS 보류 유지. VSIX/examples/counter 수정 없음. 아래 F1H는 이전 기록이다.

## 이전 재시작 지점 — F dense 비용 분리/연속 요청 복구 (2026-10-06)

F1H 기능 스트레스+그리기 보완 완료. [재현·범위·증거](waveform-render-stress.md). RTL_WAVEFORM_RENDER_TEST='stress' 한 flag로 새 waveform-render-stress.ts 실행. dev/test 숨은 probe에 bounded parents/expanded/range/reload 옵션 추가, 실제 DOM parent/bit 값 telemetry 검증. Production 진단명령 없음. medium4096×192 + dense32×4096 fixture는 격리 프로젝트 .rtl/에만 생성한다.

초기 run-72LMDz 기능 PASS이나 draw1004–1236ms; 크기/테마 read를 write 전에 모으고 눈금을 현재 draw의 폭별로 공유했다. 첫 보완 run-w34mNG36.8–157.3ms, 최종 run-a7v4rO45.9–188ms. 최종은32부모/128bit 모든 값·정확한 X/Z·dense32→zoom0·두 Reload cursor/range/값 equality·peer/4exit/SHA/host exit0, 관련29 PASS/typecheck/build exit0. 속도 비율/물리 입력/픽셀 표시는 별도다.

다음 dense query200.2ms/renderer draw188ms 비용을 worker 조회와 준비/bit projection/plot으로 분리해 bounded 후보를 비교한다. 부모 dense activity를 exact bit edge로 해석하지 않는다. 빠른 연속 요청/Reload 중 닫기·취소/물리 scroll·drag도 다음 스트레스다. host loop46.14ms는 renderer 멈춤 수치가 아니다. RSS227→330MiB 초기 회수/과거900ms 원인·실제 설계/프로필/보존 경계는 미완료, 깨끗한 OS 보류 유지. VSIX/examples/counter 변경 없음. 아래 F1G는 이전 기록이다.

## 이전 재시작 지점 — F 최대행/활동 viewport UI 스트레스 (2026-10-06)

F1G 실제 webview 계측 완료. [정의·재현·제약](waveform-render-profile.md). render-profile.ts clock/request/draw/doubleRAF는 명시적 nonce에만 활성화한다. host RTL_WAVEFORM_RENDER_TEST=1 + ExtensionMode.Development/Test에서 숨은 진단 명령 getWaveformRenderProfile/probeWaveformRenderer를 등록하며 Production에는 등록하지 않는다. Reload/loading 시 nonce 폐기, pending32/sample16/rows32 한도, 저장 상태 분리를 유지한다. 정상 worker/UI 계약은 동일하다.

최종 관련28 PASS/typecheck/build exit0. actual run-risLLx:8editor/32visible samples/24cursor probes(X/Z·정확 시간)/9exit/peer/SHA/host exit0. query median7.75ms/draw4.65ms/init→first doubleRAF62.1–97.7ms; 관측 구간 포함 phase loop52.36ms. doubleRAF는 표시 기회일 뿐 실제 pixel present/물리 latency는 아니다. init 기준은 parser/iframe startup을 제외한다. RSS204→final403MiB 초기 회수 미입증. 이전 run-FceDu2는 functional PASS이나 loop 범위에 probe 관측을 누락하여 최종 harness로 재검증했다.

다음32부모+128bit 행/실제 전이가 있는 origin 근처 viewport·dense zoom·reload/close 복구를 검증한다. 기본8신호 전체 범위 결과를 최대행 성능 수용으로 쓰지 않는다. 실제 사용자 설계/프로필/보존 경계·RSS/900ms 원인은 열려 있고, 깨끗한 OS 보류1도 유지한다. VSIX/examples/counter 수정 없음. 아래 F1F는 이전 기록이다.

## 이전 재시작 지점 — F renderer 경계 계측 (2026-10-06)

F1F bounded value reuse 적용. [범위·비교·재현](waveform-value-reuse.md). vcd.ts local pool4096항목/65536문자/값64char 이하, miss로 예산초과 시 남은 parse 비활성. real/wide bypass; identity/limits/query 동일. 비교 script는 marked block만 제거한 reference와 후보를 AB/BA24worker 비교한다. run-GeCWoZ 전체digest/SHA/exit 동일. 반복값 retained56.871→38.878MiB/중앙값parse663.64→717.33ms(+8.1%) 절충; 속도 개선이라고 쓰지 않는다. 초기 helper 후보 run-rodS7r는 고유값 overhead로 교체했다.

관련26 PASS/typecheck/build exit0. native profile run-w4sxss4cycles/9exit/pending close recover/peer/SHA/host exit0. parse697–916ms/open780–1078ms/phase loop41.75ms. RSS206→close347–370/최종386MiB; 이전native와 통제된A/B 아님, 초기회수/900ms원인 미입증. 다음 renderer first-ready/canvas frame·실제 webview query RTT를 명시적 진단으로 계측한다. 직접 worker 조회와 editor open을 렌더성능으로 쓰지 않는다. 큰3검증묶음/깨끗한OS 보류 유지, VSIX/examples/counter 변경 없음. 아래 F1E는 이전 기록이다.

## 이전 재시작 지점 — F 제한된 값 공유 비교 (2026-10-06)

F1E 진단 완료: scripts/profile-waveform-parser.mjs, npm profile:waveform-parser. 개발 도구만 추가했으며 제품 parser/worker는 변경 없음. [재현·근거·제약](waveform-parser-profile.md). run-SvRWin plain3/CPU1/할당1·5worker exit·SHA/전체digest/정확한X/Z query 통과, 관련24 PASS/타입 검사·개발 빌드 exit0. worker-local forcedGC는 진단에만 있다. fixture는 기존 waveform-scale-latest의4096신호/786432전이이며 없으면 build→verify-waveform-scale로 생성한다.

plain retained 증가56.878MiB, 자료해제→입력유지 기준선+0.117MiB.258종류 값의 post-parse canonicalization 실험은17.937MiB 절감·digest 유지. 이 실험은 파싱 중 lookup의 속도/한도 검증이 아니다. CPU/할당 원본은 run/parse.cpuprofile·parse.heapprofile. profiler heap/샘플할당과 plain liveheap을 섞지 않는다. timing은 환경 부하가 통제되지 않아 F1D 비교 금지. native RSS 초기 회수/900ms 원인 미규명 유지.

다음은 제한된 per-parse 정규화 값 공유 후보와 원본을 interleaved plain 조건으로 비교한다. entry/문자 예산·많은 고유/넓은 값으로 cache overhead를 제한하고 모든 전이digest·X/Z·real·alias·same tick·한도를 보존한다. 효과 확인 전 제품 적용/reader 공유/전체 모델 재작성 금지. 이후 renderer/실제 프로젝트·프로필/기록 경계 검증. VSIX/examples/counter 수정 없음; 깨끗한 OS 부재 보류1. 아래 F1D는 이전 재시작 기록이다.

## 이전 재시작 지점 — F parse CPU/할당·live heap (2026-10-06)

F1D 계측 구현·관련24 PASS·최종 타입 검사/개발 빌드 exit0. [구간/한계/재현](waveform-phase-profile.md). worker 요청 profile=true에만 read/decode/parse/hash 등 timings를 응답 envelope에 넣는다. 일반 client/metadata/값 계약과 보존 SHA는 유지. 격리 native suite RTL_WAVEFORM_PROFILE_TEST=1에서 기존 lifecycle fixture의 profile 모드를 사용한다. 다른 flag와 섞지 않는다.

run-hA0nMr: 실제4cycle/9exit/peer 유지/SHA 불변/host exit0. worker parse715.99–957.57ms가 editor open828.42–1118.35ms 대부분이며 read3.61–9.83ms, 잔여 roundtrip48.22–64.20ms. phase loop max41.88ms(초기 setup/취소 제외), 이전900ms 미재현·원인 미규명. 순수 IPC/실제 canvas paint 또는900→42 개선율이라고 쓰지 않는다. RSS 초기199→close422–448/최종469MiB, live heap/allocator 회수 미입증.

다음은 F parse CPU/할당과 살아 있는 worker heap을 계측해 전이/값 저장 비용과 종료 후 RSS 잔류를 구분한다. parseVcd는 이미 matchAll iterator·공유 canonical timestamp를 쓰므로 전체 split을 제거한다고 제안하지 않는다. 불필요한 공유 cache/모델 전체 재작성 전에 실제 할당 근거와 비교 조건을 얻는다. renderer 첫 paint/물리 조작·사용자 대표 프로젝트·실제 프로필/기록 경계 및 깨끗한 OS 보류1 유지. 사용자 examples/counter/VSIX 변경 없음. 아래 F1C 직후 순서는 이전 기록이다.

## 이전 재시작 지점 — F 지연 분리 계측 (2026-10-06)

F1C 취소 잔류 보완·관련26 PASS·타입 검사/개발 빌드 exit0. 실제 run-5rYxEQ 로딩 중 tab 닫기/재열기·두 custom editor4cycle·다른 reader 값 보존·9/9 exit·SHA 불변, receipt passed=true/host exit0. [문제·구현·재현](waveform-cancel-lifecycle-acceptance.md). waveform.ts는 abort 시 trace/metadata 제거·generation 갱신·session.dispose 대기 후 구독 정리; standalone 늦은 응답 게시 차단. peer는 invalidate하지 않는다.

tests/vscode/waveform-lifecycle.ts는 격리 diagnostic Worker wrapper로 actual reader exit와 값 조회를 관찰하며 suite flag RTL_WAVEFORM_LIFECYCLE_TEST=1이다. 물리 Cancel 클릭/보존 enum 실제 취소 완료 근거가 아니다. 그 준비 취소는 새 host 회귀2로 검사했다. RSS 초기202→close338–412MiB/최종433MiB, host loop max900.20ms는 임시200ms 초과. passed=true는 기능 정리이지 성능 PASS가 아니다. 이번4cycle 전체 시간15.86–33.53s이며 parser 시간으로 읽지 않는다.

다음은 F의 지연을 준비/파일 read/parse/metadata/IPC·webview/종료 단계와 warm 조건으로 분리 계측한다. startup/환경 부하로 단정하지 말고 근거를 얻는다. 공유 cache/컴파일러 변경을 성급히 도입하지 않는다. 실제 사용자 대표 설계/프로필/기록 경계 큰3묶음과 깨끗한 OS 부재 보류1 유지. 사용자 examples/counter 변경·VSIX 없음. 아래 A3/F 재시작 안내는 이전 상태다.

## 이전 재시작 지점 — A3/F 잔여 안정화 (2026-10-06)

U05 1차 구현·최종 관련52 PASS·native1 PASS·타입 검사/개발 빌드 exit0. [지원 범위·증거](waveform-enum-acceptance.md). enumSignals는 canonical enum 직접 변수/net·256bit/256항목; mapTraceEnums는 exact path/width/ambiguity 계약을 재사용하며 signal ID별 매핑이다. recorded-enums.ts는 loadRecordedInputs 전/후 검증 + overlays=[]이고 기존 runtime만 쓴다. Auto는 이름/Hex fallback, 숫자 override와 기존 저장 보기 호환. enum mapping을 저장 상태에 넣지 않는다. runtime 검증 취소도 전달한다.

실제 run06478a56-b814-4cad-bd8d-862a7d261b88에서 원본 이름 변경과 보존 변조 거절 수용. Reload의 기존 cursor0 문제를 보완했으며 동일 identity/revision0 새 group에만 시간 복원하고 peer 시간을 보존한다. 최종 GUI run-enum-PiWgE4 receipt passed=true/enumNames=true/traceReady=true/sourceUnchanged=true/cursor7486와 host exit0. 배열/struct/class 및 단독 trace 타입 추정은 미구현. examples/counter 사용자 소스 변경 없음, VSIX 없음.

다음은 loading 취소/재열기·두 reader의 실제 host 메모리/복구를 현재 UI에서 재확인하는 A3/F 작업이다. enum 분석이 기존15초 timeout/전체30초 loading 안에 들어오므로 대표 규모의 지연·취소도 함께 관찰한다. 기존 큰 검증3묶음(기록 구조 경계/실제 사용자 편집 프로필/대표 규모)과 깨끗한 OS 보류1 유지. U12 자동 발견과 D4/E/H/I를 완료로 바꾸지 않는다. 아래 U05 착수 안내는 이전 기록이다.

## 이전 재시작 지점 — U05 파형 enum 이름

U04 canvas 1차 구현·관련23 PASS·타입 검사/개발 빌드 exit0. 실제 보존 run에서 zoom/drag/scope 복원/Fit/15ns 값 수용, 최종 run-canvas-mRC2QW receipt passed=true/sourceUnchanged=true/traceReady=true/host exit0. [초기 fixture 종료 실패와 최종 범위](structure-canvas-acceptance.md). structure-canvas.ts는 host 명령 없이 viewport transform만 바꾸며 webview camera 최대32개를 root/mode/run/test/scope별로 저장한다. 기존200개 표시 제한·세로 배치 유지; 노드 자유 drag는 미구현.

다음 U05는 semantic enum 타입/값 매핑을 기록 실행 identity와 함께 검증하여 파형에 이름을 표시한다. 현재 정의를 옛 파형에 섞지 말고 이름 없는 값/X/Z/자료 부족 fallback을 유지한다. 이후 A3/F 잔여 게이트, U12 자동 발견은 별도 제안이다. 아래 U04/U03 착수 안내는 과거 기록이다.

U03 구현·관련33+보존 회귀10 PASS, 타입 검사/개발 빌드 exit0. 실제 격리 host run-C5lwZR native2 PASS, DUT 변경/복원·dirty TB 분리·저장 후 해당 대상 격리·waveform 설정 변경/복원 receipt passed=true/exit0. [증거·제한](input-freshness-acceptance.md). compareConfiguredResultInputs는 자동 package 순열만 기록에서 복원하여 저장 입력 equality를 검사하고 semantic 분석을 호출하지 않는다. InputFreshness는 순차 비교·취소·세대 보호이며 초기 matching은 확인 전 표시하지 않는다. 변경 관련 최소 hash cache는 아직 없다.

다음 U04는 기존 Structure의 현재 scope 자동 배치에 pan·포인터 중심 zoom·Fit을 추가한다. 내부 진입/Back/Up·소스 이동·기록 identity/공유 커서를 유지하고 RTL을 수정하지 않는다. 이후 U05→A3/F. 아래 U03 착수 문구는 당시 기록이다.

추가 요구 U12는 [프로젝트 탐색 설계 제안](project-discovery-direction.md)으로 기록했다. 후보 자동 발견·실행 설정 기억·선택적 소스 범위/기존 목록 가져오기이며 아직 미구현이다. 기존 manifest가 권위 있고 현재 semantic 진입에도 설정이 필요하므로 단순 전체 glob 확대를 자동 의존성 해결로 간주하지 않는다. 이번은 방안 비교 요청이며 U03 실행 순서를 변경하지 않았다.

U02 구현: container `rtl-simulation`(container ID에 점은 허용되지 않음), 기존 view ID rtl.start/rtl.results 유지. Tests/Run History·canSelectMany·행 실행/파형/소스·제목 Run All/Stop/선택 실행·설정 overflow. 빈 view에서 message를 undefined로 두어 welcome을 가리지 않는다. snapshot 테스트별 running은 표시 이름 대신 entry ID로 판별한다. 새 명령 rtl.runFile은 받은 파일 URI로 manifest를 다시 확인하고 공유 TB 여러 설정은 picker로 선택, 취소 시 실행 없음. 기존 F5의 다중 매칭 실행 동작은 유지했다.

관련24 PASS, typecheck/build exit0. 실제 전용 화면·TB/DUT 메뉴 필터·행 native counter_basic PASS16.052s와 새 run5b618c80-a0b2-4068-b76f-3de548455961 VCD 열기 확인. [수용 범위](simulation-panel-acceptance.md). U11 사용자가 원하는 **tb/ 실제 파일 행 hover ▶는 공개 API 제약으로 미구현**, 현재 우클릭과 editor/title은 대안이다. 독립 IDE workbench 요구로 남겼으며 완료라고 쓰지 않는다.

다음은 U03: 최신 테스트 행에서 입력 변경 상태를 표시하되 PASS/FAIL·미저장·확인 중/확인 불가를 구분한다. 기존 compareResultInputs, 준비된 package 순서, 보존 입력 identity를 재사용하고 RTL 전체 변경마다 무제한 semantic 분석하지 않는다. 그 뒤 U04→U05→A3/F. 아래 U02 착수 안내는 당시 기록이다.

U01 단일 커서 구현·관련 waveform34+structure-view7 PASS, typecheck/build exit0. 격리 VS Code1.140.0에서 두 도구·Zoom drag·14.788ns cursor 조회·10ns Snap 확인, host exit0. [범위와 남은 검증](waveform-cursor-acceptance.md). 옛 a 상태/공유 시간 계약 유지, B는 무시. 새 VSIX/설치 없음.

다음은 [IDE UX 설계](ide-ux-direction.md)의 Simulation Activity Bar다: 테스트 목록과 Run All/선택 실행/Stop, 테스트 행 Run/파형/소스 액션, 샘플은 시작 안내로 분리. Testing API/Core runner 재사용, 테스트 이름은 manifest에서 읽고 하드코딩하지 않는다. U03 outdated는 다음 별도 작업이며 PASS/FAIL을 바꾸지 않는다. 이후 U04 canvas→U05 enum→잔여 A3/F. 기존 하단의 '다음 enum'은 과거 순서다.

큰 검증3묶음과 깨끗한 Windows 환경 부재 보류1은 그대로다. 현재 사용자의 examples/counter 변경 소스를 자동 고치지 않는다. 이 파일 하단의 재현 명령·운영 주의점을 보존했다. 전체 상태 관리는 project-roadmap, 짧은 최근 결과는 PROGRESS, 날짜별 증거는 acceptance/verification에 기록한다.

# 최신 인수인계 — 모든 담당 모델 공통

최신 UX 제안(2026-10-05): [Simulation 전용 Activity Bar·결과 outdated·schematic canvas·단일 커서](ide-ux-direction.md)를 읽는다. 사용자는 검토/구체화를 요청했다. 이번에는 문서만 추가했고 실제 UI는 아직 변경하지 않았다. A/B·B checkbox를 없애고 Cursor/Zoom range만 두는 명시적 변경 요청을 기록했다. 실행 순서 후보는 문서 마지막에 있으며 기존 enum/검증을 완료로 처리하지 않는다.

사용자 성능 방향 추가(2026-10-05): 자체 엔진의 C++ 변환 여부보다 빠른 반복 설계/실행과 증분 빌드를 원한다. [공식 조사·현재 cross-run cache 부재·후속 후보](simulation-performance-direction.md)를 읽는다. 조사/문서만 추가했으며 성능 개선 구현·benchmark PASS가 아니다. enum/파형 UX의 다음 순서를 자동 변경하지 않는다.

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


갱신: 2026-10-04 / 작업 폴더 `D:/Dev/verilog_ide` / Windows x64.

## 첫 실행 순서

루트 AGENTS.md → [architecture](architecture.md) → [verification](verification.md) 상단 → [delivery-plan](delivery-plan.md) → 이 문서 순으로 확인한다. [루트 진행현황](../PROGRESS.md)은 요약이다. [초기 요구 점검](product-audit.md)과 [시각 디버깅 계획](visual-debugging-roadmap.md)은 범위/방향의 기준이다. 과거 [GPT-6 Sol 인수인계](handoff-gpt6-sol.md)는 역사와 상세 참고이며 현재 작업 지시는 이 문서가 우선한다.

## 이전 체크포인트 기록

D2B2 보존 실행 GUI 구조 탐색 완료 (2026-10-04): 결과 메뉴 Explore Recorded Structure가 특정 run의 검증된 Project/TestTarget을 기존 SlangProvider에 전달한다. 현재 manifest/미저장 overlay를 읽지 않고 화면·tree·탐색 이력을 current/recorded 및 run ID로 구분한다. 현재 원본 변경은 보존 view를 덮지 않으며 보존 입력 변경/손상은 stale·재검증 실패로 이동을 차단한다.

최신 검증: 일반108/typecheck/build 통과. 실제 보존 GUI run-A2LYPy(2 PASS + archived 구조/readonly 정의/손상 차단/현재 전환) 및 전체 GUI run-gQnoQ5(성공5/의도한 실패1/취소1) receipts passed=true/exit0. `.dev/d2b2-final-unit.log`, `.dev/d2b2-final-recorded-vscode.log`, `.dev/d2b2-full-vscode.log`. 실제 host API 검증이며 물리 UI 수용은 아니다. Compiler/runner/CLI 동작은 바꾸지 않았고 이전 native11/CLI receipts는 과거 근거로 유지한다.

보존 구조의 instance/definition/port/parameter source 링크는 공통 recorded-source host를 통해 당시 사본의 정확한 위치를 readonly 문서로 연다. Core가 검증한 sourceMappings 외의 파일은 열지 않고 URI는 run directory까지 포함해 중복 ID/다중 프로젝트를 분리한다. Explore current design은 명시적으로 현재 문맥으로 돌아간다. 다음은 D2B3 include/package 보존 계약; 값/클럭/trace 연결은 여전히 후속이다.

코드: core/snapshot.ts sourceMappings 추가(저장 schema/실행 동작 변경 없음), vscode/recorded-source.ts 공통 readonly 소스 provider, structure.ts current/recorded selection·양끝 archive 검증·run 키·watcher 격리, structure-view.ts provenance 안내, extension.ts 결과 메뉴 dispatch. source URI에는 run directory가 들어가 ID가 같아도 문서가 섞이지 않는다. selected의 recorded result는 요청 시 clone하여 고정한다. 현재 GUI를 fork하거나 새 semantic 분석기를 만들지 않았다.

회귀: structure-host(archived overlays 제외/원본 무시/run 전환/손상), structure-view(XSS/provenance), recorded-source(허용 파일/위치/동일 ID 다른 workspace), tests/vscode/recorded.ts 실제 native 구조·소스/문맥 검증. 초기 실제 host run-kbughh는 fixture 복구의 늦은 watcher 알림으로 current refresh가 취소돼 실패했다. fixture 복구 후 500ms settle을 넣어 run-A2LYPy가 passed=true/exit0로 통과했다. 현재 source 변화 시 분석 취소라는 보수적 기존 동작을 테스트에서 제거하지 않는다. 물리 UI 수용으로 확대하지 않는다.

D2B1 보존 소스 첫 범위 (2026-10-04): Verilator가 프로젝트 안의 명시적 소스 사본을 `.rtl/runs/<run>/inputs/`에서 빌드한다. 원본이 컴파일 직전 바뀌어도 결과와 사본의 연결이 유지된다. include 디렉터리·include 문자열·package 그룹·외부 경로는 아직 보존을 지원하지 않으며 기존 입력으로 실행하고 inputSnapshot=unavailable/이유를 기록한다. 기존 backend는 capability opt-in 없이 사본으로 전환하지 않는다.

최신 근거: 일반105/typecheck/build, native11, 보존 GUI run-VwRA80 receipt(2 PASS/readonly type 경로), CLI d2b-cli-receipt(2 PASS/현재 manifest 없이 archive hierarchy) 통과. 초기 전체 host run-xSyxi3에서 취소가 정리 지연 중 timedOut으로 바뀌는 문제를 발견해 timer 우선순위를 수정했고 final unit에 slow-cleanup 회귀를 추가했다. 실제 전체 suite 재검증 최종 근거는 verification 상단을 따른다. 초기 WorkspaceEdit 기반 readonly 테스트는 실패했으며 사용자 type 경로의 최종 테스트만 수용 근거다.

최종 전체 VS Code도 통과: `.dev/d2b-final-vscode.log`, run-XDlo5D receipt passed=true/exit0, 성공5/의도한 실패1/취소1. 취소 결과는 cancelled로 유지됐고 이번 fixture의 정리는 756ms였다. MSYS2 지연 전체를 해결했다고 확대하지 않는다. 일반105·native11·보존 GUI2 PASS·CLI2 PASS와 함께 verification 상단을 최신 기준으로 사용한다.

Core loadRecordedInputs는 run/result·원래 설정·파일 해시·경로/심볼릭링크·추가 파일을 검증하여 같은 top/defines/waveform의 Project/TestTarget을 반환한다. CLI hierarchy --run RUN_ID는 이 입력을 기존 SlangProvider에 전달하며 현재 rtl.toml 없이도 동작한다. GUI 결과의 Open Recorded Source는 당시 첫 테스트벤치 사본을 rtl-recorded 읽기 전용 문서로 보여준다. 현재 구조와 파형의 자동 결합은 아직 하지 않는다. 다음은 D2B2 보존 실행의 GUI 구조 탐색 및 include/package 지원 계약이다.

코드: core/snapshot.ts createInputSnapshot/loadRecordedInputs, runner.ts opt-in 분기/후검증, model/history snapshot metadata, Verilator capability, CLI hierarchy --run, extension rtl-recorded 문서 provider. unit input-snapshot.test.ts(4), actual integration snapshot.test.ts, actual host recorded.ts(환경 RTL_RECORDED_TEST=1)를 유지한다. readonly 사본은 출력 파일만 chmod하며 원본 권한/내용은 바꾸지 않는다. metadata/file 손상은 archived-context 로딩을 막되 기존 로그/파형/이력은 유지한다. 실패/취소 후 부분 사본은 ready로 읽지 않으며 자동 삭제하지 않는다.

이전 D2A 입력 식별 첫 범위 (2026-10-04): 공통 Core runner가 runId와 versioned SHA256 입력 지문을 결과에 저장한다. 저장된 sources/packages/test sources·include 경로/트리와 literal include 의존성·defines·top·backend/timing/waveform을 추적하고 실행 전후 변경을 구분한다. 결과 메뉴 Check Source Version 및 CLI history --verify-inputs가 같은 비교 모델을 사용한다. 과거/미지원 identity는 로그·파형을 보존하면서 legacy/unavailable로 안내한다. 미저장 입력은 GUI에 별도 안내하며 자동 저장하지 않는다.

최신 검증: 일반100/typecheck/build, 실제 Verilator 통합10, 실제 VS Code 전체 suite(성공5/의도한 실패1/취소1), 실제 CLI 두 테스트와 일치→변경 비교 모두 통과. `.dev/d2-final-unit.log`, `.dev/d2-integration.log`, `.dev/d2-vscode.log`/run-mskgxC receipt, `.dev/d2-cli.log`/d2-cli-receipt.json. 실제 host는 API 기반이며 물리 UI 수용은 아니다.

지문은 원자적 compiler snapshot이 아니다. 동적/찾을 수 없는 include·symlink·크기 제한은 unavailable, 실행 중 변경은 changed-during-run이다. 전후 관측 사이 변경 후 원복/도구 환경/모든 implicit backend 입력은 보장하지 않는다. matching은 과거 trace와 현재 diagram 결합 허가가 아니다. 다음은 D2B 불변 입력과 semantic/run 문맥 일치 계약이며 D3는 아직 시작하지 않는다.

코드: core/identity.ts captureInputs/compareResultInputs, model.ts InputIdentity/runId, runner.ts 전후 관측, history.ts legacy/future identity 보존. vscode/extension.ts 결과 메뉴 비교(현재 저장 프로젝트를 기존 package provider로 prepare), cli/cli.ts history --verify-inputs. tests/input-identity.test.ts와 tests/vscode/suite.ts 실제 비교 회귀를 유지한다. inputIdentity.settings는 canonical JSON 문자열이며 현재 manifest parameter override는 없다(소스 내 override만 파일 지문으로 추적). 도구/환경 식별은 아직 포함하지 않는다. 최종 일반100, typecheck/build 및 실제 CLI 두 테스트/변경 비교 통과. 실제 host/native 최종 근거는 verification 상단을 확인한다.

이전 완료 (2026-10-04): D1 정적 계층 탐색의 첫 범위. `packages/vscode/src/structure-navigation.ts`는 VS Code API 없는 이력/부모 관계 모델이다. `structure.ts`는 immutable async request context, generation/stale/nonce/allowed-target 보호와 native context flags를 투영한다. `structure-view.ts`는 내부 보기/더블클릭/Enter/Space, 경로·뒤로/앞으로/상위·View 선택·Change test를 제공한다. generate/instance array의 실제 부모를 사용하고 ID를 점으로 쪼개지 않는다. 같은 문맥의 refresh는 이력을 보존/잔존 부모로 복귀하며 project/test 변경은 같은 ID라도 초기화한다. 잎은 포트 연결만 보여주며 연산 그래프가 아니다. history는 창 세션에만 유지된다.

최신 증거: typecheck/build 통과, 일반94 (`.dev/d1-unit.log`), 최종 관련12 (`.dev/d1-final-navigation.log`), 실제 VS Code full suite (`.dev/d1-vscode.log`, run-vP8RDO receipt passed=true/exit0, 성공5/의도한 실패1/취소1). `tests/structure-navigation.test.ts`, `structure-host.test.ts`, `structure-view.test.ts`, `tests/vscode/structure.ts`를 유지한다. inline JS 이벤트 검증과 실제 host API 검증이지 물리 입력/시각 수용은 아니다. Core/backend/compiler는 변경하지 않았다. 아래 설치/C3/감사 체크포인트는 이전 완료 기반이며 다음 기능은 D2다.

최신 완료: 사용자 재개 요청 후 fresh-tools에 실제 독립 MSYS2/Verilator 5.050/GCC 16.2.0 설치 및 RTL smoke 검증 성공. 패키지 SigLevel=Required/잠금 정리 확인. 새 도구로 native integration 10개, 실제 VS Code 전체 suite (5 PASS/의도한 FAIL 1/취소 1), CLI check/개별/all (3 PASS/VCD) 통과했다. 기존 설치 A→실제 새 설치 B 전환과 중복 이름 다중 workspace도 PASS 3개로 확인했다. `RTL_TEST_SECOND_HOME`을 test:vscode:tools에 주면 junction 대신 해당 기존 설치를 B로 사용한다. 승인 대기가 해소됐으며 재승인/재설치를 요구하지 않는다.

근거: `.dev/fresh-install.log`, `.dev/fresh-post-install.log`, `.dev/fresh-integration.log`, `.dev/fresh-tool-switch.log`/host-r1gPL1 receipt, `.dev/fresh-vscode.log`/run-FXNCmA receipt, `.dev/fresh-cli.log`/fresh-cli-receipt.json. API host 검증과 현재 PC의 fresh store다. 의미 분석은 기존 slang runtime을 junction으로 재사용했고 새 slang 설치는 하지 않았다. 물리 UI는 computer-use 앱 승인 시간 초과로 미검증, 깨끗한 Windows OS/완전 GUI 승인 설치 수용도 아직 남아 있다. 다음 신규 기능은 D1이다. 아래 이전 증거의 B junction 판정은 host-SAlcqJ에만 해당한다.

최신 후속 검증: 일반 85개·typecheck 및 실제 VS Code 도구 경로 A→B/중복 이름 다중 workspace 실행 통과 (native PASS 3개, `.dev/remaining-tools.log`, host-SAlcqJ receipt). B는 동일 바이너리의 다른 junction 경로이며 compiler 버전 교체 검증이 아니다. 새 runner `npm run test:vscode:tools`와 `tests/vscode/tool-paths.ts`를 보존한다. 실제 HTTP 다운로드 중 취소/재시도와 fresh-store 설치 provider의 오류·잠금 정리를 추가 검증했다. 기존 GTKWave v3.3.100 재사용도 실제 버전 조회로 확인했다. 제품 코드 수정 없이 검증만 보강했다.

사용자가 재개를 요청하여 fresh-tools의 실제 MSYS2/Verilator/gcc 설치와 RTL smoke 검증을 통과했다. 독립된 새 설치지만 현재 PC의 fresh store이지 깨끗한 Windows OS는 아니다. 승인 대기로 되돌리거나 같은 저장소에 처음부터 설치를 반복하지 않는다. computer-use는 기존 사용자 프로필만 제어할 수 있었고 격리 개발 호스트 창을 찾지 못해 A3 물리 입력/파형 canvas 수용을 완료로 쓰지 않는다. 테스트용 background Code 프로세스는 정리했다. 상세 증거/한계는 verification 상단을 따른다.

최신 작업은 감사 보완 AUD-CACHE-1/AUD-CLI-1 수정이다. extension 설정 listener가 rtl.toolsDirectory 변경 시 공유 경로를 즉시 갱신하고 검증 캐시를 무효화한다. 검증/설치 시작 전에 generation을 캡처해 변경 전 결과가 캐시를 다시 채우지 않게 한다. 진행 중 작업은 반환받은 Toolchain을 유지하고 다음 실행은 다시 확인한다. CLI check는 내장 VCD와 외부 FST viewer를 구분한다. 일반 82개·typecheck/build 및 실제 VS Code 전체 suite 통과 (`.dev/audit-fix-unit.log`, `.dev/audit-fix-vscode.log`, run-PU4KDL receipt passed=true/exit 0, PASS 5/의도한 FAIL 1/취소 1). 다음은 D1이며 두 감사 결함을 다시 미수정으로 취급하지 않는다. [현재 재검증 피드백](current-validation.md)의 과거 감사와 후속 보완 기록을 함께 읽는다. 도구 경로 전환은 mock host 회귀로 확인했다; 실제 Windows compiler 교체/깨끗한 설치 수용은 별도로 미검증이다.

현재 마지막 완료 작업은 C3 실행 UI의 첫 범위다. RTL Start native tree에서 테스트를 선택하고 선택 대상 Run, 진행/Stop, 마지막 결과 메뉴를 사용한다. 상태 표시줄은 같은 view를 연다. `vscode/simulation-ui.ts`는 snapshot renderer, `simulation-summary.ts`는 VS Code 없는 formatter다. `extension.ts`의 existing execute/onStart/onResult/finally와 simulations set을 근거로 표시하며 Core runner를 복제하지 않는다.

선택과 active 집합은 workspace-qualified TestItem.id를 사용한다. 마지막 결과는 선택한 프로젝트 root/test 이름으로 필터링한다. 세션 결과 status count는 onResult에서 보관하므로 history refresh 이후에도 유지된다. 설치 거절은 blocked/no tests ran, 준비 중 parent 취소는 cancelled로 표시한다. Stop 행은 simulations set에 controller가 있을 때만 제공한다. Save/target resolution 단계는 취소 불가능하다. 대상 선택은 창 세션 내에서만 유지하며 상세 build/run 단계 분리는 아직 없다. 아래 C2/C1은 이전 완료 기반이다.

이전 C2 class/fork lexical template도 구현했다. `language/templates.ts`의 class는 이름 $1→본문 $0, SystemVerilog fork는 join/join_any/join_none native choice $1→본문 $0이다. Verilog fork는 join만 제공한다. `vscode/editor.ts`의 기존 direct Tab/completion snippet 경로를 재사용한다. 같은 줄 기존 코드/주석·macro 파일과 suffix에 기존 closer가 있는 경우 보수적으로 생략한다. virtual/typedef class 확장과 class/object semantic 지원은 아직 없다.

실제 host에서 fork 종료 선택란에 타입하면 leading tab이 사라지는 문제를 재현했다. `vscode/language-configuration.json`의 decrease 규칙은 join을 알지만 increase 규칙에 fork가 없었다. fork/named-fork 및 class 선언 시작 규칙을 추가하고 host 재검증을 통과했다. 들여쓰기 규칙을 되돌리지 말고 class/fork host 검증을 유지한다. 아래 label/enum/C1은 이전 완료 기반이다.

이전 C2 선택형 closing label도 첫 범위를 구현했다. `language/src/labels.ts`가 독립적인 lexical 삽입 계획을 만들고, `vscode/src/editor.ts`가 SystemVerilog-only refactor.rewrite 액션을 제공한다. named begin과 module/package/interface/program의 header 또는 closer에서 선택해 기존 이름을 덧붙인다. 기존 라벨을 고치지 않으며 한 번의 Undo를 실제 host에서 확인했다. 도구/manifest가 없어도 제공한다.

scanner의 hasDirective 플래그로 macro/전처리기 포함 파일을 보수적으로 제외한다. 전체 파일의 알려진 블록 짝을 확인하므로 extern prototype/assert property 등 복잡한 유효 구문에서도 액션이 생략될 수 있다. escaped 이름/함수·태스크·class 라벨은 미지원이다. 자동 타이핑/Enter/snippet 동작은 바꾸지 않았다. 아래 enum/C1 설명은 이전 완료 기반이다.

이전 C2 enum case 액션도 첫 범위를 구현·검증했다. 단순 enum identifier를 사용하는 빈 일반 case에서 Refactor의 Generate enum case branches 액션으로 값별 항목과 default를 생성한다. 기존 주석/closer를 보존하고 한 번의 Undo를 확인했다. 기존 항목 추가·복잡한 표현식은 아직 미지원이며, 전체 C2 완료를 뜻하지 않는다.

코드: `semantic/enum-case.ts` 문맥/삽입 계획, `model.ts` enumValues, `python/analyze.py` canonical enum과 compiler-verified spelling, `language-server/src/server.ts` versioned code action. 값은 compiler에서 읽고 package qualifier도 lookup으로 확인한다. 중복/unknown/invalid 값과 256개 초과는 보수적으로 생략한다. invalid enum initializer에서 native type 문자열 변환이 RuntimeError를 던지는 것을 실제 확인해 broken symbol만 제외하도록 방어했다. ConstantValue.empty()는 숫자 유효성 판정 API가 아니므로 사용하지 않는다. SVInt payload와 hasUnknown()을 사용한다.

C1 코드는 `semantic/model.ts` SignalType, `semantic/python/analyze.py` signal_type, `semantic/queries.ts` connectionPort/connectionRank, `language-server/src/server.ts` completion handler에 있다. `.port(` 직접 identifier 문맥에서만 정렬한다. scope-visible 후보를 유지하고 모르는 타입은 우선 일치로 취급하지 않는다. complex type/assignability/writable lvalue는 보장하지 않는다. syntax/name/semantic completion 및 signature help의 기존 동작을 보존했다.

## 이전 종합 검증 기록

2026-10-03 당시 감사 증거는 `.dev/recheck-unit.log`(76), `.dev/recheck-semantic.log`(11), `.dev/recheck-integration.log`(10), `.dev/recheck-vscode.log`와 run-SKYUOY receipt(passed=true/exit 0), `.dev/recheck-cli.log`다. 전부 skip 없이 통과. CLI는 GUI fixture를 `.rtl` 없이 복사해 check/individual/all 성공과 fatal 실패 종료 1을 확인했다. 아래 C3 증거는 이전 완료 참고이며 최신 판단은 감사와 verification 상단을 기준으로 한다.

- TypeScript checking/development build 통과.
- 일반 76개: `.dev/c3-unit.log`. 설치 거절/준비 중 취소, 네이티브 view의 중복 이름별 target ID/메뉴, timeout 포함 상태 요약을 검증했다.
- 실제 slang 이전 11개, skip 0: `.dev/c2-native.log`. compiler 로직은 이번에 바꾸지 않아 반복하지 않았다.
- 실제 VS Code+Verilator 최종: `.dev/c3-final-vscode.log`, `.dev/vscode-tests/run-HASUYq/project/.rtl/extension-test.json` passed=true/exit 0. 전체/현재/태그/선택 5회 성공, 의도된 실패 1회/취소 1회, 총 7개 결과. canStop/준비 취소 보강까지 반영했다. `.dev/c3-vscode.log`/run-KHwt7A도 이전 full pass 증거다.
- host RTL_SIMULATION_SELECTION_PASS / RTL_SIMULATION_STATUS_PASS가 선택/실행/실패/active/취소 정리를 확인한다. 이전 lexical/semantic/structure/waveform suite도 보존했다. timeout UI는 unit formatter/renderer, 설치 거절과 준비 중 취소는 mock host로 검증했고 깨끗한 Windows E2E라고 부르지 않는다.
- Core/Verilator 구현은 그대로지만 host 실행 콜백에 변경이 있어 실제 Verilator GUI 회귀를 수행했다. 전체 native integration suite의 나머지 FST/Unicode/timeout 세부 시나리오는 이전 verification을 기준으로 한다.

`.dev`는 무시되는 로컬 자료라 다른 PC에서는 없을 수 있다. 재현 테스트를 기준으로 다시 실행한다. 최초 점검 시 `.git`이 없었으므로 branch/commit/hash를 가정하지 않는다. 인수 시 실제 파일 상태를 먼저 확인하고 사용자 작업을 초기화/삭제하지 않는다.

## 다음 작업: D3B 보존 구조 값과 공유 시간 커서

1. D3A 첫 범위 구현은 완료했다. core/trace.ts captureTraceIdentity는 동일 source snapshot/run ID의 artifact hash/size/format을 기록한다. 128 MiB streaming capture, 32 MiB VCD load 한계와 file regular/symlink/concurrent edit checks가 있다. loadRecordedTrace는 레거시/미지원·다른 run/source·교체 trace를 거절한다. trace ready는 artifact byte identity이며 VCD 문법 검증은 기존 parseVcd가 한다. history는 malformed/future trace metadata를 unavailable로 바꾸되 정상 logs/waves를 유지한다. SHA는 일반 파일 변경 검출이지 metadata까지 악의적으로 수정하는 공격의 인증 서명이 아니다.
2. waveform/trace-map.ts는 Core/VS Code/semantic runtime 의존 없는 structural 모델이다. mapTracePorts는 semantic instancePath + width와 VCD scopeSegments/reference를 사용하고 문자열 dot split/suffix/module-name heuristics를 하지 않는다. 같은 code alias는 정상 channel이며 duplicate semantic paths/VCD roots/다른 code의 같은 선언 경로는 ambiguous다. escape marker 정규화만 하며 backend 이름 encoding을 추측하지 않는다. 현재 simple integral port만 지원; missing/width-mismatch/unsupported는 값을 연결하지 않는다.
3. semantic bridge는 compiler symbol.name으로 segments를 만들고 실제 array 부모에 index를 합친다. 기존 hierarchy.id/navigation과 별도이며 ports.signalType은 기존 공통 signal_type에서 얻는다. 파형 parser는 기존 name/scope/path를 보존하면서 raw scopeSegments/reference/range를 추가했다. `rtl trace --run UUID --json --project folder`는 Core 검증→보존 hierarchy→사후 source 검증→pure mapping을 수행한다. 이전 metadata 없는 결과는 waveform view만 허용하고 자동 backfill하지 않는다.
4. D3B의 첫 UI는 ready archived run의 port 값과 선택 시각이다. source/trace 식별을 모두 검증하고 waveform worker가 파싱한 bytes가 해당 hash임을 보장한다. loadRecordedTrace 후 같은 path를 별도 worker에서 재개방하면 race가 생길 수 있으므로 검증된 buffer 전달 또는 worker 내부 hash check 계약을 정한다. 매 query에 source 전체를 재해시하는 낭비 대신 invalidation/generation 경계를 설계한다. 현재 waveform editor와 structure host는 아직 cursor/values를 공유하지 않는다.
5. trace/source 변경 watcher, run 변경/현재 모드 전환/닫힘/취소에서 오래된 값 응답을 차단한다. 구조 webview nonce/target/generation 보호를 유지하고 값은 plain text로 escape한다. 신호가 없거나 모호하면 상태를 보여주고 X/Z를 유지한다. clock playback/live stepping이라고 부르지 않는다. alias code를 공유해도 instance/port 선택을 섞지 않는다. 정확한 bigint/decimal time을 기존 query/model로 전달한다.
6. D3B 이후 사용자 합의한 패키징 gate는 A3 실제 사용자 프로필 입력/버튼 흐름, 깨끗한 Windows 승인 설치→실행→파형, 결과/취소/실패/복구와 대표 프로젝트 성능·데이터 보존이다. 이후 첫 제한된 베타 패키지→사용 피드백 수정→초기 안정 버전 판단. D4/E/G/H/I 완료를 첫 베타 선행 조건으로 삼지 않는다. 지금은 개발 build/검증만 한다.

배포 VSIX/새 설치는 사용자 요청 전 수행하지 않는다. 기존 fresh-tools 승인/검증은 완료했다. 물리 UI/깨끗한 OS/완전 GUI 설치 수용과 큰 설계 성능은 계속 열린 항목이다. Root/architecture/verification/delivery-plan/README/이 문서를 다음 담당자가 채팅 없이 이어갈 수 있게 갱신한다.

## 반드시 보존할 방향과 제한

최종 목표는 독립 RTL IDE이며 extension-only 제품이 아니다. Core·language·semantic·waveform 모델은 VS Code 독립, GUI/CLI 실행은 공통 Core, slang semantic과 simulation backend는 분리한다. generated run은 `.rtl/`, shared tools는 외부. 설치 승인/신뢰/취소를 유지한다. build/검증만 하고 VSIX packaging/install은 사용자 요청 전까지 하지 않는다. 급히 Code-OSS fork나 전용 compiler 구현을 시작하지 않는다.

모듈 포트/parameter와 일반 function/task 안내는 구현돼 있다. class/object/system call은 제외된다. declaration defaults와 actual override를 구분한다. begin inline cursor 복원 코드는 실제 editor 문제를 고친 것이므로 제거하지 않는다. Include 소속 정확성·중첩 프로젝트·큰 설계 성능, 내장 FST/live trace, 연산 다이어그램은 아직 제한/후속 범위다.

## 환경·코드·검증 명령

아래는 현재 PC의 경로다. 제품 기본 설정에 박아 넣지 않는다. Native tests의 환경 변수가 없으면 skip되는 점을 주의한다. 사용자 profile 대신 격리된 fixture만 검증한다.

## 6. 코드 지도

| 영역 | 진입 파일 |
|---|---|
| manifest/glob/package 순서 | `packages/core/src/config.ts`, `project.ts` |
| 실행/결과/취소/이력 | `packages/core/src/runner.ts`, `model.ts`, `process.ts`, `history.ts` |
| simulator adapter | `packages/verilator/src/` |
| 도구 경로/설치/slang runtime | `packages/toolchain/src/detect.ts`, `install.ts`, `semantic.ts` |
| lexical/블록/템플릿 | `packages/language/src/`, `packages/vscode/src/editor.ts` |
| semantic 모델/문맥/native 요청 | `packages/semantic/src/model.ts`, `queries.ts`, `slang.ts` |
| 실제 slang 분석 | `packages/semantic/python/analyze.py` |
| LSP와 host lifecycle | `packages/language-server/src/server.ts`, `packages/vscode/src/semantic.ts` |
| GUI commands/testing | `packages/vscode/src/extension.ts`, `packages/vscode/package.json` |
| 구조 tree/diagram | `packages/vscode/src/structure.ts`, `structure-view.ts` |
| 내장 waveform 모델/reader | `packages/waveform/src/model.ts`, `vcd.ts`, `query.ts`, `worker.ts`, `client.ts` |
| 파형 host/renderer | `packages/vscode/src/waveform.ts`, `waveform-html.ts`, `webview/waveform.ts`, `webview/waveform.css` |
| 테스트별 저장 보기 | `packages/waveform/src/views.ts`, `packages/vscode/src/waveform-views.ts` |
| CLI | `packages/cli/src/cli.ts` |
| 실제 editor tests | `tests/vscode/suite.ts`, `editor.ts`, `semantic.ts`, `structure.ts`, `waveform.ts` |
| native tests | `tests/semantic/*.test.ts`, `tests/integration/*.test.ts` |

수정은 src에 한다. dist는 build 산출물이다. Python bridge는 build에서 extension/CLI dist로 복사되므로 소스만 바꾸고 stale dist를 실행하지 않는다. 기존 저장 파형 보기는 profile-local이고 source/run과 별개이며 임의로 삭제하지 않는다.

## 7. 검증 명령 — PowerShell, 저장소 루트

이 PC에는 Node와 node_modules가 있다. 인수 시 다시 확인한다. 기본 npm 명령이 실행되지 않으면 이미 있는 `.dev/npm/package/bin/npm-cli.js`를 Node로 실행할 수 있다. 테스트 때문에 도구를 다시 설치할 필요는 없다. 아래 절대경로는 **현재 PC의 검증 경로**이며 제품 코드에 넣지 않는다.

기본 검사:

```powershell
Set-Location D:\Dev\verilog_ide
node node_modules/typescript/bin/tsc --noEmit
node scripts/build.mjs
node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
```

실제 slang (환경 변수 없으면 native tests가 skip되므로 출력 확인 필수):

```powershell
$env:RTL_SEMANTIC_PYTHON="$PWD/.dev/rtl-dev/tools/slang-11.0.0-python-3.14.7/python.exe"
node node_modules/tsx/dist/cli.mjs --test tests/semantic/*.test.ts
```

실제 VS Code 편집/semantic/구조/파형:

```powershell
$env:RTL_DEV_HOME="$PWD/.dev/rtl-dev"
$env:VSCODE_EXECUTABLE='D:\Tools\Microsoft VS Code\Code.exe'
$env:RTL_SEMANTIC_TEST='1'
$env:RTL_EDITOR_ONLY='1'
node scripts/test-vscode.mjs
```

전체 host 시뮬레이션 회귀가 필요한 경우 위 설정에서:

```powershell
Remove-Item Env:RTL_EDITOR_ONLY -ErrorAction SilentlyContinue
node scripts/test-vscode.mjs
```

실제 Verilator failure/timeout/waveform/path 회귀:

```powershell
$env:RTL_DEV_HOME="$PWD/.dev/rtl-dev"
$env:RTL_INTEGRATION='1'
node node_modules/tsx/dist/cli.mjs --test tests/integration/*.test.ts
```

`scripts/test-vscode.mjs`가 build 후 별도 profile/project를 만들고 `.dev/vscode-tests/run-*/project/.rtl/extension-test.json` receipt와 종료 코드를 검사한다. 콘솔의 한 PASS 문자열만으로 전체 통과라 하지 않는다. tool sandbox로 실제 프로세스 실행이 막히면 그 환경의 승인 절차로 필요한 실행만 요청한다. 보존 source host는 RTL_RECORDED_TEST=1 + test-vscode.mjs로 별도 수행한다(깨끗한 두 예제 run). 전체 suite를 수행할 때는 이 환경 변수를 제거한다. 취소 timer guard는 수동 abort 뒤 늦게 deadline이 와도 cancelled를 유지하는 수정이다; 원래 무조건 timedOut을 설정하도록 되돌리지 않는다. MSYS2 프로세스 정리 지연 전체가 해결됐다고 확대하지 않는다.

새 테스트는 관련 변경에 맞춰 선택하며 문서만 변경할 때 전체 native suite를 반복할 필요는 없다.

금지: `npm run package`, `scripts/package.mjs`, VSIX install. 개발 창은 기존 launch configuration을 **Ctrl+F5 (Run Without Debugging)** 로 실행한다. F5는 과거 debugger IPv6/IPv4 연결 문제로 extension host가 멈춰 command-not-found가 났다. 지원되지 않는 debugger address 옵션을 다시 추가하지 않는다. 과거 패키지를 설치해 문제를 덮지 않는다.


## 기록 유지 규칙

다음 담당자가 채팅을 몰라도 시작할 수 있도록 매 작업 후 PROGRESS와 이 문서의 ‘현재 멈춘 위치/다음 작업/증거’를 수정한다. verification은 과거 기록을 덮지 않고 새 날짜의 결과를 위에 추가한다. 계획·감사에서 오래된 미구현 판정을 현재 구현 상태로 갱신하거나 과거 기록임을 표시한다. README는 실제 사용법만 쓴다. `packages/vscode`의 문서 복사본은 packaging 산출물이며 개발 기록으로 읽지 않는다. 원문 아이디어는 보존한다.
