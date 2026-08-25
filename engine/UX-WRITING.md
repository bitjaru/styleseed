# UX Writing — the words are part of the design

DESIGN-LANGUAGE.md and VISUAL-CRAFT.md teach the AI *visual* judgment. This file
teaches it *verbal* judgment: how to write the text inside a UI — buttons, errors,
empty states, confirmations, labels — so the copy reads like a thoughtful product,
not a system talking to itself.

The same principle as the rest of StyleSeed applies: most "AI-written" microcopy is
fine word-by-word but wrong as a system — vague buttons ("Submit"), blaming errors
("Invalid input"), robotic system-speak ("An error occurred"). Good UX writing is a
small set of decisions, applied consistently.

Grounded in Nielsen Norman Group, Material Design & Apple HIG writing guidelines,
Mailchimp's Content Style Guide, Shopify Polaris content guidelines, and Google's
developer-docs style. Brand-agnostic; the *sensibility* (clear, calm, human — the
qualities Toss is known for) is the target, not any one brand's copy.

> **Read this:** before writing any user-facing text, and whenever copy "sounds
> like a robot." Pairs with the `/ss-copy` and `/ss-feedback` skills.

---

## §W0 — Voice (the one decision that governs the rest)

**WV-1 · Write like a calm, competent human talking to one person.** Clear first,
friendly second, clever last. The reader is trying to do something — help them, don't
perform. *Why: UI copy is functional; personality that gets in the way of the task is
noise.* (NN/g)

**WV-2 · Match the tone to the moment.** Money, errors, and deletions → calm and
plain (no exclamation marks, no jokes). Success and onboarding → warm. A "Oops! 😅" on
a failed payment erodes trust; a celebration on a real win earns it.

**WV-3 · Write from the user's side.** "Your balance," "내 계좌" — not "the customer's
account." Second person, active voice. The product is the user's tool, not an
institution addressing them.

**WV-4 · Voice is a *choice* — pick one and keep it (the coherence law, for words).**
Most of this file is voice-neutral and universal: clarity, concision, no jargon,
action-named buttons, helpful errors, one term per concept — apply these whatever your
product is. The *flavor* on top is yours to pick: warm & friendly, crisp & formal
(B2B), or playful (consumer). Choose the voice that fits the product and apply it
**consistently** — don't drift between tones. **§W8 (Toss) is a *reference* for one
clear-calm-human voice and where the principles come from — not a mandate to sound like
any brand.** Want a dry, formal, or quirky voice instead? Keep the principles, change
the flavor.

---

## §W1 — Buttons & actions

**WB-1 · Label the action, not the mechanism.** A button says what *happens*: "Send
$2,400," "Delete project," "Save changes" — never "Submit," "OK," "Confirm," or
"Yes." The user should be able to read only the button and know the outcome. (NN/g)

**WB-2 · Verb + object, front-loaded.** Start with the verb. "Add card," not "Card
adding." Keep it 1–3 words. One primary action per screen (matches the visual rule).

**WB-3 · Make the two choices distinct.** In a dialog, never pair "OK / Cancel" for a
destructive action. Use "Delete / Keep," "Discard / Keep editing" — each button names
its own outcome, so a glance is enough.

---

## §W2 — Errors

**WE-1 · Say what happened + how to fix it, in that order. No blame, no jargon.**
"That email's already registered — try signing in instead," not "Invalid input" or
"Error 422." The user caused nothing; the message exists to unblock them. (NN/g, Material)

**WE-2 · Put the error where the problem is.** Field-level errors next to the field,
not a generic banner. Name the specific field and the specific fix.

**WE-3 · Never make the user feel stupid.** Drop "invalid," "illegal," "wrong,"
"failed to." Drop "Oops!"/"Uh oh!" on anything serious (money, data loss). Plain and
respectful beats cute.

**WE-4 · For system failures the user can't fix, say so + what to do.** "We couldn't
load your transactions. Check your connection and try again." Offer a retry. Never a
bare "Something went wrong" with no next step.

---

## §W3 — Empty, loading & success states

