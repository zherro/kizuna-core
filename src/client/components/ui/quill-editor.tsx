'use client';

import dynamic from 'next/dynamic';
import { useId, useMemo, useRef, useState, type MutableRefObject, type ComponentProps } from 'react';
import { Code2, SquarePlay, Smile } from 'lucide-react';
import type ReactQuillType from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { youtubeEmbedUrl } from '../../../shared/youtube';

type QuillHandle = InstanceType<typeof ReactQuillType>;
type ReactQuillProps = ComponentProps<typeof ReactQuillType> & { forwardedRef?: MutableRefObject<QuillHandle | null> };

// `next/dynamic` não repassa `ref`: o wrapper recebe como `forwardedRef` (precisamos do editor para
// inserir emoji/vídeo na posição do cursor).
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    function QuillWithRef({ forwardedRef, ...props }: ReactQuillProps) {
      return <RQ ref={forwardedRef} {...props} />;
    }
    return QuillWithRef;
  },
  { ssr: false }
);

export type QuillEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Botão de emoji (grade curta, sem biblioteca). Padrão: ligado. */
  emoji?: boolean;
  /** Botão de vídeo do YouTube (vira `<iframe class="ql-video">`; a página só aceita YouTube). Padrão: ligado. */
  video?: boolean;
  /** Botão "Ver código" (HTML cru). Ligue só para quem pode (ex.: root). Padrão: desligado. */
  source?: boolean;
};

/** Emojis do botão: os mais úteis para anúncio, evento e lugar. */
export const EDITOR_EMOJIS = [
  '😀', '😄', '😍', '🥰', '😎', '🤩', '😋', '🥳', '😉', '🙌', '👏', '👍', '🙏', '💪', '👀', '✨',
  '🎉', '🎊', '🎶', '🎵', '🎤', '🎸', '🥁', '💃', '🕺', '🎭', '🎬', '🎟️', '🎫', '🏆', '⚽', '🎮',
  '🍻', '🍺', '🍷', '🍹', '🥂', '☕', '🍔', '🍕', '🍽️', '🥩', '🍰', '🍦', '🌮', '🍣', '🥗', '🍤',
  '📍', '🗺️', '🚗', '🚌', '🅿️', '🕗', '📅', '⏰', '📞', '💬', '📸', '🎁', '💰', '💳', '♿', '👶',
  '🔥', '⭐', '🌟', '❤️', '💛', '💚', '💙', '✅', '❗', '⚠️', '🌞', '🌙', '🌴', '🌊', '🐟', '🦜',
];

