# First distribution drafts

Status: drafts, not posted. Use the deployed canonical URL only after the public page passes.
The fixture is synthetic and reproduces a real engine defect; no user/project outcome is claimed.
No Hacker News text is included.

## Korean / Threads

간격을 맞추는 규칙이 오히려 간격을 망치고 있었다.

우리 StyleSeed에서 부모 화면의 64px 간격이 자식 화면으로 넘어갔다.
자식 화면에는 이미 12px 토큰이 있었는데도.

숫자를 더 줄이는 대신, 화면 경계에서 엔진 변수의 상속을 끊었다.
같은 내용으로 전후를 바꾸면 브라우저가 실제 적용된 값을 보여준다.

직접 만든 재현 예제다. 12px가 정답이라는 뜻은 아니다.
https://styleseed-demo.vercel.app/fix-ui-spacing

AI로 만든 화면에서 간격이 어색할 때, 주로 어디가 문제였나?
버튼 안쪽, 관련 내용끼리의 간격, 아니면 섹션 사이?

## English / developer community

Our spacing rules leaked a 64px gap into a nested screen that already owned a 12px token.

We fixed the inheritance boundary instead of shrinking every gap. The content stays the same;
the child gets its existing project token back. A small interactive example shows the computed
value before and after, with the source and browser regression linked.

This is a synthetic reproduction of the CSS bug—not a customer result or a claim that 12px is
universally better: https://styleseed-demo.vercel.app/fix-ui-spacing

When AI-generated UI spacing feels wrong in your project, is the issue usually grouping,
computed CSS/token resolution, or responsive content? I’m maintaining StyleSeed and would like
to compare concrete failures.

## Attachment and posting boundary

Use the page's 1200×630 OG image or same-viewport before/after captures from the browser check.
Keep the synthetic label; do not crop it into a customer-result claim. Read the chosen community's
current self-promotion rules before submission. Posting, direct messaging, upvotes, and stars are
not performed by this document.
