# 가벼운 프로젝트와 실행 대상 자동 탐색 — U12

2026-10-05 사용자 제안에 대한 **설계 제안이며 미구현**이다. 폴더 이름이나 수동 파일 등록을 강제하지 않고 기존 RTL 프로젝트도 사용할 수 있게 한다. 현재 다음 실행 작업 U03을 이 문서만으로 바꾸지 않는다.

## 현재 상태와 요구

현재 rtl.toml의 RTL/package/test sources glob은 새 파일을 포함할 수 있으므로 모든 파일을 하나씩 적을 필요는 없다. 하지만 테스트 name/top/sources 등록은 명시적이며 기본 RTL 경로는 rtl/다. package 자동 순서와 semantic provider는 존재하지만 top에 필요한 파일만 선택하는 의존성 그래프와 manifest 없는 프로젝트의 자동 분석 시작은 없다. 기존 실행과 CLI는 manifest의 명시적 설정을 사용한다.

사용자가 원하는 것은 GUI에서 폴더를 열고 테스트벤치를 실행하면 IDE가 실행 대상과 필요한 소스를 관리하는 흐름이다. tb/, rtl/는 새 프로젝트의 편리한 기본값이지 호환 조건이 아니다. 일반 사용자가 TOML이나 simulator 인자를 직접 편집할 필요가 없어야 한다.

## 방식 비교와 권장 조합

| 방식 | 장점 | 한계·권장 역할 |
|---|---|---|
| RTL/TB 폴더 지정 | 이해하기 쉽고 탐색 범위를 제한 | 고정 폴더 구조를 강제하지 않는다. 기존 프로젝트의 선택적 범위 설정 |
| 모든 실행 후보 자동 등록 | 처음 목록을 얻기 쉬움 | RTL에도 initial이 있고 helper/root module도 있다. 추정 후보를 확정 테스트로 표시하지 않음 |
| 파일/모듈에서 Run 후 기억 | 실제 의도를 자연스럽게 확인 | 한 파일의 여러 top·한 top의 여러 설정을 구분. 파일 전체를 TB라고 영구 분류하지 않음 |
| 명시적 source/filelist 등록 | 복잡한 library·macro 설정을 재현 | 고급 옵션/기존 설정 가져오기. 일반 경로의 필수 단계로 두지 않음 |

권장은 **자동 후보 탐색 + 실행 시 선택한 top/설정 기억 + 필요한 경우만 소스 범위 선택**이다. 실행 의도와 컴파일 성공은 별개다. 명시적으로 선택한 실행 대상은 실패 후에도 재시도할 수 있지만 실패한 빌드나 파일 이름만으로 TB 판정을 확정하지 않는다.

## 제안 UX

1. 폴더를 열면 기존 rtl.toml을 우선 사용한다. 없으면 제한된 범위에서 소스와 기존 설정 파일을 찾고 후보를 제시한다. 이름·위치·initial/timing/종료 코드·인스턴스 관계 등은 단서이며 단일 단서로 확정하지 않는다. 분석이 불완전하면 이유를 표시한다.
2. Simulation은 사용자가 추가/실행한 대상을 중심으로 보여준다. 아직 선택하지 않은 항목은 접힌 ‘발견한 실행 후보’로 구분한다. RTL 전체를 테스트 목록으로 채우지 않는다.
3. 파일에서 Run 또는 ‘시뮬레이션 대상으로 추가’를 제공한다. top이 하나로 명확하면 바로 준비하고, 여럿이면 모듈 선택을 요청한다. 자동 후보가 아니어도 사용자가 지정할 수 있다. 정확한 Explorer 행 hover 버튼은 U11의 별도 workbench 작업이다.
4. 필요한 소스를 확정할 수 있으면 실행한다. 중복 module, 외부 package/include, 서로 다른 macro/library 구성 등 모호함은 ‘소스 폴더 선택 / 기존 파일 목록 가져오기 / 실행 설정’으로 해결한다. 임의의 후보 파일을 골라 조용히 실행하지 않는다.
5. 명시적으로 선택한 top과 실행 설정을 기억한다. 새 파일/이름 변경은 다시 탐색하되 기존 설정을 다른 top으로 조용히 바꾸지 않는다. 같은 파일/top의 여러 parameter/define 설정도 별도 실행 대상으로 유지한다.
6. 사용자는 GUI로 설정하고 공유 가능한 최소 설정만 rtl.toml에 저장한다. source 파일 목록을 매번 길게 쓰는 대신 범위/규칙을 저장한다. 파생 탐색 인덱스와 임시 데이터는 .rtl/에 둔다. 설정 저장 여부와 내용을 UI에서 확인할 수 있게 하며 원본 RTL은 수정하지 않는다.

