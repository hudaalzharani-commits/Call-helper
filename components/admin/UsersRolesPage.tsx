import { useState, useMemo } from 'react';
import { Users, UserPlus, Shield, Edit, Trash2, Search, X, Check, AlertCircle, Key, Eye, EyeOff } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  joinDate: string;
  avatar?: string;
  password: string;
}

export function UsersRolesPage() {
  const { getAllUsers, addUser, updateUser, deleteUser, changeUserPassword } = useAuth();
  
  // ====================================================================
  // State Management
  // ====================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all-roles');
  const [statusFilter, setStatusFilter] = useState<string>('all-status');
  
  // Dialog States
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form States
  const [formData, setFormData] = useState<Omit<User, 'id' | 'lastActive' | 'joinDate' | 'password'>>({
    name: '',
    email: '',
    username: '',
    role: 'user',
    status: 'active',
  });

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get all users from AuthContext
  const users = getAllUsers();

  // ====================================================================
  // Computed Values
  // ====================================================================
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter
      const matchesRole = roleFilter === 'all-roles' || user.role === roleFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all-status' || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const statistics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const moderators = users.filter(u => u.role === 'moderator').length;
    
    return { totalUsers, activeUsers, admins, moderators };
  }, [users]);

  // ====================================================================
  // Handler Functions
  // ====================================================================
  
  const handleAddUser = () => {
    if (!formData.name || !formData.email || !formData.username) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    // Check if email already exists
    if (users.some(u => u.email === formData.email)) {
      toast.error('البريد الإلكتروني مستخدم بالفعل');
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username === formData.username)) {
      toast.error('اسم المستخدم مستخدم بالفعل');
      return;
    }
    
    // Default password for new users
    const defaultPassword = 'password123';
    
    addUser({
      ...formData,
      password: defaultPassword,
    });
    
    setShowAddDialog(false);
    resetForm();
    toast.success(`تم إضافة المستخدم بنجاح. كلمة المرور الافتراضية: ${defaultPassword}`);
  };

  const handleEditUser = () => {
    if (!selectedUser || !formData.name || !formData.email || !formData.username) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    // Check if email is used by another user
    if (users.some(u => u.email === formData.email && u.id !== selectedUser.id)) {
      toast.error('البريد الإلكتروني مستخدم بالفعل');
      return;
    }

    // Check if username is used by another user
    if (users.some(u => u.username === formData.username && u.id !== selectedUser.id)) {
      toast.error('اسم المستخدم مستخدم بالفعل');
      return;
    }
    
    const success = updateUser(selectedUser.id, formData);
    
    if (success) {
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
      toast.success('تم تحديث المستخدم بنجاح');
    } else {
      toast.error('فشل تحديث المستخدم');
    }
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    
    const success = deleteUser(selectedUser.id);
    
    if (success) {
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast.success('تم حذف المستخدم بنجاح');
    } else {
      toast.error('لا يمكن حذف الحسابات الرئيسية');
    }
  };

  const handleChangePassword = () => {
    if (!selectedUser) return;

    if (!newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    const success = changeUserPassword(selectedUser.id, newPassword);
    
    if (success) {
      toast.success(`تم تغيير كلمة مرور ${selectedUser.name} بنجاح`);
      setShowChangePasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error('فشل تغيير كلمة المرور');
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const openChangePasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePasswordDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      role: 'user',
      status: 'active',
    });
  };

  // ====================================================================
  // Helper Functions
  // ====================================================================
  
  const getRoleBadge = (role: string) => {
    const variants = {
      'admin': { 
        label: 'أدمن', 
        color: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
      },
      'moderator': { 
        label: 'مشرف', 
        color: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      },
      'user': { 
        label: 'مستخدم', 
        color: 'bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900',
      },
    };
    const variant = variants[role as keyof typeof variants] || variants.user;
    return <Badge className={`${variant.color} border`}>{variant.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { label: 'نشط', color: 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900' },
      'inactive': { label: 'غير نشط', color: 'bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900' },
      'suspended': { label: 'موقوف', color: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' },
    };
    const variant = variants[status as keyof typeof variants] || variants.inactive;
    return <Badge className={`${variant.color} border`}>{variant.label}</Badge>;
  };

  // ====================================================================
  // Render
  // ====================================================================
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">إدارة المستخدمين والصلاحيات</h2>
          <p className="text-muted-foreground">Users & Roles Management</p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
        >
          <UserPlus className="size-4 ml-2" />
          إضافة مستخدم جديد
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Users className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statistics.totalUsers}</p>
              <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <Users className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statistics.activeUsers}</p>
              <p className="text-xs text-muted-foreground">مستخدمين نشطين</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statistics.admins}</p>
              <p className="text-xs text-muted-foreground">أدمنز</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <Users className="size-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statistics.moderators}</p>
              <p className="text-xs text-muted-foreground">مشرفين</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-panel border-2 border-border p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن مستخدم..." 
                className="glass-card border-2 border-border pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="glass-card border-2 border-border w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-roles">جميع الأدوار</SelectItem>
              <SelectItem value="admin">أدمن</SelectItem>
              <SelectItem value="moderator">مشرف</SelectItem>
              <SelectItem value="user">مستخدم</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-card border-2 border-border w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">جميع الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
              <SelectItem value="suspended">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="glass-panel border-2 border-border p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-right text-foreground">المستخدم</TableHead>
                <TableHead className="text-right text-foreground">اسم المستخدم</TableHead>
                <TableHead className="text-right text-foreground">البريد الإلكتروني</TableHead>
                <TableHead className="text-right text-foreground">الدور</TableHead>
                <TableHead className="text-right text-foreground">الحالة</TableHead>
                <TableHead className="text-right text-foreground">آخر نشاط</TableHead>
                <TableHead className="text-right text-foreground">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-border hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs">
                              <Users className="size-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">@{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.lastActive}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary/80"
                          onClick={() => openEditDialog(user)}
                          title="تعديل"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-orange-500 hover:text-orange-600"
                          onClick={() => openChangePasswordDialog(user)}
                          title="تغيير كلمة المرور"
                        >
                          <Key className="size-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => openDeleteDialog(user)}
                          title="حذف"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            عرض {filteredUsers.length} من {users.length} مستخدم
          </p>
        </div>
      </Card>

      {/* Roles & Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-panel border-2 border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Shield className="size-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">أدمن</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            صلاحيات كاملة لإدارة النظام والمستخدمين
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              إدارة المستخدمين والصلاحيات
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              تغيير كلمات المرور
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              إعدادات النظام المتقدمة
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              جميع الصلاحيات الإدارية
            </li>
          </ul>
        </Card>

        <Card className="glass-panel border-2 border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <Users className="size-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">مشرف</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            صلاحيات محدودة للإشراف على المحتوى
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              إدارة المحتوى
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              الرد على المشاكل والاستفسارات
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              عرض التقارير والإحصائيات
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              تعديل إعدادات المسارات
            </li>
          </ul>
        </Card>

        <Card className="glass-panel border-2 border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-gray-500 to-slate-500 rounded-lg">
              <Users className="size-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">مستخدم</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            صلاحيات أساسية للاستخدام العادي
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              عرض المحتوى المتاح
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              استخدام مساعد المكالمات
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              عرض وتحديث الملف الشخصي
            </li>
          </ul>
        </Card>
      </div>

      {/* ====================================================================
          Add User Dialog
          ==================================================================== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass-panel border-2 border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">إضافة مستخدم جديد</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              أدخل بيانات المستخدم الجديد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name" className="text-foreground">الاسم الكامل</Label>
              <Input
                id="add-name"
                placeholder="أدخل الاسم الكامل"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="glass-card border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-username" className="text-foreground">اسم المستخدم</Label>
              <Input
                id="add-username"
                placeholder="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="glass-card border-2 border-border font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-email" className="text-foreground">البريد الإلكتروني</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="example@rafeeq.sa"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-card border-2 border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-role" className="text-foreground">الدور</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="add-role" className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="moderator">مشرف</SelectItem>
                  <SelectItem value="admin">أدمن</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-status" className="text-foreground">الحالة</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="add-status" className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
            >
              <X className="size-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleAddUser}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Check className="size-4 ml-2" />
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================================================
          Edit User Dialog
          ==================================================================== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass-panel border-2 border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              قم بتعديل بيانات المستخدم
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-foreground">الاسم الكامل</Label>
              <Input
                id="edit-name"
                placeholder="أدخل الاسم الكامل"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="glass-card border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-username" className="text-foreground">اسم المستخدم</Label>
              <Input
                id="edit-username"
                placeholder="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="glass-card border-2 border-border font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-foreground">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="example@rafeeq.sa"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-card border-2 border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-foreground">الدور</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="edit-role" className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="moderator">مشرف</SelectItem>
                  <SelectItem value="admin">أدمن</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-foreground">الحالة</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="edit-status" className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
                resetForm();
              }}
            >
              <X className="size-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleEditUser}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Check className="size-4 ml-2" />
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================================================
          Change Password Dialog (Admin Only)
          ==================================================================== */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="glass-panel border-2 border-border sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Key className="size-5 text-orange-500" />
              تغيير كلمة المرور
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              قم بتعيين كلمة مرور جديدة للمستخدم
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <Card className="glass-card border border-border p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    {selectedUser.avatar ? (
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                        <Users className="size-5" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-foreground">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-card border-2 border-border pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-foreground">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-card border-2 border-border pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg">
                <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  سيتم تغيير كلمة المرور دون علم المستخدم
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangePasswordDialog(false);
                setSelectedUser(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              <X className="size-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleChangePassword}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              <Check className="size-4 ml-2" />
              تغيير كلمة المرور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================================================
          Delete User Dialog
          ==================================================================== */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="glass-panel border-2 border-border sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="size-5 text-red-500" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              هل أنت متأكد من حذف المستخدم؟
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <Card className="glass-card border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="size-10">
                    {selectedUser.avatar ? (
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                        <Users className="size-5" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getRoleBadge(selectedUser.role)}
                  {getStatusBadge(selectedUser.status)}
                </div>
              </Card>
              
              {(selectedUser.email === 'admin@rafeeq.sa' || selectedUser.email === 'user@rafeeq.sa') && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    لا يمكن حذف الحسابات الرئيسية
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
              }}
            >
              <X className="size-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleDeleteUser}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="size-4 ml-2" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}