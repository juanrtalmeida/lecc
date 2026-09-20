import { useEffect, useMemo, useState } from 'react';
import { Markdown } from '@/components';
import { parseMarkdown, tableOfContents } from '@/utils/markdown';

// Os textos vêm dos arquivos em docs/: a página renderiza exatamente o mesmo
// conteúdo que está no repositório, sem uma segunda cópia para divergir.
import visaoGeral from '../../docs/VISAO-GERAL.md?raw';
import comoUsar from '../../docs/COMO-USAR.md?raw';
import regras from '../../docs/REGRAS-DE-ANALISE.md?raw';
import decisoes from '../../docs/DECISOES.md?raw';

interface Doc {
  slug: string;
  title: string;
  hint: string;
  source: string;
}

const DOCS: Doc[] = [
  {
    slug: 'visao-geral',
    title: 'Visão geral',
    hint: 'o que o programa faz',
    source: visaoGeral,
  },
  {
    slug: 'como-usar',
    title: 'Como usar',
    hint: 'o caminho, tela a tela',
    source: comoUsar,
  },
  {
    slug: 'regras',
    title: 'Regras de análise',
    hint: 'o que o programa garante',
    source: regras,
  },
  {
    slug: 'decisoes',
    title: 'Decisões',
    hint: 'por que funciona assim',
    source: decisoes,
  },
];

export function DocsPage() {
  // O documento aberto vive no hash (#como-usar) — assim o link é compartilhável
  // e o botão voltar do navegador funciona.
  const [slug, setSlug] = useState<string>(() => currentSlug());

  useEffect(() => {
    const onHash = () => setSlug(currentSlug());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const doc = DOCS.find((d) => d.slug === slug) ?? DOCS[0];
  const toc = useMemo(() => tableOfContents(parseMarkdown(doc.source)), [doc]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documentação</h1>
        <p className="text-slate-500 text-sm">
          Como usar o programa, o que ele garante em cada cálculo e por que se comporta
          assim.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)_180px] items-start">
        {/* Navegação entre documentos */}
        <nav className="card p-2 flex flex-col gap-0.5 lg:sticky lg:top-20">
          {DOCS.map((d) => {
            const active = d.slug === doc.slug;
            return (
              <a
                key={d.slug}
                href={`#${d.slug}`}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-bg-subtle'
                }`}
              >
                <span className="block text-sm font-medium">{d.title}</span>
                <span
                  className={`block text-[11px] ${active ? 'text-brand/70' : 'text-slate-400'}`}
                >
                  {d.hint}
                </span>
              </a>
            );
          })}
        </nav>

        <article className="card p-6 min-w-0">
          <Markdown source={doc.source} />
        </article>

        {/* Sumário do documento aberto */}
        {toc.length > 0 && (
          <aside className="card p-3 hidden lg:block lg:sticky lg:top-20">
            <div className="label">Nesta página</div>
            <ul className="flex flex-col gap-1.5">
              {toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    onClick={(e) => {
                      // O hash é usado para escolher o documento; navegar por âncora
                      // interna faria a página trocar de doc.
                      e.preventDefault();
                      document
                        .getElementById(t.id)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-xs text-slate-600 hover:text-brand leading-snug block"
                  >
                    {t.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

function currentSlug(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return DOCS.some((d) => d.slug === hash) ? hash : DOCS[0].slug;
}
