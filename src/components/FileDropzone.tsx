import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import { useCallback, useState } from 'react';
import { readFileAsText, MAX_MEDPC_FILE_SIZE } from '@/services';

interface Props {
  onFileContent: (content: string, filename: string) => void;
}

export function FileDropzone({ onFileContent }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        const text = await readFileAsText(file);
        if (!text.trim()) {
          setError('Arquivo vazio.');
          return;
        }
        onFileContent(text, file.name);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao ler o arquivo.');
      } finally {
        setBusy(false);
      }
    },
    [onFileContent],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const r = rejections[0];
        if (r.file.size > MAX_MEDPC_FILE_SIZE) {
          setError('Arquivo acima de 10 MB.');
          return;
        }
      }
      const file = accepted[0] ?? rejections[0]?.file;
      if (file) void handle(file);
    },
    [handle],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    accept: {
      'text/plain': ['.txt', '.dat', '.csv'],
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={`card border-2 border-dashed p-10 text-center transition cursor-pointer
                    ${isDragActive ? 'border-brand bg-brand/10' : 'border-line'}`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">📁</div>
        <p className="font-medium mb-1 text-slate-700">
          {isDragActive ? 'Solte o arquivo aqui' : 'Arraste um arquivo do MED-PC'}
        </p>
        <p className="text-sm text-slate-500">
          Aceita .txt, .dat, .csv — Cabeçalho + seções A:, B:, C:...
        </p>
        <button type="button" className="btn-primary mt-5" onClick={open} disabled={busy}>
          {busy ? 'Lendo...' : 'Selecionar arquivo'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
