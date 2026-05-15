import { GraduationCap, Brain, TrendingUp, Save, RefreshCw, Zap, Target, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useState } from 'react';

export function LearnSettingsPage() {
  const [showLogSources, setShowLogSources] = useState(false);
  const [showPredictionSources, setShowPredictionSources] = useState(false);
  const [showRecommendationSources, setShowRecommendationSources] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Learn from User Settings</h2>
          <p className="text-muted-foreground">إعدادات التعلم الآلي والذكاء الاصطناعي</p>
          <p className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/35 rounded-lg px-3 py-2 max-w-2xl">
            هذه الصفحة لا تعمل حالياً — الواجهة للعرض فقط ولم يُربَط أي من الإعدادات أو الأزرار بالخادم بعد.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-2">
            <RefreshCw className="size-4 ml-2" />
            إعادة تدريب النموذج
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
            <Save className="size-4 ml-2" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Learning Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Brain className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">12,456</p>
              <p className="text-xs text-muted-foreground">تفاعلات المستخدمين</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <TrendingUp className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">94.2%</p>
              <p className="text-xs text-muted-foreground">دقة النموذج</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Target className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">8,923</p>
              <p className="text-xs text-muted-foreground">أنماط محفوظة</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">156</p>
              <p className="text-xs text-muted-foreground">تحسينات تلقائية</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Mode */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Brain className="size-5 text-primary" />
            منطق التعلم من سجلات النظام
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">التعلّم من Interaction Logs</p>
                <p className="text-xs text-muted-foreground">تحليل أداء الاستخدام</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">التعلّم من Feedback Logs</p>
                <p className="text-xs text-muted-foreground">تصحيحات وتقييمات الموظفين</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تحليل Error & Fallback Logs</p>
                <p className="text-xs text-muted-foreground">اكتشاف فجوات المعرفة</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-3">
              <Label className="text-foreground">Strategy</Label>
              <Select defaultValue="gradual">
                <SelectTrigger className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">استجابة سريعة للتكرار</SelectItem>
                  <SelectItem value="gradual">تعلّم تدريجي من اللوقز (افتراضي)</SelectItem>
                  <SelectItem value="monitor">مراقبة فقط بدون تعديل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Data Collection */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="size-5 text-primary" />
            مصادر اللوقز
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تسجيل تفاعلات المستخدم</p>
                <p className="text-xs text-muted-foreground">(Interaction Logs)</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تسجيل تصحيحات الموظف</p>
                <p className="text-xs text-muted-foreground">(Correction Logs)</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
              <div>
                <p className="text-foreground font-medium">تحليل أنماط المشاكل</p>
                <p className="text-xs text-muted-foreground">(Issue Pattern Logs)</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-3">
              <Label className="text-foreground">مدة الاحتفاظ باللوقز</Label>
              <Select defaultValue="90">
                <SelectTrigger className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 يوم</SelectItem>
                  <SelectItem value="90">90 يوم</SelectItem>
                  <SelectItem value="season">موسم كامل رمضان/الحج</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Model Parameters */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            معاملات التحليل
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">معدل التعلّم (Adaptation Speed)</Label>
                <span className="text-sm text-muted-foreground">0.01</span>
              </div>
              <Slider defaultValue={[1]} max={10} step={0.1} className="w-full" />
              <p className="text-xs text-muted-foreground">سرعة تكيّف النظام مع نتائج التحليل الجديدة من اللوقز</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">عتبة الثقة (Confidence Threshold)</Label>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <Slider defaultValue={[75]} max={100} step={1} className="w-full" />
              <p className="text-xs text-muted-foreground">الحد الأدنى لقبول اقتراح ناتج عن تحليل اللوقز</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">حجم دفعة التحليل (Analysis Batch Size)</Label>
                <span className="text-sm text-muted-foreground">32</span>
              </div>
              <Slider defaultValue={[32]} max={128} step={8} className="w-full" />
              <p className="text-xs text-muted-foreground">عدد سجلات اللوقز التي تُحلل في كل دورة تحليل</p>
            </div>
          </div>
        </Card>

        {/* Pattern Recognition */}
        <Card className="glass-panel border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            تحليل الأنماط من السجلات
          </h3>
          <div className="space-y-4">
            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-foreground font-medium">كشف الأنماط المتكررة</p>
                  <p className="text-xs text-muted-foreground">تحليل تكرار المشاكل اعتمادًا على:</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <button
                onClick={() => setShowLogSources(!showLogSources)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
              >
                {showLogSources ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                <span>{showLogSources ? 'إخفاء المصادر' : 'عرض المصادر'}</span>
              </button>
              
              {showLogSources && (
                <div className="mt-3 pr-4 space-y-1 border-r-2 border-primary/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-cyan-500" />
                    <span>Issue Pattern Logs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-blue-500" />
                    <span>Interaction Logs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-purple-500" />
                    <span>Error & Fallback Logs</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-foreground font-medium">التنبؤ بالمشاكل</p>
                  <p className="text-xs text-muted-foreground">استقراء المشاكل المحتملة بناءً على:</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <button
                onClick={() => setShowPredictionSources(!showPredictionSources)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
              >
                {showPredictionSources ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                <span>{showPredictionSources ? 'إخفاء المصادر' : 'عرض المصادر'}</span>
              </button>
              
              {showPredictionSources && (
                <div className="mt-3 pr-4 space-y-1 border-r-2 border-primary/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-emerald-500" />
                    <span>تاريخ اللوقز</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-amber-500" />
                    <span>تكرار السياق</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-rose-500" />
                    <span>نوع المشكلة</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-foreground font-medium">توصيات ذكية</p>
                  <p className="text-xs text-muted-foreground">اقتراح حلول بناءً على:</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <button
                onClick={() => setShowRecommendationSources(!showRecommendationSources)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
              >
                {showRecommendationSources ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                <span>{showRecommendationSources ? 'إخفاء المصادر' : 'عرض المصادر'}</span>
              </button>
              
              {showRecommendationSources && (
                <div className="mt-3 pr-4 space-y-1 border-r-2 border-primary/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-indigo-500" />
                    <span>حلول سابقة مشابهة</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-teal-500" />
                    <span>تحديثات معرفة</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-violet-500" />
                    <span>عناصر من الأرشيف (Archive Suggestions)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Training Schedule */}
        <Card className="glass-panel border-2 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4">جدولة التدريب</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">تدريب تلقائي يومي</p>
                <Switch defaultChecked />
              </div>
              <p className="text-xs text-muted-foreground mb-3">توليد اقتراحات تعلم يومية وإرسالها إلى Learning Review</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">الوقت:</Label>
                  <span className="text-sm text-foreground">03:00 ص</span>
                </div>
                <button className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group">
                  <Edit2 className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">مراجعة تعلم أسبوعية</p>
                <Switch defaultChecked />
              </div>
              <p className="text-xs text-muted-foreground mb-3">تحليل شامل للسجلات وتوليد اقتراحات استراتيجية للمراجعة</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">اليوم:</Label>
                  <span className="text-sm text-foreground">الأحد</span>
                </div>
                <button className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group">
                  <Edit2 className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>

            <div className="p-4 glass-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-medium">اقتراحات فورية</p>
                <Switch />
              </div>
              <p className="text-xs text-muted-foreground mb-3">إنشاء اقتراح فوري بعد كل تفاعل بدون تطبيق مباشر</p>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">الحالة:</Label>
                <span className="text-sm text-foreground">معطل</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Learning Insights */}
        <Card className="glass-panel border-2 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4">رؤى التعلم الأخيرة</h3>
          <div className="space-y-3">
            {[
              { insight: 'المستخدمون يفضلون الردود المختصرة بنسبة 78%', impact: 'عالي', color: 'green' },
              { insight: 'أنماط استخدام متزايدة في ساعات الصباح (8-11 ص)', impact: 'متوسط', color: 'blue' },
              { insight: 'تكرار نفس المشاكل من 5 مستخدمين - يحتاج تحديث قاعدة المعرفة', impact: 'عالي', color: 'amber' },
              { insight: 'تحسن دقة التنبؤ بنسبة 12% بعد آخر تدريب', impact: 'متوسط', color: 'purple' },
            ].map((item, index) => (
              <div key={index} className="p-4 glass-card rounded-xl border border-border flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  item.color === 'green' ? 'bg-green-100 dark:bg-green-950' :
                  item.color === 'blue' ? 'bg-blue-100 dark:bg-blue-950' :
                  item.color === 'amber' ? 'bg-amber-100 dark:bg-amber-950' :
                  'bg-purple-100 dark:bg-purple-950'
                }`}>
                  <Brain className={`size-4 ${
                    item.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    item.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    item.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                    'text-purple-600 dark:text-purple-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-foreground text-sm">{item.insight}</p>
                  <p className="text-xs text-muted-foreground mt-1">التأثير: {item.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}