**WS-1 · Empty states explain + invite, never shame.** "No transactions yet — they'll
show up here once you send or receive money," with the next action. Not a blank box,
not "You have no data." Turn a dead end into a starting point. (NN/g)

**WS-2 · Loading copy sets an expectation.** "Loading…" is fine for fast; for slow,
say what's happening ("Crunching your numbers — this takes a few seconds"). Never
leave the user wondering if it's stuck.

**WS-3 · Success copy confirms the specific thing.** "Sent $2,400 to Jordan" beats
"Success!" Name what happened so the user can trust it and move on.

---

## §W4 — Confirmations & consequences

**WC-1 · State the consequence, don't ask "Are you sure?"** "Delete this project? This
can't be undone." + "Delete / Keep." The dialog's job is to surface what's at stake,
not to nag. (NN/g)

**WC-2 · Reserve confirmation for the irreversible.** If it's undoable, skip the
dialog and offer Undo instead — fewer interruptions, more trust.

---

## §W5 — Clarity & concision (the everyday discipline)

**WX-1 · Cut filler.** Remove "please," "in order to," "simply," "just," "currently,"
"successfully." "To continue, please enter your email" → "Enter your email." Shorter
reads as more confident.

**WX-2 · One term per concept, everywhere.** Pick "delete" *or* "remove," "sign in"
*or* "log in" — and never mix them in the same product. Synonym-shuffling makes users
wonder if two things are different.

**WX-3 · Front-load the meaningful word.** Users scan; put what matters first.
"Payment failed — card declined" not "There was a problem and your payment failed."

**WX-4 · Plain language, not system-speak.** "An error occurred while processing your
request" → "We couldn't save that." Translate the machine's view into the user's.

**WX-5 · Clever only where there's no task.** A pun in a button or an error costs
clarity when the user needs to act. Save personality for marketing and idle moments
(empty states, success), never for money or errors.

---

## §W6 — Numbers, money & time

**WN-1 · Format for humans, no fake precision.** "$8,400" not "$8,400.0000"; "2 min
ago" not "127 seconds ago." Money gets exactly two decimals only when cents matter.

**WN-2 · Be calm and concrete around money.** State the amount, the recipient, and the
result plainly. No exclamation marks on a balance or a transfer — confidence reassures;
excitement reads as a sales pitch.

---

## §W7 — Labels, links & mechanics

**WL-1 · Link text describes the destination.** "View report," "See pricing" — never
"click here" or "read more." The link should make sense read out of context (also a11y).

**WL-2 · Sentence case for UI; skip end punctuation on labels & buttons.** "Add
payment method" (no period). Use periods only in full sentences (helper text, errors).

**WL-3 · Be consistent with title vs sentence case** across the whole product — pick
one for headings and keep it.

---

## §W8 — Korean / CJK notes — grounded in Toss's "8 Writing Principles"

Toss publishes its UX-writing framework (sources below): **5 core values** — 명료(clear)
· 간결(concise) · 친근(friendly) · 정중(respectful) · 공감(empathetic) — realized through
**8 named writing principles**, each phrased as a yes/no check. They map onto the rules
above; for Korean UI, run them as the checklist:

1. **Predictable hint** — 다음 화면을 예상할 수 있는 힌트가 있는가? (버튼·링크가 다음에 뭐가 올지 알려주기) (= WB-1, WL-1)
2. **Weed cutting (잡초 뽑기)** — 의미 없는 단어를 다 제거했는가? "이미 보유하고 계신" → **"보유 중인"** (= WX-1)
3. **Remove empty sentences** — 의미 없는 문장을 다 제거했는가? (= WX-1)
4. **Focus on key message** — 정말 중요한 메시지만 전달하는가? 한 문장에 한 메시지. (= WX-3)
5. **Easy to speak** — 어려운 용어·표현 없이, 소리 내 읽어도 자연스러운가? (전문용어 0, 사람 말처럼) (= WX-4, WV-1)
6. **Suggest than force** — 특정 행동을 강요하거나 공포를 주지 않는가? 청유형, 선택권을 준다. (= WV-2, WC-1)
7. **Universal words** — 모두가 이해하고 누구에게도 무해한가? (= WX-4)
8. **Find hidden emotion** — 정보 전달을 넘어 사용자 감정에 공감했는가? "갚느라 고생 많으셨어요" (= WV-2, WE-3)

