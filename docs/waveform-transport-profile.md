# F1P 밀집 파형 조회·전달 비용 계측 (2026-10-06)

F1O의 실제 창 정렬 검증 이후, 다음 개선 후보를 결정하기 위한 계측을 추가했다. 이번 작업은 제품 파형을 압축하거나 캐시하는 최적화가 아니다.

## 측정 계약

- 기존 명시적 render 진단 flag + Development/Test host 조건에서만 hostTiming을 전달한다. 일반 실행, Core 결과 및 저장 보기에는 추가되지 않는다.
- queueMs는 host가 요청을 받은 뒤 pump에서 시작할 때까지, windowMs는 session.window를 기다린 시간이다. 후자는 worker 조회/메시지 전달/호스트 callback 등을 포함한다.
- renderer의 queryRoundTripMs는 요청을 보낸 뒤 window 응답을 받기까지이며 drawMs는 별도다. clock 원점을 섞지 않고 같은 프로세스 내 duration만 전달한다. hostTiming은 알려진 두 필드만 finite/nonnegative/120초 이하로 수용하고 잘못된 값은 제외한다.
- 전체 왕복에서 host queue/window를 제외한 잔여는 양방향 webview 전달·직렬화·스케줄링·callback 등의 합이다. 순수 IPC 또는 단일 전달 방향의 측정이라고 부르지 않는다.
- native stress wrapper는 sparse/dense 각 한 개의 실제 32행 응답만 보관한다. 파형 UI/reader lifecycle 검증을 끝낸 후 JSON encode/decode와 structuredClone을 5번씩 측정하고 전체 결과 equality를 확인한다. 이 실험은 VS Code 내부 구현의 측정이 아니라 로컬 복사 비용의 참고치다. 보관한 두 payload 때문에 이번 RSS를 이전 기준선 시험과 직접 비교하지 않는다.

## 재현과 결과

기존 VS Code 1.140.0, `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `RTL_WAVEFORM_RENDER_TEST=stress`, `RTL_DEV_HOME=.dev/rtl-dev`, `node scripts/test-vscode.mjs`. 별도 manual suite flags는 사용하지 않는다.

두 격리 실행: run-ZPfvt9, run-qgFuCm. `.dev/vscode-tests/<run>/project/.rtl/extension-test.json`에 raw duration arrays, payload 크기 및 전체 검증 결과를 보관했다. 첫 실행 중에는 관련 unit tests도 실행했으므로 비교 기준/성능 개선 비율로 쓰지 않는다. 두 번째 실행은 다른 테스트를 병행하지 않았다. 같은 픽셀351/32부모/128bit 조건이며 단 두 번의 국소 관측이다.

| 구간 | 첫 실행 | 두 번째 실행 |
|---|---:|---:|
| dense worker query | 40.76 ms | 28.87 ms |
| dense worker 왕복 | 62.95 ms | 39.58 ms |
| dense host window | 63.05 ms | 39.65 ms |
| dense host queue | 0.017 ms | 0.003 ms |
| dense renderer 전체 왕복 | 137.4 ms | 84.0 ms |
| dense draw | 18.3 ms | 9.7 ms |
| latest burst renderer 왕복 | 175.1 ms | 120.2 ms |
| latest burst host queue | 0.003 ms | 29.08 ms |
| latest burst host window | 63.03 ms | 48.21 ms |

두 번째 dense 전체 왕복에서 host interval을 제외한 잔여는 약44.35ms다. 이 수치는 순수 직렬화 시간이 아니다. burst의29ms queue는 실제 진행 중인 이전 요청을 기다리는 비용이 있음을 보여주며 요청 전달뿐 아니라 조회 재사용도 후보가 된다.

| 실제 payload | JSON bytes | entries | 로컬 encode 중앙값 | decode 중앙값 | clone 중앙값 |
|---|---:|---:|---:|---:|---:|
| sparse | 289838 | 6112 changes | 0.705 ms | 2.038 ms | 8.191 ms |
| dense | 923982 | 11232 buckets | 1.840 ms | 5.334 ms | 12.682 ms |

bucket의 from/to/필드 이름이 행마다 반복된다. 값/경계 압축은 후보지만 데이터 크기만으로 지연 원인 전체를 설명하지 않는다. 클라이언트에서 커서만 옮길 때도 동일 viewport bucket 전체를 재계산·전달하는 현재 경로가 우선 후보다.

## 기능 검증과 한계

두 native 실행 모두 receipt passed/sourceHashPreserved/burstSawInFlight/reloadClosedWhileLoading/cancelReopenRecovered=true, 각각8생성/8실제worker exit, host exit0. 부모32/bit128 모든 값, zoom/Reload equality, peer 보존, 진행 중20연속 요청 최신 결과, loading tab-close 및 재열기를 확인했다. 물리 마우스 검증을 새로 수행했다는 뜻은 아니다.

관련40 tests PASS/0 fail/skip, TypeScript 검사 exit0, 개발 build exit0. 새 회귀는 host duration의 optional 전달/범위/이상값 제외와 renderer clock 값 보존을 확인한다. 기존 ordinary worker window/profiled window 결과 equality와 최신/취소/Reload 회귀는 유지한다.

두 번째 host-loop max35.06ms, RSS initial232366080/peak381964288/final362635264 bytes. 자료 보관 진단 영향이 있으며 baseline 회수 근거가 아니다. 이전900ms 지연 원인도 이번 관측으로 해결됐다고 하지 않는다. 전체 밀집 파형 성능 수용/60fps/대표 설계 검증은 아직 아니다.

## 다음 실행 결정

다음은 **동일 viewport에서 cursor만 바뀐 요청의 제한된 재사용 후보**를 원본과 비교한다. 기존 queryValues 계약을 활용할 수 있지만 실제 채택 전에 아래 경계를 검증해야 한다.

1. 선택 신호 순서, from/to, pixels 및 reader 세대가 모두 같을 때만 재사용한다. 한 reader/한 viewport로 제한하고 Reload/close/loading에서 제거한다.
2. 커서값은 새로 정확하게 조회한다. offscreen bit 값, X/Z, aliases 및 큰 BigInt tick을 유지한다.
3. 오래된 응답/연속 cursor와 pan/zoom 혼합/Reload·취소·peer 회귀를 독립 oracle로 확인한다. persisted view/retained identity에 캐시를 넣지 않는다.
4. 전달량과 왕복·query/draw 비용을 구분해 원본/후보를 같은 조건에서 비교한다. 개선이 입증되지 않으면 채택하지 않는다.

대표설계/실제프로필/retained 구조/RSS/깨끗한Windows 게이트는 유지한다. VSIX·사용자예제·자체compiler·Code-OSS fork 작업은 수행하지 않았다.
