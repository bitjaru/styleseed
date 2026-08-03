<div align="center">

<br />

# styleseed

### AI에게 고정된 디자인 판단을 가르칩니다.<br />하나의 고정된 미학이 아니라.

<sub>AI 코딩 도구가 디자인 시스템을 잡고, 채점 게이트가 퀄리티를 지키고, 결정은 레포에 남아 화면이 늘어나도·시간이 지나도 유지됩니다 — <b>디자인 팀 없이도 디자인된 티가 나는 제품</b>. Claude Code · Codex · Cursor용 오픈소스.</sub>

<br />
<br />

<a href="https://styleseed-demo.vercel.app/showcase">
  <img src="showcase/v26-compare.png" width="720" alt="같은 제품, 같은 프롬프트 — 왼쪽: 기본 AI 출력, 오른쪽: StyleSeed 룰 적용" />
</a>

**같은 제품. 같은 프롬프트. 룰만 바꿨습니다.**

</div>

**렌더링된 벤치마크 셀 120개로 확인했습니다:** 강제 게이트는 Codex와 Claude Code를 각각 **+5.3점** 개선했습니다. 룰만 전달했을 때는 결과가 일관되지 않았습니다(Codex +1.6, Claude Code −3.7). 그래서 StyleSeed는 프롬프트 묶음이 아니라 렌더 → 채점 → 수정 루프를 제공합니다. **[BENCH-V1 결과와 원본 근거 보기 →](https://styleseed-demo.vercel.app/gate)**

## 쉬운 시작 (30초)

**1. 프로젝트를 Claude Code, Codex, Cursor 같은 코딩 에이전트에서 엽니다.**

**2. 아래 문장을 그대로 붙여넣습니다:**

```text
StyleSeed를 `npx skills add bitjaru/styleseed`로 설치하고 이 프로젝트에 설정해줘. 내가 무엇을 만드는지와 꼭 필요한 디자인 선택만 물어봐. 결과물의 목적에 맞는 출력 문법과 형태 언어를 정하는 브랜드 레시피 하나를 선택하되 특정 회사를 복제하지 마. 내 레퍼런스가 기존 문법에 없으면 프로젝트 전용 문법으로 만들어. 승인한 결정은 STYLESEED.md에 저장하고, 하나의 명확한 초점을 가진 결과물을 만든 뒤 코드 점수를 80점 이상으로 고쳐. 실제 화면을 렌더링하고 눈으로 검증한 다음 보여줘. Claude Code에서는 `/ss-*`, Codex에서는 `$ss-*`, 다른 에이전트에서는 설치된 스킬 선택기를 사용해.
```

**3. 설치를 승인하고, 짧은 설정 질문에 답한 뒤 만들고 싶은 것을 말합니다.**
StyleSeed가 디자인 락, 빌드, 코드 검사, 실제 화면 검증을 진행합니다. 디자인 시스템을 미리 알 필요가 없습니다.

| 에이전트 | 직접 실행하고 싶을 때 |
|---|---|
| **Claude Code** | `/ss-setup` → `/ss-build` |
| **Codex** | `$ss-setup` → `$ss-build` 또는 `/skills`에서 선택 |
| **Cursor 및 기타** | 위 문장을 붙여넣거나 설치된 스킬 선택기 사용 |

[Claude Code 가이드](https://styleseed-demo.vercel.app/claude-code-ui-design) · [Codex 가이드](https://styleseed-demo.vercel.app/codex-ui-design) · [결과물 예시](https://styleseed-demo.vercel.app/showcase) · [상세 사용법](#상세-사용법)

## 보자마자 금지하는 것들

"AI가 만든 티"는 운이 나쁜 게 아니라 — **이름 붙일 수 있는 패턴의 목록**입니다. StyleSeed는 그걸 금지하는 **74개 룰**과, 80점 미만 화면을 사용자에게 보여주지 못하게 막는 **0–100 채점 게이트**를 함께 제공합니다.

| 금지 | 이유 |
|---|---|
| 기본 인디고 `#4F46E5` / `#5E6AD2` 액센트 | 만국 공통 "AI가 만들었네" 색 |
| UI 아이콘 자리에 이모지 🚗 🧺 ⭐ | 제멋대로 색 주입 + OS마다 다르게 렌더링 |
| 기능 카드마다 아이콘 칩 하나씩 | 1세대 AI 티 — 정보인 척하는 장식 |
| 같은 무게 카드의 균등 그리드 | 기계 조합 티 1위: 초점이 없음 |
| 순수 `#000` 배경 | 밋밋한 공허 — 진짜 다크 UI는 층진 램프를 씀 |
| 고정 테이블 밖의 폰트 사이즈 | 화면이 "뭔가 이상한데 왜인지 모르겠는" 이유 |
| 컴포넌트에 하드코딩된 hex | 토큰만 — 아니면 락이 화면 간에 유지 안 됨 |

<sub>기본값 금지만으론 부족합니다 — 옛 티를 막으면 에이전트는 새 유니폼으로 수렴하니까요. 그래서 룰이 체크리스트가 아니라 강제 채점-수정 루프로 옵니다.</sub>

<div align="center">

<br />

<a href="https://styleseed-demo.vercel.app">
  <img src="showcase/demo.gif" width="640" alt="StyleSeed 라이브 데모 — 같은 챗 UI가 Toss, Raycast, Arc 브랜드 스킨으로 morph" />
</a>

<br /><br />

[![▶ AI 챗 데모 열기](https://img.shields.io/badge/▶_AI_Chat_Demo-Live-FF4E8B?style=for-the-badge&logoColor=white)](https://styleseed-demo.vercel.app)
&nbsp;
[![▶ 프라이싱 데모 열기](https://img.shields.io/badge/▶_Pricing_Demo-Live-6C5CE7?style=for-the-badge&logoColor=white)](https://styleseed-demo.vercel.app/pricing)

**같은 컴포넌트. 3개 토큰 스킨.** Toss · Raycast · Arc-inspired 스킨은 색과
타입 재료를 바꿉니다. 실제 구조·컨트롤·컬렉션·밀도·모션은 별도의 브랜드 레시피가
바꿉니다. **[9개 형태 언어 비교 →](https://styleseed-demo.vercel.app/recipes)**

<br />

**StyleSeed는 Toss 룩 하나를 강제하지 않습니다. 결과물의 목적에 맞는 디자인 문법을 선택하고, 디자이너가 판단하는 방법을 에이전트에 적용합니다.**<br />
금융 소비자 앱, B2B 운영 화면, 개발자 콘솔, 에디토리얼, 커머스, 공공 서비스,
마케팅, 캐러셀은 서로 다른 룰셋으로 동작합니다. 없는 문법은 레퍼런스에서 컴파일합니다.

<br />

<a href="https://styleseed-demo.vercel.app/how-it-thinks">
  <img src="assets/rules-blueprint.svg" width="840" alt="모든 결정은 이유 있는 룰이다 — UI 카드의 각 선택에 해당 디자인 룰을 주석으로 단 다이어그램. 다른 repo는 컴포넌트를, StyleSeed는 판단을 준다." />
</a>

<br /><br />

[쉬운 시작](#쉬운-시작-30초) · [상세 사용법](#상세-사용법) · [엔진 구조](engine/ARCHITECTURE.md) · [왜-필요한가](#왜-필요한가) · [모션](#네임드-모션-시스템) · [AI-스킬-21개](#ai-스킬-21개) · [Wiki](../../wiki)

<br />

</div>

---

## 누구를 위한 프로젝트인가?

- **Claude Code**나 **Cursor**에 대시보드를 시켰는데 촌스럽게 나오신 분
- **바이브코딩**으로 SaaS를 만드는데 디자이너를 구하기 어려우신 분
- **shadcn/ui**를 쓰지만 결과물이 여전히 "AI가 만든 느낌"이신 분
- Toss 같은 레퍼런스를 **맞는 결과물에만** 적용하고 싶은 분
- 인스타 캐러셀·슬라이드·리포트·커버 등 웹 밖의 바이브코딩 산출물도 통일하고 싶은 분
- 이미지·URL·Figma·기존 UI에서 복제 아닌 재사용 가능한 디자인 문법을 추출하고 싶은 분
- 디자인용 **Claude Code 스킬** 또는 **Cursor rules**를 만드시는 분
- AI로 빠르게 출시하면서도 "AI로 만든 티 안 나는" UI가 필요하신 분

## Data vs Judgment

"LLM 디자인 개선" 시도하는 repo들은 전부 문제의 절반만 풀고 있어요. 모델한테 **디자인 데이터**를 더 먹이는 방식이죠. 브랜드 팔레트. 폰트 스펙. Shadow 토큰. 컴포넌트 라이브러리. 저도 그렇게 시작했습니다. Toss 디자인 토큰 JSON 통째로 프롬프트에 박아넣어 봤는데, 결과물은 여전히 촌스러웠어요.

그때 깨달았습니다. **Toss 팔레트 쥐여준 주니어 디자이너도 여전히 촌스러운 대시보드 만듭니다. 회색만 있는 시니어 디자이너는 정제된 화면 뽑아냅니다.** 차이는 가진 게 아니에요. 그걸 가지고 뭘 해야 할지 아는 것입니다.

디자인 데이터는 물감이에요. 디자인 판단은 물감을 어디에 칠해야 할지 아는 겁니다.

StyleSeed는 **디자인 방법 엔진**입니다. 74개 시각 룰, 8개 출력 문법, 5개 서피스
어댑터, 컨텍스트·레퍼런스 컴파일러, 48개 컴포넌트, 21개 `ss-*` 워크플로우 스킬이 LLM에게 데이터가
아니라 판단을 가르칩니다:

```
"정제된 검정은 #000이 아니라 #2A2A2A다"
"한 화면의 주 행동은 명확해야 하고, 추가 색은 반복 가능한 의미가 있어야 한다"
"그림자는 4% 투명도. 보이면 이미 너무 진한 거다"
"숫자와 단위는 2:1 비율. 48px 숫자, 24px 단위. 항상"
"같은 섹션 타입을 연속으로 쓰지 말 것. 높이 / 낮이 번갈아서 리듬을 만들 것"
"카드와 배경의 분리가 어떤 테두리보다 중요하다"
```

이런 룰은 아무도 안 써놓습니다. 프로 디자이너의 수년 경험에 녹아있어서 외부인한테 안 보이고, 그래서 LLM한테도 안 보입니다. StyleSeed는 이 판단을 문법·어댑터·도메인·페이지·프로필로 나누고, 프로젝트가 선택한 부분만 10–20KB 규칙 번들로 컴파일해 Claude Code와 Codex에 건넵니다. 전체 핸드북을 매번 프롬프트에 붓지 않습니다.

핵심 판단은 **브랜드 독립적**이지만 모든 결과물에 같은 배치를 강제하지 않습니다.
`Core judgment × Output grammar × Surface adapter × Domain/Page × Brand recipe × optional Style profile`로
합성합니다. 자세한 흐름은 [엔진 구조도와 기술문서](engine/ARCHITECTURE.md)에 정리했습니다.

<div align="center">
  <img src="assets/styleseed-architecture.svg" width="900" alt="StyleSeed 엔진 구조도" />
</div>

## 30초 실증

🔥 저희 랜딩페이지의 초기 버전을 저희 게이트로 채점하니 **58/100**이 나왔습니다. 고쳐서 86점 — **[전체 채점표(영수증) 보기](https://styleseed-demo.vercel.app/scorecard)**

Claude Code한테 "대시보드 만들어줘" 하면 보통 이런 결과가 나옵니다:

> 간격 제각각, 폰트 크기 뒤죽박죽, 색 남발, 카드 구조 없음. 기능은 되는데 촌스러움.

**StyleSeed를 쓰면:**

<div align="center">
  <img src="showcase/light-hero.png" width="280" alt="StyleSeed로 만든 SaaS 대시보드" />
  <br />
  <em>Claude Code + Toss seed로 생성. 디자이너 개입 0.</em>
</div>

<details>
<summary><strong>전체 페이지 보기</strong></summary>
<div align="center">
  <img src="showcase/light-full.png" width="280" alt="전체 대시보드" />
</div>
</details>

<br />

차이점? AI한테 **디자이너의 판단 기준**을 심어준 것.

**[before/after 직접 보기 →](https://styleseed-demo.vercel.app/why)** — 같은 대시보드 브리프를, 일반 AI 출력 vs 74개 판단 룰 적용으로 나란히. 각 차이가 어떤 룰 때문인지 주석까지.

## 상세 사용법

### ⚡ 가장 빠른 방법: 한 문장 붙여넣기

Claude Code·Codex·Cursor 등 아무 AI 에이전트에 이 한 문장을 붙여넣으면 됩니다 — **설치 + 전체 루프를 한 번에**:

```
Install StyleSeed so its checks actually run: `npx skills add bitjaru/styleseed` (if you can't, read https://styleseed-demo.vercel.app/llms.txt instead). Then use it for every visual artifact in this project. First, choose the output grammar, surface adapter, and one brand recipe for morphology without cloning a company. Lock color roles, type, geometry, and motion with me in STYLESEED.md, then run `/ss-resolve` in Claude Code or `$ss-resolve` in Codex and build from `.styleseed/effective-rules.md`. Build with ONE focal point and only stable, named color roles. Before showing me anything, run the quality gate (`/ss-score` or `$ss-score`) to ≥ 80 and fix what fails, then render and inspect with `/ss-verify` or `$ss-verify`.
```

> 💡 **왜 설치부터 시키나:** `ss-resolve` 컨텍스트 컴파일러와 `ss-score`·`ss-build`
> 게이트는 **스킬이 설치돼 있어야 실제로 돌아갑니다.** 설치하면 `STYLESEED.md`가 작은
> 출처 해시 규칙 번들로 컴파일되고, 게이트가 진짜로 채점·수정합니다. 설치가 안 되면
> `llms.txt`의 포터블 라우팅과 공개 카탈로그를 쓸 수 있지만 컴파일·게이트는 수동 경로라
> 재현성이 더 약합니다.

설치 후 Claude Code에서는 `/ss-resolve` → `/ss-build`, Codex에서는 `$ss-resolve` →
`$ss-build`를 실행하세요. 선택된 규칙만 작은 번들로 컴파일되고 출처 해시가
`.styleseed/manifest.json`에 남습니다. Codex의 `/skills` 목록에서도 선택할 수 있습니다.

### 방법 1: 인터랙티브 설정 (추천)

**1단계 — 스킬 설치.** 모든 지원 에이전트에서 가장 간단한 방법은 다음 명령입니다:

```bash
npx skills add bitjaru/styleseed
```

프로젝트에 직접 복사하려면 에이전트가 읽는 경로를 선택하세요:

```bash
# StyleSeed 다운로드
git clone https://github.com/bitjaru/styleseed.git /tmp/styleseed

# Claude Code
mkdir -p .claude/skills
cp -r /tmp/styleseed/engine/.claude/skills/* .claude/skills/

# Codex 저장소 스킬
mkdir -p .agents/skills
cp -r /tmp/styleseed/engine/.claude/skills/* .agents/skills/
```

**2단계 — 새 에이전트 세션을 시작**한 뒤 setup을 실행하세요:

```text
Claude Code: /ss-setup
Codex:       $ss-setup   # 또는 /skills에서 ss-setup 선택
```

그러면 Claude Code가 하나씩 물어봅니다:
1. 어떤 앱? (SaaS, 이커머스, 핀테크...)
2. 브랜드 색상? (선택 또는 헥스 코드 입력)
3. 참고할 브랜드 스타일? (Stripe, Linear, Vercel... awesome-design-md에서 선택)
4. 폰트?
5. 앱 이름 + 첫 페이지?

자동으로 설정하고 첫 페이지까지 생성해줍니다.

### 방법 2: Claude Code한테 URL 주기

```
https://github.com/bitjaru/styleseed 여기에서 engine/CLAUDE.md 랑
engine/DESIGN-LANGUAGE.md 읽고 디자인 시스템 규칙 파악해줘.
engine/components/ 컴포넌트랑 skins/stripe/theme.css 토큰 사용해서
SaaS 대시보드 만들어줘. 매출 차트, 유저 통계, 최근 활동 포함.
```

Claude Code가 디자인 규칙을 읽고 적용합니다. 설치 필요 없음.

### 방법 3: 프로젝트에 복사 (계속 쓸 때)

```bash
git clone https://github.com/bitjaru/styleseed.git /tmp/styleseed
# 엔진 복사 (방법 1의 스킬 복사도 함께 진행)
cp /tmp/styleseed/engine/CLAUDE.md ./CLAUDE.md
cp /tmp/styleseed/engine/DESIGN-LANGUAGE.md ./.claude/DESIGN-LANGUAGE.md
cp -r /tmp/styleseed/engine/components/* src/components/
cp -r /tmp/styleseed/engine/css/* src/styles/
cp /tmp/styleseed/skins/toss/theme.css src/styles/theme.css
```

`CLAUDE.md`를 자동으로 읽어서 매번 URL 안 줘도 됩니다.

## 왜 필요한가

### 모두가 겪는 문제

AI 코딩 도구는 기능적인 UI를 잘 만듭니다. 하지만 **기능적 ≠ 아름다운**.

디자인 규칙 없이 AI가 만든 UI:
- 간격이 제각각 (여기 16px, 저기 20px, 또 14px)
- 타이포그래피 계층 없음 (폰트 크기/두께 뒤죽박죽)
- 시각적 리듬 없음 (카드가 다 똑같음)
- 색 남용 (컬러가 너무 많거나 대비가 안 맞음)

**디자이너를 고용하거나... StyleSeed를 쓰거나.**

### StyleSeed이 다른 점

토큰만 주는 게 아닙니다. AI한테 **디자인 감각** 자체를 심어줍니다:

| 레이어 | 역할 |
|--------|------|
| **디자인 언어** | 구체적 시각 규칙 — 컬러 철학, 숫자 비율, 카드 구조, 페이지 구성, 금지 패턴 |
| **디자인 토큰** | 색상, 타이포, 간격, 그림자, 모션, 테두리 — 라이트 & 다크 모드 |
| **CSS 테마** | Tailwind CSS v4 구현체 |
| **컴포넌트** | UI 프리미티브 32개 + 패턴 컴포넌트 16개 |
| **모션** | 네임드 시드 5종 + 복사-붙여넣기 키워드 라이브러리 |
| **AI 스킬** | Claude Code·Codex 공용 워크플로우 21개 |

### 이런 규칙이 차이를 만듭니다

```
규칙: 숫자는 항상 크게, 단위는 항상 작게 — 2:1 비율.
      48px 숫자 + 24px 단위. 같은 크기 금지.

규칙: 앱 전체에서 강조 색상은 딱 하나. 나머지는 전부 회색.
      강조 색은 활성/선택 상태에만 사용.

규칙: 순수 검정(#000) 절대 금지. 가장 어두운 색은 #2A2A2A.
      5단계 그레이: #2A → #3C → #6A → #7A → #9B

규칙: 선택한 출력 문법의 그룹핑 방식을 따른다.
      카드·여백·구분선·톤은 목적에 맞게 쓰되 한 시스템으로 통일한다.

규칙: 같은 섹션 타입을 연속으로 반복 금지.
      높은 섹션과 낮은 섹션을 교대해서 시각적 리듬 만들기.

규칙: 카드 그림자는 겨우 보일 정도 (opacity 4-8%).
      그림자가 눈에 확 띄면 너무 강한 거.
```

이건 수십 개 규칙 중 6개. [전체 디자인 언어 보기 →](engine/DESIGN-LANGUAGE.md)

## AI 스킬 21개

스킬을 복사하면 **에이전트 스킬 21개**를 쓸 수 있습니다 — 컨텍스트 컴파일 · 문법 컴파일 · 빌드 · 스타일 · UI · 모션 · UX:

### 빌드 & 스타일 — 데모처럼 만들기

| 스킬 | 기능 |
|------|------|
| `/ss-resolve` | STYLESEED.md에서 문법·어댑터·브랜드 레시피 등 선택값만 10–20KB 규칙 번들과 출처 해시 manifest로 컴파일 |
| `/ss-build` | **화면 하나를 데모 방식 그대로** — 락 → 빌드 → 게이트(≥80) → 수정 후에만 보여줌. UI는 프리핸드 말고 이걸로 |
| `/ss-reference` | 이미지·URL·Figma·기존 UI를 근거·신뢰도·토큰·금지규칙이 있는 프로젝트 전용 룰셋으로 컴파일 |
| `/ss-setup` | 출력 문법·서피스 어댑터·9개 브랜드 레시피·도메인·아티팩트와 제한된 브랜드 값을 설정 |
| `/ss-dial` | 디자인 축 하나를 결정론적으로 올리고/내리기 (density·radius·color 등 7축) |
| `/ss-restyle` | 프리셋으로 룩 전체 교체 (swiss · editorial · technical · warm-dtc · minimal-mono · brutalist-lite) |
| `/ss-verify` | **비주얼 게이트** — 렌더 → 스크린샷을 직접 보고 픽셀 기준 채점 (폰트 미로딩, 죽은 여백, 포컬 부재) |

### UI 스킬 — 잘 만들기

| 스킬 | 기능 |
|------|------|
| `/ss-component` | 디자인 규칙에 맞는 새 컴포넌트 생성 |
| `/ss-page` | 모바일 페이지 스캐폴딩 |
| `/ss-pattern` | UI 패턴 조합 (카드 그리드, 테이블, 차트) |
| `/ss-motion` | 네임드 모션 적용 — 시드 또는 키워드 무브 (`toggle-flip`, `tilt-3d`...) |
| `/ss-review` | 디자인 시스템 위반 감사 |
| `/ss-tokens` | 디자인 토큰 조회/추가/수정 |
| `/ss-a11y` | 접근성 감사 (WCAG 2.2 AA) |
| `/ss-lint` | 빠른 자동 린트 — 흔한 위반을 수초 안에 감지 |
| `/ss-score` | UI 디자인 품질 0-100 점수 + 우선순위 수정 목록 |
| `/ss-update` | 최신 엔진 업데이트 — 프로젝트 분석 후 안전하게 갱신 |

### UX 스킬 — 잘 설계하기 (디자이너 없이)

| 스킬 | 기능 |
|------|------|
| `/ss-flow` | 유저 플로우 설계 (점진적 공개, 정보 피라미드) |
| `/ss-audit` | 닐슨 10대 사용성 원칙으로 UX 평가 |
| `/ss-copy` | UX 마이크로카피 생성 (버튼, 에러, 빈 상태, 토스트) |
| `/ss-feedback` | 4가지 피드백 상태 추가 (로딩, 빈 상태, 에러, 성공) |

### 워크플로우 예시

```bash
# 1. 플로우 설계
> /ss-flow "이메일 인증 포함 온보딩"

# 2. 페이지 생성
> /ss-page Onboarding "3단계 온보딩: 이름, 이메일 인증, 설정"

# 3. UX 카피 생성
> /ss-copy "온보딩 — 버튼 라벨, 에러 메시지, 성공 상태"

# 4. 피드백 상태 추가
> /ss-feedback src/pages/Onboarding.tsx

# 5. 전체 검토
> /ss-audit src/pages/Onboarding.tsx
> /ss-review src/pages/Onboarding.tsx
```

결과: 디자이너 없이 만든, 전문적이고 접근성 좋은 온보딩 플로우.

## StyleSeed + awesome-design-md

[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)는 AI가 읽는 DESIGN.md 파일 모음입니다. **우리는 이것 위에 더 깊이 갑니다.**

| | DESIGN.md | StyleSeed |
|---|-----------|-----------|
| **역할** | 브랜드 토큰 (피부) | 디자인 감각 (뇌) |
| **AI에게 가르치는 것** | 어떤 색/폰트를 쓸지 | 어떻게 디자이너처럼 생각할지 |
| **컴포넌트** | 없음 | 48개 |
| **AI 스킬** | 없음 | 21개 |
| **레이아웃 규칙** | 없음 | 섹션 타입, 정보 피라미드, 시각적 리듬 |
| **금지 패턴** | 없음 | 수십 개의 "이러면 안 됨" 규칙 |

**같이 쓰면 시너지:**

```bash
# Stripe의 브랜드 스킨 + StyleSeed 디자인 규칙
cp -r /tmp/styleseed/engine/.claude/skills/* .claude/skills/
cp /tmp/styleseed/skins/stripe/theme.css src/styles/theme.css
```

## 네임드 모션 시스템

AI가 만드는 모션은 대부분 똑같은 기본 페이드입니다. StyleSeed는 모션에 **어휘**를 줍니다 — 느낌에 이름을 붙여서, 모든 페이지에 일관된 의도적 애니메이션을 적용합니다. 두 레이어:

**1. 시드 = 성격.** 5개의 네임드 프리셋 (Spring 통통 · Silk 부드러움 · Snap 즉각 · Float 부유 · Pulse 박동), 각각 `entrance`/`exit`/`hover`/`press`/`layout` 5개 컨텍스트의 framer-motion 레시피.

```tsx
import { spring } from "@engine/motion";

<motion.button {...spring.hover} {...spring.press}>저장</motion.button>
```

**2. 키워드 = 독창적 무브.** 이름 하나로 호출하는 복사-붙여넣기 모션 라이브러리 — `toggle-flip`, `reveal-blur`, `tilt-3d`, `magnetic`, `glow-pulse`, `confetti-pop` 등. 바이브코딩 중에 키워드를 말하거나 (`/ss-motion toggle-flip`) 하면 같은 레시피가 코드에 들어갑니다.

▶ **[라이브 갤러리에서 모든 모션 미리보기 & 복사 →](https://styleseed-demo.vercel.app/motion)**
&nbsp;·&nbsp; [직접 만들기 → 모션 가이드](https://styleseed-demo.vercel.app/motion/guide)

## 사용 가능한 스킨

| 스킨 | 스타일 |
|------|--------|
| **[toss](skins/toss/)** | 토스 스타일 모바일 핀테크 — 퍼플, 미니멀 |
| **[stripe](skins/stripe/)** | 프로페셔널 — 인디고, 멀티 레이어 섀도우 |
| **[linear](skins/linear/)** | 다크 우선 — 바이올렛, 개발자 지향 |
| **[notion / raycast / arc / vercel](skins/)** | 그 외 내장 스킨 |
| **[58+ 더보기](skins/_from-awesome-design-md/)** | awesome-design-md의 모든 브랜드 (`/ss-setup`로 자동 변환) |

> 스킨은 *inspired-by* 토큰 세트입니다. 색과 타입 재료를 제공합니다. 디자인 구조
> 자체를 바꾸는 것은 [`BRAND-RECIPES.md`](engine/BRAND-RECIPES.md)의 9개 레시피이며,
> 프리셋(`/ss-restyle`)은 그 위에서 선택적으로 미감을 조정합니다.

## StyleSeed vs 대안

| | StyleSeed | shadcn/ui | Tailwind UI | Material UI | AI 기본 결과물 |
|---|---|---|---|---|---|
| 컴포넌트 | ✅ 48개 | ✅ 50+ | ✅ | ✅ | ❌ |
| 디자인 **판단 기준** (언제 뭘 쓸지) | ✅ 74개 룰 | ❌ | ❌ | 일부 | ❌ |
| Claude Code / Cursor 통합 | ✅ 21개 스킬 | ❌ | ❌ | ❌ | — |
| 브랜드 스킨 (Toss, Stripe, Linear...) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 가격 | 무료 (MIT) | 무료 | $299+ | 무료 | — |
| AI 코딩툴과 *함께* 동작 | ✅ | 간접 | 간접 | 간접 | — |

**요약:** shadcn/ui는 컴포넌트를 줍니다. Tailwind UI는 템플릿을 줍니다. StyleSeed는 **AI 결과물이 AI 같아 보이지 않게 만드는 디자인 판단 기준**을 줍니다.

### "공식 frontend-design 스킬 쓰면 되는 거 아냐?"

둘 다 쓰세요 — 해결하는 문제가 다릅니다. Anthropic 공식 [`frontend-design`](https://github.com/anthropics/skills) 스킬은 깔끔한 화면을 빠르게 스캐폴딩해 줍니다. StyleSeed는 그 **위의 레이어**입니다:

| | 공식 `frontend-design` | **StyleSeed** |
| --- | --- | --- |
| 일관된(coherent) 화면 | ✅ | ✅ |
| 제네릭-AI 티를 이름 붙여 금지 | — | ✅ (기본 인디고, 아이콘칩, 무지개 리스트…) |
| 보여주기 전에 채점·수정하는 게이트 | — | ✅ `/ss-score` ≥80 루프 |
| 결정이 프롬프트를 넘어 유지 (락) | — | ✅ `STYLESEED.md` |
| 프리셋·다이얼로 룩 전체 이동 | — | ✅ `/ss-restyle`, `/ss-dial` |

공식 스킬은 *일관되게*, StyleSeed는 *템플릿 티 안 나게*. 공식으로 스캐폴딩하고 StyleSeed 게이트로 다듬으세요.

## 자주 묻는 질문

**Q: Claude Code / Cursor가 왜 촌스러운 UI를 만드나요?**
LLM은 기능적 정답을 최적화하지 시각적 세련도를 최적화하지 않습니다. `#000` 검정, `py-4` 간격, 전부 `text-xl` — 문법은 맞고 결과는 아마추어. StyleSeed는 프로 디자이너가 쓰는 기준을 LLM에게 줍니다.

**Q: shadcn/ui 대체재인가요?**
아니요. shadcn/ui 패턴 **위에** 얹는 도구입니다. 같은 Radix primitive, 같은 CVA 컨벤션을 씁니다. "shadcn/ui + 디자인 판단 + AI 툴 통합" 이라고 생각하시면 됩니다.

**Q: Cursor에서도 되나요?**
됩니다. 74개 룰이 `.cursorrules`와 `CLAUDE.md`에 들어있어서 Cursor가 자동으로 읽습니다.

**Q: awesome-design-md와 뭐가 다른가요?**
awesome-design-md는 브랜드별 DESIGN.md를 줍니다 (what). StyleSeed는 그 브랜드를 실제 동작하는 앱으로 바꾸는 엔진을 줍니다 (how). 함께 쓰면 시너지.

**Q: 핀테크 아닌 앱에도 쓸 수 있나요?**
네. 엔진은 브랜드 중립적입니다. 스킨을 고르고 브랜드 색만 바꾸면 됩니다.

## 문서

상세 문서는 **[Wiki](../../wiki)**에 있습니다 — 디자인 규칙, 페이지 구성 레시피, 차트 가이드 등.

## 필드 노트 — 룰 뒤에 있는 생각들

AI가 만든 UI가 왜 그렇게 생겼는지, 뭐가 실제로 고쳤는지에 대한 긴 글:

- **[AI가 만든 UI가 어딘가 '어색한' 이유 — 그리고 그걸 고치는 한 가지 원칙](https://dev.to/kiwibreaksme/aiga-mandeun-uiga-eodinga-eosaeghan-iyu-geurigo-geugeol-gocineun-han-gaji-weoncig-5e4p)** — 정합성(coherence)과 "축마다 값 하나" 법칙, 복붙 CSS 포함 (3.5k+ 읽음)
- **[개발자 친구도 못 알아들어서, 제일 쉽게 다시 씁니다 — 스타일시드가 하는 일](https://dev.to/kiwibreaksme/gaebalja-cingudo-mos-aladeuleoseo-jeil-swibge-dasi-sseubnida-seutailsideuga-haneun-il-36cg)** — 이 프로젝트가 뭐 하는 물건인지 3분 설명 (토스 CSS 실측 포함)
- **[AI가 만든 UI, 보여주기 전에 채점시켜라 — 게이트를 만들고 내 랜딩부터 떨어진 이야기](https://dev.to/kiwibreaksme/aiga-mandeun-ui-boyeojugi-jeone-caejeomsikyeora-geiteureul-mandeulgo-nae-raendingbuteo-ddeoleojin-iyagi-ea7)** — 룰만으론 부족했던 이유와 강제 게이트, 58→86 채점표
- **[디자이너 없이 바이브코딩으로 토스급 UI 만드는 법](https://dev.to/kiwibreaksme/dijaineo-eobsi-baibeukodingeuro-toseugeub-ui-mandeuneun-beob-5c0g)** — 시작이 된 글

## 기여하기

StyleSeed는 **살아있는 판단 프레임워크**입니다 — 룰은 고정된 게 아니에요. 써보다가 "이렇게 하면 확실히 더 낫다"는 패턴을 찾으면, 룰로 제안해서 모두의 AI에게 가르치세요.

### ⭐ 디자인 룰 제안하기 (핵심)

좋은 룰은 의견이 아니라 **결정 + 그게 잘되는 이유**를, 모델이 적용할 수 있게 적은 것입니다.

```markdown
**Rule:** 숫자는 단위와 2:1 (48px 값 위에 24px 단위).
**Why it works:** 눈이 크기=중요도를 먼저 잠금. 같은 크기면 값이 납작해져 위계가 사라짐.
**Source:** Refactoring UI.
```

**["디자인 룰 제안"](https://github.com/bitjaru/styleseed/issues/new?template=design_rule.yml)** 이슈를 열거나, `engine/DESIGN-LANGUAGE.md`(시각/레이아웃) 또는 `engine/VISUAL-CRAFT.md`(크래프트·정합성)에 PR하세요. 판단 기준은 커뮤니티가 쌓을수록 복리로 좋아집니다.

### Claude Code로 새 스킨 만들기

1. `mkdir skins/your-brand`
2. `cp skins/toss/theme.css skins/your-brand/theme.css`
3. Claude에게: *"`skins/toss/theme.css`를 참고해서 [Linear / Apple / Material] 스타일 스킨 만들어줘 — `--brand` 색상과 토큰을 바꿔서"*
4. PR 제출

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

[MIT](LICENSE)
