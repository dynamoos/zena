import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Scale } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { useAuthStore } from '@/stores/auth-store';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-secondary/[0.09] blur-3xl" />
      </div>

      <div className="page-enter relative w-full max-w-[420px]">
        {/* Card */}
        <div className="rounded-2xl border border-border-light bg-surface p-8 shadow-card sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-card">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-3 text-lg font-semibold tracking-tight text-text">
              Zena
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Ingresá para continuar
            </p>
          </div>

          {/* Separator */}
          <div className="mb-6 border-t border-border-light" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@estudio.com"
              autoComplete="email"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="pt-1">
              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="w-full"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted/50">
          &copy; {new Date().getFullYear()} Zena &middot; Case Management
        </p>
      </div>
    </div>
  );
}

export { LoginPage };
