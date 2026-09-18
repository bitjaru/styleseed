export function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    inbox: '<path d="M4 4h16l2 12v4H2v-4L4 4Z"/><path d="M2 15h6l2 3h4l2-3h6"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z"/><path d="M7 10h10M7 14h6"/>',
    folder: '<path d="M3 6h7l2 2h9v12H3V6Z"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    file: '<path d="M5 3h9l5 5v13H5V3Z"/><path d="M14 3v6h5M9 13h6M9 17h6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    leaf: '<path d="M6 18C1 6 12 2 21 3c0 9-4 18-15 15Zm0 0L16 8"/>',
};
export function icon(name, cls = '') { return `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`; }
export function Button({ label, action = '', primary = false, iconName = '', extra = '' }) {
    return `<button type="button" class="button ${primary ? 'primary' : ''}" ${action ? `data-action="${action}"` : ''} ${extra}>${iconName ? icon(iconName) : ''}${label}</button>`;
}
export function StatusBadge(status) {
    return `<span class="status ${status === '검토 요청' ? 'needs-review' : ''}"><span class="status-dot"></span>${escapeHTML(status)}</span>`;
}
export function Avatar(name, dark = false) {
    return `<span class="avatar ${dark ? 'dark' : ''}" aria-label="${escapeHTML(name)}">${escapeHTML(name.slice(-2))}</span>`;
}
export function ProjectMark(id) {
    return `<span class="project-mark mark-${id}" aria-hidden="true">${id === 'objet' ? 'o.' : id === 'grove' ? 'g' : id === 'forma' ? 'f/' : 'm'}</span>`;
}
export function AppShell({ content, detail = false, filter = 'all', pendingCount = 2 }) {
    return `<div class="app-shell" data-styleseed-recipe="enterprise-workbench">
    <aside class="sidebar" aria-label="작업 공간">
      <a class="wordmark" href="?view=list" aria-label="folio 프로젝트 목록">${icon('grid')}<b>folio<span>.</span></b></a>
      <div class="workspace"><span class="workspace-avatar">S</span><span><strong>스튜디오 온</strong><small>팀 워크스페이스</small></span><span class="workspace-chevron">⌄</span></div>
      <nav aria-label="기본 메뉴">
        <button type="button" data-action="all" class="nav-item ${filter === 'all' ? 'active' : ''}" ${filter === 'all' ? 'aria-current="page"' : ''}>${icon('folder')}프로젝트<span class="nav-count">4</span></button>
        <button type="button" data-action="reviews" class="nav-item ${filter === 'review' ? 'active' : ''}" ${filter === 'review' ? 'aria-current="page"' : ''}>${icon('inbox')}검토 요청<span class="nav-count">${pendingCount}</span></button>
      </nav>
      <div class="sidebar-label">진행 중인 프로젝트</div>
      <div class="project-nav"><button data-project="objet"><i class="nav-dot"></i>오브제 스튜디오</button><button data-project="grove"><i class="nav-dot"></i>그로브 커피</button><button data-project="forma"><i class="nav-dot"></i>포르마 아카이브</button></div>
      <div class="sidebar-bottom"><div class="sample-label">로컬 데모 · 샘플 데이터</div><div class="identity">${Avatar('김서연', true)}<span><strong>김서연</strong><small>디자이너</small></span></div></div>
    </aside>
    <div class="app-body"><header class="app-bar"><div class="breadcrumb">워크스페이스 ${icon('chevron')} <strong>프로젝트</strong>${detail ? `${icon('chevron')}<span>프로젝트 상세</span>` : ''}</div><span class="team-online"><i></i>스튜디오 온</span></header>${content}</div>
  </div>`;
}
