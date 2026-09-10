import * as React from 'react';
import { Button } from '../src/ui/button';
import { Input } from '../src/ui/input';
import { Label } from '../src/ui/label';
import { Badge } from '../src/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '../src/ui/table';

// API examples only; not a finished screen, expert reference, or asynchronous-state implementation.
export function WorkspaceName({ value, error, onChange }: {
  value: string; error?: string; onChange: (value: string) => void;
}) {
  return <div>
    <Label htmlFor="workspace-name">Workspace name</Label>
    <Input id="workspace-name" value={value} className="min-h-11"
      onChange={event => onChange(event.currentTarget.value)}
      aria-invalid={Boolean(error)} aria-describedby={error ? 'workspace-name-error' : undefined} />
    {error && <p id="workspace-name-error" role="alert">{error}</p>}
  </div>;
}

export function SaveAction({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return <Button type="button" size="md" className="min-h-11" disabled={saving}
    aria-busy={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save settings'}</Button>;
}

export function ResourceRows({ rows }: { rows: { id: string; name: string; status: string }[] }) {
  return <Table>
    <TableCaption>Resource status</TableCaption>
    <TableHeader><TableRow><TableHead scope="col">Resource</TableHead><TableHead scope="col">Status</TableHead></TableRow></TableHeader>
    <TableBody>{rows.map(row => <TableRow key={row.id}>
      <TableCell>{row.name}</TableCell><TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}
