# F1J — 최대행 파형의 실제 마우스 조작 검증

2026-10-06. 제품 기능 변경 없이 개발용 수동 검증 준비·관찰 기능을 추가했다. `tests/vscode/manual.ts`는 격리 프로젝트 `.rtl/manual-dense.vcd`에 32개 8bit 신호, 4096시점, 131072전이를 생성한다. 기존 개발 진단으로 32부모/128bit 행과 활동 범위를 준비한 뒤 입력은 자동화하지 않는다. 마우스 조작은 computer-use의 Windows 입력 API로 따로 수행했다. 기존 사용자 프로젝트/예제/프로필은 변경하지 않았다.

## 실행과 증거

PowerShell에서 기존 Code.exe를 사용한다. 배포 패키징이나 확장 설치는 하지 않는다.

```powershell
$env:VSCODE_EXECUTABLE='D:/Tools/Microsoft VS Code/Code.exe'
$env:RTL_MANUAL_ACCEPTANCE='1'
$env:RTL_MANUAL_DENSE='1'
$env:RTL_WAVEFORM_RENDER_TEST='1'
node scripts/test-vscode.mjs
```

수동 모드가 render 자동 테스트보다 먼저 선택된다. `manual-ready.json`은 기존 준비 기록이고, 최종 코드의 `manual-dense-ready.json`은 실제 160행 응답까지 확인한 기록이다. 준비 제한은 20초, 수동 세션은 15분이다. 진단 샘플은 기존 nonce당16개 한도이며 `manual-render.json`은 최신 프로필을 관찰해 보관한다. 한도가 찬 경우 더 많은 조작을 위한 계측 세션으로 해석하지 않는다. 종료는 해당 격리 프로젝트의 `.rtl/manual-stop.json`에 `{"finish":true}`를 기록한다. receipt의 `passed`는 준비/종료·입력 SHA 확인이며 `acceptancePassed:false`는 물리 조작의 합격을 자동 판정하지 않는다는 뜻이다.

물리 조작 세션: `.dev/vscode-tests/run-lC8P9t/project/.rtl/`. 초기 코드로 실행했으며 아래 준비 대기 보완 전이다. 화면은 대화의 실제 Windows 캡처로 확인했다.

| 조작 | 실제 관찰/대조 |
|---|---|
| 휠 스크롤 및 스크롤바 드래그 | 상단 비트 행→중간 port_16→끝 port_31의 파형과 값 정상 표시. 상단 시간 눈금은 유지 |
| 아래쪽 port_21에서 Zoom range 드래그 | 범위가 9007199254740993–9007199254745088에서 9007199254741216–9007199254742657로 변경 |
| 아래쪽 port_22 행 드래그 | 순서 21,22,23,24,25→21,23,24,22,25. 응답 뒤 값/파형 복구 확인 |
| 실제 Reload 버튼 | nonce 변경. `before-reload.json`과 `manual-render.json`의 마지막 샘플: cursor/전체 rows/전체 details deep equality. 행 순서, 32부모/128bit 확장, 범위, raw 값 보존 |
| 좁은 Zoom range 드래그 | 범위 9007199254741425–9007199254741458, denseRows=0. 부모의 개별 값 전이와 bit의 X/Z/0/1 표시 확인 |
| 실제 Cursor 드래그 | 마지막 tick 9007199254741445(원점+452). 32부모 raw 값 및128bit DOM 값을 fixture 식과 전부 대조해 일치. `cursor-checked.json` |

밀집 구간 응답왕복192.3–347.7ms/그리기181.6–267.5ms, Reload 왕복288.1ms/그리기254.9ms. 최종 좁은 커서 구간 왕복8.9ms/그리기40.7ms. 입력 주입·캡처 시간이나 실제 compositor 표시 지연은 포함하지 않는 개발 프로필이다. 통제된 성능 비교/60fps/실제 사용자 규모 합격 근거가 아니다. 원점은 Number 정밀도를 넘는 합성 시간으로 일반 ns 파형 UX를 대표하지 않는다.

물리 세션 종료 receipt: sourceHashPreserved=true, acceptancePassed=false, host exit0. 최종 코드에서는 첫 응답/160행 응답을 명시적으로 기다리고 준비 시간 초과를 실패 처리하도록 보완했다. 최종 준비/종료 재실행 `run-KuVyAh`: `manual-dense-ready.json` 32부모/128bit 확인, SHA `aeef58f62182793afdbdc67033e60bb96874bab5dd2d3be6d6015e667165228d`, receipt SHA 보존/host exit0. 이 재실행은 준비 코드 검증이며 물리 조작을 다시 수행한 세션은 아니다.

관련31 tests PASS/0fail/0skip, 타입 검사/개발 빌드 exit0. simulator/worker/parser/제품 webview 변경 없음. 이전 F1I reader 실제 exit/peer/burst 결과는 [별도 근거](waveform-dense-recovery.md)이며 이번 수동 세션에서 reader exit 수를 새로 계측하지 않았다.

## 발견 사항과 다음 작업

- Reload는 선택/확장/순서/시간 상태는 보존하지만 세로 스크롤 위치는 위로 초기화한다. 다음 개선에서 스크롤을 상태와 분리해 안전하게 복원할지 검토한다.
- 큰 절대 시간에서는 라벨이 길고, 좁은 범위에서 부모 값 텍스트가 잘려 읽기 어렵다. 시간 origin+offset 표시와 라벨 겹침 억제를 별도 UI 개선으로 검토한다. 정확한 BigInt tick/실제 단위는 유지한다.
- 행 재배치/Reload의 응답 대기 동안 값과 plot이 잠시 비워진다. 불변 snapshot 유지 여부를 latest/generation 안전성과 함께 검토한다.
- 밀집 160행의 수백ms 작업은 여전히 개선 대상이다. 다음은 visible-row 그리기 비용을 계측하고, 후보는 scroll/reveal/resize/Reload/취소와 offscreen 값 유지까지 검증한다. 단순히 보이지 않는 canvas를 건너뛰는 변경은 금지한다.
- 이번은 단일 행 재배치/커서 및 범위 드래그 검증이다. Ctrl/Shift 그룹 이동, Esc 중단, 창 크기 변경, 초고속 물리 연속 입력, 실제 사용자 프로필/대표 설계와 전체 F 수용은 미완료다. 깨끗한 Windows 환경 부재에 따른 설치 검증 보류도 유지한다.
