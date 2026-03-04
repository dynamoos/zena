import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { api } from '@/lib/api';
import type { Person } from '@/types';

interface CreatePersonModalProps {
  onClose: () => void;
}

function CreatePersonModal({ onClose }: CreatePersonModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Person>('/persons/', {
        first_name: firstName,
        last_name: lastName,
        dni,
        phone: phone || null,
        email: email || null,
        address: address || null,
      }),
    onSuccess: () => {
      toast.success('Persona creada');
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      handleClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleClose = () => {
    setFirstName('');
    setLastName('');
    setDni('');
    setPhone('');
    setEmail('');
    setAddress('');
    mutation.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal
      onClose={handleClose}
      title="Nueva Persona"
      description="Registrar una persona para vincular a casos"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Juan"
              required
            />
            <Input
              label="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Pérez"
              required
            />
          </div>
          <Input
            label="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="12345678"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+51 999 888 777"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@ejemplo.com"
            />
          </div>
          <Input
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Av. Lima 123"
          />
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Error al crear persona'}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={!firstName || !lastName || !dni}
          >
            Crear Persona
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { CreatePersonModal };
export type { CreatePersonModalProps };
