import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLE } from '@/types';

function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  return {
    isAdmin: role === USER_ROLE.ADMIN,
    canEdit: role === USER_ROLE.ADMIN || role === USER_ROLE.EDITOR,
  };
}

export { usePermissions };
