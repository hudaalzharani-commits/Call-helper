import { useState, useEffect, useCallback, useMemo, type ElementType, type ReactNode } from 'react';
import {
  User, Activity, AlertCircle, BookOpen, RefreshCw, Lightbulb,
  Headphones, Bot, Sparkles, Menu, X, Shield, Settings, LogOut, ChevronLeft,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from './components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { LiveIndicators } from './components/LiveIndicators';
import { CallHelper } from './components/CallHelper';
import { CommonIssues } from './components/CommonIssues';
import { KnowledgeBase } from './components/KnowledgeBase';
import { OperationalUpdates } from './components/OperationalUpdates';
import { RafeeqTraining } from './components/RafeeqTraining';
import { TeachRafeeqExperience } from './components/TeachRafeeqExperience';
import { Logo, IconLogo } from './components/Logo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdvancedSettingsProvider } from './contexts/AdvancedSettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { UserSettingsDialog } from './components/UserSettingsDialog';
import { ThemeToggle } from './components/ThemeToggle';
import { AccentPalettePicker } from './components/AccentPalettePicker';
import { Toaster } from './components/ui/sonner';
import { canShowAdminTab } from './utils/appRoles';
import { isUiFlagEnabled, pageKeyForServiceId } from './utils/uiVisibility';

const DASHBOARD_SERVICES = [
  { id: 'live-indicators', name: 'المؤشرات اللحظية', icon: Activity },
  { id: 'public-issues', name: 'المشاكل العامة', icon: AlertCircle },
  { id: 'knowledge-base', name: 'سجل المعرفة', icon: BookOpen },
  { id: 'operational-updates', name: 'التحديثات التشغيلية', icon: RefreshCw },
  { id: 'what-did-rafeeq-learn', name: 'وش تعلم رفيق؟', icon: Lightbulb },
] as const;

type DashboardService = (typeof DASHBOARD_SERVICES)[number];

const DASHBOARD_DEEP_LINK_SERVICE_IDS = ['teach-rafeeq-experience'] as const;

function isAllowedDashboardService(
  serviceId: string,
  user: Parameters<typeof isUiFlagEnabled>[0],
  navigable: { id: string }[],
): boolean {
  if (navigable.some((s) => s.id === serviceId)) return true;
  if (
    (DASHBOARD_DEEP_LINK_SERVICE_IDS as readonly string[]).includes(serviceId) &&
    isUiFlagEnabled(user, pageKeyForServiceId(serviceId))
  ) {
    return true;
  }
  return false;
}

function RtlShell({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen" style={{ background: 'var(--background)' }}>
      {children}
    </div>
  );
}

function ViewPill({
  active, onClick, icon: Icon, label, disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-active={active}
      className="pill disabled:opacity-40 disabled:pointer-events-none"
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

function RailItem({
  service, isActive, onClick, expanded,
}: {
  service: DashboardService;
  isActive: boolean;
  onClick: () => void;
  expanded: boolean;
}) {
  const Icon = service.icon;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={service.name}
        aria-label={service.name}
        aria-pressed={isActive}
        className="size-11 rounded-2xl flex items-center justify-center transition-all duration-200"
        style={{
          background: isActive ? 'var(--primary)' : 'transparent',
          color: isActive ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          boxShadow: isActive ? 'var(--rail-active-shadow)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
          }
        }}
      >
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className="relative w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-right transition-all duration-200"
      style={{
        background: isActive ? 'var(--surface-2)' : 'transparent',
        color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
        boxShadow: isActive ? 'var(--inner-highlight), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute right-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
          style={{ background: 'var(--primary)', boxShadow: '0 0 8px 0 var(--primary-glow)' }}
        />
      )}
      <span
        className="shrink-0 size-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: isActive ? 'var(--primary-soft)' : 'transparent',
          color: isActive ? 'var(--primary)' : 'var(--muted-strong)',
        }}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="text-sm font-medium truncate flex-1" style={{ color: isActive ? 'var(--foreground)' : 'inherit' }}>
        {service.name}
      </span>
    </button>
  );
}

