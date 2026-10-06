# F1N 실제 파형 창 검증 중간 기록 (2026-10-06)

현재 절대시간 표시는 사용자 사용 경험에 따라 추후 개선할 수 있는 임시 디자인 결정이다. viewport-relative 표시로 되돌리지 않는다.

## 실제 관찰

- run-lxeoUg: 32 부모/128 bit, 긴 절대시간 두 줄 표시 확인.
- 실제 canvas 클릭 후 오른쪽 커서 선이 ruler와 trace에서 일치함을 관찰.
- canvas 포커스 Ctrl+-는 VS Code 화면을 축소하고 파형 범위를 유지했다. 일반 minus/equal은 파형 범위를 축소/확대했다. Signals 패널 접기로 폭을 바꾼 뒤 다시 클릭한 커서도 정렬됨을 관찰.
- 수치 프로필은 최초 2분 이후 새 결과를 거부했으므로 이 조작의 tick/값 oracle 수치 검증 근거로 쓰지 않는다. 기존 manual-render가 오래된 cursor를 유지하는 문제를 발견했다.
- run-lxeoUg harness 정상 종료/host exit 0. 자동 receipt는 전체 UI acceptance가 아니다.

## 보완 및 검증

진단의 initToDrawMs/initToFrameMs는 패널을 연 뒤 경과한 시간이다. query/draw latency와 같은 120초 상한을 적용하면 오래 진행하는 수동 검증 기록이 빠진다. init 경과 시간은 24시간까지 허용하고 query/draw는 기존 120초 상한, finite/nonnegative 검사, nonce 및 16 sample 제한을 유지했다. 제품 파형 계산/표시 동작은 변경하지 않았다.

실제 profiler에서 10분 뒤 요청한 큰 tick을 host timing validator에 통과시키는 회귀를 추가했다. 관련 39 tests PASS, TypeScript 검사와 개발 build exit 0.

수정 후 native run-oLKjWj를 시작했으나 사용자 물리 Escape로 Computer Use가 중단되었다. 이후 UI 입력을 수행하지 않았다. 수정 후 native 장시간 프로필 검증 완료로 표시하지 않는다.

## 다음 실행

1. 수정된 native host에서 2분 이후 cursor/range/값의 최신 진단 기록을 대조한다.
2. 동일 창에서 overflow 유무 전환 및 실제 창 폭 변경 정렬을 확인한다. VM의 160→1→160/DPR 검증을 실제 OS DPI 합격으로 표현하지 않는다.
3. 이어서 dense query/전달 비용을 조사한다. 대표 설계, 실제 사용자 프로필 충돌, 보존 경계, RSS/900ms 및 깨끗한 Windows 검증 게이트는 유지한다.

VSIX 생성/배포와 사용자 examples/counter 수정은 수행하지 않았다.
