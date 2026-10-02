import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { currentUser } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="p-5">
        <h2 className="text-sm font-medium">Profile</h2>
        <div className="mt-4 space-y-4">
          <Field label="Name" defaultValue={currentUser.name} />
          <Field label="Email" defaultValue={currentUser.email} type="email" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm">Save changes</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-medium">Daily goal</h2>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Minutes of study per day before your streak counts.
        </p>
        <div className="mt-4 max-w-[160px]">
          <Field label="Minutes" defaultValue="45" type="number" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-medium">AI Tutor</h2>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Connect your own OpenAI API key, or use your workspace&apos;s shared key.
        </p>
        <div className="mt-4">
          <Field label="OpenAI API key" defaultValue="" placeholder="sk-…" type="password" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-medium">Connected accounts</h2>
        <div className="mt-4 space-y-3">
          <ConnectedRow name="GitHub" connected />
          <ConnectedRow name="Google" connected={false} />
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-[var(--color-text-tertiary)]">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
      />
    </label>
  );
}

function ConnectedRow({ name, connected }: { name: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3">
      <span className="text-[13.5px]">{name}</span>
      <Button variant={connected ? "outline" : "secondary"} size="sm">
        {connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}
