import { useLanguage } from '../../contexts/LanguageContext';
import { Bell, Mail, MessageSquare, Smartphone, Save, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

export function NotificationSettingsPage() {
  const { t, dir } = useLanguage();

  return (
    <div className="space-y-6">
      <Alert
        dir={dir}
        role="status"
        className="border-amber-500/50 bg-amber-50/90 text-amber-950 dark:bg-amber-950/35 dark:text-amber-50 dark:border-amber-400/45 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
      >
        <AlertTriangle className="size-4 shrink-0" />
        <AlertTitle className="text-amber-950 dark:text-amber-50">
          {t('admin.notifications.demoAlertTitle')}
        </AlertTitle>
        <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
          {t('admin.notifications.demoAlertDesc')}
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('admin.notifications.title')}</h2>
          <p className="text-muted-foreground">{t('admin.notifications.subtitle')}</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground">
          <Save className="size-4 ml-2" />
          حفظ الإعدادات
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            {t('admin.notifications.emailSection')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.newLogin')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.newLoginDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.newIssues')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.newIssuesDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.systemUpdates')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.systemUpdatesDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.weeklyReports')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.weeklyReportsDesc')}</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.securityAlerts')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.securityAlertsDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Push Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            {t('admin.notifications.pushSection')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تفعيل {t('admin.notifications.pushSection')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.enablePushDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.importantEvents')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.importantEventsDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.taskAssignment')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.taskAssignmentDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.repliesComments')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.repliesCommentsDesc')}</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.mentions')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.mentionsDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* SMS Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            {t('admin.notifications.smsSectionShort')}
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">{t('admin.notifications.phoneLabel')}</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+966 5X XXX XXXX" 
                className="glass-card border-2 border-border"
              />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.enableSms')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.enableSmsDesc')}</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.emergencyOnly')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.emergencyOnlyDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.otpCodes')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.otpCodesDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* In-App Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            {t('admin.notifications.inAppSection')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.showInApp')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.showInAppDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">الأصوات</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.soundDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.badgeCount')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.badgeCountDesc')}</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">{t('admin.notifications.popupNotifications')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.notifications.popupNotificationsDesc')}</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Email Templates */}
        <Card className="glass-panel border-2 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4">قوالب البريد الإلكتروني</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject" className="text-foreground">{t('admin.notifications.emailSubjectLabel')}</Label>
              <Input 
                id="email-subject" 
                defaultValue="[رفيق] لديك إشعار جديد" 
                className="glass-card border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-body" className="text-foreground">{t('admin.notifications.emailBodyLabel')}</Label>
              <Textarea 
                id="email-body" 
                rows={6}
                defaultValue="مرحباً {{name}},&#10;&#10;لديك إشعار جديد في نظام رفيق.&#10;&#10;{{notification_message}}&#10;&#10;مع تحياتنا،&#10;فريق رفيق"
                className="glass-card border-2 border-border font-mono text-sm"
              />
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <p className="text-sm text-foreground mb-2 font-medium">{t('admin.notifications.availableVars')}</p>
              <div className="flex flex-wrap gap-2">
                <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{'{{name}}'}</code>
                <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{'{{email}}'}</code>
                <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{'{{notification_message}}'}</code>
                <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{'{{date}}'}</code>
                <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{'{{time}}'}</code>
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Schedule */}
        <Card className="glass-panel border-2 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4">{t('admin.notifications.scheduleSection')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">{t('admin.notifications.dndMode')}</p>
                <Switch />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('admin.notifications.from')}</Label>
                  <Input type="time" defaultValue="22:00" className="glass-card border-2 border-border h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('admin.notifications.to')}</Label>
                  <Input type="time" defaultValue="08:00" className="glass-card border-2 border-border h-9 text-sm" />
                </div>
              </div>
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">{t('admin.notifications.weekendDays')}</p>
                <Switch />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('admin.notifications.weekendDaysDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
