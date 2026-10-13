# 조건부 디자인 판단 개선 — 2026-10-13

이번 변경은 비교 패널·형태·색·서체를 일률적으로 바꾸도록 하던 지침 충돌을 고친다.
전문가가 선택한 시스템과 실제 과업을 보존하면서 적용 조건, 허용 변형, 반례, 확인할 근거를
명시한다. 접근성·기능 기준은 유지한다. 새로운 점수 항목이나 의무적인 외형 체크리스트는 없다.

## 근거와 한계

[Awwwards](https://www.awwwards.com/websites/sites_of_the_day/) 124개,
[CSS Design Awards](https://www.cssdesignawards.com/wotd-award-winners) 21개,
[Siteinspire](https://www.siteinspire.com/) 40개,
[Recent](https://recent.design/websites) 20개,
Lazyweb 제품/마케팅 참고 20개로 총 225개 미리보기를 선별 관찰했다.
65개 상세 관찰 카드와 12개 조건부 패턴을 작성했다. 알려진 중복 7쌍을 합치면 218개
참고 레코드이며, 218개의 독립 제작사나 검증된 성공 사례라는 뜻은 아니다.
실제 콘텐츠를 렌더해 확인한 사이트는 SIHA, Town, SORT Office의 3개다.

선정 갤러리는 표현 중심의 브랜드·포트폴리오에 치우친 표본이다. 정지 미리보기는
모바일, 키보드, 모션 시간, reduced-motion, 성능, 접근성 적합성, 전환율을 증명하지 않는다.
사용성 성과나 전문가 수준의 디자인 향상을 검증했다는 주장은 하지 않는다.

- [사례 65개](CASES.md), [패턴과 반례](PATTERNS.md), [최초 규칙 감사](RULE-AUDIT.md)
- [참고 색인](data/corpus.json), [관찰 범위](data/observations.json), [패턴 데이터](data/patterns.json)
- 외부 원본 HTML, 이미지, 폰트, 사설 검색 세션은 이 조사 패키지나 core 설치물에 포함하지 않는다.
  사례의 로컬 이미지 표시는 조사 당시 관찰 기록이며 이 저장소에서 열리는 링크가 아니다.
- JSON의 `research-candidates-not-active` / `activation: none`은 최초 연구 상태다.
  이 데이터는 resolver 입력이 아니다. 아래 개선은 기존 canonical 지침에 반영했다.

## 최신 배포 구조로의 이식

최초 작업 폴더의 4.2 구조에서 개선분을 분리하고 공개 main
`5c54252fea30f587a06da960aac84a2693d5abd3`의 5.0 구조에 이식했다.
기존 변경 파일 전체를 복사하지 않았다. `styleseed` 1개 스킬과 22개 내부 workflow,
최신 spacing 실행 경로와 update preflight를 보존했다.

| 항목 | 반영한 판단과 반례 | 주요 canonical 위치 |
|---|---|---|
| R01 반복 | 같은 질문은 같은 표현. 비교 패널·목록은 반복 허용; 추세를 진행률로 바꾸는 장식적 변주는 금지 | `DESIGN-LANGUAGE.md` §§61–64/66, `ss-page`, `ss-score` |
| R02 KPI | 동일 KPI 자체가 아니라 우선순위를 가리거나 불필요한 카드가 된 경우를 지적 | `BRAND-RECIPES.md` enterprise-workbench, `RULESETS.md` operations-console |
| R03 구도·수량 | Hero+KPI, 밀도 기울기, 최소 섹션 수 제거. 작업 큐 하나로 완결될 수 있음 | handbook §§18–21/40/63/67/68/71, compact craft, `METHODOLOGY.md` |
| R04 색 | 행동·상태·분류·브랜드·콘텐츠 역할로 판단. 다색 이미지와 안정적인 행동색은 공존 가능 | `VISUAL-CRAFT.md` CL-1–3, handbook §65, Claude 진입점 |
| R05 타입·표면 | 전면 종이색·세리프 본문·검정을 유행 감점에서 제외. 역할·읽기·맥락 검사 유지 | craft CC-9d, editorial recipe, score/review |
| R06 행동 | 의사결정 영역별 다음 행동. 전역 Share와 팝오버 Apply, 명확한 파괴적 확인은 각각의 문맥을 가짐 | craft CC-6, `PAGE-TYPES.md` landing/form, copy/page/review |
| R07 구분 | 여백→선→그림자 순서 강제 제거. 밀집 도구의 hairline과 편집 화면의 여백을 모두 허용 | craft CR-6, compact craft |
| R08 깊이 | 3–6개 그림자·특정 광원 의무 제거. 선택된 재질과 깊이 역할의 일관성 검사 | craft CC-1, score/dial |
| R09 컨테이너 | border XOR shadow·사방 동일 padding 제거. 경계와 떠 있는 층이 다른 역할이면 병용 | craft CR-4/CC-7, score/review |
| R10 차트 문맥 | footer·현재값·세 개 pill 할당 제거. 단위·기간·기준·범례를 가까이 또는 명확히 공유 | handbook §69, compact craft, score/review |
| R11 수치 | 승인 토큰·광학·언어·플랫폼 조건 우선. 간격·tracking·서체 수는 예시이며 읽기 검증 유지 | craft CR-1/2/10/CT-1–8, compact craft, Claude 진입점 |
| R12 지표 | delta에는 실제 기준, sparkline에는 실제 시계열 필요. 4개/행·2행 한도 제거 | craft CD-4, handbook §62 |
| R13 도메인 | 12개 playbook 각각에 적용 과업·예외 삽입. 개별로 추출한 번들에도 조건 포함 | `APP-PLAYBOOKS.md`, `RULESETS.md` |
| R14 평가 예제 | “동일 KPI 두 줄” 대신 급한 업무를 가린 장식적 KPI를 지적. 예제 점수 합산도 정합화 | `ss-score/SKILL.md` |
| R15 근거 | 확인하지 못한 41% 주장 삭제. 문자 수와 CSS ch 구분; 언어별 실제 렌더 확인 | craft CR-7, compact craft |
| R16 반응형 | stack everything 제거. 과업 우선 재배치·비교 보존·필요한 제한 영역 스크롤 허용 | page landing/detail, handbook §73, review |
| R17 모션 | named seed 미사용 감점 제거. 승인된 모션·목적·타이밍·reduced motion·실제 관찰로 판단 | `ss-score`, 도메인별 조건 |
| R18 유행 | bento/glass/다층 그림자의 보편적 채택 지침 제거. 시점과 맥락이 있는 선택으로 분리 | craft §C6 |


`ss-*`는 `engine/.claude/skills/styleseed/workflows/<name>/WORKFLOW.md`를 가리킨다.
상위 헌법, AGENTS/Cursor/Claude 진입점, build/verify 경로에 남아 있던 단일 hero·색 개수
강제도 함께 맞췄다. generator로 설치용 mirror, 공개 catalog, 예제 bundle을 갱신한다.

## 검증과 배포 경계

회귀 검사는 12개 도메인의 조건 추출, 실제 resolver의 여섯 과업 구성, 접근성·기능 기준,
참조 증거의 관찰 한계와 승인 경계, 빌드/시각 검토 진입점의 강제 규칙 재유입을 확인한다.
전체 저장소/빌드 검사 외에 깨끗한 임시 프로젝트에서 실제 skills CLI 설치 및 archive 설치,
외부 애플리케이션 회귀, 브라우저 공개 경로와 공간 규칙을 검사한다.

운영 의존성 audit에서 발견한 `sharp`와 `source-map-js` 문제는 기존 보안 PR #72의
lockfile 변경을 별도 커밋으로 적용해 처리한다. 디자인 지침 변경과 분리해 검토할 수 있다.

이 후보는 edge 소스 변경이며 버전 번호와 changelog는 변경하지 않는다. 새 stable 릴리스는
별도의 버전·서명 tag·CI provenance·승인 절차가 필요하다. 배포 승인 전의 후보와 운영
반영을 구분한다. CI 성공은 새 디자인 생성 실험이나 사람의 미적 평가를 대체하지 않는다.
