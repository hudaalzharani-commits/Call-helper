import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sun, Moon, User, Activity, AlertCircle, BookOpen, RefreshCw, Lightbulb, Headphones, Bot, Sparkles, Menu, X, Zap, Shield, Settings } from 'lucide-react';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { LiveIndicators } from './components/LiveIndicators';
import { CallHelper } from './components/CallHelper';
import { CommonIssues } from './components/CommonIssues';
import { KnowledgeBase } from './components/KnowledgeBase';
import { OperationalUpdates } from './components/OperationalUpdates';
import { RafeeqTraining } from './components/RafeeqTraining';
import { TeachRafeeqExperience } from './components/TeachRafeeqExperience';
import { Logo } from './components/Logo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdvancedSettingsProvider } from './contexts/AdvancedSettingsContext';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { UserSettingsDialog } from './components/UserSettingsDialog';
import { Toaster } from './components/ui/sonner';
import { canShowAdminTab } from './utils/appRoles';
import { isUiFlagEnabled, pageKeyForServiceId } from './utils/uiVisibility';

const DASHBOARD_SERVICES: {
  id: string;
  name: string;
  icon: typeof Activity;
  color: string;
}[] = [
  { id: 'live-indicators', name: 'المؤشرات اللحظية', icon: Activity, color: 'from-cyan-500 to-blue-500' },
  { id: 'public-issues', name: 'المشاكل العامة', icon: AlertCircle, color: 'from-orange-500 to-red-500' },
  { id: 'knowledge-base', name: 'سجل المعرفة', icon: BookOpen, color: 'from-blue-500 to-indigo-500' },
  { id: 'operational-updates', name: 'التحديثات التشغيلية', icon: RefreshCw, color: 'from-green-500 to-emerald-500' },
  { id: 'what-did-rafeeq-learn', name: 'وش تعلم رفيق؟', icon: Lightbulb, color: 'from-yellow-500 to-amber-500' },
];

