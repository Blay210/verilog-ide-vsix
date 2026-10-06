# 4,096신호 파형 화면 수용 기록

2026-10-05 · A3/F 부분 수용. 기존 VS Code 1.140.0과 격리 지속 저장 개발 프로필에서 computer-use의 실제 키·마우스·드래그로 관측했다. 전체 A3/F, 사용자 프로필 충돌, 실제 설계 또는 메모리 수용 완료는 아니다.

## 실제 관측

| 흐름 | 확인한 결과 |
|---|---|
| 큰 정수 시간 fixture 열기 | 4,096신호 / 786,432전이 로드; 8신호 초기 선택; 목록 200개 제한 안내 |
| 초기 목록 밖 신호 검색 | `port_4095` 검색으로 1개 후보; 체크하여 9번째 파형 추가 |
| 큰 정수 시간 이동 | `9007199254740994 ps` → A `9007.199254740994 s`; port_0=0xZZ, port_4095=0x00 |
| 다음 Edge | A `9007.199254740995 s`; port_0=0x02, port_4095=0x01; 1ps 정밀도 유지 |
| 수정된 큰 시간 눈금 | 실제 재시작 화면에서 겹침 없이 표시, 범위 tooltip 유지 |
| Go 버튼 | 일반 시간축에서 `100 ps` 입력 후 버튼 클릭 → A=100ps, port_0=0x0A |
| 확대 및 좌우 이동 | 0–1910ps → 확대 0–955ps → 오른쪽 238–1193ps → 왼쪽 0–955ps → 축소 0–1910ps |
| 드래그 구간 확대 | Zoom range 선택 후 캔버스 드래그 → 372–711ps |
| 두 커서 비교 | B 도구로 드래그 → A=100ps, B=600ps, Δ=500ps |
| 잘못된 시간 및 복구 | `100 ns`는 범위 밖 오류; 기존 A/B/값 유지; Fit 후 전체 범위·정상 상태 복구 |

입력 후 화면/접근성 관측은 렌더링보다 먼저 반환될 수 있어 후속 관측으로 확정했다. 이 API 호출 시간은 제품 응답 시간 측정으로 사용하지 않는다. 이번 조작에서 지속적인 멈춤은 관측하지 않았지만 32신호 최대 선택·모든 화면 폭·고 DPI·밝은 테마의 성능/가독성을 보장하는 결과는 아니다.

## 발견과 보완

**A3-WAVE-RULER-1:** 큰 시간값에서 고정 6개 눈금의 긴 글자가 겹쳤다. VS Code 독립 `packages/waveform/src/ruler.ts`가 실제 글자 폭으로 양 끝을 먼저 배치하고 겹치는 내부 눈금/같은 timestamp를 생략한다. 눈금선과 조회 범위는 그대로이며 BigInt 시간·정확한 물리 단위 표현을 유지한다. 좁은 캔버스에서 맞지 않는 글자는 생략하고 canvas title에 전체 범위를 제공한다. 새로운 회귀는 큰 offset의 정확한 양 끝, 비겹침/비잘림, 좁은 폭 및 1tick 중복을 검증한다.

시간 입력 옆에 **Go** submit 버튼을 추가하여 Enter를 기억하지 않아도 이동할 수 있게 했다. 기존 Enter 경로와 입력 오류 검증을 재사용한다. simulation/Core/source 및 저장 보기 형식은 바꾸지 않았다.

## fixture 및 근거

- 원본: `.dev/scale-tests/waveform-0PfKkS/signals-4096-steps-192.vcd` (12,530,851 bytes), 시작 tick=9007199254740993, 1ps 단위. SHA256 `3f278c9ead41d41538db8e3e34f96edc775e2cf24f3c8287437199660c389f13`를 전후 확인해 보존했다.
- 일반 시간축 사본: `.dev/medium-ui/signals-4096-steps-192.vcd`. 각 VCD timestamp를 `(tick - 9007199254740993) * 10`으로 변환했다. 선언/값/전이 수를 유지하고 시작 0ps, 끝 1910ps로 바꾸어 확대/이동을 확인했다. SHA256 `cd870658ff2f752337676b6b10e72f62de43a2eac9661fefbe1fa8fa22ecc119`.
- 두 파일은 합성 standalone VCD다. 실제 기록 구조와 연결하지 않으며 TB 저장 보기 기능이 비활성이고 그 이유가 표시된다.
- 수정 전/후 개발 창 로그: `.dev/medium-ui-host.log`, `.dev/medium-ui-host-final.log`. 프로필/프로젝트는 `.dev/vscode-tests/run-rQSqPW`; `RTL_MANUAL_PERSISTENT=1` 재현 방법은 [저장 보기 기록](waveform-view-acceptance.md)을 따른다. 정상 종료 exit0.
- `tsc --noEmit` 및 development build 통과. 관련 테스트 **24 PASS / 0 fail / 0 skip**: `.dev/medium-ui-regression.log` (`waveform-ruler`, `waveform`, `waveform-link-webview`, `waveform-views`, `waveform-views-host`). 전체 일반/semantic/native simulation suite는 이번에 반복하지 않았다.
- 물리 화면 근거는 대화의 computer-use screenshot/accessibility 관측이다. `.dev/medium-ui-acceptance.json`은 관측 요약이며 자동 제품 수용 receipt가 아니다.

## 다음 실행 순서

다음은 격리 예제의 **RTL Start 테스트 선택/Run/Stop/결과/재실행 버튼 흐름**과 실패·취소 복구의 실제 UI 수용이다. 이후 남은 편집 문맥·package/function/task/parameter 물리 입력, 다른 TB/프로젝트 저장 보기 격리, 구조·시간 연결 화면 및 사용자 프로필 충돌을 확인한다. 실제 설계/메모리 회수는 계속 열린 항목이며 깨끗한 Windows 설치 종단은 별도 PC/VM 부재로 보류다. D4/E 확대 또는 배포 준비 완료로 표시하지 않는다. VSIX 생성·설치 없음.
