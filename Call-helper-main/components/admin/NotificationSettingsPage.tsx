import { Bell, Mail, MessageSquare, Smartphone, Save, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

export function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <Alert
        dir="rtl"
        role="status"
        className="border-amber-500/50 bg-amber-50/90 text-amber-950 dark:bg-amber-950/35 dark:text-amber-50 dark:border-amber-400/45 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
      >
        <AlertTriangle className="size-4 shrink-0" />
        <AlertTitle className="text-amber-950 dark:text-amber-50">
          تنبيه: صفحة إعدادات الإشعارات لا تعمل حالياً
        </AlertTitle>
        <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
          الواجهة للعرض التجريبي فقط؛ التغييرات لا تُحفظ ولا تُربَط بالخادم حتى يتم تفعيلها لاحقاً.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Notification Settings</h2>
          <p className="text-muted-foreground">إدارة التنبيهات والإشعارات</p>
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
            إشعارات البريد الإلكتروني
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تسجيل دخول جديد</p>
                <p className="text-xs text-muted-foreground">إشعار عند تسجيل دخول من جهاز جديد</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">المشاكل الجديدة</p>
                <p className="text-xs text-muted-foreground">إشعار عند إضافة مشكلة جديدة</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تحديثات النظام</p>
                <p className="text-xs text-muted-foreground">إشعار عند توفر تحديثات</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">التقارير الأسبوعية</p>
                <p className="text-xs text-muted-foreground">ملخص أسبوعي للنشاطات</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تنبيهات الأمان</p>
                <p className="text-xs text-muted-foreground">إشعار فوري بالمشاكل الأمنية</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Push Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            الإشعارات الفورية
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تفعيل الإشعارات الفورية</p>
                <p className="text-xs text-muted-foreground">السماح بالإشعارات في المتصفح</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">الأحداث المهمة</p>
                <p className="text-xs text-muted-foreground">إشعار بالأحداث عالية الأولوية</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تعيين المهام</p>
                <p className="text-xs text-muted-foreground">إشعار عند تعيين مهمة جديدة</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">الردود والتعليقات</p>
                <p className="text-xs text-muted-foreground">إشعار بالردود على مشاركاتك</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">الإشارات</p>
                <p className="text-xs text-muted-foreground">إشعار عند الإشارة إليك</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* SMS Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            إشعارات الرسائل القصيرة
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">رقم الهاتف</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+966 5X XXX XXXX" 
                className="glass-card border-2 border-border"
              />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تفعيل الرسائل القصيرة</p>
                <p className="text-xs text-muted-foreground">استقبال إشعارات SMS</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">حالات الطوارئ فقط</p>
                <p className="text-xs text-muted-foreground">إرسال SMS للأحداث الحرجة</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">رموز التحقق</p>
                <p className="text-xs text-muted-foreground">إرسال OTP عبر SMS</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* In-App Notifications */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            إشعارات داخل التطبيق
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">إظهار الإشعارات</p>
                <p className="text-xs text-muted-foreground">عرض إشعارات في واجهة التطبيق</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">الأصوات</p>
                <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول إشعار</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">شارة الأعداد</p>
                <p className="text-xs text-muted-foreground">عرض عدد الإشعارات غير المقروءة</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">الإشعارات المنبثقة</p>
                <p className="text-xs text-muted-foreground">نوافذ منبثقة للإشعارات العاجلة</p>
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
              <Label htmlFor="email-subject" className="text-foreground">موضوع البريد</Label>
              <Input 
                id="email-subject" 
                defaultValue="[رفيق] لديك إشعار جديد" 
                className="glass-card border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-body" className="text-foreground">نص البريد</Label>
              <Textarea 
                id="email-body" 
                rows={6}
                defaultValue="مرحباً {{name}},&#10;&#10;لديك إشعار جديد في نظام رفيق.&#10;&#10;{{notification_message}}&#10;&#10;مع تحياتنا،&#10;فريق رفيق"
                className="glass-card border-2 border-border font-mono text-sm"
              />
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <p className="text-sm text-foreground mb-2 font-medium">المتغيرات المتاحة:</p>
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
          <h3 className="text-lg font-bold text-foreground mb-4">جدولة الإشعارات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">وضع عدم الإزعاج</p>
                <Switch />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">من</Label>
                  <Input type="time" defaultValue="22:00" className="glass-card border-2 border-border h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">إلى</Label>
                  <Input type="time" defaultValue="08:00" className="glass-card border-2 border-border h-9 text-sm" />
                </div>
              </div>
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">أيام العطلة</p>
                <Switch />
              </div>
              <p className="text-xs text-muted-foreground">
                تعطيل الإشعارات غير العاجلة في عطلة نهاية الأسبوع
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
