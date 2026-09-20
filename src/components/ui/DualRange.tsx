import { useCallback } from 'react';

interface Props {
  min: number;
  max: number;
  step: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  /** Marcas opcionais (0..1 já normalizado) desenhadas atrás dos trilhos. */
  ticks?: number[];
  disabled?: boolean;
}

/**
 * Slider de dois polegares. São dois `<input type="range">` empilhados: o trilho
 * nativo fica invisível (`.dual-range`, em index.css) e só os polegares recebem
 * ponteiro, de modo que o trilho pintado abaixo mostre a faixa selecionada.
 */
export function DualRange({
  min,
  max,
  step,
  start,
  end,
  onChange,
  ticks,
  disabled = false,
}: Props) {
  const span = Math.max(1e-9, max - min);
  const pct = useCallback(
    (v: number) => ((Math.min(max, Math.max(min, v)) - min) / span) * 100,
    [min, max, span],
  );

  const handleStart = (value: number) => {
    onChange(Math.min(value, end), end);
  };
  const handleEnd = (value: number) => {
    onChange(start, Math.max(value, start));
  };

  const left = pct(start);
  const right = pct(end);

  return (
    <div className={`dual-range ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* trilho + faixa selecionada */}
      <div className="dual-range__track">
        {ticks?.map((t, i) => (
          <span key={i} className="dual-range__tick" style={{ left: `${t * 100}%` }} />
        ))}
        <div
          className="dual-range__fill"
          style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
        />
      </div>

      <input
        type="range"
        aria-label="Início da janela"
        min={min}
        max={max}
        step={step}
        value={start}
        disabled={disabled}
        onChange={(e) => handleStart(Number(e.target.value))}
      />
      <input
        type="range"
        aria-label="Fim da janela"
        min={min}
        max={max}
        step={step}
        value={end}
        disabled={disabled}
        onChange={(e) => handleEnd(Number(e.target.value))}
      />
    </div>
  );
}
