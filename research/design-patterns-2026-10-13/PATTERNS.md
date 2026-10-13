> Research snapshot: 2026-10-13. Engine locations refer to the original 4.2 working tree.
> The deployment candidate uses the v5 single-skill workflows; see [scope and transfer](README.md).

# 관찰에서 도출한 12개 조건부 패턴

최초 조사 단계의 연구 후보 기록이다. 이후 반영한 조건·반례는 [구현 기록](README.md)에 있으며, 이 목록 자체를 12개 의무 룰로 추가하지 않았다. 서로 다른 외형에서 반복된 관계를 기록했다. 수상 여부·출현 빈도는 사용성이나 전환의 인과 증거가 아니다. 개별 사례의 관찰 범위는 [CASES.md](CASES.md), 전체 기록은 [observations.json](data/observations.json)에 있다.

| 패턴 | 지원할 판단 | 엔진에서 할 일 |
|---|---|---|
| P01 중요한 대상과 보조 정보 사이에 강약을 만든다 | 사용자가 먼저 봐야 할 것이 무엇인가 | 기존 원칙 유지 + 하위 지침 정합화 |
| P02 비대칭에도 공유하는 정렬 관계가 있다 | 다른 비중의 내용을 어떻게 한 화면으로 묶을 것인가 | 기존 원칙에 사례 추가 |
| P03 여백과 구분선은 정보의 묶음을 설명한다 | 어디까지 같은 묶음인지 어떻게 알릴 것인가 | 강제 수치와 형태를 조건부 휴리스틱으로 |
| P04 타이포그래피는 역할 사이의 차이를 만든다 | 읽는 문장·탐색 라벨·숫자·브랜드 목소리를 어떻게 구별할 것인가 | 역할 기반 평가로 정합화 |
| P05 이미지는 장식이 아니라 판단할 대상을 보여준다 | 사용자에게 무엇을 보여줘야 제안이 구체적으로 이해되는가 | 기존 원칙 강화 + 미디어 계약 구체화 후보 |
| P06 색의 수보다 색이 맡는 역할이 안정적이다 | 어떤 색이 행동·분류·상태·브랜드·콘텐츠를 담당하는가 | 팔레트 계약과 오래된 craft 문구의 충돌 정리 |
| P07 같은 의미의 항목은 같은 문법으로 반복한다 | 무엇을 비교 가능하게 보존하고 무엇을 다르게 보여줄 것인가 | 최우선 정합화 |
| P08 개성은 일관된 표현 관계에서 나온다 | 이 브랜드만의 구체적인 특징을 어디에 둘 것인가 | 기존 원칙을 과도하게 해석하지 않도록 사례 보강 |
| P09 밀도와 화면 분할은 사용자의 작업을 따른다 | 지금 사용자는 감상·읽기·비교·조작 중 무엇을 하는가 | 하드한 구성 수량 제거 후보 |
| P10 다음 행동의 강도와 위치가 현재 맥락에 맞는다 | 이 영역을 본 뒤 사용자가 할 일은 무엇인가 | 범위를 viewport에서 의사결정 맥락으로 수정 |
| P11 작업 도구와 보여줄 콘텐츠의 표현 강도를 나눈다 | 화면의 개성과 기능적 익숙함을 어디에 배분할 것인가 | 적용 맥락 구체화 |
| P12 해석에 필요한 설명은 대상 가까이에 둔다 | 이 이미지·숫자·항목을 오해하지 않으려면 무엇을 같이 봐야 하는가 | 좋은 원칙과 예시 형태를 분리 |

## P01 · 중요한 대상과 보조 정보 사이에 강약을 만든다

크기·위치·여백·명도·밀도 중 맥락에 맞는 수단으로 중요도를 드러낸다.

