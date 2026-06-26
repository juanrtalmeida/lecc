import { Button, Input, Select, Card, CategoryBadge, StatCard } from '@/components/ui';

const options = [
  { value: 'response', label: 'Resposta' },
  { value: 'reinforcement', label: 'Reforço' },
  { value: 'stimulus', label: 'Estímulo' },
  { value: 'state', label: 'Estado' },
  { value: 'other', label: 'Outro' },
];

export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10">
        <h1 className="display text-3xl font-semibold tracking-tight text-slate-900">
          Behavio Design System
        </h1>
        <p className="body mt-2 text-slate-500">
          Preview visual do estilo do MED-PC Analyzer.
        </p>
      </header>

      <div className="grid gap-6">
        <section>
          <h2 className="heading text-xl font-semibold text-slate-800">Cores</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ColorSwatch name="primary" value="#6366f1" />
            <ColorSwatch name="success" value="#10b981" />
            <ColorSwatch name="warning" value="#f59e0b" />
            <ColorSwatch name="error" value="#ef4444" />
            <ColorSwatch name="bg" value="#f8fafc" subtle />
            <ColorSwatch name="surface" value="#ffffff" />
            <ColorSwatch name="border" value="#e2e8f0" subtle />
            <ColorSwatch name="secondary" value="#0f172a" />
          </div>
        </section>

        <section>
          <h2 className="heading text-xl font-semibold text-slate-800">Tipografia</h2>
          <div className="mt-4 card p-4 space-y-2">
            <p className="display">Display 32px</p>
            <p className="heading">Heading 22px</p>
            <p className="body">Body 16px — texto principal</p>
            <p className="caption">CAPTION 12px</p>
            <p className="font-mono text-sm text-slate-600">
              1234.567 — números monoespaçados
            </p>
          </div>
        </section>

        <section>
          <h2 className="heading text-xl font-semibold text-slate-800">Botões</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary">Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Perigo</Button>
          </div>
        </section>

        <section>
          <h2 className="heading text-xl font-semibold text-slate-800">Inputs e selects</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Nome do experimento" placeholder="Ex.: Sessão 01" />
            <Select label="Categoria" placeholder="Selecione" options={options} />
            <Input label="Com erro" error="Campo obrigatório" />
          </div>
        </section>

        <section>
          <h2 className="heading text-xl font-semibold text-slate-800">Cards e badges</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card title="Eventos" actions={<span className="caption">Hoje</span>}>
              <StatCard title="Total" value="124" unit="eventos" />
            </Card>
            <Card title="Categorias">
              <div className="flex flex-wrap gap-2">
                <CategoryBadge label="Resposta" variant="response" />
                <CategoryBadge label="Reforço" variant="reinforcement" />
                <CategoryBadge label="Estímulo" variant="stimulus" />
                <CategoryBadge label="Outro" variant="other" />
              </div>
            </Card>
            <Card title="Resumo rápido">
              <p className="body text-slate-600">
                Visão geral do experimento com foco em clareza, ordem e precisão.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function ColorSwatch({ name, value, subtle }: { name: string; value: string; subtle?: boolean }) {
  return (
    <div className="card p-3">
      <div
        className="h-16 w-full rounded-md border border-line"
        style={{ backgroundColor: value }}
      />
      <p className="mt-2 text-xs font-medium text-slate-600">{name}</p>
      <p className="text-[11px] text-slate-500">{value}</p>
    </div>
  );
}
