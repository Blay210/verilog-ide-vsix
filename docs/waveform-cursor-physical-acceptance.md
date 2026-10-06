# F1S 기본 커서 재사용 실제 드래그 확인 (2026-10-06)

F1R 기본 적용 뒤 격리된 실제 개발 창에서 커서 드래그/확대/이동/스크롤/Reload를 확인했다. 제품 코드는 이번에 변경하지 않았다. 전체 안정화 완료나 임의 입력속도/60fps 보장은 아니다.

## 재현과 물리 조작

기존 VS Code 1.140.0, `RTL_MANUAL_ACCEPTANCE=1`, `RTL_MANUAL_DENSE=1`, `RTL_WAVEFORM_RENDER_TEST=1`, `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `node scripts/test-vscode.mjs`. cursor reuse를 켜는 별도 flag 없이 실행했다.

`.dev/vscode-tests/run-xbQA9K/project/.rtl/`의 합성 VCD32부모/128bit, 원점9007199254740993ps를 사용했다. 준비용 probe와 native Computer Use 마우스 조작은 별개다.

1. 부모행에서 오른쪽 드래그→cursor9007199254744480.
2. bit행에서 왼쪽 드래그→9007199254742062.
3. 화면 확대 버튼 후 bit행 오른쪽 드래그→9007199254742887.
4. 오른쪽 pan 버튼으로 구간을 옮겼다. cursor는 유지되고 from/to가 바뀌었다.
5. 실제 scroll 및 scrollbar thumb drag로 port21..31까지 내려간 후 port28 canvas에서 오른쪽 드래그→9007199254743293.
6. Reload 버튼 클릭 뒤 하단 스크롤 위치·cursor/range/전체 raw값이 복원됐다.

관측된 드래그 종료 상태에서 ruler/trace 커서 선이 맞고 표시 값이 갱신됐다. 각 drag는 Sky의 한 native drag 입력이다. 극단적인 고빈도 연속 입력, 드래그를 유지한 상태의 동시 keyboard zoom/Escape, OS DPI 변경 시험으로 확대해서 표현하지 않는다.

pan 직후 외부 전원 Info 알림이 화면 중앙 일부를 덮었다. 해당 알림의 설정·checkbox/확인창은 조작하지 않았다. 가려지지 않은 개발 창 영역에서 scroll/하단 drag/Reload를 진행했다. 알림이 가린 중앙 영역의 시각적 품질은 확인했다고 주장하지 않는다.

## 수치 대조 및 복구

`physical-values-checked.json`은 초기+drag/zoom/pan6개의 표본 모두 부모32/bit128을 fixture 규칙에서 독립 계산한 값과 대조했다. 최종 하단 cursor는 Reload 뒤 `physical-reload-checked.json`에서 같은 규칙으로 대조했다. 둘 다 passed=true.

Reload 전후 nonce가 바뀌고 cursor/rows/details 전체가 동일했다. 최종cursor9007199254743293,32parents/128bits. 실제 하단 port21..31 및 scroll 복원을 관찰했다.

| 관측 | renderer 요청 왕복 | draw |
|---|---:|---:|
| 첫 오른쪽 drag 종료 | 4.5 ms | 12.5 ms |
| 반대 방향 drag 종료 | 3.5 ms | 16.0 ms |
| 확대 후 drag 종료 | 3.3 ms | 13.4 ms |
| 하단 drag 종료 | 3.8 ms | 8.9 ms |
| zoom 전체 구간 조회 | 168.1 ms | 14.2 ms |
| pan 전체 구간 조회 | 143.7 ms | 12.7 ms |

원점/표시 범위 및 tick은 모두 절대시간이다. RTT는 compositor 표시 지연이 아니다. cursor-only 최적화가 물리 조작에서 사용되는 것은 확인됐지만 pan/zoom의 full query/전달 지연은 여전히 남아 있다.

manual receipt passed/sourceHashPreserved=true, manualHarness=true, acceptancePassed=false; host exit0. 이 receipt는 원본 SHA와 harness 종료를 증명하며 위 제한된 실제 검증을 전체UI 합격으로 바꾸지 않는다. native runner 개발 build exit0. 제품 변경이 없으므로 F1R의42회귀/typecheck 통과를 이번에 새로 실행한 것으로 세지 않는다.

## 다음 작업

이번 제한된 cursor/zoom/pan 실제 입력 확인은 완료했다. 다음은 열린 안정화 3묶음 중 **보존된 실행 결과와 구조·파형 연동 종단/경계** 검증으로 돌아간다. 이어서 실제 사용자 편집 프로필 충돌과 대표 프로젝트 규모·loading 취소·두reader 메모리 복구를 확인한다.

실제 대표설계·사용자프로필·retained 경계·RSS/이전900ms 원인 및 깨끗한Windows(별도PC/VM없음) 게이트는 열린 상태다. 확대/pan 지연과 물리Esc/OS DPI 제한도 보존한다. 파형 자체의 기능 검증과 제품 전체 수용을 혼동하지 않는다. 사용자예제/VSIX/배포/자체IDE fork는 변경하지 않았다.
