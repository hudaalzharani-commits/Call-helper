import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Wrench, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { OperationalUpdate, UpdateFormData } from '../types';
import {
  listOperationalUpdates,
  createOperationalUpdate,
  updateOperationalUpdate,
  deleteOperationalUpdate,
} from '../services/operationalUpdatesService';
import { useAuth } from '../contexts/AuthContext';
import { cn } from './ui/utils';
import { formatAppDate, formatAppDateTime } from '../utils/dateDisplay';

/** تباين أوضح داخل الـ Dialog (مثل نافذة «لماذا تظهر هنا؟») حتى لا يذوب النص في خلفية الثيم */
const OPERATIONAL_DIALOG_PANEL =
  'max-h-[min(90vh,40rem)] overflow-y-auto shadow-2xl outline-none !border-2 !border-zinc-300 !bg-white !text-zinc-950 dark:!border-zinc-600 dark:!bg-zinc-950 dark:!text-zinc-50';

const OP_UPDATE_TYPE_AR: Record<OperationalUpdate['type'], string> = {
  maintenance: 'صيانة',
  incident: 'حادثة',
  enhancement: 'تحسين',
  announcement: 'إعلان',
};

const OP_UPDATE_STATUS_AR: Record<OperationalUpdate['status'], string> = {
  scheduled: 'مجدول',
  ongoing: 'جاري التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

const OP_UPDATE_PRIORITY_AR: Record<OperationalUpdate['priority'], string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

export function OperationalUpdates() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'moderator';

  // ========================
  // State Management
  // ========================
  const [updates, setUpdates] = useState<OperationalUpdate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<OperationalUpdate | null>(null);

  // Form state
  const [formData, setFormData] = useState<UpdateFormData>({
    title: '',
    description: '',
    type: 'announcement',
    priority: 'medium',
    status: 'scheduled',
    startDate: new Date(),
    affectedServices: [],
  });

  // ========================
  // Data Fetching
  // ========================
  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    setIsLoading(true);
    try {
      const rows = await listOperationalUpdates();
      setUpdates(rows);
    } catch (error) {
      console.error('Error loading updates:', error);
      setUpdates([]);
      toast.error(error instanceof Error ? error.message : 'تعذّر تحميل التحديثات التشغيلية');
    } finally {
      setIsLoading(false);
    }
  };

  // ========================
  // CRUD Operations
  // ========================
  const handleCreateUpdate = async () => {
    if (!canManage) {
      toast.error('لا تملك صلاحية إضافة تحديث تشغيلي');
      return;
    }
    try {
      await createOperationalUpdate(formData);
      toast.success('تم إنشاء التحديث');
      setIsCreateDialogOpen(false);
      resetForm();
      await loadUpdates();
    } catch (error) {
      console.error('Error creating update:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الإنشاء');
    }
  };

  const handleUpdateUpdate = async () => {
    if (!selectedUpdate) return;
    if (!canManage) {
      toast.error('لا تملك صلاحية التعديل');
      return;
    }

    try {
      await updateOperationalUpdate(selectedUpdate.id, { ...formData, endDate: formData.endDate ?? null });
      toast.success('تم حفظ التعديلات');
      setIsEditDialogOpen(false);
      setSelectedUpdate(null);
      resetForm();
      await loadUpdates();
    } catch (error) {
      console.error('Error updating update:', error);
      toast.error(error instanceof Error ? error.message : 'فشل التحديث');
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!canManage) {
      toast.error('لا تملك صلاحية الحذف');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا التحديث؟')) return;

    try {
      await deleteOperationalUpdate(id);
      toast.success('تم الحذف');
      await loadUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الحذف');
    }
  };

  // ========================
  // Helper Functions
  // ========================
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'announcement',
      priority: 'medium',
      status: 'scheduled',
      startDate: new Date(),
      affectedServices: [],
    });
  };

  const openEditDialog = (update: OperationalUpdate) => {
    setSelectedUpdate(update);
    setFormData({
      title: update.title,
      description: update.description,
      type: update.type,
      priority: update.priority,
      status: update.status,
      startDate: update.startDate,
      endDate: update.endDate,
      affectedServices: update.affectedServices,
    });
    setIsEditDialogOpen(true);
  };

  const getTypeIcon = (type: OperationalUpdate['type']) => {
    switch (type) {
      case 'maintenance':
        return <Wrench className="size-5 text-blue-600" />;
      case 'incident':
        return <AlertTriangle className="size-5 text-red-600" />;
      case 'enhancement':
        return <CheckCircle className="size-5 text-green-600" />;
      default:
        return <RefreshCw className="size-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: OperationalUpdate['status']) => {
    const variants = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ongoing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };

    const labels = {
      scheduled: 'مجدول',
      ongoing: 'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغى',
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeBadge = (type: OperationalUpdate['type']) => {
    const labels = {
      maintenance: 'صيانة',
      incident: 'حادثة',
      enhancement: 'تحسين',
      announcement: 'إعلان',
    };

    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  const getPriorityBadge = (priority: OperationalUpdate['priority']) => {
    const variants = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };

    const labels = {
      high: 'عالية',
      medium: 'متوسطة',
      low: 'منخفضة',
    };

    return (
      <Badge className={variants[priority]}>
        {labels[priority]}
      </Badge>
    );
  };

  const filteredUpdates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return updates;
    return updates.filter(u => {
      const blob = [
        u.title,
        u.description,
        u.createdBy,
        u.type,
        u.status,
        u.priority,
        OP_UPDATE_TYPE_AR[u.type],
        OP_UPDATE_STATUS_AR[u.status],
        OP_UPDATE_PRIORITY_AR[u.priority],
        ...(u.affectedServices ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [updates, searchQuery]);

  // ========================
  // Render
  // ========================
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <RefreshCw className="size-8 text-primary" />
          </div>
          <h1 className="text-foreground">التحديثات التشغيلية</h1>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="shrink-0 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="size-4 ml-2" />
            تحديث جديد
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث… (عنوان، وصف، نوع، حالة، خدمات…)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10 text-right"
              aria-label="بحث في التحديثات التشغيلية"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" dir="rtl">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-4 py-3 text-right text-sm font-semibold">العنوان</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">الأولوية</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">تاريخ البدء</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الخدمات المتأثرة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">المنشئ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-background">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <p className="text-muted-foreground">جاري التحميل...</p>
                  </td>
                </tr>
              ) : updates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <RefreshCw className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <p className="text-muted-foreground">لا توجد تحديثات</p>
                  </td>
                </tr>
              ) : filteredUpdates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <Search className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <p className="mb-3 text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                      مسح البحث
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredUpdates.map((update, index) => (
                  <tr
                    key={update.id}
                    className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
                  >
                    <td className="max-w-[min(28rem,40vw)] px-4 py-3 align-top text-right">
                      <div className="line-clamp-2 font-medium text-foreground">{update.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{update.description}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="shrink-0">{getTypeIcon(update.type)}</span>
                        {getTypeBadge(update.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">{getStatusBadge(update.status)}</td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">{getPriorityBadge(update.priority)}</td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <span className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                        {formatAppDateTime(update.startDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      {update.endDate ? (
                        <span className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                          {formatAppDateTime(update.endDate)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {(update.affectedServices ?? []).length > 0 ? (
                          update.affectedServices.map((service, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <span className="line-clamp-2 text-sm text-foreground">{update.createdBy}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatAppDate(update.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {canManage ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => openEditDialog(update)}
                          >
                            <Edit className="size-3 ml-1" />
                            تعديل
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-destructive"
                            onClick={() => handleDeleteUpdate(update.id)}
                          >
                            <Trash2 className="size-3 ml-1" />
                            حذف
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className={cn('max-w-2xl', OPERATIONAL_DIALOG_PANEL)} dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl text-zinc-950 dark:text-zinc-50">
              تحديث تشغيلي جديد
            </DialogTitle>
            <DialogDescription className="text-right text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
              أضف تحديثاً تشغيلياً جديداً
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-base leading-relaxed [&_label]:font-medium [&_label]:text-zinc-800 dark:[&_label]:text-zinc-200">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-right block">العنوان</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="text-right"
                placeholder="عنوان التحديث..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-right block">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="text-right min-h-[100px]"
                placeholder="وصف تفصيلي..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">النوع</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="incident">حادثة</SelectItem>
                    <SelectItem value="enhancement">تحسين</SelectItem>
                    <SelectItem value="announcement">إعلان</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-right block">الأولوية</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">الحالة</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: OperationalUpdate['status']) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="scheduled">مجدول</SelectItem>
                    <SelectItem value="ongoing">جاري التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date-create" className="text-right block">
                  تاريخ الانتهاء (اختياري)
                </Label>
                <Input
                  id="end-date-create"
                  type="datetime-local"
                  className="text-right"
                  value={
                    formData.endDate
                      ? new Date(formData.endDate.getTime() - formData.endDate.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={e => {
                    const v = e.target.value;
                    setFormData({ ...formData, endDate: v ? new Date(v) : undefined });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="services" className="text-right block">الخدمات المتأثرة (مفصولة بفواصل)</Label>
              <Input
                id="services"
                value={formData.affectedServices.join(', ')}
                onChange={e => setFormData({ ...formData, affectedServices: e.target.value.split(/[،,]/).map(s => s.trim()) })}
                className="text-right"
                placeholder="مثال: نظام الحجز, البوابة الإلكترونية"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateUpdate} className="bg-blue-600 hover:bg-blue-700">
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn('max-w-2xl', OPERATIONAL_DIALOG_PANEL)} dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl text-zinc-950 dark:text-zinc-50">تعديل التحديث</DialogTitle>
            <DialogDescription className="text-right text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
              تعديل بيانات التحديث التشغيلي
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-base leading-relaxed [&_label]:font-medium [&_label]:text-zinc-800 dark:[&_label]:text-zinc-200">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-right block">العنوان</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-right block">الوصف</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="text-right min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">النوع</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="incident">حادثة</SelectItem>
                    <SelectItem value="enhancement">تحسين</SelectItem>
                    <SelectItem value="announcement">إعلان</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-right block">الأولوية</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">الحالة</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: OperationalUpdate['status']) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="scheduled">مجدول</SelectItem>
                    <SelectItem value="ongoing">جاري التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end" className="text-right block">
                  تاريخ الانتهاء (اختياري)
                </Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  className="text-right"
                  value={
                    formData.endDate
                      ? new Date(formData.endDate.getTime() - formData.endDate.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={e => {
                    const v = e.target.value;
                    setFormData({ ...formData, endDate: v ? new Date(v) : undefined });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-services" className="text-right block">
                الخدمات المتأثرة (مفصولة بفواصل)
              </Label>
              <Input
                id="edit-services"
                value={formData.affectedServices.join(', ')}
                onChange={e =>
                  setFormData({ ...formData, affectedServices: e.target.value.split(/[،,]/).map(s => s.trim()) })
                }
                className="text-right"
                placeholder="مثال: نظام الحجز, البوابة الإلكترونية"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateUpdate} className="bg-blue-600 hover:bg-blue-700">
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}