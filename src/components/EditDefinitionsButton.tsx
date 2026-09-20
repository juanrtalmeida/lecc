import { useState } from 'react';
import type { Analysis } from '@/types';
import { Modal } from './Modal';
import { EventIdentificationForm } from './EventIdentificationForm';
import { useCurrentAnalysis } from '@/hooks';
import { computeStats } from '@/analysis';

export function EditDefinitionsButton({ analysis }: { analysis: Analysis }) {
  const [open, setOpen] = useState(false);
  const setDefinitions = useCurrentAnalysis((s) => s.setEventDefinitions);

  const stats = computeStats(analysis);
  const knownCodes = Object.keys(stats.byCode)
    .map((k) => Number(k))
    .sort((a, b) => a - b);

  return (
    <>
      <button
        className="btn"
        onClick={() => setOpen(true)}
        title="Editar nomes/cores/categorias dos códigos"
      >
        Identificar eventos
      </button>
      <Modal title="Identificar eventos" open={open} onClose={() => setOpen(false)} size="lg">
        <EventIdentificationForm
          knownCodes={knownCodes}
          codeStats={stats.byCode}
          initial={analysis.eventDefinitions}
          initialCategories={analysis.customCategories ?? []}
          isUpdate
          onSave={(defs, cats) => {
            setDefinitions(defs, cats);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