- **적용:** 브랜드 소개, 상품 이해, 읽기, 작업 화면 모두. 단, 여러 대상을 동시에 비교하는 작업은 비교 영역 전체가 중심이 된다.
- **열어 둘 선택:** 사진이 크게 / 제목이 크게 / 비교 영역이 넓게 / 주변을 조용하게. 큰 헤드라인이나 단일 거대 KPI를 의무화하지 않는다.
- **관찰 근거:** [SI002 SIHA](https://www.siteinspire.com/website/13654-siha), [SI013 Town](https://www.siteinspire.com/website/13643-town), [SI014 Sam Thies](https://www.siteinspire.com/website/13642-sam-thies), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), LW013 amplitude (private reference; not distributed), LW020 pinterest (private reference; not distributed)
- **반례·한계:** 분석 화면의 동등한 지표에 억지로 주인공 하나를 만들면 비교가 왜곡된다.
- **확인 방법:** 라벨을 읽기 전의 시선 중심과 실제 사용자의 우선 작업이 맞는지 검토한다.
- **기존 엔진 연결:** CRAFT-BASELINE.md의 attention model은 유지. PAGE-TYPES.md의 headline dominates / brightest CTA를 조건부로 수정.
- **신뢰 범위:** 관찰 중간~높음; 태스크 성과 미검증

## P02 · 비대칭에도 공유하는 정렬 관계가 있다

몇 개의 기준선과 정보 역할을 공유하고, 강조할 영역에서만 배치를 변주한다.

- **적용:** 서로 다른 크기의 이미지·본문·메타데이터를 함께 쓰는 화면.
- **열어 둘 선택:** 중앙 축, 좌우 열, 이미지 가장자리, 반복되는 캡션선. 열 수·좌우 비율·대칭 여부는 자유.
- **관찰 근거:** [SI024 Studio OL](https://www.siteinspire.com/website/13632-studio-ol), [SI028 TaylorHare Architects](https://www.siteinspire.com/website/13628-taylorhare-architects), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), [CD004 Cristiana Araújo — Portfolio](https://www.cssdesignawards.com/sites/cristiana-araujo-portfolio/50197/), [AW077 Obys® Experiment Space](https://www.awwwards.com/sites/obys-r-experiment-space), LW013 amplitude (private reference; not distributed)
- **반례·한계:** 표현형 캠페인은 일부 글자를 의도적으로 변형하거나 겹칠 수 있다. 데이터 표의 비교 정렬까지 흐트러뜨릴 근거는 아니다.
- **확인 방법:** 어떤 요소가 어느 기준선에 연결되는지 설명할 수 있는지, 실제 문자열로 줄바꿈·잘림을 확인한다.
- **기존 엔진 연결:** VISUAL-CRAFT.md CR-10을 유지하고 비대칭·다른 이미지 비율의 사례를 추가.
- **신뢰 범위:** 정적 구도 관찰 중간~높음

## P03 · 여백과 구분선은 정보의 묶음을 설명한다

정보 관계를 먼저 만들고 이를 간격·정렬·톤·선·필요한 깊이로 드러낸다.

- **적용:** 소개 문장, 경력, 상품 목록, 도구 패널 등.
- **열어 둘 선택:** 카드 없는 편집 화면, 얇은 선의 도구 패널, 톤이 다른 덩어리 모두 가능. 모든 그룹의 2배 간격·그림자 수를 강제하지 않는다.
- **관찰 근거:** [CD004 Cristiana Araújo — Portfolio](https://www.cssdesignawards.com/sites/cristiana-araujo-portfolio/50197/), [SI024 Studio OL](https://www.siteinspire.com/website/13632-studio-ol), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), LW008 dovetail (private reference; not distributed), LW013 amplitude (private reference; not distributed), LW018 retool (private reference; not distributed)
- **반례·한계:** 정보가 많은 편집기는 여백만으로 구분하기 어려워 경계선이 유리할 수 있다. 장식 때문에 이미 명확한 그룹을 다시 카드에 넣지 않는다.
- **확인 방법:** 내용의 묶음과 시각적 묶음이 일치하는지, 불필요한 경계를 제거해도 구분되는지 확인한다.
- **기존 엔진 연결:** CRAFT-BASELINE의 경계 기준을 중심으로 CR-6·CC-1·CC-7·§70의 절대형 문구를 정리.
- **신뢰 범위:** 관찰 중간~높음; 정확한 간격 수치는 미측정

## P04 · 타이포그래피는 역할 사이의 차이를 만든다

서체, 굵기, 행 구성, 폭, 크기를 읽는 목적에 맞춰 배정한다.

- **적용:** 브랜드·편집 화면에서 특히 강함. 제품 UI는 반복 독해와 조작을 우선.
- **열어 둘 선택:** 세리프 소개, 산세리프 대제목, 응축 디스플레이, 조용한 도구 라벨. 특정 서체나 흰 바탕을 품질의 대리 지표로 쓰지 않는다.
- **관찰 근거:** [SI013 Town](https://www.siteinspire.com/website/13643-town), [SI024 Studio OL](https://www.siteinspire.com/website/13632-studio-ol), [SI035 House of Honey](https://www.siteinspire.com/website/13621-house-of-honey), [AW074 2xA Studio](https://www.awwwards.com/sites/2xa-studio), [CD002 Tom Barrow — Portfolio](https://www.cssdesignawards.com/sites/tom-barrow/50379/), LW013 amplitude (private reference; not distributed)
- **반례·한계:** 작은 표·금액·식별자에는 장식적 서체보다 구별과 정렬이 중요하다. 보기 좋은 커버만으로 본문 가독성을 승인하지 않는다.
- **확인 방법:** 실제 언어·문장 길이·숫자·작은 화면으로 읽기 확인. 글꼴 수가 아니라 역할 충돌과 읽기 실패를 기록한다.
- **기존 엔진 연결:** CC-9d의 freshness/serif 금지를 수정. 승인된 타입 역할을 존중하는 ss-score/ss-review는 유지.
- **신뢰 범위:** 관찰 중간~높음; 한국어 전이 검증 필요

## P05 · 이미지는 장식이 아니라 판단할 대상을 보여준다

실제 대상의 형태·재질·맥락·작업 결과와 텍스트의 배치를 함께 설계한다.

- **적용:** 상품, 공간, 작품, 만드는 과정, 제품 기능을 소개할 때.
- **열어 둘 선택:** 제품 근접 사진, 작업 장면, 공간 사진, 기능 화면, 타이포그래피만의 아카이브. 3D·사진은 필수가 아니다.
- **관찰 근거:** [SI002 SIHA](https://www.siteinspire.com/website/13654-siha), [CD005 Wonder Vision](https://www.cssdesignawards.com/sites/wonder-vision/50220/), [SI019 Jakobsen Copenhagen](https://www.siteinspire.com/website/13637-jakobsen-copenhagen), [SI025 Tekt](https://www.siteinspire.com/website/13631-tekt), [AW101 Radian](https://www.awwwards.com/sites/radian), [RE009 Interfere](https://recent.design/i/mysyrbt-interfere)
- **반례·한계:** 데이터 표나 아카이브에 무관한 영웅 이미지를 넣으면 판단해야 할 내용을 밀어낸다.
- **확인 방법:** 그 이미지를 다른 회사의 스톡 이미지로 바꿔도 메시지가 같다면 구체성이 약한지 재검토. crop·캡션·대체 표현은 실제 렌더에서 확인.
- **기존 엔진 연결:** CRAFT-BASELINE의 real product content를 유지. REFERENCE-COMPILER의 media 기록을 subject / role / crop / text-safe area / fallback까지 구체화하는 후보.
- **신뢰 범위:** 관찰 중간~높음; 의미 적합성은 편집 판단

## P06 · 색의 수보다 색이 맡는 역할이 안정적이다

각 색의 반복 위치와 의미를 유지하고 필요한 신호가 경쟁하지 않게 한다.

- **적용:** 기능 화면, 편집 아카이브, 다색 브랜드, 따뜻한 이미지 중심 화면.
- **열어 둘 선택:** 단색 UI, 다색 분류, 종이색 배경, 어두운 브랜드, 다채로운 상품 이미지. 행동색 하나를 전체 콘텐츠 팔레트에까지 강요하지 않는다.
- **관찰 근거:** [AW061 Mosby's Files](https://www.awwwards.com/sites/mosbys-files), [AW103 Units](https://www.awwwards.com/sites/units), [SI006 Carrière Scène](https://www.siteinspire.com/website/13650-carriere-scene), [SI024 Studio OL](https://www.siteinspire.com/website/13632-studio-ol), [SI035 House of Honey](https://www.siteinspire.com/website/13621-house-of-honey), LW013 amplitude (private reference; not distributed)
- **반례·한계:** 오류·경고가 브랜드 장식과 구별되지 않으면 실패다. 다색을 사용한다는 이유만으로 일관성이 생기지는 않는다.
- **확인 방법:** 색별 역할 표를 만들고 흑백·색각 조건에서 정보가 사라지지 않는지 검사한다. 이번 수집 이미지는 대비 통과 증거가 아니다.
- **기존 엔진 연결:** PALETTE-RECIPES의 semantic roles 유지. VISUAL-CRAFT CL-2b/2c/3/5의 단색·검정·배경색 절대 규정을 맥락화.
- **신뢰 범위:** 관찰 중간~높음; 접근성 별도 측정

## P07 · 같은 의미의 항목은 같은 문법으로 반복한다

동등한 정보는 구조·표기·단위·축을 일관되게 유지한다. 중요도나 질문이 바뀔 때 표현을 바꾼다.

- **적용:** KPI, 상품, 작품, 설정, 목록, 같은 데이터 질문을 다루는 차트.
- **열어 둘 선택:** 같은 KPI 카드, 반복 행, 동일 차트의 small multiples, 이미지 비율만 달라지는 작품 목록. 반복 자체를 감점하지 않는다.
- **관찰 근거:** LW002 pop (private reference; not distributed), LW003 dub (private reference; not distributed), LW005 hashnode (private reference; not distributed), LW006 squarespace (private reference; not distributed), LW018 retool (private reference; not distributed), LW020 pinterest (private reference; not distributed), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), [RE008 Harry Atkins](https://recent.design/i/9b18jw0-harry-atkins)
- **반례·한계:** 서로 다른 질문이나 중요도를 모든 카드에 똑같이 넣는 것도 실패다. 이야기의 전환 구간은 리듬을 바꿀 수 있다.
- **확인 방법:** 서로 비교할 두 항목을 같은 방식으로 읽을 수 있는가. 다양성을 만들기 위해 차트의 데이터 의미를 바꾸지 않았는가.
- **기존 엔진 연결:** §61~64·§66·enterprise-workbench Reject를 수정하고, CRAFT-BASELINE/List page의 반복 허용 원칙을 모든 진입점에 전파.
- **신뢰 범위:** 관찰 높음; 비교 효과의 인과 검증은 별도

## P08 · 개성은 일관된 표현 관계에서 나온다

형태·재료·언어·색이 서로 관련되게 만들되 기능적 안내는 해석 가능하게 유지한다.

- **적용:** 표현이 필요한 브랜드, 문화, 포트폴리오, 상품 소개.
- **열어 둘 선택:** 파일 탭의 분류 체계, 변형된 워드마크, 사람과 캐릭터의 짝, 패키지와 연결된 색. 특정 장식 하나를 모든 화면에 복제하지 않는다.
- **관찰 근거:** [AW061 Mosby's Files](https://www.awwwards.com/sites/mosbys-files), [AW064 NOTHIN'](https://www.awwwards.com/sites/nothin), [AW103 Units](https://www.awwwards.com/sites/units), [SI006 Carrière Scène](https://www.siteinspire.com/website/13650-carriere-scene), [SI013 Town](https://www.siteinspire.com/website/13643-town), [CD009 Agrumea Farm](https://www.cssdesignawards.com/sites/agrumea-farm/50176/)
- **반례·한계:** 업무 도구의 모든 패널에 개성 있는 장식을 넣을 필요는 없다. 획일적인 '한 가지 시그니처 필수'도 또 다른 템플릿이 된다.
- **확인 방법:** 브랜드 재료와 사용자 과업 사이의 설명 가능한 연결이 있는지 확인. 여러 표현을 쓰더라도 관계가 유지되는지 검토.
- **기존 엔진 연결:** CC-9c와 expressive-brand의 의도는 유지. signature count를 하드 검사로 승격하지 않음.
- **신뢰 범위:** 관찰 중간; 독창성은 인간 판단

## P09 · 밀도와 화면 분할은 사용자의 작업을 따른다

한 화면의 정보량과 구획을 작업 관계에 맞춰 정한다.

- **적용:** 같은 제품 안의 랜딩, 아카이브, 분석, 편집, 빈 상태.
- **열어 둘 선택:** 한 표지만 보여주는 화면, 빽빽한 인덱스, 설정-결과-속성 패널, 데이터 없는 시작 화면. 위에서 아래로 밀도가 반드시 증가할 이유는 없다.
- **관찰 근거:** [SI017 The Surfer’s Journal Archives](https://www.siteinspire.com/website/13639-the-surfers-journal-archives), [SI024 Studio OL](https://www.siteinspire.com/website/13632-studio-ol), [SI036 Visual (Archives) Society](https://www.siteinspire.com/website/13620-visual-archives-society), [AW077 Obys® Experiment Space](https://www.awwwards.com/sites/obys-r-experiment-space), LW004 polar-sh (private reference; not distributed), LW013 amplitude (private reference; not distributed), LW018 retool (private reference; not distributed)
- **반례·한계:** 아카이브의 고밀도를 가입 폼에, 캠페인의 큰 빈 공간을 반복 업무에 그대로 적용하지 않는다.
- **확인 방법:** 주요 작업에 필요한 정보가 함께 보이는지, 다른 정보가 우선 작업을 가리는지 검토한다.
- **기존 엔진 연결:** §63·67·68의 Hero/KPI/4~7 sections를 특정 예시로 격하. PAGE-TYPES Dashboard의 현재 task 모델을 유지.
- **신뢰 범위:** 정적 관찰 중간; 전체 플로우 추가 검증 필요

## P10 · 다음 행동의 강도와 위치가 현재 맥락에 맞는다

그 순간의 다음 행동을 주변 설명·증거와 연결하고 경쟁하는 선택을 명료하게 나눈다.

- **적용:** 구매·가입·조건 적용·작품 탐색. 전역 행동과 지역 행동은 구분.
- **열어 둘 선택:** 밑줄 링크, 검정 버튼, 아이템 전체의 탐색 링크, 팝오버 Apply. 가장 채도 높은 요소 하나를 viewport 전체에 강요하지 않는다.
- **관찰 근거:** [SI002 SIHA](https://www.siteinspire.com/website/13654-siha), [SI013 Town](https://www.siteinspire.com/website/13643-town), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), [AW101 Radian](https://www.awwwards.com/sites/radian), [RE009 Interfere](https://recent.design/i/mysyrbt-interfere), LW013 amplitude (private reference; not distributed)
- **반례·한계:** 독립 작업 영역 두 곳에 각각 중요한 버튼이 있을 수 있다. CTA의 존재가 전환 개선을 입증하지는 않는다.
- **확인 방법:** 현재 영역에서 행동을 찾을 수 있는지, 버튼의 결과가 명확한지, 전역/지역 행동이 혼동되지 않는지 확인.
- **기존 엔진 연결:** CC-6과 Landing hierarchy를 decision region 기준으로 재작성.
- **신뢰 범위:** 관찰 중간~높음; 전환 성과 미검증

## P11 · 작업 도구와 보여줄 콘텐츠의 표현 강도를 나눈다

탐색과 조작은 일관되게 식별되도록 하고, 차별화가 필요한 콘텐츠에 표현의 비중을 둔다.

- **적용:** 미디어 목록, 작품 사이트, 분석·편집 도구, 브랜드 랜딩.
- **열어 둘 선택:** 조용한 메뉴+강한 작품, 반복되는 속성 패널+편집 대상, 작은 안내+큰 브랜드 장면. 브랜드형 메뉴도 역할이 명확하면 가능.
- **관찰 근거:** [SI004 WSM](https://www.siteinspire.com/website/13652-wsm), [SI011 ViV Management](https://www.siteinspire.com/website/13645-viv-management), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), [CD005 Wonder Vision](https://www.cssdesignawards.com/sites/wonder-vision/50220/), LW013 amplitude (private reference; not distributed), LW018 retool (private reference; not distributed)
- **반례·한계:** 상단 영역이 항상 작거나 무채색이어야 하는 것은 아니다. AW103처럼 메뉴 자체가 브랜드 체계를 가질 수 있다.
- **확인 방법:** 브랜드 표현을 제거해도 탐색·작업 구조가 설명되는가. 반대로 메뉴가 콘텐츠를 압도하지 않는가.
- **기존 엔진 연결:** APP-PLAYBOOKS의 domain bias를 domain × page role로 좁히는 사례 추가.
- **신뢰 범위:** 관찰 중간~높음

## P12 · 해석에 필요한 설명은 대상 가까이에 둔다

해석에 필요한 문맥을 대상과 연결하되 모든 화면에 같은 모양의 보조 블록을 강요하지 않는다.

- **적용:** 작품명·번호, 사진 설명·출처, 기간·단위·범례, 경력의 역할·시점.
- **열어 둘 선택:** 이미지 하단 캡션, 옆 주석, 표 헤더, 공통 기간 필터, 차트의 직접 라벨. 반드시 세 칸짜리 stat footer일 필요는 없다.
- **관찰 근거:** [SI024 Studio OL](https://www.siteinspire.com/website/13632-studio-ol), [SI030 SORT Office](https://www.siteinspire.com/website/13626-sort-office), [CD004 Cristiana Araújo — Portfolio](https://www.cssdesignawards.com/sites/cristiana-araujo-portfolio/50197/), [AW077 Obys® Experiment Space](https://www.awwwards.com/sites/obys-r-experiment-space), LW013 amplitude (private reference; not distributed), LW020 pinterest (private reference; not distributed)
- **반례·한계:** 같은 기간과 단위를 공유하는 차트마다 중복 설명을 붙이면 잡음이 될 수 있다. 제거해도 해석 가능한지 먼저 판단.
- **확인 방법:** 단위·기간·출처·라벨 없이 잘못 읽을 여지가 있는지 실제 내용으로 확인.
- **기존 엔진 연결:** §69의 context 원칙은 보존하고 footer/기간 버튼 수/현재 값의 형태 강제를 제거.
- **신뢰 범위:** 관찰 중간~높음

## 별도 검증이 필요한 두 영역

**반응형:** 첫 화면의 역할·비교 관계·다음 행동이 작은 화면에서도 유지되는지 확인해야 한다. 이번에는 모바일 렌더를 관찰하지 않았으므로 새로운 공통 모바일 패턴이라고 주장하지 않는다.

**모션:** 정지 미리보기는 움직임의 시간·타이밍·조작성을 증명하지 않는다. 기존의 행동 차단 금지와 reduced-motion 기준은 유지하고, 별도로 실제 조작·정지 상태를 확인해야 한다.

## 원칙과 외형을 분리하는 검토 질문

같은 원칙을 적용하고도 다른 색·서체·구도·재료로 좋은 결과를 만들 수 있는가? 만들 수 없다면 원칙이 아니라 특정 외형의 레시피인지 확인한다. 레시피도 유용하지만 선택된 맥락 안에 머물러야 한다.
