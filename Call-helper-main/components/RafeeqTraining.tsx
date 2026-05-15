import { useState, useEffect } from 'react';
import { Lightbulb, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, MessageSquare, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import type { TrainingEntry, TrainingFormData } from '../types';
import {
  listTrainingEntries,
  createTrainingEntry,
  updateTrainingEntry,
  deleteTrainingEntry,
  reviewTrainingEntry,
} from '../services/trainingEntriesService';
import { useAuth } from '../contexts/AuthContext';
import { isPrivilegedStaff } from '../utils/appRoles';
import { isGranularCreateEnabled } from '../utils/uiVisibility';
import { cn } from './ui/utils';
import { formatAppDate } from '../utils/dateDisplay';
import {
  stripTrainingAttachmentFooter,
} from '../utils/trainingScenarioAttachment';

function trainingScenarioDisplayText(entry: TrainingEntry): string {
  return stripTrainingAttachmentFooter(entry.scenario);
}

function trainingAttachmentAbsoluteUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

function TrainingAttachmentLink({ entry }: { entry: TrainingEntry }) {
  const raw = entry.attachmentUrl?.trim();
  if (!raw) return null;
  const href = trainingAttachmentAbsoluteUrl(raw);
  const label = (entry.attachmentOriginalName || '').trim() || 'فتح المرفق التوضيحي';
  return (
    <p className="mt-2 text-right">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={e => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <Paperclip className="size-3.5 shrink-0" aria-hidden />
        {label}
      </a>
    </p>
  );
}

/** خلفية غير شفافة داخل الـ Dialog حتى لا تذوب مع الثيم أو الطبقات الخلفية */
const TRAINING_DIALOG_PANEL =
  'max-h-[min(90vh,40rem)] overflow-y-auto shadow-2xl outline-none !border-2 !border-zinc-300 !bg-white !text-zinc-950 dark:!border-zinc-600 dark:!bg-zinc-950 dark:!text-zinc-50';

export function RafeeqTraining() {
  const { user } = useAuth();
  const canReview = isPrivilegedStaff(user?.role);
  const canAddTrainingExample = isGranularCreateEnabled(user, 'action_training_example_create');
  const canEditEntry = (e: TrainingEntry) =>
    canReview || (!!e.submitterUserId && !!user?.id && e.submitterUserId === user.id);

  // ========================
  // State Management
  // ========================
  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TrainingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TrainingEntry | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Form state
  const [formData, setFormData] = useState<TrainingFormData>({
    scenario: '',
    correctResponse: '',
    alternativeResponses: [],
    category: '',
  });

  // ========================
  // Data Fetching
  // ========================
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const rows = await listTrainingEntries();
      setEntries(rows);
    } catch (error) {
      console.error('Error loading training entries:', error);
      setEntries([]);
      toast.error(error instanceof Error ? error.message : 'تعذّر تحميل أمثلة التدريب');
    } finally {
      setIsLoading(false);
    }
  };

  // ========================
  // Filtering
  // ========================
  useEffect(() => {
    let filtered = [...entries];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(entry => entry.status === selectedStatus);
    }

    setFilteredEntries(filtered);
  }, [entries, selectedStatus]);

  // ========================
  // CRUD Operations
  // ========================
  const handleCreateEntry = async () => {
    try {
      await createTrainingEntry(formData);
      toast.success('تم إرسال المثال للمراجعة');
      setIsCreateDialogOpen(false);
      resetForm();
      await loadEntries();
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الإرسال');
    }
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;

    try {
      await updateTrainingEntry(selectedEntry.id, formData);
      toast.success('تم حفظ التعديلات');
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
      resetForm();
      await loadEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error(error instanceof Error ? error.message : 'فشل التحديث');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإدخال؟')) return;

    try {
      await deleteTrainingEntry(id);
      toast.success('تم الحذف');
      await loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الحذف');
    }
  };

  const handleReviewEntry = async (status: 'approved' | 'rejected') => {
    if (!selectedEntry) return;
    if (!canReview) {
      toast.error('لا تملك صلاحية المراجعة');
      return;
    }

    try {
      await reviewTrainingEntry(selectedEntry.id, status, reviewNotes);
      toast.success(status === 'approved' ? 'تمت الموافقة' : 'تم الرفض');
      setIsReviewDialogOpen(false);
      setSelectedEntry(null);
      setReviewNotes('');
      await loadEntries();
    } catch (error) {
      console.error('Error reviewing entry:', error);
      toast.error(error instanceof Error ? error.message : 'فشلت المراجعة');
    }
  };

  // ========================
  // Helper Functions
  // ========================
  const resetForm = () => {
    setFormData({
      scenario: '',
      correctResponse: '',
      alternativeResponses: [],
      category: '',
    });
  };

  const openEditDialog = (entry: TrainingEntry) => {
    setSelectedEntry(entry);
    setFormData({
      scenario: entry.scenario,
      correctResponse: entry.correctResponse,
      alternativeResponses: entry.alternativeResponses || [],
      category: entry.category,
    });
    setIsEditDialogOpen(true);
  };

  const openReviewDialog = (entry: TrainingEntry) => {
    setSelectedEntry(entry);
    setReviewNotes('');
    setIsReviewDialogOpen(true);
  };

  const getStatusBadge = (status: TrainingEntry['status']) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const labels = {
      pending: 'قيد المراجعة',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getStatusIcon = (status: TrainingEntry['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="size-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="size-5 text-red-500" />;
      default:
        return <Clock className="size-5 text-yellow-500" />;
    }
  };

  // ========================
  // Render
  // ========================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Lightbulb className="size-8 text-primary" />
          </div>
          <h1 className="text-foreground">وش تعلم رفيق؟</h1>
        </div>
        {canAddTrainingExample ? (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="size-4 ml-2" />
            إضافة مثال تدريبي
          </Button>
        ) : null}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} dir="rtl">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
              <TabsTrigger value="approved">موافق عليه</TabsTrigger>
              <TabsTrigger value="rejected">مرفوض</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Training Entries */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Lightbulb className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد إدخالات تدريبية</p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map(entry => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(entry.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-right">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {getStatusBadge(entry.status)}
                          <Badge variant="outline">{entry.category}</Badge>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Scenario */}
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="size-4 text-blue-600 dark:text-blue-400" />
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">السيناريو:</p>
                            </div>
                            <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                              {trainingScenarioDisplayText(entry)}
                            </p>
                            <TrainingAttachmentLink entry={entry} />
                          </div>

                          {/* Correct Response */}
                          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                            <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">الرد الصحيح:</p>
                            <p className="text-sm text-green-800 dark:text-green-200">{entry.correctResponse}</p>
                          </div>

                          {/* Alternative Responses */}
                          {entry.alternativeResponses && entry.alternativeResponses.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-950/20 p-4 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">ردود بديلة:</p>
                              <ul className="space-y-2">
                                {entry.alternativeResponses.map((alt, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 pr-4">
                                    • {alt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Review Notes */}
                          {entry.notes && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                              <p className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-2">ملاحظات المراجعة:</p>
                              <p className="text-sm text-amber-800 dark:text-amber-200">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {entry.status === 'pending' && canReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewDialog(entry)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            مراجعة
                          </Button>
                        )}
                        {canEditEntry(entry) && (
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(entry)}>
                            <Edit className="size-4" />
                          </Button>
                        )}
                        {canEditEntry(entry) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>بواسطة: {entry.submittedBy}</span>
                      <span>•</span>
                      <span>{formatAppDate(entry.submittedAt)}</span>
                      {entry.reviewedBy && (
                        <>
                          <span>•</span>
                          <span>تمت المراجعة بواسطة: {entry.reviewedBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className={cn('max-w-3xl', TRAINING_DIALOG_PANEL)} dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إضافة مثال تدريبي جديد</DialogTitle>
            <DialogDescription className="text-right">
              ساعد في تحسين رفيق من خلال إضافة أمثلة واقعية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario" className="text-right block">السيناريو</Label>
              <Textarea
                id="scenario"
                value={formData.scenario}
                onChange={e => setFormData({ ...formData, scenario: e.target.value })}
                className="text-right min-h-[80px]"
                placeholder="مثال: عميل يشتكي من عدم وصول رسالة التأكيد..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct-response" className="text-right block">الرد الصحيح</Label>
              <Textarea
                id="correct-response"
                value={formData.correctResponse}
                onChange={e => setFormData({ ...formData, correctResponse: e.target.value })}
                className="text-right min-h-[100px]"
                placeholder="الرد المثالي على هذا السيناريو..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternatives" className="text-right block">ردود بديلة (كل رد في سطر)</Label>
              <Textarea
                id="alternatives"
                value={formData.alternativeResponses.join('\n')}
                onChange={e => setFormData({ 
                  ...formData, 
                  alternativeResponses: e.target.value.split('\n').filter(r => r.trim()) 
                })}
                className="text-right min-h-[80px]"
                placeholder="ردود بديلة مقبولة..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-right block">الفئة</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="text-right"
                placeholder="مثال: خدمة عملاء، تقني..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateEntry} className="bg-blue-600 hover:bg-blue-700">
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn('max-w-3xl', TRAINING_DIALOG_PANEL)} dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل المثال التدريبي</DialogTitle>
            <DialogDescription className="text-right">
              تعديل بيانات المثال التدريبي
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-scenario" className="text-right block">السيناريو</Label>
              <Textarea
                id="edit-scenario"
                value={formData.scenario}
                onChange={e => setFormData({ ...formData, scenario: e.target.value })}
                className="text-right min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-response" className="text-right block">الرد الصحيح</Label>
              <Textarea
                id="edit-response"
                value={formData.correctResponse}
                onChange={e => setFormData({ ...formData, correctResponse: e.target.value })}
                className="text-right min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="text-right block">الفئة</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-alternatives" className="text-right block">ردود بديلة</Label>
              <Textarea
                id="edit-alternatives"
                value={formData.alternativeResponses.join('\n')}
                onChange={e => setFormData({ 
                  ...formData, 
                  alternativeResponses: e.target.value.split('\n').filter(r => r.trim()) 
                })}
                className="text-right min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateEntry} className="bg-blue-600 hover:bg-blue-700">
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className={cn('max-w-2xl', TRAINING_DIALOG_PANEL)} dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">مراجعة المثال التدريبي</DialogTitle>
            <DialogDescription className="text-right">
              راجع المثال ووافق عليه أو ارفضه
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">السيناريو:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {trainingScenarioDisplayText(selectedEntry)}
                  </p>
                  <TrainingAttachmentLink entry={selectedEntry} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">الرد الصحيح:</p>
                  <p className="text-sm text-muted-foreground">{selectedEntry.correctResponse}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-notes" className="text-right block">ملاحظات المراجعة</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="text-right min-h-[100px]"
                  placeholder="أضف ملاحظاتك هنا..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => handleReviewEntry('rejected')} 
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="size-4 ml-2" />
              رفض
            </Button>
            <Button 
              onClick={() => handleReviewEntry('approved')} 
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="size-4 ml-2" />
              موافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}