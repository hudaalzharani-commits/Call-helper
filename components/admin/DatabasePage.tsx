import { useState, useEffect, useMemo } from 'react';
import { Plus, Save, X, RefreshCw, Search, Archive } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { formatAppDateTime } from '../../utils/dateDisplay';

interface Case {
  _id: string;
  caseId: string;
  userType: string;
  accountStatus: string;
  category: string;
  subCategory: string;
  mainKeywords: string;
  extraKeywords: string;
  synonyms: string;
  negativeKeywords: string;
  responseText: string;
  why: string;
  fallbackText: string;
  notes: string;
  priority: string;
  updatedAt: string;
  isActive?: boolean;
  isArchived?: boolean;
  archivedAt?: string | null;
}

const USER_TYPE_OPTIONS = ['عمرة', 'حج'] as const;

const ACCOUNT_STATUS_OPTIONS: Record<string, string[]> = {
  عمرة: ['وكيل خارجي', 'شركة عمرة'],
  حج: ['مقدم خدمة سكن', 'مكتب شؤون', 'منظم تابع']
};

const USER_TYPE_CASE_PREFIX: Record<string, string> = {
  عمرة: 'UM',
  حج: 'HJ'
};

const SUBTYPE_CASE_CODE: Record<string, string> = {
  'وكيل خارجي': 'EA',
  'شركة عمرة': 'UC',
  'مقدم خدمة سكن': 'HP',
  'مكتب شؤون': 'AO',
  'منظم تابع': 'SO'
};