const BTN =
  'inline-flex h-6 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function QuillEditor({ value, onChange, placeholder, emoji = true, video = true, source = false }: QuillEditorProps) {
  const toolbarId = `ql-toolbar-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const quillRef = useRef<QuillHandle | null>(null);
  const [panel, setPanel] = useState<'emoji' | 'video' | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [showSource, setShowSource] = useState(false);

  // O toolbar é o JSX abaixo (botões `ql-*` ganham ícone e ação do próprio Quill); fixo por montagem.
  const modules = useMemo(() => ({ toolbar: { container: `#${toolbarId}` } }), [toolbarId]);

  /** Insere na posição do cursor (ou no fim) e fecha o painel. */
  const insert = (fn: (quill: ReturnType<QuillHandle['getEditor']>, index: number) => void) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    fn(quill, index);
    setPanel(null);
  };

  const addEmoji = (e: string) =>
    insert((quill, index) => {
      quill.insertText(index, e, 'user');
      quill.setSelection(index + e.length, 0, 'user');
    });

  const addVideo = () => {
    const embed = youtubeEmbedUrl(videoUrl);
    if (!embed) {
      setVideoError('Cole um link do YouTube (youtube.com/watch?v=…, youtu.be/…, Shorts).');
      return;
    }
    insert((quill, index) => {
      quill.insertEmbed(index, 'video', embed, 'user');
      quill.setSelection(index + 1, 0, 'user');
    });
    setVideoUrl('');
    setVideoError('');
  };

  // Mantém a seleção do editor ao clicar nos botões próprios.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();
  const toggle = (p: 'emoji' | 'video') => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="quill-wrapper relative rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background">
      <div id={toolbarId} className="flex flex-wrap items-center gap-y-1">
        <span className="ql-formats">
          <button type="button" className="ql-bold" aria-label="Negrito" disabled={showSource} />
          <button type="button" className="ql-italic" aria-label="Itálico" disabled={showSource} />
          <button type="button" className="ql-underline" aria-label="Sublinhado" disabled={showSource} />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-list" value="ordered" aria-label="Lista numerada" disabled={showSource} />
          <button type="button" className="ql-list" value="bullet" aria-label="Lista" disabled={showSource} />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-clean" aria-label="Limpar formatação" disabled={showSource} />
        </span>
        {(emoji || video || source) && (
          <span className="ql-formats !inline-flex items-center gap-0.5">
            {emoji && (
              <button
                type="button"
                className={BTN}
                aria-label="Inserir emoji"
                aria-expanded={panel === 'emoji'}
                disabled={showSource}
                onMouseDown={keepSelection}
                onClick={() => toggle('emoji')}
              >
                <Smile className="h-4 w-4" />
              </button>
            )}
            {video && (
              <button
                type="button"
                className={BTN}
                aria-label="Inserir vídeo do YouTube"
                aria-expanded={panel === 'video'}
                disabled={showSource}
                onMouseDown={keepSelection}
                onClick={() => toggle('video')}
              >
                <SquarePlay className="h-4 w-4" />
              </button>
            )}
            {source && (
              <button
                type="button"
                className={`${BTN} ${showSource ? 'bg-muted text-foreground' : ''}`}
                aria-label={showSource ? 'Voltar ao editor' : 'Ver código'}
                aria-pressed={showSource}
                title={showSource ? 'Voltar ao editor' : 'Ver código (HTML)'}
                onClick={() => {
                  setPanel(null);
                  setShowSource((s) => !s);
                }}
              >
                <Code2 className="h-4 w-4" />
              </button>
            )}
          </span>
        )}
      </div>

      {panel === 'emoji' && (
        <div className="absolute left-2 right-2 z-20 mt-1 max-w-sm rounded-xl border border-border bg-popover p-2 shadow-lg sm:right-auto">
          <div className="grid grid-cols-8 gap-0.5">
            {EDITOR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg text-xl transition hover:bg-muted"
                aria-label={`Inserir ${e}`}
                onMouseDown={keepSelection}
                onClick={() => addEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === 'video' && (
        <div className="absolute left-2 right-2 z-20 mt-1 max-w-md rounded-xl border border-border bg-popover p-3 shadow-lg sm:right-auto sm:w-96">
          <label htmlFor={`${toolbarId}-video`} className="text-sm font-semibold text-foreground">
            Link do vídeo no YouTube
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={`${toolbarId}-video`}
              type="url"
              inputMode="url"
              autoFocus
              value={videoUrl}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setVideoError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addVideo();
                }
                if (e.key === 'Escape') setPanel(null);
              }}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={addVideo}
              className="h-9 shrink-0 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Inserir
            </button>
          </div>
          {videoError && <p className="mt-2 text-xs text-destructive">{videoError}</p>}
        </div>
      )}

      {/* O Quill continua montado (o toolbar é dele); no modo código só fica escondido. */}
      <div className={showSource ? 'hidden' : undefined}>
        <ReactQuill
          forwardedRef={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder ?? 'Escreva a descrição do anúncio...'}
        />
      </div>
      {showSource && (
        <textarea
          aria-label="Código HTML da descrição"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block min-h-[240px] w-full resize-y rounded-b-[var(--ui-radius-field,0.375rem)] border-t border-input bg-muted/30 p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none"
        />
      )}
    </div>
  );
}
