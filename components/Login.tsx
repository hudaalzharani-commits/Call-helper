import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export function Login() {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(emailOrUsername, password);
      if (!success) {
        setError('البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-cyan-400/10 dark:bg-cyan-500/10 rounded-full blur-3xl floating" />
        <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl floating" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/5 dark:bg-teal-500/5 rounded-full blur-3xl floating" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">مرحباً بك</h1>
          <p className="text-muted-foreground">سجل دخولك للمتابعة</p>
        </div>

        {/* Login Form */}
        <div className="glass-panel border-2 border-border rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                id="emailOrUsername"
                type="text"
                placeholder={isEmailFocused || emailOrUsername ? "" : "الرجاء إدخال البريد الالكتروني أو اسم المستخدم"}
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="glass-card border-2 border-border focus:border-primary transition-all h-12 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </div>

            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder={isPasswordFocused || password ? "" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-card border-2 border-border focus:border-primary transition-all h-12 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 border-2 border-cyan-400 dark:border-cyan-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 ml-2 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="size-4 ml-2" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground mb-3">حسابات تجريبية:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="glass-card p-2.5 rounded-lg border border-border">
                <p className="text-foreground font-semibold mb-0.5">أدمن 1</p>
                <p className="text-muted-foreground text-[10px]">admin1 / 123456</p>
              </div>
              <div className="glass-card p-2.5 rounded-lg border border-border">
                <p className="text-foreground font-semibold mb-0.5">أدمن 2</p>
                <p className="text-muted-foreground text-[10px]">admin2 / 123456</p>
              </div>
              <div className="glass-card p-2.5 rounded-lg border border-border">
                <p className="text-foreground font-semibold mb-0.5">مشرف 1</p>
                <p className="text-muted-foreground text-[10px]">moderator1 / 123456</p>
              </div>
              <div className="glass-card p-2.5 rounded-lg border border-border">
                <p className="text-foreground font-semibold mb-0.5">مستخدم 1</p>
                <p className="text-muted-foreground text-[10px]">user1 / 123456</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}