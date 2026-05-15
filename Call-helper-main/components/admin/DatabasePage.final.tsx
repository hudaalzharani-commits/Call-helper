import { useState, useEffect } from 'react';
import { Plus, Save, X, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { toast } from 'sonner';

interface Case {
  _id: string;
  caseId: string;
  userType: string;
  accountStatus: string;
  category: string;
  subCategory: string;
  mainKeywords: string;
  priority: string;
  updatedAt: string;
}

export function DatabasePage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    caseId: '',
    userType: '',
    accountStatus: '',
    category: '',
    subCategory: '',
    mainKeywords: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Fetch cases from database
  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/cases', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      setCases(data.data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('فشل في تحميل الحالات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      caseId: '',
      userType: '',
      accountStatus: '',
      category: '',
      subCategory: '',
      mainKeywords: ''
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
      newErrors.userType = 'UserType is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.mainKeywords.trim()) {
      newErrors.mainKeywords = 'MainKeywords is required';
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
      mainKeywords: caseItem.mainKeywords
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showAddForm) {
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
          {/* CaseID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              CaseID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., CH-UM-004"
              value={formData.caseId}
              onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.caseId ? 'border-red-500' : 'border-border'
              }`}
              disabled={!!editingCase}
            />
            {errors.caseId && (
              <p className="text-xs text-red-500 mt-1">{errors.caseId}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Unique identifier for this case</p>
          </div>

          {/* UserType */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              UserType <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., شركة صغيرة"
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.userType ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.userType && (
              <p className="text-xs text-red-500 mt-1">{errors.userType}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Type of user this case applies to</p>
          </div>

          {/* AccountStatus */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              AccountStatus
            </label>
            <input
              type="text"
              placeholder="e.g., نشط"
              value={formData.accountStatus}
              onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Cases Management</h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchCases}
            variant="outline"
            className="border-2"
          >
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

      {/* Cases Table */}
      <Card className="glass-panel border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="text-right px-6 py-3 text-sm font-semibold">CaseID</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">UserType</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Account Status</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Category</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">SubCategory</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Priority</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Last Updated</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-background">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
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
              ) : (
                cases.map((caseItem, index) => (
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
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        {caseItem.priority}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">{formatDate(caseItem.updatedAt)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditClick(caseItem)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
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
        Total cases: {cases.length}
      </p>
    </div>
  );
}
