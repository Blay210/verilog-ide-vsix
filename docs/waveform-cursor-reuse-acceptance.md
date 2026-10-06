# F1R 커서 재사용 경계 검증·기본 적용 (2026-10-06)

F1Q의 검증 전용 후보를 경계 검사 후 일반 경로에 활성화했다. 같은 신호 순서/from/to/pixels에서는 cursor raw 값만 새로 받아 renderer의 최근 한 구간과 합친다. viewport가 바뀌면 전체 조회하고 loading/init/error는 재사용을 폐기한다. Core, worker 데이터, 절대시간 및 saved-view 계약은 그대로다.

## 추가 검증과 보완

실제 bundled 화면 코드를 실행하는 VM에서 values 응답이 진행 중일 때 resize, zoom, pan 및 pointer reorder를 각각 발생시켰다. 새 full query가 선택되고 늦은 values가 새 viewport를 덮거나 추가 요청을 만들지 않는 것을 확인했다. 새 full 응답 뒤에는 새 viewport에서 values 조회가 다시 가능하다.

최신 error에서 entry를 폐기하는 보완을 추가했다. 오류 뒤 다음 커서 요청은 full query다. row count가 잘못된 values 응답도 full query로 재시도한다. 이전 요청의 error는 latest ID 검사에 걸려 현재 상태를 폐기하지 않는다. loading 이후 늦은 values는 행을 되살리지 못하며 init은 full query로 시작한다.

helper 회귀는 sparse real(1.25/-2.5/3.0), 128bit·X/Z, empty selection, end=0 trace의 결과를 fresh queryWindow와 완전히 대조했다. row order 불일치도 재사용하지 않는다. 기존 큰tick/alias/XZ/source불변/선택 순서·수/pixels/from/to 검사도 유지한다.

diagnostic 없는 ordinary init에서 canvas pointer 입력으로 values 조회가 발생하고, 응답 후 진단 telemetry가 켜지지 않는 것을 확인했다. 테스트의 마우스 이벤트는 VM이므로 물리 클릭 합격이라고 표현하지 않는다.

## 기본 적용과 native 재검증

host가 모든 일반 init에 cursorReuse=true를 전달하고 values 메시지를 허용한다. 개발 A/B를 위해 명시 render 진단 모드의 `RTL_WAVEFORM_CURSOR_REUSE_TEST=0`만 원본 경로를 선택할 수 있다. Production은 이 환경변수 비교 override를 적용하지 않는다. diagnostics 자체는 기존 Development/Test + 명시 flag 조건을 유지한다.

`VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `RTL_WAVEFORM_RENDER_TEST=stress`, `RTL_DEV_HOME=.dev/rtl-dev`, cursor reuse 환경변수 제거 후 `node scripts/test-vscode.mjs`.

최종 native `run-lGGL2k/project/.rtl/extension-test.json`: passed/sourceHashPreserved/burstSawInFlight/reloadClosedWhileLoading/cancelReopenRecovered=true, 8생성/8실제worker exit, host exit0. raw parent32/bit128 값과 X/Z, zoom/Reload equality, peer, 진행중20연속 최신 응답 및 loading tab-close/재열기를 확인했다. 별도 enable flag 없이 values 요청3개가 관찰됐다.

동일 dense cursor step3/17/18의 왕복3.1/2.8/2.4ms. F1Q의 원본73.5–98.7ms와 비교되는 국소 합성 관측이며 전체 규모 성능 보장/60fps 수용은 아니다. payload1020bytes, 기존 구간은 renderer에 남는다.

관련42 tests PASS/0fail/skip, TypeScript 검사 exit0, native runner 개발 build/host exit0. ordinary init 추가 회귀 및 마지막 gesture 대상 수정 후 영향4 tests도 PASS. 사용자 examples/counter/VSIX/설치/배포는 수행하지 않았다.

## 다음과 남은 게이트

이 cursor-only 최적화는 기본 적용했다. 다음은 실제 연속 커서 드래그와 확대/이동이 섞이는 UI 반응성 확인이다. VM/native programmatic latest 회귀가 실제 compositor 표시나 물리 체감을 대체하지 않는다. 확대/이동처럼 viewport가 바뀌면 full payload/query 비용은 여전히 발생한다.

대표설계(수백 RTL/수천 신호), 실제 사용자 편집 프로필 충돌, retained 구조 경계, RSS 기준선 회수/이전900ms 지연 및 별도 깨끗한Windows 환경 부재 게이트는 유지한다. 전체 안정화 완료/배포 단계로 이동하지 않는다.