## 자동화의 경계

- ‘실행 시작점 선택’과 ‘컴파일 입력 결정’은 서로 다른 문제다. SystemVerilog 파일 자체만으로 외부 library 위치나 define 의도를 항상 알 수 없다.
- tb_ 이름, tb 폴더, 포트 없음, initial, $finish/$dumpvars는 후보 단서다. RTL에도 초기화 코드가 있을 수 있고 TB에 dump 코드가 없을 수 있다. 파일은 여러 module/package를 포함할 수 있다.
- 모든 .sv/.v를 컴파일하면 서로 다른 구현의 동일 module, vendor source, 다른 configuration의 macro가 충돌할 수 있다. .svh/.vh는 기본적으로 include 후보이며 독립 compile unit으로 무조건 추가하지 않는다.
- 최소 source graph는 module 인스턴스 검색만으로 만들지 않는다. 전처리·include·package/import·interface·bind 및 library 선택을 지원 범위에 맞게 처리한다. 미해결 입력과 지원하지 않는 harness/backend는 명확히 안내한다.
- 탐색은 제외 경로·파일 수/시간 제한·취소·증분 갱신이 필요하다. .rtl/, 도구/캐시/출력은 제외하고 기존 ignore 정책과 명시적 포함 설정의 우선순위를 정의한다. 자동 탐색을 무제한 전체 프로젝트 elaboration으로 구현하지 않는다.
- 기존 build script는 자동 실행하지 않는다. filelist 가져오기는 상대 경로, 순서, include/define 옵션을 보존하고 지원되지 않는 인자는 보고한다.
- 기존 manifest의 명시적 설정은 우선한다. 신규 자동 모드는 호환 가능한 schema와 명시적 진입 경로를 설계한 뒤 도입한다. 현재 기본 glob을 일괄적으로 전체 workspace glob으로 바꾸지 않는다.
- Core가 같은 입력에서 같은 후보·해결 결과를 반환하고 GUI/CLI가 재사용한다. 현재 semantic provider의 manifest 의존성을 먼저 해소하거나 탐색용 별도 입력을 제공해야 한다. lexical 추정을 semantic 확정으로 표현하지 않는다.
- 실행 ID와 저장 파형 보기/이력 연결을 유지한다. 탐색 갱신은 과거 결과를 바꾸지 않고 U03 입력 변경 판단과 실제 사용 입력 snapshot을 일치시킨다.

## 단계적 구현 제안과 완료 조건

1. **GUI 실행 설정**: 파일/모듈을 대상으로 추가하고 이름/top/source 범위를 저장한다. 여러 top/공유 파일/취소/재실행과 기존 manifest 호환을 검증한다. 완전 자동 의존성 해결로 부르지 않는다.
2. **구조 독립 후보 탐색**: 임의 폴더, 파일 추가/이동, 후보/확정 대상 구분, 제외/취소, 외부 경로 선택과 지원 filelist 가져오기. 수백 파일에서 UI 응답과 오탐을 검증한다.
3. **의미 기반 입력 해결**: top에서 필요한 package/include/module을 구성별로 해결한다. 중복 모듈·macro 분기·순서·복수 configuration·경로 공백/한글·미해결 안내, GUI/CLI 입력 일치와 실제 Verilator 실행을 검증한다.

현재 순서는 U03→U04→U05→잔여 안정화 수용이다. U12는 O07/O11/O12를 연결하는 별도 프로젝트 UX 작업으로 추적한다. 착수 순서를 정할 때 U03 이후에 초기 GUI 등록을 먼저 넣을지 검토하고, 이번 논의를 구현 승인/완료로 간주하지 않는다. 자체 compiler 개발과 별개이며 기존 Verilator 어댑터로도 구현할 수 있다.

## 공식 참고

Verilator는 --top-module로 시작점을 지정하고, 입력 파일에서 찾지 못한 module은 -y/+libext로 파일을 찾을 수 있다. 즉 simulator에 넘길 전체 인자를 사용자가 직접 쓰게 해야 하는 것은 아니다. 다만 이 기능이 임의 파일명·모든 package/include/library 설정을 자동 해결한다는 의미는 아니다. [Finding and Binding Modules](https://verilator.org/guide/latest/verilating.html#finding-and-binding-modules), [Verilator arguments](https://verilator.org/guide/latest/exe_verilator.html).

이번 변경은 코드 검토와 설계 기록뿐이다. 자동 탐색 구현·실행 검증·새 전체 회귀·VSIX 제작은 수행하지 않았다.
