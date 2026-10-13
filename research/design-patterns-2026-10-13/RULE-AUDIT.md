> Research snapshot: 2026-10-13. Engine locations refer to the original 4.2 working tree.
> The deployment candidate uses the v5 single-skill workflows; see [scope and transfer](README.md).

# 기존 룰 감사와 수정 후보

2026-10-13. 대상은 **현재 로컬 작업 트리**이며 `engine/VERSION`은 4.2.0이다. 설치된 전역 v5 패키지나 공개 main의 상태와 동일하다고 가정하지 않았다. 기존 미커밋 변경은 보존했다. 아래 내용은 최초 조사 시점의 변경 제안이다. 이후 사용자 요청으로 R01–R18을 반영했으며 현재 상태는 [구현 기록](README.md)을 따른다.

## 현재 무엇이 있는가

| 층 | 현재 내용 | 맡는 판단 |
|---|---|---|
| `PRODUCT-PRINCIPLES.md` | 제품 헌법, 사람의 결정, 적용 맥락, 조정 가능한 휴리스틱 구분 | 무엇을 필수로 지키고 무엇을 선택할지 |
| `CRAFT-BASELINE.md` | coherence, hierarchy, spacing/type, interaction, color/a11y/motion의 압축 원칙 | 매번 로드할 공통 판단 |
| `RULESETS.md` | 8종: consumer-service, operations-console, technical-instrument, editorial-reading, commerce-conversion, institutional-service, expressive-marketing, sequential-story | 사용자의 작업과 주의 배분 |
| `ADAPTERS.md` | 5종: product-ui, social-carousel, slide-deck, document-report, single-frame | 화면·매체·출력 조건 |
| `APP-PLAYBOOKS.md` | 12개 도메인 | 업종·서비스별 기본 편향 |
| `PAGE-TYPES.md` | 7개: dashboard, form, landing, detail, list, settings, onboarding | 현재 화면의 목적 |
| `BRAND-RECIPES.md` | 9개 브랜드 문법 | 형태·글꼴·컨트롤·구조의 조합 |
| `PALETTE-RECIPES.md` | 8개 팔레트 방향 + 의미 역할 | 색의 역할과 배분 |
| `PRESETS.md` | 6개 선택형 미감 좌표. none 가능 | 기능적 구조를 보존한 표현 방향 |
| `DESIGN-LANGUAGE.md` | 번호가 붙은 74개 절 | 구성 요소, 상태, 흐름, 모션, 데이터, 페이지 구성의 상세 예시 |
| `VISUAL-CRAFT.md` | 명명된 CR/CT/CC/CL/CD 항목 44개 + coherence/trend 절 | 간격·타입·컴포넌트·색·차트의 상세 지침 |
| `REFERENCE-COMPILER.md` | 참조의 관찰·맥락·예외·검증·승격 경계 | 취향을 근거 있는 조건부 문법으로 바꾸기 |
| `ss-score` / `ss-review` | 맥락과 승인된 계약을 기준으로 평가 | 실제 위반과 유효한 변형을 구분 |

74와 44는 **문서의 절·항목 수**다. 독립적인 원자 룰 총합이나 실행 검사 개수로 더하지 않는다. 룰 상당수가 서로 겹친다.

## 실제 적용 경로와 발견의 범위

`scripts/build-context-catalog.mjs:205–218`은 공통 craft로 `CRAFT-BASELINE.md`를 컴파일한다. 전체 `DESIGN-LANGUAGE.md`와 `VISUAL-CRAFT.md`의 모든 문장을 항상 bundle에 넣는 구조는 아니다. 반면 `ss-score`는 상세 문서를 명시적으로 참조하고, `build-llms.mjs`는 전체 handbook과 visual craft를 공개 색인에 포함한다.

따라서 발견한 문제는 **모든 생성물이 이미 이 규칙 때문에 획일화되었다는 실험 결과가 아니다.** 서로 다른 진입점에서 상충하는 지침을 읽을 수 있다는 문서·예제·평가의 정합성 문제다. 실제 생성에 미치는 영향은 별도 비교 실험이 필요하다.

이미 잘 되어 있는 부분도 분명하다.

- 헌법은 필수 기준, 승인된 프로젝트 결정, 휴리스틱을 구분한다.
- 압축 craft는 비교 영역의 반복을 허용하고, 여러 형태·색도 반복되는 역할을 가지면 허용한다.
- `PAGE-TYPES.md:18`의 dashboard는 작업과 증거를 우선하며 거대한 hero를 의무화하지 않는다.
- `ss-score:109–133`은 베이지·세리프·반복되는 기능 요소 자체를 감점하지 말라고 명시한다.
- `DESIGN-LANGUAGE.md:2838`의 §74도 역사적 수치와 금지의 맥락적 적용을 요구한다.

**이 방향을 뒤집을 필요는 없다. 아래의 오래된 강한 문구를 같은 방향으로 맞추는 것이 우선이다.**

## 수정 후보

