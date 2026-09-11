import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceName, SaveAction, ResourceRows } from '../context/examples';
import { Button } from '../src/ui/button';
import { Input } from '../src/ui/input';

// Operator-only integration probe. Not a candidate screen, design reference or model answer.
function Probe() {
  const [value, setValue] = React.useState('Synthetic workspace');
  const [error, setError] = React.useState<string | undefined>('Example validation error');
  const [saving, setSaving] = React.useState(false);
  const [saves, setSaves] = React.useState(0);
  return <main data-styleseed-recipe="enterprise-workbench" style={{ padding: 16, maxWidth: 520 }}>
    <h1>Operator-only component integration probe</h1>
    <WorkspaceName value={value} error={error} onChange={next => { setValue(next); setError(undefined); }} />
    <SaveAction saving={saving} onSave={() => { setSaving(true); setSaves(count => count + 1); }} />
    <p role="status">Save calls: {saves}</p>
    <button type="button" onClick={() => setSaving(false)}>Complete synthetic save</button>
    <ResourceRows rows={[{ id: 'probe-1', name: 'Synthetic resource', status: 'Paused' }]} />
    <h2>Unmodified vendor defaults — diagnostic only</h2>
    <Input aria-label="Unmodified vendor input" data-testid="vendor-input" />
    <Button data-testid="vendor-button">Unmodified vendor button</Button>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Probe />);
