# 시뮬레이터 성능·증분 빌드 방향 — 조사 및 설계 메모

2026-10-05 사용자 질문에 대한 공식 문서 조사. 구현/벤치마크 완료 기록이 아니다. 현재 다음 구현인 enum 파형 이름 표시를 이 메모만으로 대체하지 않는다.

## 성능 목표

제품은 C++ 변환 여부보다 편집→실행 결과까지의 시간을 최적화한다. 첫 빌드, 수정 후 빌드, 무수정 재실행, 실행 본체, trace 생성, 파형 로딩을 구분해 측정한다. `make`는 변경 입력과 의존성에 따라 산출물을 재빌드하는 도구이며 Verilator도 생성 Makefile을 사용한다. C++를 거치는 자체만으로 비효율적이라고 판단할 수 없다.

상용 도구의 공개 문서에서 확인 가능한 수준은 다음과 같다. 비공개 엔진의 현재 IR/기계어 생성 세부 경로를 추측해 확정하지 않는다.

- Vivado: xvlog/xvhdl 분석 → xelab elaboration/실행 snapshot 생성 → xsim 실행. UG900의 -incr는 simulation의 incremental analysis/elaboration이다. FPGA 합성/배치배선의 incremental compile과 구분한다.
- VCS: partition compile/precompiled IP 및 실행 시 fine-grained parallelism/save-restore를 공식 소개한다.
- Xcelium: Multi-Snapshot Incremental Elaboration(MSIE)로 설계/테스트 rebuild를 개선한다.
- Questa: compiled library partitioning/PDU/parallel elaboration 기반 증분 빌드 흐름을 소개한다.
- Verilator: C++/SystemC 생성과 native compile, Make dependencies(--MMD), compiler cache(ccache/sccache 등), hierarchical Verilation이 있다. hierarchical은 flat scheduling보다 실행 성능이 낮아질 수 있으며 delay/cross-boundary 접근 등의 제한을 확인해야 한다.
- Icarus는 VVP 실행용 코드를 생성하고 runtime에서 실행하는 다른 구조의 예다. 바이트코드/기계어 선택과 event-driven scheduling은 별도 설계 축이다. 현대 Verilator의 timing 지원을 단순한 clock-only 모델로 설명하지 않는다.

## 현재 저장소에서 확인한 사실

Core runTest는 run UUID마다 `.rtl/runs/<test>-<uuid>`를 만들고, 입력 사본을 보존한 뒤 VerilatorBackend.build를 호출한다. 어댑터의 --Mdir는 그 실행의 build 폴더이며 --binary/-j2를 사용한다. 명시적 cross-run executable/object cache는 없다. 입력 fingerprint는 보존 입력 검증용이며 toolchain 버전·환경까지 포함하는 완전한 build-cache key가 아니다. 공백/한글 alias 임시 경로와 실행별 snapshot 경로도 재사용 시 해결해야 한다.

이 구조가 반복 빌드 재사용을 제한하는 것은 코드에서 확인했다. 사용자가 느낀 Vivado와의 속도 차이를 이 하나로 설명하거나 실제 런타임 우열/개선 배수를 단정하는 측정은 하지 않았다.

## 단계적 후보 — 아직 미구현

1. 단계별 시간 계측 및 동일 입력/옵션/trace/assertion 조건의 cold/warm/no-change/leaf edit/package edit 실험. 최초 빌드와 warm 반복을 각각 보고한다.
2. 보존 기록은 실행별로 유지하면서 검증된 동일 입력의 실행 파일을 재사용한다. 새 프로세스, 새 실행 폴더, 새 로그/파형으로 항상 다시 실행한다. 과거 PASS나 파형을 새 테스트 결과로 재사용하지 않는다.
3. stable content-addressed build workspace 및 object cache 평가. 프로젝트 외부의 공유 캐시와 프로젝트 내부 `.rtl/` 기록을 분리한다. 캐시 key에는 source/include bytes와 검색/순서/define/parameter/top, timing/trace/assertion/최적화, simulator/compiler/runtime/ABI/OS, DPI 등 링크 입력과 관련 환경을 반영한다. 런타임 `$readmemh` 등의 입력은 별도 실행 의존성으로 다룬다. 기존 snapshot fingerprint 하나만 key로 쓰지 않는다.
4. 취소/실패 결과 publish 금지, cache lock·원자적 완료 표시·산출물 검증·오염/손상 시 재빌드, 동시 실행 격리, 용량/정리 정책, source/trace 보존 identity와 경로 매핑 회귀를 먼저 설계한다.
5. backend별 지원을 검증한 뒤 module/partition 단위 재사용. package typedef/parameter/include/전처리 단위 순서/generate/상위 최적화 의존성 변화는 파급 재빌드한다. 바뀐 `.v` 파일 하나만 재컴파일하면 된다고 가정하지 않는다.

## 미래 자체 엔진 검토

후보 구조: SV frontend → 타입/의존성/elaborated IR → 분할 최적화 → native 코드 또는 C++ 또는 JIT → 실행 scheduler. 각 parameter 특수화와 dependency를 캐시 단위로 관리한다. 포트 ABI/신호 상태 layout과 최적화 경계를 설계해 내부 구현 변경과 인터페이스 변경을 구분한다. 전역 최적화와 세밀한 증분 재사용은 trade-off가 있으므로 빠른 개발 모드와 장시간 회귀 모드를 평가할 수 있다. LLVM/JIT가 자동으로 더 빠르다는 전제는 두지 않는다. 자체 엔진 구현을 지금 시작한다는 결정이 아니다.

신호 전파/NBA/delta cycles/복수 클럭/시간 지연/4-state 의미와 지원 범위의 정확성이 성능 조건의 일부다. 기능을 빼고 얻은 성능 수치를 같은 시뮬레이션의 개선으로 표시하지 않는다.

증분 컴파일과 시뮬레이션 중간 시점 재사용은 다른 문제다. 변경된 회로가 과거 상태에 영향을 줄 수 있어 이전 100us 상태를 임의로 이어 실행할 수 없다. checkpoint/save-restore는 호환된 모델·상태·입력 조건에서 검증해야 하며 hot replacement/replay는 별도 후속 연구다.

## 공식 근거

- [Verilator generation/Make/hierarchical](https://verilator.org/guide/latest/verilating.html)
- [Verilator build cache FAQ](https://verilator.org/guide/latest/faq.html#how-do-i-get-faster-build-times)
- [Verilator runtime/build optimization](https://verilator.org/guide/latest/simulating.html)
- [Vivado simulation stages](https://docs.amd.com/r/en-US/ug900-vivado-logic-simulation/Vivado-Simulator-Quick-Reference-Guide)
- [Vivado simulation incremental options](https://docs.amd.com/r/2024.1-English/ug900-vivado-logic-simulation/xelab-xvhdl-and-xvlog-xsim-Command-Options)
- [VCS compile/runtime techniques](https://www.synopsys.com/verification/simulation/vcs.html)
- [Xcelium MSIE](https://support1.cadence.com/public/docs/content/20438095.html)
- [Questa incremental build flows](https://resources.sw.siemens.com/en-US/white-paper-expediting-simulation-turnaround-time-with-incremental-build-flows/)
- [Icarus VVP](https://steveicarus.github.io/iverilog/targets/tgt-vvp.html)
