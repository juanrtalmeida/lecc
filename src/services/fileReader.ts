import type { DropEvent, FileRejection } from 'react-dropzone';

export interface FilePick {
  content: string;
  filename: string;
  size: number;
}

/**
 * Lê um arquivo de texto. Validação de tamanho fica por conta do caller.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Falha de leitura'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(file);
  });
}

/** Aceita o arquivo se cair dentro do limite (10 MB por padrão). */
export const MAX_MEDPC_FILE_SIZE = 10 * 1024 * 1024;

/** Filtra a lista de drop events do react-dropzone. */
export function pickMedPcFile(
  accepted: File[],
  rejections: FileRejection[],
): File | null {
  if (accepted.length > 0) return accepted[0];
  if (rejections.length > 0) {
    // tenta usar um arquivo menor que 10 MB mesmo que rejeitado pelo MIME check
    const bigger = rejections.find(
      (r) => r.file.size > 0 && r.file.size <= MAX_MEDPC_FILE_SIZE,
    );
    if (bigger) return bigger.file;
  }
  return null;
}

export type { DropEvent };
