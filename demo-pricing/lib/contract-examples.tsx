import type { ComponentProps, ReactNode } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@engine/components/ui/badge";
import { Button } from "@engine/components/ui/button";
import { Input } from "@engine/components/ui/input";
import { Label } from "@engine/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@engine/components/ui/select";
import { Switch } from "@engine/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@engine/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@engine/components/ui/tabs";

// Live examples for the component contracts. Every example imports the real engine component, so a
// contract page cannot show a variant or state the code does not render.
type Examples = {
  variant?: (value: string) => ReactNode;
  size?: (value: string) => ReactNode;
  states?: { label: string; node: ReactNode }[];
};

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];
type BadgeVariant = ComponentProps<typeof Badge>["variant"];
type SelectSize = ComponentProps<typeof SelectTrigger>["size"];

function PlanSelect({ id, size, disabled, invalid }: { id: string; size?: SelectSize; disabled?: boolean; invalid?: boolean }) {
  return (
    <Select disabled={disabled}>
      <SelectTrigger id={id} size={size} aria-label="Plan" aria-invalid={invalid || undefined} className="w-44">
        <SelectValue placeholder="Choose a plan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="starter">Starter</SelectItem>
        <SelectItem value="team">Team</SelectItem>
        <SelectItem value="business">Business</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const contractExamples: Record<string, Examples> = {
  button: {
    variant: (value) => <Button variant={value as ButtonVariant}>Save changes</Button>,
    size: (value) => value === "icon"
      ? <Button size="icon" variant="outline" aria-label="Add item"><Plus aria-hidden="true" /></Button>
      : <Button size={value as ButtonSize}>Save</Button>,
    states: [
      { label: "Disabled", node: <Button disabled>Save changes</Button> },
      { label: "Pair: secondary left, primary right", node: <div className="flex gap-3"><Button variant="secondary">Keep</Button><Button variant="destructive">Delete</Button></div> },
    ],
  },
  badge: {
    variant: (value) => <Badge variant={value as BadgeVariant}>Paid</Badge>,
  },
  tabs: {
    states: [{
      label: "Selected, unselected, disabled",
      node: (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
          </TabsList>
        </Tabs>
      ),
    }],
  },
  input: {
    states: [
      { label: "Label above, placeholder", node: <div className="grid w-64 gap-2"><Label htmlFor="contract-email">Work email</Label><Input id="contract-email" type="email" placeholder="name@company.com" /></div> },
      { label: "Invalid", node: <div className="grid w-64 gap-2"><Label htmlFor="contract-email-invalid">Work email</Label><Input id="contract-email-invalid" type="email" defaultValue="name@company" aria-invalid aria-describedby="contract-email-error" /><p id="contract-email-error" className="text-[12px] text-destructive">Add the part after the dot, like .com.</p></div> },
      { label: "Disabled", node: <Input className="w-64" aria-label="Disabled field" defaultValue="Locked by your admin" disabled /> },
    ],
  },
  select: {
    size: (value) => <PlanSelect id={`contract-select-${value}`} size={value as SelectSize} />,
    states: [
      { label: "Invalid", node: <PlanSelect id="contract-select-invalid" invalid /> },
      { label: "Disabled", node: <PlanSelect id="contract-select-disabled" disabled /> },
    ],
  },
  switch: {
    states: [
      { label: "On, with its label", node: <div className="flex items-center gap-2"><Switch id="contract-switch-on" defaultChecked /><Label htmlFor="contract-switch-on">Email notifications</Label></div> },
      { label: "Off", node: <div className="flex items-center gap-2"><Switch id="contract-switch-off" /><Label htmlFor="contract-switch-off">Weekly summary</Label></div> },
      { label: "Disabled", node: <div className="flex items-center gap-2"><Switch id="contract-switch-disabled" disabled /><Label htmlFor="contract-switch-disabled">Auto-renew</Label></div> },
    ],
  },
  table: {
    states: [{
      label: "Caption, numeric column, selected row",
      node: (
        <Table className="min-w-80">
          <TableCaption>Invoices this month</TableCaption>
          <TableHeader>
            <TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount (USD)</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell>INV-1042</TableCell><TableCell>Paid</TableCell><TableCell className="text-right tabular-nums">1,250.00</TableCell></TableRow>
            <TableRow data-state="selected"><TableCell>INV-1043</TableCell><TableCell>Due</TableCell><TableCell className="text-right tabular-nums">980.50</TableCell></TableRow>
            <TableRow><TableCell>INV-1044</TableCell><TableCell>Paid</TableCell><TableCell className="text-right tabular-nums">12,400.00</TableCell></TableRow>
          </TableBody>
        </Table>
      ),
    }],
  },
};
