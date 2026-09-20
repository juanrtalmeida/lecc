import { Fragment, useMemo } from 'react';
import type { Block, InlineToken } from '@/utils/markdown';
import { parseInline, parseMarkdown } from '@/utils/markdown';

/**
 * Renderiza os `docs/*.md` como elementos React (nada de `innerHTML`).
 * O subconjunto suportado está documentado em `utils/markdown.ts`.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'heading': {
      const common = 'scroll-mt-20 text-slate-900';
      if (block.level === 1) {
        return (
          <h1 id={block.id} className={`${common} text-2xl font-bold tracking-tight`}>
            <Inline text={block.text} />
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2
            id={block.id}
            className={`${common} text-lg font-semibold mt-4 pb-1.5 border-b border-line`}
          >
            <Inline text={block.text} />
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 id={block.id} className={`${common} text-base font-semibold mt-2`}>
            <Inline text={block.text} />
          </h3>
        );
      }
      return (
        <h4 id={block.id} className={`${common} text-sm font-semibold uppercase tracking-wider`}>
          <Inline text={block.text} />
        </h4>
      );
    }

    case 'paragraph':
      return (
        <p className="text-sm leading-relaxed text-slate-700">
          <Inline text={block.text} />
        </p>
      );

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag
          className={`text-sm leading-relaxed text-slate-700 pl-5 flex flex-col gap-1.5 ${
            block.ordered ? 'list-decimal' : 'list-disc'
          }`}
        >
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              <Inline text={item} />
            </li>
          ))}
        </Tag>
      );
    }

    case 'code':
      return (
        <pre className="bg-bg-subtle border border-line rounded-lg p-3 text-xs overflow-x-auto">
          <code className="font-mono text-slate-700">{block.value}</code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote className="border-l-2 border-brand/40 pl-3 text-sm text-slate-600 italic">
          <Inline text={block.text} />
        </blockquote>
      );

    case 'table':
      return (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle">
              <tr>
                {block.header.map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-2 font-medium text-slate-600 border-b border-line"
                  >
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-line/50 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-slate-700">
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'hr':
      return <hr className="border-line" />;
  }
}

function Inline({ text }: { text: string }) {
  const tokens = useMemo(() => parseInline(text), [text]);
  return (
    <>
      {tokens.map((t, i) => (
        <Fragment key={i}>{renderToken(t)}</Fragment>
      ))}
    </>
  );
}

function renderToken(token: InlineToken) {
  switch (token.kind) {
    case 'code':
      return (
        <code className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-bg-subtle border border-line text-slate-700">
          {token.value}
        </code>
      );
    case 'strong':
      return <strong className="font-semibold text-slate-900">{token.value}</strong>;
    case 'em':
      return <em className="italic">{token.value}</em>;
    case 'link':
      // Links dos docs apontam para outros .md do repositório; abrimos em nova aba
      // só quando são externos.
      return /^https?:/.test(token.href) ? (
        <a
          href={token.href}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          {token.value}
        </a>
      ) : (
        <span className="text-brand">{token.value}</span>
      );
    case 'text':
      return token.value;
  }
}