export function DatabasePage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    caseId: '',
    userType: '',
    accountStatus: '',
    category: '',
    subCategory: '',
    mainKeywords: '',
    extraKeywords: '',
    synonyms: '',
    negativeKeywords: '',
    responseText: '',
    why: '',
    fallbackText: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const getNextCaseId = (serviceType: string, userSubtype: string) => {
    const servicePrefix = USER_TYPE_CASE_PREFIX[serviceType];
    const subtypeCode = SUBTYPE_CASE_CODE[userSubtype];
    if (!servicePrefix || !subtypeCode) return '';

    const fullPrefix = `CH-${servicePrefix}-${subtypeCode}`;
    const pattern = new RegExp(`^${fullPrefix}-(\\d+)$`, 'i');
    let maxNumber = 0;

    cases.forEach((caseItem) => {
      const match = caseItem.caseId?.trim().match(pattern);
      if (!match) return;

      const numericPart = parseInt(match[1], 10);
      if (!Number.isNaN(numericPart)) {
        maxNumber = Math.max(maxNumber, numericPart);
      }
    });

    return `${fullPrefix}-${String(maxNumber + 1).padStart(3, '0')}`;
  };

  // Toggle active/inactive
  const handleActiveToggle = async (id: string, nextIsActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/cases/${id}/active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update case status');
      }

      setCases((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isActive: nextIsActive } : item
        )
      );

      toast.success(nextIsActive ? 'تم تفعيل الحالة' : 'تم تعطيل الحالة');
    } catch (error: any) {
      console.error('Error updating case active status:', error);
      toast.error(error.message || 'فشل في تحديث حالة التفعيل');
    }
  };

  // Fetch cases from database
  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/cases?archived=false&includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      setCases(data.data || []);

      const usageResponse = await fetch('http://localhost:5000/api/cases/usage-counts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        const usageMap: Record<string, number> = {};
        (usageData.data || []).forEach((entry: { caseDbId: string; usageCount: number }) => {
          usageMap[entry.caseDbId] = entry.usageCount;
        });
        setUsageCounts(usageMap);
      } else {
        setUsageCounts({});
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('فشل في تحميل الحالات');
      setUsageCounts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (!showAddForm || !!editingCase) {
      return;
    }

    if (!formData.userType) {
      setFormData((prev) => {
        if (!prev.caseId && !prev.accountStatus) return prev;
        return {
          ...prev,
          caseId: '',
          accountStatus: ''
        };
      });
      return;
    }

    const allowedAccountStatuses = ACCOUNT_STATUS_OPTIONS[formData.userType] || [];
    const hasValidSubtype = allowedAccountStatuses.includes(formData.accountStatus);
    const generatedCaseId = hasValidSubtype
      ? getNextCaseId(formData.userType, formData.accountStatus)
      : '';

    setFormData((prev) => {
      const nextCaseId = generatedCaseId;
      const nextAccountStatus = allowedAccountStatuses.includes(prev.accountStatus)
        ? prev.accountStatus
        : '';

      if (prev.caseId === nextCaseId && prev.accountStatus === nextAccountStatus) {
        return prev;
      }

      return {
        ...prev,
        caseId: nextCaseId,
        accountStatus: nextAccountStatus
      };
    });
  }, [showAddForm, editingCase, formData.userType, formData.accountStatus, cases]);

  // Reset form
  const resetForm = () => {
    setFormData({
      caseId: '',
      userType: '',
      accountStatus: '',
      category: '',
      subCategory: '',
      mainKeywords: '',
      extraKeywords: '',
      synonyms: '',
      negativeKeywords: '',
      responseText: '',
      why: '',
      fallbackText: '',
      notes: ''
    });
    setErrors({});
    setShowAddForm(false);
    setEditingCase(null);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

;

    if (!formData.caseId.trim()) {
      newErrors.caseId = 'CaseID is required';
    }

    if (!formData.userType.trim()) {
      newErrors.userType = 'Service Type is required';
    }

    if (!formData.accountStatus.trim()) {
      newErrors.accountStatus = 'UserType is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.mainKeywords.trim()) {
      newErrors.mainKeywords = 'MainKeywords is required';
    }

    if (!formData.responseText.trim()) {
      newErrors.responseText = 'ResponseText is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add new case
  const handleAddCase = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/cases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create case');
      }

      toast.success('تم إضافة الحالة بنجاح');
      resetForm();
      fetchCases();
    } catch (error: any) {
      console.error('Error adding case:', error);
      toast.error(error.message || 'فشل في إضافة الحالة');
    }
  };

  // Edit case
  const handleEditClick = (caseItem: Case) => {
    setEditingCase(caseItem);
    setFormData({
      caseId: caseItem.caseId,
      userType: caseItem.userType,
      accountStatus: caseItem.accountStatus,
      category: caseItem.category,
      subCategory: caseItem.subCategory,
      mainKeywords: caseItem.mainKeywords,
      extraKeywords: caseItem.extraKeywords || '',
      synonyms: caseItem.synonyms || '',
      negativeKeywords: caseItem.negativeKeywords || '',
      responseText: caseItem.responseText || '',
      why: caseItem.why || '',
      fallbackText: caseItem.fallbackText || '',
      notes: caseItem.notes || ''
    });
    setShowAddForm(true);
  };

  // Update case
  const handleUpdateCase = async () => {
    if (!validateForm() || !editingCase) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/cases/${editingCase._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update case');
      }

      toast.success('تم تحديث الحالة بنجاح');
      resetForm();
      fetchCases();
    } catch (error: any) {
      console.error('Error updating case:', error);
      toast.error(error.message || 'فشل في تحديث الحالة');
    }
  };

  // Delete case
  const handleDeleteCase = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this case?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/cases/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete case');
      }

      toast.success('تم حذف الحالة بنجاح');
      fetchCases();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast.error('فشل في حذف الحالة');
    }
  };

  const handleArchiveCase = async (id: string, caseId: string) => {
    if (
      !window.confirm(
        `أرشفة الحالة «${caseId}»؟ ستختفي من القائمة الرئيسية ويمكن إعادتها من صفحة الأرشيف.`
      )
    ) {
      return;
    }

    setArchivingId(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/cases/${id}/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.message === 'string' ? body.message : 'فشل أرشفة الحالة');
      }

      if (editingCase?._id === id) {
        resetForm();
      }

      toast.success('تمت أرشفة الحالة');
      fetchCases();
    } catch (error: unknown) {
      console.error('Error archiving case:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في أرشفة الحالة');
    } finally {
      setArchivingId(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => formatAppDateTime(dateString);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(c => {
      const haystack = [
        c.caseId,
        c.userType,
        c.accountStatus,
        c.category,
        c.subCategory,
        c.mainKeywords,
        c.extraKeywords,
        c.synonyms,
        c.negativeKeywords,
        c.responseText,
        c.why,
        c.fallbackText,
        c.notes,
        c.priority,
        c.isActive !== false ? 'active true' : 'inactive false',
      ]
        .map(x => String(x ?? '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [cases, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showAddForm) {
    const accountStatusOptions = ACCOUNT_STATUS_OPTIONS[formData.userType] || [];
    const hasLegacyUserTypeValue = !!formData.userType && !USER_TYPE_OPTIONS.includes(formData.userType as typeof USER_TYPE_OPTIONS[number]);
    const hasLegacyAccountStatusValue = !!formData.accountStatus && !accountStatusOptions.includes(formData.accountStatus);
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            {editingCase ? 'Edit Case' : 'Add New Case'}
          </h2>
          <Button
            onClick={resetForm}
            variant="ghost"
            className="p-2"
          >
            <X className="size-5" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* UserType */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.userType ? 'border-red-500' : 'border-border'
              }`}
            >
              <option value="">اختر نوع المستخدم</option>
              {USER_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
              {hasLegacyUserTypeValue && (
                <option value={formData.userType}>{formData.userType}</option>
              )}
            </select>
            {errors.userType && (
              <p className="text-xs text-red-500 mt-1">{errors.userType}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">نوع الخدمة الأساسية (عمرة أو حج)</p>
          </div>

          {/* AccountStatus */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              UserType <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.accountStatus}
              onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.accountStatus ? 'border-red-500' : 'border-border'
              }`}
              disabled={!formData.userType}
            >
              <option value="">
                {formData.userType ? 'اختر نوع المستخدم' : 'اختر Service Type أولاً'}
              </option>
              {accountStatusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
              {hasLegacyAccountStatusValue && (
                <option value={formData.accountStatus}>{formData.accountStatus}</option>
              )}
            </select>
            {errors.accountStatus && (
              <p className="text-xs text-red-500 mt-1">{errors.accountStatus}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.userType === 'عمرة'
                ? 'خيارات عمرة: وكيل خارجي أو شركة عمرة'
                : formData.userType === 'حج'
                  ? 'خيارات حج: مقدم خدمة سكن أو مكتب شؤون أو منظم تابع'
                  : 'الفئة التفصيلية تعتمد على Service Type'}
            </p>
          </div>

          {/* CaseID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              CaseID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={
                formData.accountStatus
                  ? `CH-${USER_TYPE_CASE_PREFIX[formData.userType] || 'UM'}-${SUBTYPE_CASE_CODE[formData.accountStatus] || 'EA'}-001`
                  : formData.userType === 'حج'
                    ? 'CH-HJ-HP-001'
                    : 'CH-UM-EA-001'
              }
              value={formData.caseId}
              onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.caseId ? 'border-red-500' : 'border-border'
              }`}
              disabled={!!editingCase}
              readOnly={!editingCase}
            />
            {errors.caseId && (
              <p className="text-xs text-red-500 mt-1">{errors.caseId}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated unique ID based on Service Type + UserType (e.g., CH-UM-EA-001 / CH-HJ-HP-001)
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., تحديث البيانات"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.category ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.category && (
              <p className="text-xs text-red-500 mt-1">{errors.category}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Main category of the issue</p>
          </div>

          {/* SubCategory */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              SubCategory
            </label>
            <input
              type="text"
              placeholder="e.g., تحديث بيانات المحموعي"
              value={formData.subCategory}
              onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* MainKeywords */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              MainKeywords <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Comma-separated keywords, e.g., كيف, اقدر, اغير, etc."
              value={formData.mainKeywords}
              onChange={(e) => setFormData({ ...formData, mainKeywords: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${
                errors.mainKeywords ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.mainKeywords && (
              <p className="text-xs text-red-500 mt-1">{errors.mainKeywords}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Primary keywords for matching (comma-separated). These get +2 points each.
            </p>
          </div>

          {/* ExtraKeywords */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              ExtraKeywords
            </label>
            <textarea
              placeholder="Additional keywords for matching"
              value={formData.extraKeywords}
              onChange={(e) => setFormData({ ...formData, extraKeywords: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supplementary keywords to enhance matching accuracy
            </p>
          </div>

          {/* Synonyms */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Synonyms
            </label>
            <textarea
              placeholder="Alternative words with similar meanings"
              value={formData.synonyms}
              onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Synonym words that mean the same thing
            </p>
          </div>

          {/* NegativeKeywords */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              NegativeKeywords
            </label>
            <textarea
              placeholder="Keywords to exclude from matching"
              value={formData.negativeKeywords}
              onChange={(e) => setFormData({ ...formData, negativeKeywords: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Keywords that should NOT trigger this case
            </p>
          </div>

          {/* ResponseText */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              ResponseText <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="The response text to provide to the user"
              value={formData.responseText}
              onChange={(e) => setFormData({ ...formData, responseText: e.target.value })}
              rows={5}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${
                errors.responseText ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.responseText && (
              <p className="text-xs text-red-500 mt-1">{errors.responseText}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Main response text for this case
            </p>
          </div>

          {/* Why */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Why
            </label>
            <textarea
              placeholder="Explanation or reasoning for this case"
              value={formData.why}
              onChange={(e) => setFormData({ ...formData, why: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Reasoning or explanation for this response
            </p>
          </div>

          {/* FallbackText */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              FallbackText
            </label>
            <textarea
              placeholder="Alternative text if primary response fails"
              value={formData.fallbackText}
              onChange={(e) => setFormData({ ...formData, fallbackText: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fallback response if the primary one doesn't work
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              placeholder="Additional notes or comments about this case"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Internal notes for reference
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={resetForm}
              variant="outline"
              className="border-2"
            >
              <X className="size-4 ml-2" />
              Cancel
            </Button>
            <Button
              onClick={editingCase ? handleUpdateCase : handleAddCase}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Save className="size-4 ml-2" />
              {editingCase ? 'Update Case' : 'Add Case'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-3xl font-bold text-foreground">Cases Management</h2>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:min-w-[min(100%,24rem)]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث في قاعدة البيانات (CaseID، كلمات، تصنيف…)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10 text-right"
              aria-label="بحث في الحالات"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={fetchCases} variant="outline" className="border-2">
              <RefreshCw className="size-4 ml-2" />
              تحديث البيانات
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Plus className="size-4 ml-2" />
              Add New Case
            </Button>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <Card className="glass-panel border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="text-right px-6 py-3 text-sm font-semibold">CaseID</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Used</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Service Type</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">UserType</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Category</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">SubCategory</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Active</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Last Updated</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-background">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Plus className="size-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No cases found. Add your first case!</p>
                      <Button
                        onClick={() => setShowAddForm(true)}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                      >
                        <Plus className="size-4 ml-2" />
                        Add New Case
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="size-12 text-muted-foreground" />
                      <p className="text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                        مسح البحث
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((caseItem, index) => (
                  <tr
                    key={caseItem._id}
                    className={`border-b border-border ${
                      index % 2 === 0 ? 'bg-muted/30' : 'bg-background'
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-medium text-foreground">{caseItem.caseId}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-semibold text-primary">{usageCounts[caseItem._id] ?? 0}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-foreground">{caseItem.userType}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-foreground">{caseItem.accountStatus}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-foreground">{caseItem.category}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-foreground">{caseItem.subCategory}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div
                        className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-2 py-1 transition-colors hover:bg-accent/40"
                        title="Click switch to toggle case status"
                      >
                        <Switch
                          checked={caseItem.isActive !== false}
                          onCheckedChange={(checked) => handleActiveToggle(caseItem._id, checked)}
                          className="cursor-pointer shadow-sm data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-400 dark:data-[state=unchecked]:bg-gray-600"
                        />
                        <span className={`text-xs font-medium ${caseItem.isActive !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {caseItem.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">{formatDate(caseItem.updatedAt)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={archivingId === caseItem._id}
                          onClick={() => handleEditClick(caseItem)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          disabled={archivingId === caseItem._id}
                          onClick={() => handleArchiveCase(caseItem._id, caseItem.caseId)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 gap-1"
                          title="أرشفة الحالة"
                        >
                          <Archive className="size-3.5 shrink-0" />
                          Archive
                        </Button>
                        <Button
                          size="sm"
                          disabled={archivingId === caseItem._id}
                          onClick={() => handleDeleteCase(caseItem._id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer */}
      <p className="text-sm text-muted-foreground">
        {searchQuery.trim()
          ? `عرض ${filteredCases.length} من ${cases.length} حالة`
          : `Total cases: ${cases.length}`}
      </p>
    </div>
  );
}
