# F1K — 시간 눈금 정렬과 viewport 그리기

2026-10-06. 사용자 제보: 긴 시간에서 눈금과 실제 파형, 특히 커서 선의 위치가 어긋난다. 이전 구조의 ruler는 스크롤 영역 밖, trace는 scrollbar를 가진 영역 안이었다. 동일 시간→폭 비율을 사용해도 scrollbar가 차지하는 폭만큼 끝쪽 좌표가 달라질 수 있었다. BigInt 절대 시간의 정밀도 문제로 단정하지 않았다.

## 구현

- HTML의 `#traces` 안에 sticky `.ruler-row`와 `#trace-rows`를 함께 둔다. 둘은 같은 content width, scrollbar gutter, SIGNAL 열 폭을 사용한다. CSS `scrollbar-gutter:stable`로 overflow 변화도 안정화했다. 두 canvas는 같은 BigInt 시간 좌표 계산을 계속 사용한다.
- 매우 큰 원점(`from > span*1000`, 원점 표시16문자 초과)에서는 눈금을 `+상대 시간`으로 표시하고 footer에 `Origin 절대 시각 · +구간 길이`를 표시한다. ruler tooltip은 절대 시작/끝, 커서/이동 입력/실제 tick은 절대 시간이다. 일반 ns 파형은 기존 표시를 유지한다. 작은 화면에서는 기존 CSS로 footer range가 숨겨지는 제약이 남아 있다.
- draw 준비에서 canvas의 화면 rect를 쓰기 전에 읽는다. 화면+위아래43px overscan만 canvas 그리기/bit 전이 투영을 수행한다. 모든 부모/bit의 커서 label 값은 화면 밖도 갱신한다. DOM160행과 worker의 최대32신호 조회는 그대로 유지하며 전체 가상화/worker 전달 최적화는 아니다.
- scroll은 RAF 하나로 합쳐 현재 range/cursor와 일치하는 window에서 다시 그린다. 새 window가 필요한 scroll query는 보내지 않는다. mismatch/latest/loading 조건은 기존 draw guard를 유지한다. resize는 ruler와 scroll surface를 관찰해 다시 조회한다. theme redraw도 현재 viewport에서 수행한다.
- 행 재구성 시 현재 scrollTop을 복원한다. Reload loading 이전 위치는 별도 변수로 보관하고 init의 행 재구성 후 복원한다. 영구 저장 보기/진단 정보와 섞지 않으며 신호 수가 줄면 브라우저가 유효 범위로 clamp한다.

## 검증

관련35 tests PASS/0fail/0skip. 타입 검사·개발 빌드 exit0. 기존 enum/numeric/raw bits/loading/latest/cancel/reader dispose/query 검증을 유지했다. 실제 browser bundle VM 회귀는160행 생성,20개 미만 canvas paint, offscreen 값, 큰 원점의 ruler/trace cursor x equality, 상대 눈금, scroll reveal paint 및 worker 조회 없음, Reload 위치 복원을 확인한다. HTML 회귀는 ruler/rows가 하나의 scroll surface 안에 있는지 확인한다. VM은 실제 CSS layout/compositor를 대체하지 않으므로 native 관찰을 병행했다.

초기 native `run-lhbEyc`는 진단의 parentRows가0으로 실패했다. HTML 컨테이너 변경 후 진단 집계만 기존 `#traces.children`을 참조한 문제였다. `#trace-rows`로 수정하고 bundled 테스트에32부모/128bit 진단 집계 assertion을 추가했다. 실패 기록을 성공으로 취급하지 않는다.

최종 자동 native `run-T0BtBf/project/.rtl/extension-test.json`: passed=true,32부모/128bit 모든 값, medium/dense/zoom/Reload equality, 조회 중20연속 요청 최종값, Reload 로딩 중 닫기/peer/재열기,8reader 실제exit, source SHA, host exit0. 주요 왕복/그리기(ms):

| 사례 | query RTT | draw |
|---|---:|---:|
| medium 최대행 | 25.7 | 9.9 |
| dense 최대행 | 99.6 | 14.3 |
| dense zoom | 8.2 | 8.1 |
| burst 최종 | 107.7 | 12.3 |
| 취소 후 재열기 | 6.9 | 9.3 |

이 값은 단일 실행의 실제 viewport 비용이다. 이전 모든160행 paint와 통제된 통계 A/B/보장된 속도 비율 비교가 아니다. host loop43.97ms를 renderer/pixel latency로 해석하지 않는다. RSS peak370.55/final351.97MiB로 초기 회수 문제는 여전히 열려 있다.

실제 Windows 마우스 세션 `run-7uWK3q/project/.rtl/`:

- 큰 원점의 파형에서 커서 드래그: 상단 ruler의 삼각형/선과 아래 bit/bus 선이 일직선으로 표시됨.
- 스크롤바 드래그/휠로 port31까지 reveal: sticky ruler 유지, 새 아래 행 plot와 커서 정상 표시.
- 아래 위치에서 실제 Reload: 같은 아래 행 위치 복원. `before-reload.json`과 `manual-render.json`의 cursor/rows/details equality와 nonce 변경 확인.
- Signals 패널 숨기기로 plot 폭 변경: ruler/아래 cursor 정렬 유지. 실제 ruler 클릭도 아래 커서와 값으로 반영됨.
- 마지막 커서 tick=원점+2021,32부모/128bit raw 값 전체 oracle 일치(`cursor-checked.json`). 물리 세션 dense Reload RTT309.4/draw31.5ms, 마지막 ruler 클릭 RTT326.4/draw24.3ms. 자동 실행보다 큰 viewport/운영 부하로 결과가 다르며 성능 수용을 주장하지 않는다.
- manual receipt passed/SHA 보존/host exit0. `acceptancePassed:false`는 자동 receipt가 물리 UI 합격을 판정하지 않는 기존 계약이다. 화면 관찰 근거는 대화의 Windows 캡처다.

## 다음 작업과 제약

visible-row의 첫 후보는 적용·검증했다. 다음은 Ctrl/Shift 그룹 재배치·Esc 중단·overflow가 생기고 사라지는 선택 변경·실제 창 resize/DPI/zoom 조합의 정렬 및 reveal 회귀를 확인한다. 확대 단축키/일반 시간 눈금도 회귀 대상이다. 이번 panel 폭 변경을 모든 resize/DPI 환경 합격으로 쓰지 않는다.

dense query/전달은 여전히 수백ms일 수 있으며 요청 데이터 양/관측 구간을 다음 계측 대상으로 둔다. 재배치/Reload 응답대기 시 빈 plot, 짧은 bus 구간 값 텍스트 clipping은 별도 개선 대상이다. 대표 실제 설계/사용자 프로필/보존 경계/native RSS/과거900ms 원인·깨끗한 Windows 설치 검증 보류는 유지한다. compiler/simulator/worker/Core/사용자예제 변경과 VSIX 패키징·설치는 없다.
