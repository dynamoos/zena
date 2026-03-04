import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

interface ModalProps {
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

function Modal({
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-overlay modal-backdrop"
        onClick={onClose}
        aria-label="Cerrar modal"
      />
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl bg-surface shadow-modal',
          'max-h-[calc(100vh-2rem)] modal-panel',
          sizeStyles[size],
        )}
      >
        <div className="flex items-start justify-between border-b border-border-light px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ModalFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        '-mx-6 -mb-5 mt-5 flex items-center justify-end gap-3 rounded-b-2xl border-t border-border-light px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Modal, ModalFooter };
export type { ModalProps };
