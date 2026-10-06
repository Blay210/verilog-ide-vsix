# F1Q 커서 전용 조회 재사용 후보 (2026-10-06)

F1P 계측에 따라 같은 viewport에서 커서만 이동할 때 전체 bucket 재계산·전달을 피하는 후보를 구현했다. **검증 전용이며 일반 사용자 경로에는 아직 활성화하지 않았다.**

## 구현과 경계

`WindowReuse`는 renderer의 최근 viewport 한 개만 보유한다. 신호 ID의 순서, from/to 및 pixels가 모두 같을 때만 기존 changes/buckets/initial을 유지하고 기존 `WaveformSession.values`로 새 커서값을 조회한다. 결과는 기존 WaveWindow 형태로 합쳐 draw와 bit/enum 표시를 그대로 사용한다. from/to/pixels/선택 순서가 달라지면 full window를 조회한다.

loading/init에서 entry와 보낸 request를 제거한다. latest request ID를 먼저 확인해 오래된 values 응답을 무시하고 cursor/row count/ID 순서가 안 맞으면 full query로 복구한다. 데이터는 reader/window state 및 saved view에 저장하거나 다른 문서와 공유하지 않는다. 별도 worker cache, compiler, Core API 변경은 없다.

host는 명시 render 진단 flag와 Development/Test 모드에 더해 `RTL_WAVEFORM_CURSOR_REUSE_TEST=1`일 때만 후보를 init에 전달하고 values 메시지를 허용한다. 기본값/Production은 원본 full-window 경로다. candidate renderer도 명시 init flag가 없으면 values 응답을 받아들이지 않는다.

## 동일 fixture A/B

기존 native stress 실행에서 dense-max-rows 다음 cursor step3/17/18을 같은 범위로 조회하도록 추가했다. 원점9007199254740993ps, 32부모/128bit, pixels351, 4096steps. 원본 `run-ES1vGB`(flag0), 후보 `run-ajHhJd`, 최종 후보 `run-WXK22A`(flag1).

| cursor | 원본 전체 왕복 | 첫 후보 | 최종 후보 |
|---|---:|---:|---:|
| step3 | 98.7 ms | 4.3 ms | 3.4 ms |
| step17 X | 73.5 ms | 2.3 ms | 2.9 ms |
| step18 Z | 75.2 ms | 2.9 ms | 2.2 ms |

원본 full-window JSON 크기923982bytes와 달리 후보 values는 각1020bytes다. 기존 bucket은 renderer에 남고, 신규 커서 raw 값만 전달된다. 후보 draw는9.6–12.9ms이며 전체구간 그리기를 새로 최적화한 결과는 아니다. 별도 실행의 좁은 합성 자료 관측이고 일반 프로젝트 성능비율/60fps 보장이 아니다.

세 native 실행 모두 passed/sourceHashPreserved/burstSawInFlight/reloadClosedWhileLoading/cancelReopenRecovered=true, 각각8worker 생성/8실제 exit와 host exit0. 모든32parent/128bit 값, X/Z, zoom/Reload equality, peer, 진행 중20연속 요청 latest, loading tab-close/재열기가 통과했다. 물리 마우스 UX 검증은 수행하지 않았다.

## 회귀와 초기 검사 실패

관련41 tests PASS/0fail/skip, TypeScript 검사와 개발 build exit0. 마지막 guard 추가 후 영향받는3 tests도 PASS, 최종 native 후보 재실행 통과.

- helper는 큰 tick/aliases/X/Z의 merged 결과를 fresh queryWindow와 대조하고 원본 불변, signals 순서/수/pixels/from/to 불일치와 clear를 확인한다.
- 실제 bundled renderer를 VM에서 실행해 연속 values 요청의 늦은 응답 무시, 최종 부모/bit 값, loading 이후 늦은 응답 차단, 재초기화 full-window를 확인한다.
- 초기 새 VM assertion은 진단 double-RAF를 flush하지 않아 sample이 없었고, 이후 동일한 구조의 다른 realm 배열을 deepStrictEqual로 비교해 실패했다. frame flush와 canonical JSON 비교로 검사 환경을 수정했다. native 제품 실패로 세지 않는다.

## 다음 실행

일반 사용에 활성화하기 전에 cursor-only와 pan/zoom/resize/신호 재배치/값 응답이 **교차 진행되는** 회귀를 추가한다. real/wide/zero-end/sparse 자료 및 오류 후 full-query 복구도 확인한다. 최근 viewport가 read generation/loading/취소/peer 경계를 넘지 않음을 검증한 뒤 기본 활성화 여부를 결정한다. 후보 성능 개선이 보였다는 이유만으로 이 경계를 생략하지 않는다.

대표설계/실제프로필/retained 구조/RSS/기존900ms/깨끗한Windows 게이트는 유지한다. 사용자 예제/VSIX/배포/Code-OSS fork 작업은 수행하지 않았다.
