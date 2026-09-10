// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageGalleryManager } from './image-gallery-manager';

afterEach(cleanup);

const uploadedRecord = {
  id: 'f1',
  originalName: 'photo.png',
  storagePath: 'files/f1',
  publicUrl: null,
  mimeType: 'image/png',
  sizeBytes: 1024,
  width: 10,
  height: 10,
  purpose: 'image',
  active: true,
  createdAt: null,
  updatedAt: null,
};

beforeEach(() => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/storage/files?')) {
      return new Response(JSON.stringify({ items: [uploadedRecord] }), { status: 200 });
    }
    if (url === '/api/storage/files' && init?.method === 'POST') {
      return new Response(JSON.stringify({ uploaded: [uploadedRecord], errors: [] }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ImageGalleryManager', () => {
  it('renderiza com um controle de upload', () => {
    render(
      <ImageGalleryManager
        referenceId="r1"
        initialImageIds={[]}
        onSaved={vi.fn()}
        onPersist={vi.fn(async () => [])}
      />
    );
    expect(screen.getByText('Selecionar arquivos')).toBeTruthy();
    expect(screen.getByText('Nenhuma imagem vinculada ainda.')).toBeTruthy();
  });

  it('ao enviar arquivo chama onPersist(referenceId, [id]) e onSaved com a lista normalizada', async () => {
    const onSaved = vi.fn();
    const onPersist = vi.fn(async (_ref: string, ids: string[]) => ids);
    const { container } = render(
      <ImageGalleryManager
        referenceId="r1"
        initialImageIds={[]}
        onSaved={onSaved}
        onPersist={onPersist}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    await userEvent.upload(input, file);

    await waitFor(() => expect(onPersist).toHaveBeenCalledWith('r1', ['f1']));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(['f1']));
  });
});
