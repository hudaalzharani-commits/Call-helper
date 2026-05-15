import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Eye, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface CallLog {
  _id: string;
  customerName: string;
  entityType: string;
  problemType: string;
  problemSummary: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    username: string;
  };
}

export function DatabasePage() {
  const { user } = useAuth();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  // Fetch call logs from database
  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/calls/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch call logs');
      }

      const data = await response.json();
      setCallLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      toast.error('فشل في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, []);

  // Delete call log
  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/calls/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('تم حذف السجل بنجاح');
      fetchCallLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('فشل في حذف السجل');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'escalated':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="size-8 animate-spin text-primary" />
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
                    key={caseItem.id}
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
                      <span className="text-sm text-muted-foreground">{caseItem.lastUpdated}</span>
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
                          onClick={() => handleDeleteCase(caseItem.id)}
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