**버튼 (Toss Design System):** 단일 CTA는 **"~하기"**("가입하기", "2,400원 보내기") — "확인"·"제출" X.
내비게이션만 "확인"/"다음". 두 버튼일 땐 취소 쪽을 **"취소" 대신 "닫기"·"다음에"** 로 (부정어 줄이기).
**관점·존댓말:** "고객님의 계좌" → **"내 계좌"**; 해요체/합쇼체 섞지 말고 하나로.

---

## §W9 — Korean mixed-script examples

Use these when Hangul, Latin product or plan names, numerals, money, percentages, and units share
one UI string. They apply to product UI, pricing, status, and CTA copy where the user needs to scan
the value quickly. Counterexample: legal, billing, medical, or government copy may need the official
term, full product name, or policy wording even when a shorter UI phrase would scan better.

**Hangul + Latin product name**
- **Do:** `Pro 플랜으로 업그레이드하기`
- **Don't:** `프로 요금제 업그레이드 신청 제출`
- **Why:** Keep the actual product or plan name if the user saw it that way elsewhere; translate the
  surrounding action into natural Korean and make the CTA name the outcome. Toss's public writing
  guide favors active, product-native 해요체 copy and action-specific buttons; that is useful evidence,
  not a universal demand to copy Toss wording.

**Money or percentage + tabular numerals**
- **Do:** `이번 달 12,400원 절약했어요` / `전월보다 8% 낮아요`
- **Don't:** `이번 달에 절약한 금액은 십이만사천원입니다` / `전월 대비 8 퍼센트만큼 감소`
- **Why:** Arabic numerals make changing values easier to compare and should render with tabular
  numerals in UI. In Korean, currency symbols and common unit signs can sit tight with Arabic
  numerals in compact UI (`12,400원`, `8%`), while the sentence explains the meaning in plain Korean.

**Number + unit in CTA or status**
- **Do:** `3분 안에 끝내기` / `남은 공간 2GB`
- **Don't:** `삼 분 이내 절차 진행` / `잔여 저장 공간: 2 기가바이트`
- **Why:** Put the decision-making number where scanning starts, keep the unit users expect in the
  product context, and avoid nominalized admin language. Use Korean units when they are the user's
  mental model (`3분`); keep established technical units in Latin when that is how the product,
  OS, or device labels them (`2GB`).

---

## Sources

**General UX writing:** Nielsen Norman Group (error messages, empty states, microcopy) ·
Material Design & Apple HIG (writing) · Mailchimp Content Style Guide · Shopify Polaris
(content) · Google developer-documentation style guide.

**§W8 (Toss) — primary:** [Toss Tech — "토스의 8가지 라이팅 원칙들"](https://toss.tech/article/8-writing-principles-of-toss)
(the canonical 8 principles + 5 core values). Supporting: [Toss Tech — "첫 UX writer는 무슨 일을 해야 할까"](https://toss.tech/article/1st_uxwriter) ·
[Toss Tech — "토스 피플 #2: UX 라이팅의 새로운 기준"](https://toss.tech/article/toss-people-2) ·
[Toss Feed — UX Writing 인터뷰](https://toss.im/tossfeed/article/uxwriter-interview) (잡초 뽑기, TDS 버튼 규칙).
StyleSeed restates Toss's published *principles*, not its proprietary copy.

**§W9 mixed Korean UI strings:** [Toss App-in-Toss UX Writing](https://developers-apps-in-toss.toss.im/design/ux-writing.html)
(해요체, active phrasing, positive/plain wording, and exceptions) ·
[국립국어원 온라인가나다 — 한글맞춤법 제43항 질문](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=326727)
(unit nouns may attach to Arabic numerals under Hangul orthography rule 43).
