import type { Metadata } from 'next';
import TryExperience from './try-experience';

export const metadata: Metadata = {
  title: 'StyleSeed 직접 체험 — 디자인 결정을 다음 화면까지',
  description: '같은 설정 화면을 두 사용 맥락에서 비교하고, 실제 StyleSeed 엔진이 만든 AI 에이전트용 규칙을 내려받으세요.',
  alternates: { canonical: 'https://styleseed-demo.vercel.app/try' },
};

export default function TryPage() {
  return <TryExperience />;
}
