import { Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';

interface ReportVisualBuilderProps {
  initialDesignJson?: string;
  onSave: (payload: { html: string; designJson: string; name: string }) => void;
  templateName: string;
  disabled?: boolean;
}

interface UnlayerEditorApi {
  init: (options: Record<string, unknown>) => void;
  loadDesign: (design: unknown) => void;
  exportHtml: (cb: (data: { html: string; design: unknown }) => void) => void;
  addEventListener: (event: string, cb: () => void) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    unlayer?: UnlayerEditorApi;
  }
}

const UNLAYER_SCRIPT_ID = 'unlayer-embed-script';
const UNLAYER_SCRIPT_SRC = 'https://editor.unlayer.com/embed.js';
const UNLAYER_PROJECT_ID = Number(import.meta.env.VITE_UNLAYER_PROJECT_ID || 0);

function ReportVisualBuilder({
  initialDesignJson,
  onSave,
  templateName,
  disabled = false,
}: ReportVisualBuilderProps) {
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [localName, setLocalName] = useState(templateName);
  const containerIdRef = useRef(
    `unlayer-editor-${Math.random().toString(36).slice(2, 10)}`,
  );
  const containerId = containerIdRef.current;
  const mountedRef = useRef(false);
  const initializedRef = useRef(false);
  const initialDesignJsonRef = useRef(initialDesignJson);

  useEffect(() => {
    mountedRef.current = true;

    const initEditor = () => {
      if (!window.unlayer || !mountedRef.current || initializedRef.current)
        return;

      initializedRef.current = true;

      window.unlayer.init({
        id: containerId,
        displayMode: 'document',
        ...(UNLAYER_PROJECT_ID > 0 ? { projectId: UNLAYER_PROJECT_ID } : {}),
        appearance: { theme: 'light' },
        features: { stockImages: true },
        mergeTags: {},
      });

      window.unlayer.addEventListener('editor:ready', () => {
        if (!mountedRef.current || !window.unlayer) return;

        if (initialDesignJsonRef.current) {
          try {
            const parsed = JSON.parse(initialDesignJsonRef.current);
            if (isValidDesign(parsed)) {
              window.unlayer.loadDesign(parsed);
            }
          } catch {
            // ignore invalid serialized designs from previous schema versions
          }
        }

        setReady(true);
        setLoadError('');
      });
    };

    if (window.unlayer) {
      // Library already loaded (common case after first page load)
      initEditor();
    } else {
      // Remove stale script whose `load` event already fired and won't fire again
      document.getElementById(UNLAYER_SCRIPT_ID)?.remove();

      const script = document.createElement('script');
      script.id = UNLAYER_SCRIPT_ID;
      script.src = UNLAYER_SCRIPT_SRC;
      script.async = true;
      script.onload = initEditor;
      script.onerror = () => {
        setLoadError(
          'No se pudo cargar Unlayer. Revisa conexión o bloqueadores.',
        );
      };
      document.body.appendChild(script);
    }

    return () => {
      mountedRef.current = false;
      initializedRef.current = false;
      if (window.unlayer) {
        try {
          window.unlayer.destroy();
        } catch {
          // ignore cleanup errors from external script
        }
      }
    };
  }, [containerId]);

  const handleSave = () => {
    if (!window.unlayer || !localName.trim()) return;

    setSaving(true);
    window.unlayer.exportHtml((data) => {
      onSave({
        html: data.html,
        designJson: JSON.stringify(data.design),
        name: localName.trim(),
      });
      setSaving(false);
    });
  };

  return (
    <Card className="flex h-[calc(100vh-220px)] min-h-[700px] flex-col overflow-hidden !p-0">
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <input
            value={localName}
            onChange={(event) => setLocalName(event.target.value)}
            placeholder="Nombre de plantilla"
            required
            className="h-9 w-[420px] max-w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={disabled || !ready || !localName.trim()}
        >
          <Save className="h-4 w-4" />
          Guardar diseño
        </Button>
      </div>
      {loadError && (
        <div className="border-b border-danger/20 bg-danger-light px-4 py-2 text-xs text-danger">
          {loadError}
        </div>
      )}
      <div id={containerId} className="min-h-0 flex-1" />
    </Card>
  );
}

function isValidDesign(design: unknown) {
  if (!design || typeof design !== 'object') return false;
  const candidate = design as { body?: { rows?: unknown[] } };
  return !!candidate.body && Array.isArray(candidate.body.rows);
}

export { ReportVisualBuilder };
export type { ReportVisualBuilderProps };
