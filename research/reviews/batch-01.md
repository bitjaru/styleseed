# Review batch 01 — control sizing, roles, motion, one built screen

- **Status:** open
- **Cards:** 10 · about 20–30 minutes
- **Reviewer:** read `docs/DESIGNER-GUIDE.ko.md`
- **Reviewer's agent:** read `docs/designer-review-agent.md` before the first card

Every card shows something StyleSeed ships today and a place where its own documents or code disagree.
No answer is on file. The maintainer could not settle these from the code, so they are asked here.
"I don't know" and "skip" are valid answers.

Card kinds:

| Kind | The reviewer answers with |
|---|---|
| `proposition` | `agree`, `conditional` (say the condition), or `disagree` (say what instead), plus one or two sentences |
| `choice` | one of the listed options, or their own, plus one or two sentences |
| `open` | free text |

The agent fills in **Answer** under each card in the reviewer's own words and changes nothing else in this file.

---

## Card 1 · proposition · one height for controls that sit together

**Look at:** https://styleseed-demo.vercel.app/gallery/button and https://styleseed-demo.vercel.app/gallery/input

**What ships:** the default button is 40px tall; the default input and select are 36px. Placed in one row
they do not line up.

**Proposition (rule `CRAFT-control-heights`):** Buttons, inputs, and selects in one context share a height.
Touch surfaces provide at least 44px targets; pointer-first dense desktop controls may be smaller when still
operable.

**질문:** 한 줄에 놓인 버튼, 입력창, 셀렉트는 높이가 같아야 한다. 터치 화면에서는 44px 이상이어야 하고, 마우스로
쓰는 촘촘한 데스크톱 화면에서는 더 작아도 된다. 이 규칙에 동의하시나요?

**Feeds:** `reviews[]` on `CRAFT-control-heights`; if agreed, the default button and field heights are aligned.

**Answer**
- Verdict:
- Note:

---

## Card 2 · choice · default text field height on desktop

**Look at:** https://styleseed-demo.vercel.app/gallery/input

**What disagrees:**
- `engine/DESIGN-LANGUAGE.md` §44: 48px (`h-12`).
- `engine/VISUAL-CRAFT.md` (control height, CC-8): 40px default, 44–48px on touch.
- The shipped input: 36px (`h-9`).

**Question:** For a desktop product screen used with a mouse (settings, tables, forms), how tall is the default
text field?

**질문:** 마우스로 쓰는 데스크톱 제품 화면(설정, 표, 폼)에서 기본 입력창 높이는 몇 px가 맞나요?

**Options:** 36px · 40px · 44px · 48px · depends (say on what)

**Feeds:** `DESIGN-LANGUAGE.md` §44 and the input contract; a `decisions[]` proposal on `controlHeights`.

**Answer**
- Choice:
- Note:

---

## Card 3 · proposition · the 44px minimum is a touch rule

**Look at:** https://styleseed-demo.vercel.app/gallery/select and https://styleseed-demo.vercel.app/gallery/tabs

**What disagrees:** `engine/DESIGN-LANGUAGE.md` §41 says touch targets are at least 44×44px and names no
platform. The shipped select (36px), tabs (36px) and small button (32px) are under it. The component contracts
list each of these as a known gap.

**Proposition:** The 44px minimum applies to touch screens only. On a mouse-first desktop product, 32–40px
controls are acceptable and are not a defect.

**질문:** 44px 최소 크기는 터치 화면에만 적용한다. 마우스 중심 데스크톱 제품에서는 32~40px 컨트롤이 결함이 아니다.
동의하시나요?

**Feeds:** the scope sentence of §41; the "under the touch minimum" lines in the component contracts.

**Answer**
- Verdict:
- Note:

---

## Card 4 · choice · `brand` and `primary`

**Look at:** https://styleseed-demo.vercel.app/gallery/button, https://styleseed-demo.vercel.app/gallery/badge
and https://styleseed-demo.vercel.app/gallery/switch

**What ships:** the main button is painted with the `brand` role. The default badge and the "on" switch are
painted with the `primary` role. In a theme where the two roles hold different colours, a main button and an
"on" switch on the same screen do not match.

**Question:** Should the main button, the default badge and the "on" switch use one colour role?

**질문:** 주 버튼, 기본 배지, 켜진 스위치가 같은 색 역할 하나를 써야 하나요? 지금은 버튼이 `brand`, 배지와 스위치가
`primary`입니다.

**Options:** one role for all three (say which name) · two roles (say what each one means) · depends