P0는 정합성 수정 우선, P1은 표현과 근거 보완, P2는 추가 검증 후 판단이다. 원본 위치는 이번 스냅샷의 줄 번호다.

| ID·우선순위 | 현재 지침 / 위치 | 문제 | 제안 | 관련 근거 |
|---|---|---|---|---|
| R01 · P0 | `DESIGN-LANGUAGE.md:2432` §61, §62–64, §66: 섹션·KPI·차트 종류의 반복 금지와 높이 교대 | 같은 의미를 비교할 때도 장식적 다양성을 요구할 위험 | **같은 질문·우선순위는 같은 표현. 질문·중요도·이야기 단계가 바뀔 때 변주** | P07, LW002/005/006/018/020, SI030, RE008 |
| R02 · P0 | `BRAND-RECIPES.md:121`: enterprise-workbench에서 identical KPI cards 거부 | 바로 앞의 coordinated comparison 원칙과 충돌 | 동일한 KPI가 아니라 **의미와 무관한 균등 강조·불필요한 카드화**를 거부 | P07, LW003/018/020 |
| R03 · P0 | `DESIGN-LANGUAGE.md:2537,2668,2686`: 항상 Hero+KPI, 아래로 밀도 증가, 최소 4·이상적 5–6개 섹션 | 데이터 없는 화면에도 채우기용 섹션을 만들게 됨 | 필요한 작업·질문·상태가 완결되면 충분. 해당 구성은 예시로 이동 | P09, LW004/005/006/013, SI017/036 |
| R04 · P0 | `VISUAL-CRAFT.md:295` CL-2b: 아바타·일러스트까지 accent/grey만 허용 | 브랜드·콘텐츠·분류의 색을 UI 행동색과 혼동 | **행동·상태·분류·브랜드·콘텐츠 색의 역할을 기록하고 충돌을 검사** | P06, AW061/103, SI006/024/035 |
| R05 · P0 | `VISUAL-CRAFT.md:244` CC-9d: 흰 기반, 전체 종이색과 세리프 본문을 dated 취급 | 시각적 취향을 보편적인 품질 조건으로 사용 | 색 온도·타입·미디어·목적의 적합성을 평가. 오래됨/신선함은 스타일 선택의 판단으로 남김 | P04/P06, SI024/035; ss-score의 현재 예외 원칙 |
| R06 · P0 | `VISUAL-CRAFT.md:182`, `PAGE-TYPES.md:56`: view당 primary 하나, headline 지배, CTA가 가장 밝음 | 전역 행동과 팝오버 행동을 함께 강조할 수 없고 이미지 중심 랜딩을 오판 | **의사결정 영역마다 다음 행동을 명료하게**. 밝기·채도·큰 제목은 가능한 수단 중 하나 | P01/P10, SI002/013/030, LW013 |
| R07 · P1 | `VISUAL-CRAFT.md:78`: whitespace→tint→shadow→border. compact craft는 whitespace→tone→hairline→shadow | 같은 판단에 반대 우선순위 | 기능과 매체에 맞는 가장 약한 구분 수단을 선택. 고밀도 패널은 hairline이 적합할 수 있음 | P03, CD004, LW013/018 |
| R08 · P1 | `VISUAL-CRAFT.md:158`: shadow 3–6개, 하나의 hard shadow 금지 | 구현 기법·미감 예시를 품질의 필수 조건으로 고정 | 깊이가 필요한가부터 판단. 선택한 재질·방향·대비가 일관적인지 평가 | P03. 그림자 개수의 우월성은 이번 자료로 입증되지 않음 |
| R09 · P1 | `VISUAL-CRAFT.md:187`: border XOR shadow, 동일 사방 padding | 경계와 떠 있는 레이어가 동시에 필요한 경우를 배제 | 기능상 이유 없는 중복 경계만 지적. 다른 padding은 내용과 광학 정렬로 판단 | P03, LW013의 팝오버; 정확한 CSS 수치는 미측정 |
| R10 · P1 | `DESIGN-LANGUAGE.md:2708` §69: chart마다 고정 footer, 3개 기간 pill, 현재 값 | 문맥 제공이라는 원칙과 특정 예제의 해부 구조를 혼동 | 해석에 필요한 단위·기간·축·범례·출처를 가까이 제공. 중복 없이 공유 가능 | P12, LW013/020 |
| R11 · P1 | `VISUAL-CRAFT.md:55,61,131`: off-scale 금지, 그룹 2배, tracking 하한 | 관계를 보장하려던 수치가 언어·글꼴·광학 보정을 막을 수 있음 | 승인 token과 광학 보정 우선. 수치는 기본값이며 실제 렌더로 확인 | P02/P03/P04. 정확한 대체 수치를 참조 이미지에서 추정하지 않음 |
| R12 · P1 | `VISUAL-CRAFT.md:338`: KPI=큰 수+delta+sparkline, 4개/행·2행 이하 | 시계열이나 비교 기준이 없는 수치에도 변화 그래프를 강요 | 값에 맞는 단위·기준만 제공하고 추세가 실제로 있을 때만 시계열을 추가 | P07/P12, LW002/018/020 |
| R13 · P1 | `APP-PLAYBOOKS.md:36–238`: 도메인별 색·밀도·모션·hero 패턴 | 같은 업종의 랜딩·운영·읽기 화면에 같은 외형을 적용할 위험 | 도메인 기본값은 page/task 역할을 통과한 뒤 적용. 기존 'domain-bias' 선언을 각 예시에 반영 | P09/P11. 전면 재작성보다 적용 조건 명료화 |
| R14 · P1 | `ss-score/SKILL.md:191` 예제의 'two identical KPI rows' 감점 | 실제 평가 본문은 목적 있는 반복을 허용하지만 출력 예제는 형태만 지적 | 예제도 **어떤 비교·우선순위가 깨졌는지** 감점 이유를 명시 | P07. 현재 본문의 예외 처리는 유지 |
| R15 · P1 | `VISUAL-CRAFT.md:82`: 50–75ch와 '41% 더 스킵' 주장 | 읽기 폭의 근거와 검증되지 않은 효과 수치가 혼합. ch는 실제 문자 수와 같지 않음 | 읽기 폭 권고는 언어·글꼴·과업별 기본값으로 유지. 41%는 직접 근거를 찾기 전 삭제 후보 | Baymard 원문 확인: 길이 권고는 있음. 해당 41% 수치는 확인하지 못함 |
| R16 · P2 | `PAGE-TYPES.md:72`, `DESIGN-LANGUAGE.md:2824`: mobile stack everything | 기능적 비교·우선순위·탐색을 보존하는 변환과 단순 세로화가 다름 | adapter의 task-priority reflow에 맞춰 구체화 | 이번 조사에 모바일 관찰 없음. 새 모바일 패턴으로 승격하지 않음 |
| R17 · P2 | `ss-score/SKILL.md:160`: named seed가 아닌 fade 감점 | 토큰 계약 준수와 모션의 시각적·기능적 품질을 혼동할 여지 | 기존 프로젝트의 승인 모션을 존중하고 목적·타이밍·대체 상태를 평가 | 실제 모션·reduced-motion 미검증. 수상작 3D를 근거로 완화하지 않음 |
| R18 · P2 | `VISUAL-CRAFT.md:346`: bento·glass·layered shadows를 durable/adopt로 분류 | 시점별 취향 신호가 모든 출력의 기본 형태가 될 위험 | 추세 관찰을 맥락·날짜가 있는 선택 예시로 분리 | P03/P08/P09. 이번 표본으로 영속성 입증 불가 |

