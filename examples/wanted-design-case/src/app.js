import { icon, Button, StatusBadge, Avatar, ProjectMark, AppShell, escapeHTML } from './components.js';
const projects = [
    { id: 'objet', name: '오브제 스튜디오', type: '브랜드 웹사이트', status: '검토 요청', date: '9월 24일', progress: 72, owner: '이도윤', description: '일상의 물건을, 오래 머무는 경험으로.', deliverable: '홈 화면 디자인', version: 'v3', message: '전체적인 방향이 좋아요. 메인 카피의 대비만 조금 더 또렷하게 조정해 주세요.' },
    { id: 'grove', name: '그로브 커피', type: '온라인 스토어', status: '검토 요청', date: '9월 28일', progress: 48, owner: '박지수', description: '취향이 시작되는 한 잔.', deliverable: '상품 상세 디자인', version: 'v2', message: '원두의 맛과 향 설명이 잘 보여요. 구매 버튼도 이 흐름에서 확인 부탁드립니다.' },
    { id: 'forma', name: '포르마 아카이브', type: '포트폴리오', status: '진행 중', date: '10월 02일', progress: 35, owner: '김서연', description: '형태와 생각을 모으는 곳.', deliverable: '아카이브 목록 디자인', version: 'v1', message: '첫 화면의 정보 구조를 정리했습니다. 콘텐츠 순서를 검토해 주세요.' },
    { id: 'mono', name: '모노 라이프', type: '브랜드 리뉴얼', status: '진행 중', date: '10월 08일', progress: 16, owner: '이도윤', description: '생활의 기본을 다시 봅니다.', deliverable: '브랜드 방향 제안', version: 'v1', message: '브랜드의 핵심 색상과 타이포그래피 방향을 제안합니다.' },
];
const params = new URLSearchParams(location.search);
let view = params.get('view') || 'list';
let selected = projects.find(p => p.id === params.get('project')) || projects[0];
let filter = 'all', search = '';
const completed = new Set();
const notes = new Map();
const root = document.querySelector('#root');
const capture = params.has('capture');
document.body.classList.toggle('capture', capture);
const copy = {
    list: { n: '01', tag: 'BUILD WITH JUDGMENT', title: 'AI가 만드는 화면에, 디자인 판단을 더합니다.', sub: '지금 답해야 할 요청이 먼저 보이도록. StyleSeed 규칙을 적용해 만든 클라이언트 업무 도구입니다.', left: '우선순위가 보이는 정보 위계', right: '검토 요청 → 프로젝트 목록 → 다음 행동' },
    detail: { n: '02', tag: 'CARRY DECISIONS FORWARD', title: '다음 화면도, 같은 제품답게.', sub: '목록에서 상세로. 같은 컴포넌트와 색·타입·상태 기준을 이어 쓰고, 화면의 목적에 맞게 배치합니다.', left: '같은 기준, 서로 다른 화면의 역할', right: '공통 셸 · 상태 표시 · 버튼 · 디자인 토큰 재사용' },
    decisions: { n: '03', tag: 'KEEP THE REASONING', title: '좋은 화면의 기준을, 프로젝트에 남깁니다.', sub: '색상만 복사하지 않습니다. 무엇을 먼저 보여줄지, 어디서 행동할지까지 규칙과 구현에 연결합니다.', left: '설명에서 끝나지 않는 디자인 기준', right: '프로젝트 결정 → 화면별 규칙 → 공통 구현' },
};
function status(p) { return completed.has(p.id) ? '검토 완료' : p.status; }
function heading() { let c = copy[view] || copy.list; return `<header class="case-heading"><div class="case-brand">${icon('leaf')}<b>StyleSeed</b><span>DESIGN JUDGMENT, REPEATED.</span></div><div class="case-kicker">${c.tag}<span>${c.n} / 03</span></div><h1>${c.title}</h1><p>${c.sub}</p></header>`; }
function row(p) { return `<tr><td><button class="project-cell" data-project="${p.id}">${ProjectMark(p.id)}<span><strong>${p.name}</strong><small>${p.type}</small></span></button></td><td>${StatusBadge(status(p))}</td><td><div class="progress-wrap"><span class="progress" role="meter" aria-label="${p.name} 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.progress}"><i style="width:${p.progress}%"></i></span><span>${p.progress}%</span></div></td><td class="date">${p.date}</td><td>${Avatar(p.owner)}<span class="owner-name">${p.owner}</span></td><td><button class="icon-button" data-project="${p.id}" aria-label="${p.name} 상세 보기">${icon('arrow')}</button></td></tr>`; }
function list() {
    const pending = projects.filter(p => p.status === '검토 요청' && !completed.has(p.id));
    const rows = projects.filter(p => (filter !== 'review' || status(p) === '검토 요청') && `${p.name} ${p.type}`.includes(search));
    return AppShell({ filter, pendingCount: pending.length, content: `<main id="main" class="main list-main"><div class="page-title"><div><div class="eyebrow">THURSDAY, SEPTEMBER 17</div><h2>프로젝트</h2><p>좋은 작업이, 다음 단계로 이어지도록.</p></div><div class="work-summary"><strong>04</strong><span>진행 중인<br>프로젝트</span></div></div>
 <section class="review-queue" aria-label="오늘 확인할 요청"><div class="queue-heading"><div><span class="section-kicker">NEXT UP</span><h3>먼저 확인해 주세요 <span>${pending.length}</span></h3></div><span class="quiet">클라이언트의 답변이 도착했어요</span></div>
 ${pending.length ? pending.map((p, i) => `<div class="review-row">${ProjectMark(p.id)}<div class="review-copy"><strong>${p.name}<span class="inline-meta">${p.deliverable} ${p.version}</span></strong><p>${p.message}</p></div><div class="review-meta"><span>${icon('chat')} ${p.id === 'objet' ? '3' : '1'}개 의견</span><small>${i ? '1시간 전' : '20분 전'}</small></div>${Button({ label: '검토하기', action: `open-${p.id}`, primary: i === 0, iconName: 'arrow' })}</div>`).join('') : `<div class="all-done">${icon('check')}모든 요청을 확인했습니다. 프로젝트 목록에서 작업을 이어가세요.</div>`}</section>
 <section class="collection" aria-label="프로젝트 목록"><div class="collection-bar"><div class="tabs" role="group" aria-label="프로젝트 필터"><button data-action="all" class="${filter === 'all' ? 'selected' : ''}" aria-pressed="${filter === 'all'}">전체 프로젝트 <span>4</span></button><button data-action="reviews" class="${filter === 'review' ? 'selected' : ''}" aria-pressed="${filter === 'review'}">검토 요청 <span>${pending.length}</span></button></div><label class="search">${icon('search')}<input type="search" placeholder="프로젝트 검색" aria-label="프로젝트 검색" value="${escapeHTML(search)}"></label></div>
 <div class="table-wrap"><table><thead><tr><th>프로젝트명</th><th>상태</th><th>진행률</th><th>마감일</th><th>담당자</th><th><span class="sr-only">열기</span></th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table>${rows.length ? '' : `<div class="empty"><strong>일치하는 프로젝트가 없어요</strong><p>다른 검색어를 입력하거나 필터를 초기화해 보세요.</p>${Button({ label: '검색 초기화', action: 'reset' })}</div>`}</div><div class="table-footer"><span>${rows.length}개의 프로젝트</span><span>변경 사항은 이 탭에서만 유지됩니다</span></div></section></main>` });
}
function artwork(p) { return `<div class="artboard art-${p.id}" role="img" aria-label="${p.name} 브랜드 웹사이트 샘플 시안"><div class="art-top"><b>${p.id === 'objet' ? 'objet.' : p.id === 'grove' ? 'grove.' : p.id === 'forma' ? 'forma/' : 'mono.'}</b><span>Collection　　Our story　　Contact</span></div><div class="art-composition"><div class="art-type"><span>OBJECTS WITH A STORY</span><strong>${p.id === 'objet' ? 'Less, but\nbetter living.' : p.id === 'grove' ? 'A slower\nkind of coffee.' : p.id === 'forma' ? 'Ideas,\nin good form.' : 'Make room\nfor the everyday.'}</strong><p>${p.description}</p><span class="art-link">Explore the collection　↗</span></div><div class="still-life"><div class="art-disc"></div><div class="art-vase"></div><div class="art-plinth"></div><span class="art-edition">EDITION 01 / 2026</span></div></div><div class="art-bottom"><span>Made for everyday rituals.</span><span>01 — 04</span></div></div>`; }
function detail() {
    const p = selected;
    const done = completed.has(p.id);
    return AppShell({ detail: true, pendingCount: projects.filter(p => p.status === '검토 요청' && !completed.has(p.id)).length, content: `<main id="main" class="main detail-main"><button class="back-link" data-action="all">${icon('back')}전체 프로젝트</button><div class="detail-heading"><div class="detail-identity">${ProjectMark(p.id)}<div><div class="title-line"><h2>${p.name}</h2>${StatusBadge(status(p))}</div><p>${p.type} <span>·</span> ${p.description}</p></div></div>${Button({ label: done ? '검토 완료됨' : '검토 완료', primary: !done, action: 'complete', iconName: 'check', extra: done ? 'disabled' : '' })}</div><div class="detail-facts"><span>담당자 ${Avatar(p.owner)}<strong>${p.owner}</strong></span><span>마감일 <strong>${p.date}</strong></span><span>진행률 <strong>${p.progress}%</strong></span></div>
 <div class="detail-columns"><section class="deliverable" aria-label="디자인 시안"><div class="panel-heading"><h3>${p.deliverable}</h3><span class="version">${p.version} · 최신 버전</span></div>${artwork(p)}<div class="file-info">${icon('file')}<span><strong>${p.id}-design-${p.version}.fig</strong><small>샘플 시안 · 실제 고객 작업물이 아닙니다</small></span><span class="file-state">${icon('check')}검토용</span></div><div class="milestones"><span class="finished">${icon('check')}기획</span><i></i><span class="current">디자인 검토</span><i></i><span>개발 전달</span></div></section>
 <aside class="feedback" aria-label="클라이언트 피드백"><div class="panel-heading"><h3>피드백</h3><span class="quiet">${done ? '완료' : '확인 필요'}</span></div><div class="comment"><div class="comment-author">${Avatar('박수빈')}<span><strong>박수빈 <small>클라이언트</small></strong><time>오늘 10:40</time></span></div><p>${p.message}</p><div class="comment-context">${icon('chat')} 홈 화면 · 첫 번째 섹션</div></div><div class="review-checklist"><h4>이번 검토에서 확인할 것</h4><label><input type="checkbox" ${done ? 'checked' : ''}>핵심 메시지가 먼저 읽히나요?</label><label><input type="checkbox" ${done ? 'checked' : ''}>주요 행동이 분명하게 보이나요?</label></div><form id="note-form"><label for="note">검토 메모</label><textarea id="note" name="note" placeholder="확인한 내용이나 다음 할 일을 남겨 주세요." maxlength="500" required></textarea><div id="note-error" class="field-error" role="alert"></div>${Button({ label: '메모 남기기', extra: 'id="save-note"', action: 'save-note' })}</form><div class="saved-note" role="status">${escapeHTML(notes.get(p.id) || '')}</div></aside></div></main>` });
}
function decisions() {
    return `<main id="main" class="evidence-view"><section class="decisions-column"><div class="file-tab">${icon('file')} 프로젝트에 기록한 디자인 판단<span>folio</span></div><h2>매번 설명하던 기준을,<br>다시 쓸 수 있는 규칙으로.</h2><div class="decision-item"><span>01</span><div><h3>중요한 일부터 보이게</h3><p>검토 요청을 목록 위에 분리합니다.<br>모든 프로젝트를 같은 무게로 강조하지 않습니다.</p></div></div><div class="decision-item"><span>02</span><div><h3>색에는 역할을 주기</h3><p>초록은 주요 행동, 황토색은 검토 요청.<br>상태는 색과 문자를 함께 표시합니다.</p></div></div><div class="decision-item"><span>03</span><div><h3>화면이 달라도 같은 사용법</h3><p>목록과 상세가 버튼·상태 표시·내비게이션을<br>같은 소스에서 가져옵니다.</p></div></div><div class="actual-files">${icon('folder')} 이 사례의 실제 파일<a href="./project.json" target="_blank" rel="noreferrer">프로젝트 설정 ↗</a><a href="./project-list.md" target="_blank" rel="noreferrer">목록 규칙 ↗</a><a href="./project-detail.md" target="_blank" rel="noreferrer">상세 규칙 ↗</a></div></section>
 <section class="reuse-column"><div class="reuse-heading"><span>ONE SYSTEM. TWO SCREENS.</span><h3>같은 기준이, 실제 컴포넌트로 이어집니다.</h3></div><div class="reuse-preview"><div class="mini-label">프로젝트 목록</div><div class="mini-project">${ProjectMark('objet')}<div><strong>오브제 스튜디오</strong><small>브랜드 웹사이트</small></div>${StatusBadge('검토 요청')}${Button({ label: '검토하기', primary: true, action: 'open-objet', iconName: 'arrow' })}</div><div class="connection"><span></span>${icon('arrow')}<b>같은 컴포넌트 재사용</b><span></span></div><div class="mini-label">프로젝트 상세</div><div class="mini-detail"><div class="mini-detail-title">${ProjectMark('objet')}<strong>오브제 스튜디오</strong>${StatusBadge('검토 요청')}</div>${artwork(projects[0])}<div class="mini-action"><span>같은 상태 표시 · 같은 행동 색상</span>${Button({ label: '검토 완료', primary: true, action: 'open-objet', iconName: 'check' })}</div></div></div><div class="source-strip"><span>공통 소스</span><code>AppShell</code><code>StatusBadge</code><code>Button</code><code>tokens.css</code></div></section></main>`;
}
function render({ focusMain = false } = {}) { let c = copy[view] || copy.list; root.innerHTML = `<div class="case-page">${capture ? heading() : `<div class="demo-toolbar"><a href="?view=list">${icon('leaf')}StyleSeed 적용 사례</a><span>실제 동작하는 로컬 예제 · 샘플 데이터</span><a href="?view=decisions">디자인 기준 보기 ${icon('arrow')}</a></div>`}${view === 'decisions' ? decisions() : view === 'detail' ? detail() : list()}${capture ? `<footer class="case-footer"><span><i></i>${c.left}</span><span>${c.right}</span><small>StyleSeed 적용 예제 · 샘플 데이터 · 로컬 렌더</small></footer>` : ''}</div>`; bind(); if (focusMain) {
    let main = document.querySelector('#main');
    main.tabIndex = -1;
    main.focus();
} }
function navigate(next, p) { view = next; if (p)
    selected = p; params.set('view', view); params.set('project', selected.id); history.replaceState(null, '', `?${params}`); render({ focusMain: true }); }
