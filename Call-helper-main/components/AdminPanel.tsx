import { useMemo, useState } from 'react';
import { 
  Shield,
  RefreshCw,
  Home,
  Sliders,
  ScrollText,
  Archive,
  Bell,
  GraduationCap,
  Sparkles,
  Users,
  ChevronDown,
  ChevronRight,
  Server,
  Brain,
  Eye,
  Database,
} from 'lucide-react';
import { Button } from './ui/button';
import { DashboardPage } from './admin/DashboardPage';
import { AdvancedSettingsPage } from './admin/AdvancedSettingsPage';
import { LogsPage } from './admin/LogsPage';
import { UsersRolesPage } from './admin/UsersRolesPage';
import { ArchivePage } from './admin/ArchivePage';
import { NotificationSettingsPage } from './admin/NotificationSettingsPage';
import { LearnSettingsPage } from './admin/LearnSettingsPage';
import { ReviewCenterPage } from './admin/ReviewCenterPage';
import { DatabasePage } from './admin/DatabasePage';
import { SystemLogsPage } from './admin/logs/SystemLogsPage';
import { LearningLogsPage } from './admin/logs/LearningLogsPage';
import { useI18nLayout } from '../hooks/useI18nLayout';

interface AdminMenuItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subItems?: {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export function AdminPanel() {
  const { t, isRtl, textAlign } = useI18nLayout();
  const [selectedMenuItem, setSelectedMenuItem] = useState('dashboard');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showDatabaseView, setShowDatabaseView] = useState(false);

  const iconGap = isRtl ? 'ml-2' : 'mr-2';
  const subMenuIndent = isRtl ? 'mr-4 border-r-2 border-border pr-2' : 'ml-4 border-l-2 border-border pl-2';

  const adminMenuItems: AdminMenuItem[] = useMemo(
    () => [
      { id: 'dashboard', name: t('admin.menu.dashboard'), icon: Home, color: 'from-primary to-primary' },
      { id: 'advanced-settings', name: t('admin.menu.advancedSettings'), icon: Sliders, color: 'from-purple-500 to-pink-500' },
      {
        id: 'logs',
        name: t('admin.menu.logs'),
        icon: ScrollText,
        color: 'from-blue-500 to-indigo-500',
        subItems: [
          { id: 'system-logs', name: t('admin.menu.systemLogs'), icon: Server },
          { id: 'learning-logs', name: t('admin.menu.learningLogs'), icon: Brain },
        ],
      },
      { id: 'users-roles', name: t('admin.menu.usersRoles'), icon: Users, color: 'from-green-500 to-emerald-500' },
      { id: 'archive', name: t('admin.menu.archive'), icon: Archive, color: 'from-gray-500 to-slate-500' },
      { id: 'notifications', name: t('admin.menu.notifications'), icon: Bell, color: 'from-red-500 to-rose-500' },
      {
        id: 'learn-settings',
        name: t('admin.menu.learnSettings'),
        icon: GraduationCap,
        color: 'from-teal-500 to-cyan-500',
        subItems: [{ id: 'review-center', name: t('admin.menu.reviewCenter'), icon: Eye }],
      },
    ],
    [t],
  );

  const renderContent = () => {
    switch (selectedMenuItem) {
      case 'dashboard':
        return <DashboardPage />;
      case 'advanced-settings':
        return <AdvancedSettingsPage />;
      case 'logs':
        return <LogsPage />;
      case 'system-logs':
        return <SystemLogsPage />;
      case 'learning-logs':
        return <LearningLogsPage />;
      case 'users-roles':
        return <UsersRolesPage />;
      case 'archive':
        return <ArchivePage />;
      case 'notifications':
        return <NotificationSettingsPage />;
      case 'learn-settings':
        return <LearnSettingsPage />;
      case 'review-center':
        return <ReviewCenterPage />;
      case 'database':
        return <DatabasePage />;
      default:
        return <DashboardPage />;
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedItems.includes(id)) {
      setExpandedItems(expandedItems.filter((item) => item !== id));
    } else {
      setExpandedItems([...expandedItems, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl">
              <Shield className="size-6 text-white" />
            </div>
            {t('admin.panel.title')}
          </h1>
          <p className="text-muted-foreground">{t('admin.panel.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-panel border-2 border-border rounded-xl p-1">
            <Button
              variant={!showDatabaseView ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowDatabaseView(false)}
              className={`${!showDatabaseView ? 'bg-primary text-primary-foreground text-white hover:from-primary hover:to-primary' : 'hover:bg-accent'}`}
            >
              <Shield className={`size-4 ${iconGap}`} />
              {t('admin.panel.adminPanel')}
            </Button>
            <Button
              variant={showDatabaseView ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowDatabaseView(true)}
              className={`${showDatabaseView ? 'bg-primary text-primary-foreground text-white hover:from-primary hover:to-primary' : 'hover:bg-accent'}`}
            >
              <Database className={`size-4 ${iconGap}`} />
              {t('admin.panel.database')}
            </Button>
          </div>

          <Button className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground shadow-lg border-2 border-primary/30">
            <RefreshCw className={`size-4 ${iconGap}`} />
            {t('admin.panel.refreshData')}
          </Button>
        </div>
      </div>

      {showDatabaseView ? (
        <DatabasePage />
      ) : (
        <div className="flex gap-6">
          <aside className="w-80 space-y-3 shrink-0">
            <div className="glass-panel border-2 border-border rounded-2xl p-5">
              <div className="mb-4">
                <h3 className={`text-foreground font-bold px-3 mb-3 flex items-center gap-2 ${textAlign}`}>
                  <Sparkles className="size-5 text-primary" />
                  {t('admin.panel.menuTitle')}
                </h3>
              </div>

              <div className="space-y-2">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    selectedMenuItem === item.id ||
                    item.subItems?.some((sub) => sub.id === selectedMenuItem);
                  const isExpanded = expandedItems.includes(item.id);
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const ExpandIcon = isExpanded ? ChevronDown : ChevronRight;

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMenuItem(item.id);
                            if (hasSubItems) {
                              toggleExpand(item.id);
                            }
                          }}
                          className={`flex-1 group relative overflow-hidden rounded-xl transition-all duration-300 ${
                            isActive ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
                          }`}
                        >
                          {isActive && (
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.color}`} />
                          )}
                          <div
                            className={`relative flex items-center gap-3 px-4 py-3 ${
                              isActive ? 'text-white' : 'text-foreground glass-card'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                              <Icon className="size-4" />
                            </div>
                            <span className={`font-medium text-sm flex-1 ${textAlign}`}>{item.name}</span>
                            {hasSubItems && (
                              <div>
                                <ExpandIcon className="size-4" />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>

                      {hasSubItems && isExpanded && (
                        <div className={`space-y-1 ${subMenuIndent}`}>
                          {item.subItems!.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = selectedMenuItem === subItem.id;

                            return (
                              <button
                                key={subItem.id}
                                type="button"
                                onClick={() => setSelectedMenuItem(subItem.id)}
                                className={`w-full ${textAlign} px-3 py-2 rounded-lg transition-all ${
                                  isSubActive
                                    ? 'bg-primary/20 text-primary border-2 border-primary'
                                    : 'glass-card text-muted-foreground hover:bg-accent/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <SubIcon className="size-3" />
                                  <span className="text-xs font-medium">{subItem.name}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      )}
    </div>
  );
}