## 바로 검토할 수 있는 대체 문장

### 반복과 다양성

> Preserve equivalent presentation for equivalent information. Vary composition when priority, data question, or narrative role changes. Repetition in comparisons, collections, and workflows is valid; decorative variation must not change data meaning or interaction expectations.

### 색

> Assign stable roles to action, status, category, brand, and content color. Judge conflicting emphasis and lost meaning, not the number of hues alone. Brand and content palettes may be multicolored while action and severity signals remain identifiable.

### 구도

> Make the user's primary task, reading promise, or comparison region perceptually clear. Scale, position, spacing, contrast, and imagery are available means. No universal hero, heading size, CTA color, card layout, or section count is required.

### 타이포그래피와 분위기

> Evaluate type, surface color, and imagery as a coordinated response to content and context. Serif, warm paper, hard black, or repeated functional controls are not violations by themselves. Preserve readable roles and the approved project system.

### 해석 문맥

> Place the labels, units, timeframe, reference, and explanation needed to interpret a view close to that view or in an unambiguous shared scope. A stat footer, sparkline, or fixed period-control shape is an optional implementation.

## 강하게 유지할 것

승인된 프로젝트 시스템 보존, 의미가 안정적인 토큰, 과업에 맞는 계층·그룹, 실제 내용, 기능 상태, 식별 가능한 컨트롤, 키보드·포커스·대비·텍스트 확대, 읽기를 막지 않는 모션은 그대로 유지한다. 수상작에 결함이 보인다고 그 결함을 새로운 예외로 채택하지 않는다.

## 반영 순서

1. R01–R06의 조건·예외를 확정하고, 기존 상위 원칙에 맞춰 문구와 반례를 정리한다.
2. 같은 조건을 handbook, craft, page type, brand recipe, score/review의 예제까지 일치시킨다. root `skills/`는 직접 편집하지 않는다.
3. 동일 내용·동일 브랜드로 서로 다른 유효한 디자인을 생성하는 비교 실험을 수행한다. 제약 해제의 효과와 품질 하락을 함께 본다.
4. 합의된 변경만 canonical `engine/`에 반영하고 generator·core·full gate·실제 화면 확인을 수행한다. 이번 연구 파일 작성은 이 단계를 실행한 것이 아니다.

근거: [사례 관찰](CASES.md), [조건부 패턴](PATTERNS.md), [Baymard 읽기 폭 원문](https://baymard.com/research-articles/line-length-readability), [Dashboard Design Patterns 연구](https://arxiv.org/abs/2205.00757).