function AppContent() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('live-indicators');
  const [viewMode, setViewMode] = useState<'dashboard' | 'callhelper' | 'admin'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [callHelperLaunch, setCallHelperLaunch] = useState<{ seed: string; nonce: number } | null>(null);
  const [knowledgeCategoryFocus, setKnowledgeCategoryFocus] = useState<string | null>(null);

  const clearCallHelperLaunch = useCallback(() => {
    setCallHelperLaunch(null);
  }, []);

  const clearKnowledgeCategoryFocus = useCallback(() => {
    setKnowledgeCategoryFocus(null);
  }, []);

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
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      }
      if (e.detail.view === 'knowledge-base') {
        try {
          sessionStorage.setItem('knowledge-base-focus', e.detail.category);
        } catch {
          /* ignore */
        }
        setKnowledgeCategoryFocus(e.detail.category);
        setViewMode('dashboard');
        setSelectedService('knowledge-base');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      }
      if (e.detail.view === 'teach-rafeeq') {
        const p = (e.detail as { prefill?: Record<string, string> }).prefill;
        if (p) {
          try {
            sessionStorage.setItem('teach-rafeeq-prefill', JSON.stringify(p));
          } catch {
            /* ignore */
          }
        }
        setViewMode('dashboard');
        setSelectedService('teach-rafeeq-experience');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      }
      if (e.detail.view === 'dashboard-service') {
        setViewMode('dashboard');
        setSelectedService(e.detail.serviceId);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener('app:navigate', fn);
    return () => window.removeEventListener('app:navigate', fn);
  }, []);

  useEffect(() => {
    if (viewMode === 'admin' && !canShowAdminTab(user)) {
      setViewMode('dashboard');
    }
  }, [viewMode, user]);

  const navigableServices = useMemo(
    () => DASHBOARD_SERVICES.filter((s) => isUiFlagEnabled(user, pageKeyForServiceId(s.id))),
    [user],
  );

  useEffect(() => {
    if (viewMode !== 'dashboard' || !user) return;
    if (navigableServices.length === 0) return;
    if (!navigableServices.some((s) => s.id === selectedService)) {
      setSelectedService(navigableServices[0].id);
    }
  }, [viewMode, user, navigableServices, selectedService]);

  useEffect(() => {
    if (viewMode !== 'dashboard' || !user) return;
    if (
      selectedService === 'teach-rafeeq-experience' &&
      !isUiFlagEnabled(user, pageKeyForServiceId('teach-rafeeq-experience'))
    ) {
      setSelectedService(navigableServices[0]?.id ?? 'live-indicators');
    }
  }, [viewMode, user, selectedService, navigableServices]);

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

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className={isDarkMode ? 'dark' : ''} dir="rtl">
        <div className="min-h-screen bg-background">
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''} dir="rtl">
      <div className="min-h-screen bg-background">
        {/* Animated Background Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-cyan-400/10 dark:bg-cyan-500/10 rounded-full blur-3xl floating" />
          <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl floating" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/5 dark:bg-teal-500/5 rounded-full blur-3xl floating" style={{ animationDelay: '4s' }} />
        </div>

        {/* Top Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
          <div className="max-w-[1920px] mx-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
              {/* Right Side - Logo */}
              <div className="flex items-center gap-3">
                {/* Sidebar toggle — visible on every breakpoint now that the
                    sidebar can be hidden on desktop too. Without this, closing
                    the sidebar on a large screen leaves no way to reopen it. */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  aria-label={isSidebarOpen ? 'إخفاء القائمة الجانبية' : 'إظهار القائمة الجانبية'}
                  className="p-2 hover:bg-accent/50 rounded-xl transition-all border border-border"
                >
                  {isSidebarOpen ? <X className="size-5 text-foreground" /> : <Menu className="size-5 text-foreground" />}
                </button>
                <Logo />
              </div>

              {/* Center - View Mode Pills */}
              <div className="hidden md:flex items-center gap-2 glass-card px-1.5 py-1.5 rounded-2xl border-2 border-border">
                <button
                  onClick={() => setViewMode('dashboard')}
                  disabled={!isUiFlagEnabled(user, 'view_dashboard')}
                  className={`px-5 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    !isUiFlagEnabled(user, 'view_dashboard')
                      ? 'opacity-40 pointer-events-none'
                      : ''
                  } ${
                    viewMode === 'dashboard'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg border border-cyan-400 dark:border-cyan-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  <Activity className="size-4" />
                  <span className="font-semibold text-sm">لوحة التحكم</span>
                </button>
                <button
                  onClick={() => setViewMode('callhelper')}
                  disabled={!isUiFlagEnabled(user, 'view_callhelper')}
                  className={`px-5 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    !isUiFlagEnabled(user, 'view_callhelper')
                      ? 'opacity-40 pointer-events-none'
                      : ''
                  } ${
                    viewMode === 'callhelper'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg border border-cyan-400 dark:border-cyan-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  <Headphones className="size-4" />
                  <span className="font-semibold text-sm">مساعد المكالمات</span>
                </button>
                {canShowAdminTab(user) && (
                  <button
                    onClick={() => setViewMode('admin')}
                    className={`px-5 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                      viewMode === 'admin'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg border border-cyan-400 dark:border-cyan-300'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                    }`}
                  >
                    <Shield className="size-4" />
                    <span className="font-semibold text-sm">الأدمن</span>
                  </button>
                )}
              </div>

              {/* Left Side - Actions */}
              <div className="flex items-center gap-2">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2.5 glass-card hover:bg-accent/50 rounded-xl transition-all group border border-border"
                >
                  {isDarkMode ? (
                    <Sun className="size-5 text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
                  ) : (
                    <Moon className="size-5 text-primary group-hover:-rotate-12 transition-transform duration-500" />
                  )}
                </button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="glass-card p-1 rounded-xl hover:bg-accent/50 transition-all border border-border">
                      <Avatar className="size-9 ring-2 ring-primary/50 dark:ring-primary">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.name} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white border-2 border-cyan-300 dark:border-cyan-400">
                            <User className="size-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="glass-card w-56 border-2 border-border">
                    <DropdownMenuItem className="cursor-default rounded-lg hover:bg-transparent">
                      <div className="flex items-center gap-3 w-full">
                        <Avatar className="size-10">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                              <User className="size-5" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-semibold text-foreground text-sm">{user.name}</span>
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowUserSettings(true)}
                      className="cursor-pointer rounded-lg hover:bg-accent/50 flex items-center gap-2"
                    >
                      <Settings className="size-4" />
                      <span>إعدادات الحساب</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={logout}
                      className="cursor-pointer rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <X className="size-4 ml-2" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile View Mode - Bottom Pills */}
            <div className="md:hidden px-4 pb-3">
              <div className="flex items-center gap-2 glass-card px-1.5 py-1.5 rounded-2xl border-2 border-border">
                <button
                  onClick={() => setViewMode('dashboard')}
                  disabled={!isUiFlagEnabled(user, 'view_dashboard')}
                  className={`flex-1 px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    !isUiFlagEnabled(user, 'view_dashboard') ? 'opacity-40 pointer-events-none' : ''
                  } ${
                    viewMode === 'dashboard'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg border border-cyan-400 dark:border-cyan-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  <Activity className="size-4" />
                  <span className="font-semibold text-xs">لوحة التحكم</span>
                </button>
                <button
                  onClick={() => setViewMode('callhelper')}
                  disabled={!isUiFlagEnabled(user, 'view_callhelper')}
                  className={`flex-1 px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    !isUiFlagEnabled(user, 'view_callhelper') ? 'opacity-40 pointer-events-none' : ''
                  } ${
                    viewMode === 'callhelper'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg border border-cyan-400 dark:border-cyan-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  <Headphones className="size-4" />
                  <span className="font-semibold text-xs">مساعد المكالمات</span>
                </button>
                {canShowAdminTab(user) && (
                  <button
                    onClick={() => setViewMode('admin')}
                    className={`flex-1 px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      viewMode === 'admin'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg border border-cyan-400 dark:border-cyan-300'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                    }`}
                  >
                    <Shield className="size-4" />
                    <span className="font-semibold text-xs">الأدمن</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Layout */}
        <div className="pt-[72px] md:pt-[64px]">
          <div className="flex max-w-[1920px] mx-auto">
            {/* Left Sidebar - Services (Only in Dashboard mode) */}
            {/* Note: we deliberately drop the `lg:translate-x-0` override so
                that the close button works on every breakpoint. The main
                content already handles `lg:mr-80` based on `isSidebarOpen`,
                so the layout shifts cleanly when the sidebar is hidden. */}
            {viewMode === 'dashboard' && (
              <aside
                className={`fixed right-0 top-[72px] md:top-[64px] bottom-0 w-80 glass-panel border-l z-40 transition-transform duration-300 overflow-y-auto ${
                  isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <div className="p-5 space-y-3">
                  <div className="mb-4 flex items-center justify-between gap-2 px-3">
                    <h3 className="text-foreground font-bold flex items-center gap-2">
                      <Sparkles className="size-5 text-primary" />
                      الخدمات المتاحة
                    </h3>
                    {/* Inline close button so the admin can hide the sidebar
                        without hunting for the hamburger in the top nav. */}
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      aria-label="إخفاء القائمة الجانبية"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {navigableServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-right px-3 py-4 rounded-xl border border-dashed border-border">
                      لا توجد صفحات مفعّلة في القائمة لهذا المستخدم. راجع المسؤول في «إدارة المستخدمين والصلاحيات».
                    </p>
                  ) : null}

                  {navigableServices.map((service) => {
                    const Icon = service.icon;
                    const isActive = selectedService === service.id;
                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service.id);
                          if (window.innerWidth < 1024) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className={`w-full group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                          isActive ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
                        }`}
                      >
                        {isActive && (
                          <div className={`absolute inset-0 bg-gradient-to-r ${service.color}`} />
                        )}
                        <div className={`relative flex items-center gap-3 px-4 py-3.5 ${
                          isActive ? 'text-white' : 'text-foreground glass-card'
                        }`}>
                          <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                            <Icon className={`size-4 ${service.id === 'what-did-rafeeq-learn' && !isActive ? 'group-hover:rotate-12 transition-transform' : ''}`} />
                          </div>
                          <span className="font-medium text-sm">{service.name}</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Floating Bot Button */}
                  <div className="pt-6 mt-6 border-t">
                    <button
                      onClick={() => {/* TODO: Add functionality */}}
                      className="w-full glass-card hover:bg-accent/50 rounded-2xl p-4 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
                          <Bot className="size-5 text-white" />
                        </div>
                        <div className="text-right flex-1">
                          <h4 className="text-foreground font-semibold text-sm">اسأل رفيق</h4>
                          <p className="text-muted-foreground text-xs">مساعدك الذكي</p>
                        </div>
                        <Zap className="size-4 text-amber-500" />
                      </div>
                    </button>
                  </div>
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <main className={`flex-1 min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-64px)] transition-all duration-300 ${
              viewMode === 'dashboard' && isSidebarOpen ? 'lg:mr-80' : ''
            }`}>
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                  {viewMode === 'callhelper' ? (
                    <CallHelper
                      isDarkMode={isDarkMode}
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
              </div>
            </main>
          </div>
        </div>

        {/* User Settings Dialog */}
        <UserSettingsDialog open={showUserSettings} onOpenChange={setShowUserSettings} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdvancedSettingsProvider>
        <AppContent />
        <Toaster />
      </AdvancedSettingsProvider>
    </AuthProvider>
  );
}
