'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Download, RotateCcw } from 'lucide-react';
import { Button } from '@engine/components/ui/button';
import { SectionCard } from '@engine/components/patterns/section-card';
import palette from '@/content/site-docs-palette.json';
import data from '@/content/try-bundles.json';
import styles from './try.module.css';

type Agent = 'codex' | 'claude';
const theme = Object.fromEntries(Object.entries(palette.roles).map(([key, value]) => [`--try-${key}`, value])) as CSSProperties;

export default function TryExperience() {
  const [choice, setChoice] = useState(0);
  const [agent, setAgent] = useState<Agent>('codex');
  const [notification, setNotification] = useState(true);
  const [time, setTime] = useState('09:00');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = data.examples[choice];
  const entry = selected.agents[agent];
  const isWork = selected.id === 'work';

  function download() {
    try {
      const url = URL.createObjectURL(new Blob([entry.bundle], { type: 'text/markdown;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `styleseed-${selected.id}-${agent}.md`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`${agent === 'codex' ? 'Codex' : 'Claude'}용 규칙 파일 다운로드를 시작했습니다.`);
    } catch {
      setNotice('다운로드하지 못했습니다. 아래 규칙 원문을 펼쳐 복사해 주세요.');
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (notification && !time) {
      setError('알림 받을 시간을 선택해 주세요.');
      setSaved(false);
      return;
    }
    setError('');
    setSaved(true);
  }

  function reset() {
    setNotification(true); setTime('09:00'); setSaved(false); setError('');
  }

  return (
    <main className={styles.page} style={theme} lang="ko" data-styleseed-recipe="developer-platform">
      <a className={styles.skip} href="#experience">체험으로 건너뛰기</a>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}><ArrowLeft size={16} aria-hidden="true" /> StyleSeed<span> / 직접 체험</span></Link>
        <a href="https://github.com/bitjaru/styleseed" target="_blank" rel="noreferrer" className={styles.source}>소스 보기 <ArrowUpRight size={16} aria-hidden="true" /></a>
      </header>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>DESIGN DECISIONS, CARRIED FORWARD</p>
        <h1>한 번 정한 디자인을,<br />다음 화면에서도.</h1>
        <p className={styles.lead}>AI에게 매번 다시 설명하던 디자인 기준.<br className={styles.desktopBreak} /> StyleSeed는 그 결정을 적용할 규칙으로 정리합니다.</p>
      </section>

      <section id="experience" className={styles.workspace} aria-label="StyleSeed 규칙과 컴포넌트 체험">
        <aside className={styles.inspector}>
          <h2>어떤 화면을 만드나요?</h2>
          <p className={styles.hint}>사용 맥락을 바꿔 보세요. 같은 내용에 적용할 규칙이 달라집니다.</p>
          <fieldset className={styles.choices}>
            <legend className={styles.srOnly}>사용 맥락 선택</legend>
            {data.examples.map((example, index) => (
              <label className={styles.choice} key={example.id} data-selected={choice === index}>
                <input type="radio" name="context" value={example.id} checked={choice === index} onChange={() => { setChoice(index); setNotice(''); }} />
                <span><strong>{example.label}</strong><small>{example.caption}</small></span>
              </label>
            ))}
          </fieldset>

          <div className={styles.decision} aria-live="polite">
            <p className={styles.smallLabel}>선택이 바꾸는 것</p>
            <h3>{isWork ? '빠르게 비교하고 수정하기' : '필요한 설정에 편안하게 집중하기'}</h3>
            <p>{isWork ? '경계가 분명한 패널과 각진 버튼으로 설정을 정돈합니다.' : '부드러운 그룹과 여유 있는 간격으로 설정을 묶습니다.'}</p>
            <p className={styles.preserved}><Check size={16} aria-hidden="true" /> 내용·브랜드 색·입력값은 유지</p>
          </div>
          <p className={styles.note}>아래 예제는 기존 StyleSeed 컴포넌트로 작성했습니다. 선택한 규칙 전체를 자동 구현하거나 AI가 화면을 실시간 생성하는 체험은 아닙니다.</p>
        </aside>

        <div className={styles.previewPane}>
          <div className={styles.previewBar}><span>적용 예제 <b>알림 설정</b></span><button onClick={reset} type="button" aria-label="예제 입력 초기화"><RotateCcw size={14} aria-hidden="true" /> 초기화</button></div>
          <div className={styles.canvas}>
            <div className={styles.example} data-styleseed-recipe={selected.recipe} data-testid="example" data-context={selected.id}>
              <p className={styles.exampleBrand}>DAYNOTE <span>설정</span></p>
              <h2>하루를 시작하는 알림</h2>
              <p className={styles.exampleIntro}>오늘 할 일을 원하는 시간에 확인하세요.</p>
              <SectionCard className={styles.settingsCard}>
                <form onSubmit={save} noValidate>
                  <label className={styles.checkRow}>
                    <span><strong>오늘의 할 일 받기</strong><small>하루에 한 번, 예정된 할 일을 모아 알려드려요.</small></span>
                    <input type="checkbox" checked={notification} onChange={e => { setNotification(e.target.checked); setSaved(false); setError(''); }} />
                  </label>
                  <div className={styles.timeField}>
                    <label htmlFor="notification-time">알림 시간 {notification && <span>(필수)</span>}</label>
                    <input id="notification-time" type="time" value={time} disabled={!notification} onChange={e => { setTime(e.target.value); setSaved(false); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'time-error' : 'time-help'} />
                    <p id="time-help">{notification ? '기기에서 사용하는 현지 시간을 기준으로 해요.' : '알림이 꺼져 있어요. 다시 켜면 시간을 변경할 수 있어요.'}</p>
                  </div>
                  {error && <p id="time-error" className={styles.error} role="alert">{error}</p>}
                  <Button type="submit" variant="outline" className={styles.save}>설정 적용</Button>
                  <p className={styles.saveResult} role="status">{saved ? '체험 화면에 적용됐어요. 실제 알림은 발송되지 않아요.' : '입력한 내용은 이 화면에서만 사용해요.'}</p>
                </form>
              </SectionCard>
            </div>
          </div>
          <div className={styles.evidenceStrip} aria-live="polite">
            <span>같은 컴포넌트</span><code>SectionCard · Button</code><span>적용 규칙</span><code>{selected.recipe}</code>
          </div>
        </div>
      </section>

      <section className={styles.export} aria-labelledby="export-title">
        <div><p className={styles.eyebrow}>TAKE THE DECISION WITH YOU</p><h2 id="export-title">이 기준을 내 AI에게 전달하세요.</h2><p>선택한 맥락을 실제 엔진으로 미리 컴파일한 규칙입니다.<br />파일을 프로젝트에 첨부하고, 이 기준으로 구현해 달라고 요청하세요.</p></div>
        <div className={styles.exportActions}>
          <label htmlFor="agent">사용하는 AI 도구</label>
          <div className={styles.downloadRow}><select id="agent" value={agent} onChange={e => { setAgent(e.target.value as Agent); setNotice(''); }}><option value="codex">Codex</option><option value="claude">Claude Code</option></select><button type="button" onClick={download} className={styles.download}><Download size={17} aria-hidden="true" /> 규칙 내려받기</button></div>
          <p className={styles.downloadStatus} role="status">{notice || `${selected.label} · ${new TextEncoder().encode(entry.bundle).length.toLocaleString('ko-KR')} bytes`}</p>
        </div>
      </section>

      <section className={styles.details} aria-label="규칙 원문과 재현 방법">
        <details><summary>어떤 규칙이 전달되나요?</summary><p>선택한 화면 목적·구성·접근성·디자인 규칙과 AI 도구별 실행 지침을 포함합니다. 파일 다운로드는 도구 설치나 프로젝트 설정 변경을 수행하지 않습니다.</p><pre tabIndex={0} aria-label="다운로드할 규칙 원문">{entry.bundle}</pre></details>
        <details><summary>직접 재현하고 확인하기</summary><p>원본 저장소에서 아래 명령으로 같은 규칙을 만들 수 있습니다. StyleSeed 설치 후에는 프로젝트 설정에 맞춰 <code>ss-setup</code>과 <code>ss-build</code>를 사용하세요.</p><pre tabIndex={0}>{`node engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs \\\n  --project-root /tmp/my-styleseed-example \\\n  --grammar ${selected.grammar} --adapter product-ui \\\n  --domain ${selected.domain} --page settings \\\n  --recipe ${selected.recipe} --palette ${selected.palette} \\\n  --key-color '${data.keyColor}' --palette-character balanced \\\n  --palette-mode light --surface-temperature neutral \\\n  --profile none --agent ${agent} --stdout`}</pre><p className={styles.hash}>규칙 파일 SHA-256 <code>{entry.sha256}</code></p><p>이 체험은 규칙과 기존 컴포넌트의 연결을 보여줍니다. 디자인 품질 향상이나 작업시간 절감을 측정한 비교 실험은 아닙니다.</p></details>
      </section>
      <footer className={styles.footer}><span>StyleSeed · 기존 결정을 지키며, 다음 화면으로.</span><Link href="/evaluate">설치와 검증 자료 <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
    </main>
  );
}
