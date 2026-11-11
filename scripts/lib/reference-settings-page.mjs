// The settings page the reference browser fixtures measure (WO-04 structure probe fixture): a sticky
// top bar, a 240px side nav, three `2fr 5fr` settings groups with one primary action each, a table
// with 40px rows, and a 768px breakpoint below which the side nav and the columns drop. The text is
// fictional fixture copy; no probe may export it. Options make the "built screen" of the distance
// fixture from the same page: `rowHeight` for the table rows, `extraPrimary` for a second primary
// action in the first settings group (shown at 768px and wider), and `accent` for the primary fill.
// With no options the page is byte for byte the WO-04 fixture.
export function settingsPage({ rowHeight = 40, extraPrimary = false, accent = '#0f766e' } = {}) {
  const group = (title, fields, extra = false) => `<section class="fx-group"><div><h2>${title}</h2><p>고객에게 보이는 설정입니다.</p></div><div class="fx-card">${fields.map(([id, label, value]) => `<div class="fx-field"><label for="${id}">${label}</label><input id="${id}" value="${value}"></div>`).join('')}<div class="fx-actions"><button class="fx-secondary">취소</button><button class="fx-primary">저장</button>${extra ? '<button class="fx-primary fx-extra">게시</button>' : ''}</div></div></section>`;
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>structure probe fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f8f8;color:#090c0b;font:14px/20px system-ui}
.fx-top{position:sticky;top:0;z-index:2;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#ffffff;border-bottom:1px solid #e3e8e7}
.fx-logo{display:block;width:96px;height:24px;background:#0f766e;border-radius:4px}
.fx-text{background:transparent;border:0;color:#4d5150;height:32px;padding:0 8px;font:inherit}
.fx-shell{display:flex}
.fx-side{display:none;flex:0 0 240px;width:240px;height:calc(100vh - 56px);position:sticky;top:56px;padding:16px 8px;background:#ffffff;border-right:1px solid #e3e8e7}
.fx-side a{display:flex;align-items:center;height:32px;padding:0 8px;color:#4d5150;text-decoration:none;border-radius:4px}
.fx-main{flex:1;min-width:0;padding:32px 16px;display:flex;flex-direction:column;gap:32px}
h1{font-size:24px;line-height:32px;font-weight:600;margin:0}h2{font-size:16px;line-height:24px;font-weight:600;margin:0 0 8px}p{margin:0;color:#4d5150}
.fx-group{display:grid;grid-template-columns:1fr;gap:16px}
.fx-card{background:#ffffff;border:1px solid #e3e8e7;border-radius:8px;padding:24px;display:flex;flex-direction:column;gap:16px}
.fx-field{display:flex;flex-direction:column;gap:8px}label{font-weight:500}
input{height:36px;width:100%;border:1px solid #b4bdbb;border-radius:4px;padding:0 8px;font:inherit}
.fx-actions{display:flex;gap:8px;justify-content:flex-end}
.fx-primary{height:36px;padding:0 16px;border:0;border-radius:4px;background:${accent};color:#fafcfc;font:inherit;transition:background-color 150ms ease-out}
.fx-secondary{height:36px;padding:0 16px;border:1px solid #b4bdbb;border-radius:4px;background:transparent;color:#090c0b;font:inherit}
.fx-primary:hover{background:#0b5e58}.fx-primary:focus-visible,.fx-secondary:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
table{width:100%;border-collapse:collapse;background:#ffffff}thead tr{height:36px}tbody tr{height:${rowHeight}px}
th,td{padding:0 16px;text-align:left;border-bottom:1px solid #e3e8e7}.fx-num{text-align:right;font-variant-numeric:tabular-nums}
@media (min-width: 768px){.fx-side{display:block}.fx-main{padding:32px}.fx-group{grid-template-columns:2fr 5fr}}
@media (prefers-reduced-motion: reduce){.fx-primary{transition:none}}
${extraPrimary ? '.fx-extra{display:none}@media (min-width: 768px){.fx-extra{display:inline-block}}\n' : ''}</style><body>
<header class="fx-top"><span class="fx-logo" aria-hidden="true"></span><nav aria-label="계정"><button class="fx-text">도움말</button><button class="fx-text">내 계정</button></nav></header>
<div class="fx-shell">
<nav class="fx-side" aria-label="주 메뉴"><a href="#home">홈</a><a href="#orders">주문</a><a href="#products">상품</a><a href="#customers">고객</a><a href="#payouts">정산</a><a href="#settings">설정</a></nav>
<main class="fx-main">
<div class="fx-head"><h1>스토어 설정</h1><p>결제와 알림을 관리합니다.</p></div>
${group('스토어 정보', [['f1', '스토어 이름', '키위 상점'], ['f2', '연락 이메일', 'owner@example.test']], extraPrimary)}
${group('결제', [['f3', '통화', 'KRW'], ['f4', '정산 계좌', '110-123-456789']])}
${group('알림', [['f5', '알림 이메일', 'alerts@example.test'], ['f6', '요약 주기', '매일']])}
<section class="fx-panel"><h2>최근 정산</h2><table><thead><tr><th>날짜</th><th>상태</th><th class="fx-num">금액</th></tr></thead><tbody>
${['1,240,000', '980,500', '1,102,000', '875,000', '1,330,000', '990,000'].map((amount, i) => `<tr><td>11월 ${i + 1}일</td><td>완료</td><td class="fx-num">${amount}</td></tr>`).join('')}
</tbody></table></section>
</main></div></body></html>`;
}
