import { useMutation } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Modal, ModalFooter } from '@/components/atoms/modal';

interface DeleteConfirmModalProps {
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  confirmLabel?: string;
}

function DeleteConfirmModal({
  onClose,
  title,
  description,
  onConfirm,
  confirmLabel,
}: DeleteConfirmModalProps) {
  const mutation = useMutation({
    mutationFn: onConfirm,
    onSuccess: () => {
      toast.success('Eliminado correctamente');
      onClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  return (
    <Modal onClose={handleClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-light">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <p className="text-sm text-text-secondary">{description}</p>
        {mutation.error && (
          <p className="text-sm text-danger">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Error al eliminar'}
          </p>
        )}
      </div>
      <ModalFooter>
        <Button type="button" variant="ghost" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {confirmLabel || 'Eliminar'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { DeleteConfirmModal };
export type { DeleteConfirmModalProps };
