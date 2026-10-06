# F1M — 절대 시간 눈금 복원

2026-10-06 사용자 선호: viewport 왼쪽 시각을 기준으로 하는 상대 눈금은 사용하지 않는다. 커서 정렬과 시간 표시는 별개다. F1K의 동일 scroll surface/column/gutter 정렬 및 viewport paint는 유지하고, 상대눈금/Origin footer는 제거했다.

`formatRulerTime(tick, timescale)`은 정확한 절대시간을 표시한다. `formatTime` 결과16문자 이하 또는 소수부 없는 값은 기존 한 줄이다. 더 긴 소수 시각은 두 줄: 정수 시각과 source timescale unit으로 표현한 나머지. 예: `9007 s` / `199,254,740,993 ps`. 합은 `9007.199254740993 s`. 현재 viewport의 from을 빼지 않으므로 pan/zoom에 따라 동일 tick의 표현이 바뀌지 않는다. magnitude는 fs 환산에 포함되며 나머지가 source unit으로 정확히 나눠지지 않을 때만 fs를 사용한다. BigInt 연산, 표시용 세 자리 comma, 원래 cursor/input/query는 그대로다.

사용자 예시 `9002.193029001 s`는16문자 이하여서 기존 한 줄이다. 긴 값만 나누는 목적이며 모든 큰 초 값을 무조건 두 줄로 바꾸지 않는다. 정수 초 carry는 다음 절대 초로 표시한다.

timelineRuler의 label 폭은 가장 긴 줄로 측정해 겹침/클리핑을 억제한다. 기존36px ruler에 두 baseline13/28px를 사용하고 단일 줄 baseline22px는 유지한다. 같은 label의 두 줄은 같은x에서 시작한다. 작은 화면에서는 수평공간 부족으로 label 일부가 생략될 수 있으며, cursor 전체시각과 tooltip은 정확한 절대값이다. footer도 기존 절대 시작–끝으로 복원한다.

공통 prefix를 한 곳에 고정하는 대안은 더 압축적이지만 기준과눈금을 떨어져읽어야 한다. 이번에는 각각의 눈금이 스스로 절대시각을 나타내는 두 줄을 선택했다. 이후 변경하더라도 사용자 승인 없이 viewport-relative 표시를 기본으로 되돌리지 않는다.

검증: 관련6 tests PASS/0fail/0skip, 타입 검사·개발 빌드 exit0. ruler 회귀의 ns/ps/10fs round-trip,16문자 기준,정수초carry,두 줄 measured nonoverlap와 bundled 실제화면 코드의 절대두줄/footer·큰원점 cursor x equality/viewport/group/Esc/resize-DPR 회귀를 포함한다. 최초 ns 예시가16문자 이하인데 두 줄을 기대한 test가 실패해 기대값을 기존 한 줄로 수정했다. native 물리 픽셀 재검증은 이번 범위에서 수행하지 않았으며 이전native회귀를 새결과로 표기하지 않는다. 패키징/설치/사용자예제/worker/simulator 변경 없음.

다음 실행 순서는 F1L의 native container shortcut·overflow/right-cursor resize 마무리→dense query/전달 계측을 유지한다. 대표설계/프로필/RSS/보존경계/깨끗한Windows보류도 유지한다.
