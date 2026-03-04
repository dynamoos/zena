import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardHeader, CardTitle } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { Select } from '@/components/atoms/select';
import { Skeleton } from '@/components/atoms/skeleton';
import { TablePagination } from '@/components/molecules/table-pagination';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  type PaginatedResponse,
  USER_ROLE,
  type User,
  type UserRole,
} from '@/types';

const ROLE_OPTIONS = [
  { value: USER_ROLE.ADMIN, label: 'Admin' },
  { value: USER_ROLE.EDITOR, label: 'Editor' },
  { value: USER_ROLE.VIEWER, label: 'Viewer' },
];

const PAGE_SIZE = 20;

function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () =>
      api.get<PaginatedResponse<User>>(
        `/users/?offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`,
      ),
    enabled: currentUser?.role === USER_ROLE.ADMIN,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const deactivateUser = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      toast.success('Usuario desactivado');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  if (currentUser?.role !== USER_ROLE.ADMIN) {
    return (
      <Card className="page-enter">
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="Acceso restringido"
          description="Solo los administradores pueden gestionar usuarios del sistema"
        />
      </Card>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Usuarios del sistema
          </h1>
          <p className="mt-1 text-text-muted">
            {data
              ? `${data.total} usuarios registrados`
              : 'Administración de cuentas internas y permisos'}
          </p>
        </div>
        <Badge variant="primary">
          <Shield className="mr-1 h-3.5 w-3.5" />
          Solo Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <CreateUserForm />

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Usuarios registrados
            </CardTitle>
          </CardHeader>
          {isLoading && !data ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No hay usuarios registrados"
              description="Creá el primer usuario para comenzar"
            />
          ) : (
            <>
              <div className="space-y-2">
                {data.items.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active ? 'default' : 'warning'}>
                        {user.is_active ? user.role : 'Inactivo'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.is_active && user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deactivateUser.mutate(user.id)}
                          disabled={deactivateUser.isPending}
                          className="text-text-muted hover:bg-danger-light hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <TablePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={data.total}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {editTarget && (
        <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}

function CreateUserForm() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLE.VIEWER);

  const createUser = useMutation({
    mutationFn: () =>
      api.post<User>('/auth/register', {
        full_name: fullName,
        email,
        password,
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFullName('');
      setEmail('');
      setPassword('');
      setRole(USER_ROLE.VIEWER);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createUser.mutate();
  };

  return (
    <Card className="xl:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Crear usuario
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="María Pérez"
          required
        />
        <Input
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@zena.pe"
          required
        />
        <Input
          label="Contraseña inicial"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
        />
        <Select
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={ROLE_OPTIONS}
        />
        {createUser.error && (
          <p className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
            {createUser.error instanceof Error
              ? createUser.error.message
              : 'No se pudo crear el usuario'}
          </p>
        )}
        <Button
          type="submit"
          loading={createUser.isPending}
          className="w-full"
          size="lg"
        >
          Crear cuenta
        </Button>
      </form>
    </Card>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.full_name);
  const [role, setRole] = useState<UserRole>(user.role);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch<User>(`/users/${user.id}`, {
        full_name: name,
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal onClose={onClose} title="Editar usuario" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Select
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={ROLE_OPTIONS}
        />
        {mutation.error && (
          <p className="text-sm text-danger">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Error al actualizar'}
          </p>
        )}
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { UsersPage };
