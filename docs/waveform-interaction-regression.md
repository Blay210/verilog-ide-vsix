# F1L — 그룹 이동·취소·폭/배율 회귀

2026-10-06. F1K의 viewport 그리기 후속 검증. 제품 수정은 파형 키보드 처리의 modifier guard 한 곳이며 Core/worker/simulator 계약은 변경하지 않았다.

## 발견과 보완

`#traces`에 포커스가 있을 때 기존 keydown은 `-`, `0`, 화살표를 modifier 여부와 관계없이 가로챘다. 파형 canvas 클릭은 이 컨테이너에 포커스를 주므로 Ctrl+- 편집기 확대 축소와 Ctrl/Alt 조합키가 충돌할 수 있었다. 이제 Ctrl/Meta/Alt가 있으면 파형 zoom/pan 처리를 하지 않는다. 일반 파형 단축키와 Ctrl+wheel zoom의 계약은 유지했다.

이는 코드 점검과 bundled 이벤트 회귀로 확인한 충돌이다. 수정 전 실제 창의 **신호 label** 포커스에서 Ctrl+-는 앱 확대 비율을 정상 변경했지만, 이것은 수정 대상인 **trace container** 포커스 검증과 다르다. 수정 후 실제 container 포커스의 Ctrl+- 재검증은 아래 사유로 미완료다.

## 자동 회귀

`tests/waveform-enum-webview.test.ts`의 실제 browser bundle VM 시나리오를 확장했다. 이전 enum/loading/latest/viewport/regression을 유지하며 다음을 검사한다.

- 실제 click handler의 Ctrl 비연속 선택 및 Shift 범위 선택 후 pointer capture drag로 그룹 이동. 표시 순서와8개 bit child 보존, 시간 커서 불변.
- row pointermove 후 Esc/lostpointercapture/늦은 pointerup: 순서 불변, 추가 worker 조회 없음.
- cursor 및 zoom-range pointermove 후 Esc: 원래 cursor/range 복원, capture 해제, 이전 응답이 늦게 도착해도 취소 결과 유지.
- trace container의 Ctrl/Meta/Alt+-: preventDefault/조회 없음, host shortcut에 전달.
- 96/333/801px 폭 × DPR1/1.25/2 조합: backing canvas 크기와 ruler/visible trace cursor x equality.
- 160→1→160행 변화 및 viewport 높이400→800: 선택/bit 행수 유지, 새 visible 행 paint.

VM은 실제 browser CSS scrollbar/OS DPI/키보드 전파를 완전히 재현하지 않는다. 초기 테스트는 target rect의 scroll 좌표를 무시한 drop 위치, Reload 후 폐기된 진단 nonce를 사용해 실패했다. target rect 기반 좌표와 새 init nonce로 보완한 뒤 최종 회귀를 통과했다. 제품 결함으로 기록하지 않는다.

최종 관련37 tests PASS/0fail/0skip. 이는 이전35개에 기존 waveform-order2개를 포함한 관련 검사 집합이며 새로37개의 기능을 구현했다는 뜻이 아니다. 최종 타입 검사·개발 빌드 exit0. 실행:

```powershell
node node_modules/tsx/dist/cli.mjs --test tests/waveform-enum-webview.test.ts tests/waveform-order.test.ts tests/waveform-ruler.test.ts tests/waveform-render-profile.test.ts tests/waveform-dense-window.test.ts tests/waveform-profile.test.ts tests/waveform-cancel-host.test.ts tests/waveform-link-host.test.ts tests/waveform-value-reuse.test.ts tests/trace-links.test.ts tests/waveform.test.ts
node node_modules/typescript/bin/tsc --noEmit
node scripts/build.mjs
```

## 실제 창 관찰

기존 [수동160행 harness](waveform-physical-ui.md)과 computer-use Windows 입력을 사용했다. `run-sGbRnL/project/.rtl/`:

- scrollbar로 아래행 reveal.
- port18 label 클릭, Tab으로port19 label 포커스, Shift+Enter로18–19 범위 선택. 두 행 선택 표시 확인.
- port18을port21뒤로 mouse drag: 표시순서18,19,20,21→20,21,18,19. `group-checked.json`의32parent/128bit와 실제순서도 확인했다. Ctrl+mouse의 비연속 다중선택은 이번 native 입력에서 직접 검증하지 않았다.
- label 포커스 Ctrl+-로 실제 앱 확대 비율 변경 후에도 ruler/trace 시작점과 커서 선이 일치하는 것을 관찰했다. 변경 뒤 viewport에 새로 보이는 행이 그려졌다. cursor가 원점에 있었으므로 끝쪽 좌표/DPI 회귀로 확대 해석하지 않는다.
- SHA 보존/manual receipt passed/host exit0. 이 세션은 modifier guard 수정 전 제품을 사용했다.

최종 guard 수정 후 `run-Pz50OV`:160행 준비 및 종료/SHA 보존/host exit0. 물리 입력 도구가 사용자 입력을 감지했고 창 선택 후에도 foreground가 바뀌어 최종 Ctrl+- 입력은 수행하지 않았다. 이전 좌표로 다른 앱을 조작하지 않았다. 이 receipt는 준비/종료 확인이며 `acceptancePassed:false` 계약을 유지한다. 새로운8reader lifecycle 재실행 결과는 없고 이전 F1K 근거와 구분한다.

## 다음 실행 순서

1. 별도 짧은 native 세션에서 **canvas 클릭→Ctrl+-**, 일반 파형 `-`/`+`/화살표, scrollbar overflow 변화와 커서가 오른쪽인 resize/앱 zoom 조합을 확인한다. physical Esc 중간 취소/비연속Ctrl 선택 및 여러 OS DPI는 아직 미검증이다.
2. 정렬/shortcut 회귀가 마무리되면 밀집 query/전달 payload와 응답대기 빈plot 개선을 조사한다. 현재 worker32신호 조회와128bit DOM 유지 경계는 그대로다. 성능 수용을 선언하지 않는다.
3. 대표 실제 설계/사용자 프로필/기록 경계/RSS 회수/과거900ms 원인, 깨끗한Windows 설치 보류는 유지한다. VSIX/확장 설치/사용자예제 변경은 없다.
