import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LogIn, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

interface LoginProps {
  onBack?: () => void;
}

export function Login({ onBack }: LoginProps) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword]               = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(emailOrUsername, password);
      if (!success) {
        setError(t('login.invalidCredentials'));
      }
    } catch {
      setError(t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--muted-foreground)' }}
          aria-label={t('login.backAria')}
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span>{t('login.back')}</span>
        </button>
      )}

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="ambient"
          style={{
            top: '-30%', right: '-20%', width: 720, height: 720,
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 65%)',
            opacity: 0.10,
          }}
        />
        <div
          className="ambient"
          style={{
            bottom: '-30%', left: '-20%', width: 600, height: 600,
            background: 'radial-gradient(circle, var(--ai) 0%, transparent 65%)',
            opacity: 0.06,
            animationDelay: '5s',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Login card */}
      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Logo size="large" />
          <p className="mt-5 text-sm tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
            {t('login.subtitle')}
          </p>
        </div>

        <div className="panel-elevated p-8">
          <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">

            {/* Username / email */}
            <div className="space-y-2">
              <label
                htmlFor="emailOrUsername"
                className="block text-xs font-semibold tracking-[0.08em] uppercase"
                style={{ color: 'var(--muted-strong)' }}
              >
                {t('login.usernameLabel')}
              </label>
              <Input
                id="emailOrUsername"
                type="text"
                placeholder={t('login.usernamePlaceholder')}
                className="h-11 rounded-xl text-right"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold tracking-[0.08em] uppercase"
                style={{ color: 'var(--muted-strong)' }}
              >
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11 rounded-xl pl-10 text-right"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl p-3 text-sm"
                style={{
                  background: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  border: '1px solid var(--border)',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 ml-2 animate-spin" />
                  {t('login.submitting')}
                </>
              ) : (
                <>
                  <LogIn className="size-4 ml-2" />
                  {t('login.submit')}
                </>
              )}
            </Button>
          </form>

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted-strong)' }}>
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