function AskRafeeqRailFooter({ expanded }: { expanded: boolean }) {
  return (
    <div className={['pt-3 mt-3 border-t', expanded ? '' : 'w-full flex justify-center'].join(' ')} style={{ borderColor: 'var(--border)' }}>
      {expanded ? (
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:translate-y-[-1px] text-right"
          style={{ background: 'var(--ai-soft)' }}
        >
          <span className="shrink-0 size-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ai)', color: 'var(--ai-foreground)' }}>
            <Bot className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold flex items-center gap-1.5 justify-end" style={{ color: 'var(--foreground)' }}>
              <Sparkles className="size-3" style={{ color: 'var(--ai)' }} />
              اسأل رفيق
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--muted-foreground)' }}>مساعدك الذكي</p>
          </div>
          <ChevronLeft className="size-3.5 shrink-0" style={{ color: 'var(--muted-strong)' }} />
        </button>
      ) : (
        <button
          type="button"
          title="اسأل رفيق"
          aria-label="اسأل رفيق"
          className="size-11 rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-[1.04]"
          style={{ background: 'var(--ai)', color: 'var(--ai-foreground)', boxShadow: 'var(--shadow-ai-glow)' }}
        >
          <Bot className="size-[18px]" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [selectedService, setSelectedService] = useState<string>('live-indicators');
  const [viewMode, setViewMode] = useState<'dashboard' | 'callhelper' | 'admin'>('dashboard');
  const [railExpanded, setRailExpanded] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [callHelperLaunch, setCallHelperLaunch] = useState<{ seed: string; nonce: number } | null>(null);
  const [knowledgeCategoryFocus, setKnowledgeCategoryFocus] = useState<string | null>(null);

  const clearCallHelperLaunch = useCallback(() => setCallHelperLaunch(null), []);
  const clearKnowledgeCategoryFocus = useCallback(() => setKnowledgeCategoryFocus(null), []);

  useEffect(() => {
    const fn = (ev: Event) => {
      const e = ev as CustomEvent<
        | { view: 'callhelper'; problemSeed: string }
        | { view: 'knowledge-base'; category: string }
        | { view: 'teach-rafeeq'; prefill?: Record<string, string> }
        | { view: 'dashboard-service'; serviceId: string }
      >;
      if (!e.detail) return;
      if (e.detail.view === 'callhelper') {
        setCallHelperLaunch({ seed: e.detail.problemSeed, nonce: Date.now() });
        setViewMode('callhelper');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setRailExpanded(false);
      }
      if (e.detail.view === 'knowledge-base') {
        try { sessionStorage.setItem('knowledge-base-focus', e.detail.category); } catch { /* ignore */ }
        setKnowledgeCategoryFocus(e.detail.category);
        setViewMode('dashboard');
        setSelectedService('knowledge-base');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setRailExpanded(false);
      }
      if (e.detail.view === 'teach-rafeeq') {
        const p = (e.detail as { prefill?: Record<string, string> }).prefill;
        if (p) {
          try { sessionStorage.setItem('teach-rafeeq-prefill', JSON.stringify(p)); } catch { /* ignore */ }
        }
        setViewMode('dashboard');
        setSelectedService('teach-rafeeq-experience');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setRailExpanded(false);
      }
      if (e.detail.view === 'dashboard-service') {
        setViewMode('dashboard');
        setSelectedService(e.detail.serviceId);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setRailExpanded(false);
      }
    };
    window.addEventListener('app:navigate', fn);
    return () => window.removeEventListener('app:navigate', fn);
  }, []);

  useEffect(() => {
    if (viewMode === 'admin' && !canShowAdminTab(user)) setViewMode('dashboard');
  }, [viewMode, user]);

  const navigableServices = useMemo(
    () => DASHBOARD_SERVICES.filter((s) => isUiFlagEnabled(user, pageKeyForServiceId(s.id))),
    [user],
  );

  useEffect(() => {
    if (viewMode !== 'dashboard' || !user) return;
    if (isAllowedDashboardService(selectedService, user, navigableServices)) return;
    const fallback = navigableServices[0]?.id ?? 'live-indicators';
    if (selectedService !== fallback) setSelectedService(fallback);
  }, [viewMode, user, navigableServices, selectedService]);

  useEffect(() => {
    if (!user) return;
    if (viewMode === 'dashboard' && !isUiFlagEnabled(user, 'view_dashboard')) {
      if (isUiFlagEnabled(user, 'view_callhelper')) setViewMode('callhelper');
      else if (canShowAdminTab(user)) setViewMode('admin');
    }
    if (viewMode === 'callhelper' && !isUiFlagEnabled(user, 'view_callhelper')) {
      if (isUiFlagEnabled(user, 'view_dashboard')) setViewMode('dashboard');
      else if (canShowAdminTab(user)) setViewMode('admin');
    }
  }, [viewMode, user]);

  if (!user) {
    return (
      <RtlShell>
        <Login />
      </RtlShell>
    );
  }

  const dashboardEnabled = isUiFlagEnabled(user, 'view_dashboard');
  const callHelperEnabled = isUiFlagEnabled(user, 'view_callhelper');

  return (
    <RtlShell>
      <header className="topbar fixed top-0 inset-x-0 z-50 h-14">
        <div className="h-full flex items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {viewMode === 'dashboard' && (
              <button
                type="button"
                onClick={() => setRailExpanded(!railExpanded)}
                className="size-9 rounded-full flex items-center justify-center hover:bg-surface-2 transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                aria-label={railExpanded ? 'إخفاء القائمة' : 'إظهار القائمة'}
              >
                {railExpanded ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            )}
            <div className="hidden sm:block"><Logo /></div>
            <div className="sm:hidden"><IconLogo className="size-9" /></div>
          </div>

          <div className="hidden sm:flex pill-rail">
            <ViewPill active={viewMode === 'dashboard'} onClick={() => setViewMode('dashboard')} icon={Activity} label="لوحة التحكم" disabled={!dashboardEnabled} />
            <ViewPill active={viewMode === 'callhelper'} onClick={() => setViewMode('callhelper')} icon={Headphones} label="مساعد المكالمات" disabled={!callHelperEnabled} />
            {canShowAdminTab(user) && (
              <ViewPill active={viewMode === 'admin'} onClick={() => setViewMode('admin')} icon={Shield} label="الأدمن" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <AccentPalettePicker />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded-full transition-all hover:ring-2 ring-offset-2 ring-offset-background"
                  style={{ ['--tw-ring-color' as string]: 'var(--primary-soft)' }}
                >
                  <Avatar className="size-8">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : (
                      <AvatarFallback className="text-xs" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                        <User className="size-3.5" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl">
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{user.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>@{user.username}</p>
                </div>
                <DropdownMenuItem onClick={() => setShowUserSettings(true)} className="m-1 rounded-lg cursor-pointer flex items-center gap-2 text-sm">
                  <Settings className="size-3.5" />
                  إعدادات الحساب
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="m-1 rounded-lg cursor-pointer flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
                  <LogOut className="size-3.5" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-center gap-1 px-4 pb-2">
          <div className="pill-rail">
            <ViewPill active={viewMode === 'dashboard'} onClick={() => setViewMode('dashboard')} icon={Activity} label="لوحة التحكم" disabled={!dashboardEnabled} />
            <ViewPill active={viewMode === 'callhelper'} onClick={() => setViewMode('callhelper')} icon={Headphones} label="مساعد المكالمات" disabled={!callHelperEnabled} />
            {canShowAdminTab(user) && (
              <ViewPill active={viewMode === 'admin'} onClick={() => setViewMode('admin')} icon={Shield} label="الأدمن" />
            )}
          </div>
        </div>
      </header>

      <div className="pt-14 flex min-h-screen">
        {viewMode === 'dashboard' && (
          <aside
            className={[
              'sticky top-14 self-start hidden lg:flex flex-col shrink-0',
              'h-[calc(100vh-3.5rem)] overflow-y-auto border-l',
              railExpanded ? 'w-60 px-3 py-4' : 'w-[68px] px-3 py-4',
              'transition-[width] duration-300 ease-rafiq',
            ].join(' ')}
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <nav className={['flex-1 flex flex-col', railExpanded ? 'gap-1' : 'gap-1.5 items-center'].join(' ')}>
              {railExpanded && (
                <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-right" style={{ color: 'var(--muted-strong)' }}>
                  الخدمات
                </p>
              )}
              {navigableServices.length === 0 && railExpanded ? (
                <p className="text-xs text-right px-2 py-3 rounded-xl border border-dashed" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}>
                  لا توجد صفحات مفعّلة في القائمة.
                </p>
              ) : null}
              {navigableServices.map((s) => (
                <RailItem
                  key={s.id}
                  service={s}
                  isActive={selectedService === s.id}
                  expanded={railExpanded}
                  onClick={() => setSelectedService(s.id)}
                />
              ))}
              <div className="flex-1" />
              <AskRafeeqRailFooter expanded={railExpanded} />
            </nav>
          </aside>
        )}

        {viewMode === 'dashboard' && railExpanded && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setRailExpanded(false)}>
            <aside
              className="absolute top-14 right-0 bottom-0 w-72 p-3 overflow-y-auto"
              style={{ background: 'var(--surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-right" style={{ color: 'var(--muted-strong)' }}>
                الخدمات
              </p>
              <div className="flex flex-col gap-1">
                {navigableServices.map((s) => (
                  <RailItem
                    key={s.id}
                    service={s}
                    isActive={selectedService === s.id}
                    expanded
                    onClick={() => { setSelectedService(s.id); setRailExpanded(false); }}
                  />
                ))}
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 transition-all duration-300">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 fade-in">
            {viewMode === 'callhelper' ? (
              <CallHelper
                isDarkMode={isDark}
                callHelperLaunch={callHelperLaunch}
                onConsumeCallHelperLaunch={clearCallHelperLaunch}
              />
            ) : viewMode === 'admin' ? (
              <AdminPanel />
            ) : (
              <>
                {selectedService === 'live-indicators' && <LiveIndicators />}
                {selectedService === 'public-issues' && <CommonIssues />}
                {selectedService === 'knowledge-base' && (
                  <KnowledgeBase
                    externalCategoryFocus={knowledgeCategoryFocus}
                    onConsumeExternalCategoryFocus={clearKnowledgeCategoryFocus}
                  />
                )}
                {selectedService === 'operational-updates' && <OperationalUpdates />}
                {selectedService === 'what-did-rafeeq-learn' && <RafeeqTraining />}
                {selectedService === 'teach-rafeeq-experience' &&
                  isUiFlagEnabled(user, pageKeyForServiceId('teach-rafeeq-experience')) && (
                    <TeachRafeeqExperience />
                  )}
              </>
            )}
          </div>
        </main>
      </div>
      <UserSettingsDialog open={showUserSettings} onOpenChange={setShowUserSettings} />
    </RtlShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdvancedSettingsProvider>
          <AppContent />
          <Toaster />
        </AdvancedSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