function bind() { root.querySelectorAll('[data-project]').forEach(b => b.onclick = () => navigate('detail', projects.find(p => p.id === b.dataset.project))); root.querySelectorAll('[data-action]').forEach(b => b.onclick = () => { const a = b.dataset.action; if (a.startsWith('open-'))
    return navigate('detail', projects.find(p => p.id === a.slice(5))); if (a === 'complete') {
    completed.add(selected.id);
    render({ focusMain: true });
    announce('검토를 완료했습니다. 목록에도 반영되었습니다.');
} if (a === 'all' || a === 'reviews') {
    filter = a === 'all' ? 'all' : 'review';
    navigate('list');
} if (a === 'reset') {
    search = '';
    filter = 'all';
    render();
    root.querySelector('input[type=search]')?.focus();
} if (a === 'save-note') {
    const field = root.querySelector('#note');
    const value = field.value.trim();
    if (!value) {
        root.querySelector('#note-error').textContent = '메모 내용을 입력해 주세요.';
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', 'note-error');
        field.focus();
        return;
    }
    notes.set(selected.id, value);
    render();
    announce('메모를 남겼습니다. 이 탭을 닫으면 초기화됩니다.');
} }); const input = root.querySelector('input[type=search]'); if (input)
    input.oninput = () => { const position = input.selectionStart; search = input.value; render(); const next = root.querySelector('input[type=search]'); next.focus(); try {
        next.setSelectionRange(position, position);
    }
    catch { } }; root.querySelector('#note-form')?.addEventListener('submit', e => e.preventDefault()); }
function announce(text) { document.querySelector('#announcement').textContent = text; }
render();