**Feeds:** the Button, Badge and Switch contracts; token naming (#96).

**Answer**
- Choice:
- Note:

---

## Card 5 · proposition · body text size

**Look at:** https://styleseed-demo.vercel.app/showcase/settings

**What disagrees:**
- `engine/DESIGN-LANGUAGE.md` type table: body is 14–15px.
- `engine/CRAFT-BASELINE.md`: body is 16px on general surfaces; an approved productive desktop scale may use 14px.

**Proposition:** Body text starts at 16px. A dense desktop product may use 14px when the project has approved
that scale.

**질문:** 본문 글자는 16px에서 시작한다. 촘촘한 데스크톱 제품은 프로젝트가 승인한 경우에 14px를 쓸 수 있다.
동의하시나요?

**Feeds:** the type table in `DESIGN-LANGUAGE.md`.

**Answer**
- Verdict:
- Note:

---

## Card 6 · choice · colour changes under reduced motion

**Look at:** https://styleseed-demo.vercel.app/gallery/button with "reduce motion" switched on in the system
settings

**What disagrees:** `engine/DESIGN-LANGUAGE.md` §41 says colour transitions are preserved under reduced motion.
The shipped CSS sets every transition to 0.01ms, so hover and focus colours switch at once.

**Question:** When a person has asked for reduced motion, should hover and focus colour changes still fade?

**질문:** 사용자가 "동작 줄이기"를 켰을 때 호버와 포커스의 색 변화는 부드럽게 바뀌어야 하나요, 바로 바뀌어야 하나요?

**Options:** colour still fades (movement stops) · everything is instant · depends (say on what)

**Feeds:** §41 and `engine/css/base.css`; rule `CRAFT-motion-family`.

**Answer**
- Choice:
- Note:

---

## Card 7 · proposition · no input fields inside cards

**Look at:** https://styleseed-demo.vercel.app/showcase/settings

**What disagrees:**
- `engine/DESIGN-LANGUAGE.md` §44: "No input fields inside cards." A form goes to a separate page or a bottom sheet.
- §70 of the same file lets a form group its fields in flat sections, fieldsets, or cards.
- The one recorded case (`research/cases/saas-dashboard/shopify-app-settings-2026-11-05`) puts fields inside cards.

**Proposition:** Input fields do not go inside cards.

**질문:** 입력창은 카드 안에 넣지 않는다. 이 규칙이 제품 화면(예: 설정)에도 맞나요?

**Feeds:** the scope of §44.

**Answer**
- Verdict:
- Note:

---

## Card 8 · proposition · one corner radius for controls that sit together

**Look at:** https://styleseed-demo.vercel.app/gallery/input and https://styleseed-demo.vercel.app/gallery/button

**What ships:** Button and Tabs take their corner radius from the theme. Input, Select and Badge have a fixed
radius. In a theme with rounder controls, a button and an input side by side get different corners.

**Proposition:** Controls that sit together (button, input, select) share one corner radius, and it follows the theme.

**질문:** 나란히 놓이는 컨트롤(버튼, 입력창, 셀렉트)은 모서리 반경이 같아야 하고 그 값은 테마를 따른다.
동의하시나요?

**Feeds:** the Input, Select and Badge contracts and components.

**Answer**
- Verdict:
- Note:

---

## Card 9 · choice · button hover on desktop

**Look at:** https://styleseed-demo.vercel.app/gallery/button (move the pointer over the buttons)

**What ships:** buttons have no hover style. A pointer user sees a change only while pressing.
`engine/DESIGN-LANGUAGE.md` §46 rejects hover by lowering opacity.

**Question:** Does a desktop button need a hover state?

**질문:** 데스크톱 버튼에 호버 상태가 필요한가요? 지금은 누를 때만 반응합니다.

**Options:** yes, a darker fill · yes, something else (say what) · no, press feedback is enough · depends

**Feeds:** `DESIGN-LANGUAGE.md` §46 and the Button contract.

**Answer**
- Choice:
- Note:

---

## Card 10 · open · one screen StyleSeed built

**Look at:** https://styleseed-demo.vercel.app/showcase/settings

**Question:** What is wrong here? Name up to three things you would change first.

**질문:** 이 화면에서 무엇이 잘못됐나요? 가장 먼저 고칠 것을 세 가지까지 말씀해 주세요.

**Feeds:** a list of fixes, each checked against the rules to see whether a rule should have caught it.

**Answer**
- Note:

---

## Record

Filled in by the reviewer's agent after the last card, once the reviewer has read every answer back.

- Reviewer (name or handle, as the reviewer chose):
- Date (YYYY-MM-DD):
- Via: designer+agent
- Agent used:
- Cards answered / skipped:
