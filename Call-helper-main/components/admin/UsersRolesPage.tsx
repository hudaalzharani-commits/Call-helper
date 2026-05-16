import { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, UserPlus, Shield, Edit, Trash2, Search, X, Check, AlertCircle, Key, Eye, EyeOff, Headphones, UserCog, LayoutDashboard, PlusCircle } from 'lucide-react';
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
import { formatAppDateShort } from '../../utils/dateDisplay';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  setAdminUserPassword,
  type ApiAdminUser,
} from '../../services/usersAdminService';
import {
  APP_ROLES,
  ROLE_LABEL_AR,
  effectivePermAdminPanel,
  effectivePermContentCreate,
  type AppRole,
} from '../../utils/appRoles';
import { buildVisibilityDraft, UI_SURFACE_DEFINITIONS, GRANULAR_CREATE_DEFINITIONS } from '../../utils/uiVisibility';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: AppRole;
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  joinDate: string;
  avatar?: string;
  permAdminPanel?: boolean;
  permContentCreate?: boolean;
  uiVisibility?: Record<string, boolean>;
  password?: string;
}

function normalizeRole(r: string): AppRole {
  if (r === 'admin' || r === 'user' || r === 'moderator' || r === 'customer_service') return r;
  return 'user';
}

function mapApiUserToRow(u: ApiAdminUser): User {
  const rawStatus = u.accountStatus || (u.isActive ? 'active' : 'inactive');
  const status: User['status'] =
    rawStatus === 'suspended' || rawStatus === 'inactive' || rawStatus === 'active'
      ? rawStatus
      : 'inactive';
  return {
    id: u._id,
    name: u.name || '',
    email: u.email || '',
    username: u.username,
    role: normalizeRole(u.role),
    status,
    lastActive: u.lastLogin ? formatAppDateShort(u.lastLogin) : '—',
    joinDate: u.createdAt ? formatAppDateShort(u.createdAt) : '—',
    avatar: u.avatar || undefined,
    permAdminPanel: typeof u.permAdminPanel === 'boolean' ? u.permAdminPanel : undefined,
    permContentCreate: typeof u.permContentCreate === 'boolean' ? u.permContentCreate : undefined,
    uiVisibility:
      u.uiVisibility && typeof u.uiVisibility === 'object' && !Array.isArray(u.uiVisibility)
        ? { ...(u.uiVisibility as Record<string, boolean>) }
        : undefined,
    password: '',
  };
}

function OnOffToggle({
  value,
  onChange,
  disabled,
  ariaLabelledby,
  compact,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabelledby?: string;
  /** أصغر للصفوف في الجدول */
  compact?: boolean;
}) {
  const btn = compact ? 'h-7 min-w-[2.25rem] px-1.5 text-[10px]' : 'h-8 min-w-[2.75rem] px-2 text-xs';
  return (
    <div
      className="inline-flex items-center gap-0.5 shrink-0 rounded-md border border-border/70 bg-background/80 p-0.5 shadow-sm"
      dir="ltr"
      role="group"
      aria-labelledby={ariaLabelledby}
    >
      <Button
        type="button"
        size="sm"
        variant={value ? 'default' : 'ghost'}
        disabled={disabled}
        className={`font-bold ${btn} ${
          value
            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
            : 'text-muted-foreground'
        }`}
        onClick={() => !disabled && onChange(true)}
        aria-pressed={value}
      >
        ON
      </Button>
      <Button
        type="button"
        size="sm"
        variant={!value ? 'destructive' : 'ghost'}
        disabled={disabled}
        className={`font-bold ${btn} ${!value ? '' : 'text-muted-foreground'}`}
        onClick={() => !disabled && onChange(false)}
        aria-pressed={!value}
      >
        OFF
      </Button>
    </div>
  );
}

export function UsersRolesPage() {
  const { user: currentSession, refreshCurrentUser } = useAuth();
  
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
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [permissionsDialogUser, setPermissionsDialogUser] = useState<User | null>(null);
  const [permDialogDraft, setPermDialogDraft] = useState<{
    permAdminPanel: boolean;
    permContentCreate: boolean;
    uiVisibility: Record<string, boolean>;
  } | null>(null);
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

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [permSavingId, setPermSavingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const rows = await fetchAdminUsers();
      setUsers(rows.map(mapApiUserToRow));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'فشل تحميل المستخدمين من الخادم');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    const plainUsers = users.filter(u => u.role === 'user').length;
    const customerServiceStaff = users.filter(u => u.role === 'customer_service').length;
    const moderators = users.filter(u => u.role === 'moderator').length;
    const admins = users.filter(u => u.role === 'admin').length;

    return { totalUsers, activeUsers, plainUsers, customerServiceStaff, moderators, admins };
  }, [users]);

  // ====================================================================
  // Handler Functions
  // ====================================================================
  
  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.username) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const defaultPassword = 'password123';

    try {
      await createAdminUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        role: formData.role,
        status: formData.status,
        password: defaultPassword,
      });
      setShowAddDialog(false);
      resetForm();
      toast.success(`تم إضافة المستخدم بنجاح. كلمة المرور الافتراضية: ${defaultPassword}`);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل إضافة المستخدم');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.name || !formData.email || !formData.username) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      await updateAdminUser(selectedUser.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        role: formData.role,
        status: formData.status,
        ...(formData.role === 'admin'
          ? {
              permAdminPanel: !!formData.permAdminPanel,
              permContentCreate: !!formData.permContentCreate,
            }
          : formData.role === 'moderator'
            ? { permAdminPanel: false, permContentCreate: !!formData.permContentCreate }
            : { permAdminPanel: false, permContentCreate: false }),
        uiVisibility: formData.uiVisibility ?? buildVisibilityDraft(selectedUser.uiVisibility),
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
      toast.success('تم تحديث المستخدم بنجاح');
      await loadUsers();
      if (currentSession?.id === selectedUser.id) await refreshCurrentUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل تحديث المستخدم');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteAdminUser(selectedUser.id);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast.success('تم حذف المستخدم بنجاح');
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل حذف المستخدم');
    }
  };

  const handleChangePassword = async () => {
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

    try {
      await setAdminUserPassword(selectedUser.id, newPassword);
      toast.success(`تم تغيير كلمة مرور ${selectedUser.name} بنجاح`);
      setShowChangePasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل تغيير كلمة المرور');
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
      permAdminPanel: effectivePermAdminPanel(user),
      permContentCreate: effectivePermContentCreate(user),
      uiVisibility: buildVisibilityDraft(user.uiVisibility),
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

  const openPermissionsDialog = (u: User) => {
    if (u.role === 'admin') return;
    setPermissionsDialogUser(u);
    setPermDialogDraft({
      permAdminPanel: effectivePermAdminPanel(u),
      permContentCreate: effectivePermContentCreate(u),
      uiVisibility: buildVisibilityDraft(u.uiVisibility) as Record<string, boolean>,
    });
    setShowPermissionsDialog(true);
  };

  const handleSavePermissionsDialog = async () => {
    if (!permissionsDialogUser || !permDialogDraft) return;
    const u = permissionsDialogUser;
    setPermSavingId(u.id);
    try {
      const permPatch =
        u.role === 'admin'
          ? {
              permAdminPanel: permDialogDraft.permAdminPanel,
              permContentCreate: permDialogDraft.permContentCreate,
            }
          : u.role === 'moderator'
            ? { permAdminPanel: false, permContentCreate: permDialogDraft.permContentCreate }
            : { permAdminPanel: false, permContentCreate: false };

      await updateAdminUser(u.id, {
        ...permPatch,
        uiVisibility: permDialogDraft.uiVisibility,
      });
      toast.success('تم حفظ الصلاحيات');
      setShowPermissionsDialog(false);
      setPermissionsDialogUser(null);
      setPermDialogDraft(null);
      await loadUsers();
      if (currentSession?.id === u.id) await refreshCurrentUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل حفظ الصلاحيات');
    } finally {
      setPermSavingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      role: 'user',
      status: 'active',
      avatar: undefined,
      permAdminPanel: undefined,
      permContentCreate: undefined,
      uiVisibility: undefined,
    });
  };

  // ====================================================================
  // Helper Functions
  // ====================================================================
  
  const getRoleBadge = (role: AppRole) => {
    const colors: Record<AppRole, string> = {
      admin:
        'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
      user: 'bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900',
      customer_service:
        'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-900',
      moderator:
        'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    };
    return (
      <Badge className={`${colors[role] || colors.user} border text-[10px] font-semibold px-1.5 py-0 h-5 leading-none`}>
        {ROLE_LABEL_AR[role]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { label: 'نشط', color: 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900' },
      'inactive': { label: 'غير نشط', color: 'bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900' },
      'suspended': { label: 'موقوف', color: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' },
    };
    const variant = variants[status as keyof typeof variants] || variants.inactive;
    return (
      <Badge className={`${variant.color} border text-[10px] font-semibold px-1.5 py-0 h-5 leading-none`}>
        {variant.label}
      </Badge>
    );
  };

  // ====================================================================
  // Render
  // ====================================================================
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-primary/25 dark:from-violet-500/15 dark:to-indigo-600/15"
            title="الصلاحيات"
            aria-hidden
          >
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0">إدارة المستخدمين والصلاحيات</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-stretch gap-1.5 sm:justify-end">
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground text-xs sm:text-sm"
          >
            <UserPlus className="size-3.5 ml-1.5 sm:size-4 sm:ml-2 shrink-0" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      {/* Statistics — من بيانات الخادم */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="glass-panel border border-border p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-md shrink-0">
              <Users className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{statistics.totalUsers}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">إجمالي</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border border-border p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-md shrink-0">
              <Users className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{statistics.activeUsers}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">نشط</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border border-border p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-slate-500 to-zinc-600 rounded-md shrink-0">
              <Users className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{statistics.plainUsers}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">عادي</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border border-border p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-md shrink-0">
              <Headphones className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{statistics.customerServiceStaff}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">خدمة عملاء</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border border-border p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md shrink-0">
              <UserCog className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{statistics.moderators}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">مشرفون</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border border-border p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md shrink-0">
              <Shield className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{statistics.admins}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">مسؤولون</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-panel border border-border p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input 
                placeholder="ابحث..." 
                className="glass-card border border-border pr-9 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="glass-card border border-border w-full sm:w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-roles">جميع الأدوار</SelectItem>
              {APP_ROLES.map(r => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL_AR[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-card border border-border w-full sm:w-[130px] h-9 text-xs">
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
      <Card className="glass-panel border border-border p-2 sm:p-3 overflow-hidden">
        <Table className="min-w-[620px] text-xs">
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold">المستخدم</TableHead>
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold">المعرّف</TableHead>
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold max-w-[140px]">البريد</TableHead>
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold">الدور</TableHead>
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold">الحالة</TableHead>
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold">آخر نشاط</TableHead>
                <TableHead className="text-right text-foreground h-8 py-1.5 text-[11px] font-semibold min-w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    جاري تحميل المستخدمين من الخادم...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-border hover:bg-muted/40">
                    <TableCell className="py-1.5 px-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-7 shrink-0">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-primary text-white text-[10px] p-0">
                              <Users className="size-3.5" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[160px]">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px] py-1.5 px-2">@{user.username}</TableCell>
                    <TableCell className="text-muted-foreground py-1.5 px-2 max-w-[140px]">
                      <span className="truncate block" title={user.email}>
                        {user.email}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 px-2">{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="py-1.5 px-2">{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-[10px] py-1.5 px-2 max-w-[100px] whitespace-normal">
                      <span className="line-clamp-2 whitespace-normal leading-tight" title={user.lastActive}>
                        {user.lastActive}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 px-1">
                      <div className="flex flex-nowrap items-center justify-end gap-0.5 shrink-0">
                        {user.role !== 'admin' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-1.5 gap-1 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 shrink-0"
                            onClick={() => openPermissionsDialog(user)}
                            title="الصلاحيات وظهور الصفحات"
                          >
                            <Shield className="size-3.5 shrink-0" />
                            <span className="hidden xl:inline text-[10px] font-semibold">صلاحيات</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-primary hover:text-primary/80"
                          onClick={() => openEditDialog(user)}
                          title="تعديل"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-orange-500 hover:text-orange-600"
                          onClick={() => openChangePasswordDialog(user)}
                          title="تغيير كلمة المرور"
                        >
                          <Key className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500 hover:text-red-600 disabled:opacity-40"
                          onClick={() => openDeleteDialog(user)}
                          title="حذف"
                          disabled={currentSession?.id === user.id}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

        {/* Pagination Info */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/80">
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            عرض {filteredUsers.length} من {users.length} مستخدم
          </p>
        </div>
      </Card>

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
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-card border-2 border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-role" className="text-foreground">الدور</Label>
              <Select value={formData.role} onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="add-role" className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL_AR[r]}
                    </SelectItem>
                  ))}
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

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
            >
              <X className="size-3.5 ml-1.5" />
              إلغاء
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
              onClick={handleAddUser}
            >
              <Check className="size-3.5 ml-1.5" />
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPermissionsDialog}
        onOpenChange={(open) => {
          setShowPermissionsDialog(open);
          if (!open) {
            setPermissionsDialogUser(null);
            setPermDialogDraft(null);
          }
        }}
      >
        <DialogContent className="glass-panel border border-border gap-3 p-4 sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          {permissionsDialogUser && permDialogDraft && (
            <>
              <DialogHeader className="text-right sm:text-right space-y-2">
                <DialogTitle className="text-foreground flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <Shield className="size-6 text-primary shrink-0" aria-hidden />
                  صلاحيات المستخدم
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {permissionsDialogUser.name} — @{permissionsDialogUser.username}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1" dir="rtl">
                {(permissionsDialogUser.role === 'moderator' ||
                  permissionsDialogUser.role === 'customer_service') && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 max-h-52 overflow-y-auto space-y-2">
                    <div className="flex flex-row-reverse items-center justify-end gap-2 font-semibold text-sm text-foreground border-b border-border/50 pb-2 mb-1">
                      <PlusCircle className="size-4 text-primary shrink-0" aria-hidden />
                      <span>أزرار إضافة المحتوى</span>
                    </div>
                    <div className="space-y-2">
                      {GRANULAR_CREATE_DEFINITIONS.map(({ key, label }) => (
                        <div key={key} className="flex justify-between items-center gap-2">
                          <Label
                            id={`perm-dlg-create-label-${key}`}
                            className="text-xs text-muted-foreground flex-1 text-right leading-snug cursor-pointer"
                          >
                            {label}
                          </Label>
                          <OnOffToggle
                            value={permDialogDraft.uiVisibility[key] !== false}
                            disabled={permSavingId === permissionsDialogUser.id}
                            onChange={(c) =>
                              setPermDialogDraft((d) => {
                                if (!d) return null;
                                return {
                                  ...d,
                                  uiVisibility: {
                                    ...buildVisibilityDraft(d.uiVisibility),
                                    [key]: c,
                                  },
                                };
                              })
                            }
                            ariaLabelledby={`perm-dlg-create-label-${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20 p-3 max-h-44 overflow-y-auto space-y-2">
                  <div className="flex flex-row-reverse items-center justify-end gap-2 font-semibold text-sm text-foreground border-b border-border/50 pb-2 mb-1">
                    <LayoutDashboard className="size-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
                    <span>ظهور الصفحات والتبويبات</span>
                  </div>
                  <div className="space-y-2">
                    {UI_SURFACE_DEFINITIONS.map(({ key, label }) => (
                      <div key={key} className="flex justify-between items-center gap-2">
                        <Label
                          id={`perm-dlg-surf-label-${key}`}
                          className="text-xs text-muted-foreground flex-1 text-right leading-snug cursor-pointer"
                        >
                          {label}
                        </Label>
                        <OnOffToggle
                          value={permDialogDraft.uiVisibility[key] !== false}
                          disabled={permSavingId === permissionsDialogUser.id}
                          onChange={(c) =>
                            setPermDialogDraft((d) => {
                              if (!d) return null;
                              return {
                                ...d,
                                uiVisibility: {
                                  ...buildVisibilityDraft(d.uiVisibility),
                                  [key]: c,
                                },
                              };
                            })
                          }
                          ariaLabelledby={`perm-dlg-surf-label-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowPermissionsDialog(false)}
                >
                  <X className="size-3.5 ml-1.5" />
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
                  onClick={handleSavePermissionsDialog}
                  disabled={permSavingId === permissionsDialogUser.id}
                >
                  <Check className="size-3.5 ml-1.5" />
                  {permSavingId === permissionsDialogUser.id ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ====================================================================
          Edit User Dialog
          ==================================================================== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass-panel border-2 border-border sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-right sm:text-right space-y-2">
            <DialogTitle className="text-foreground flex flex-row-reverse items-center justify-end gap-2 text-right">
              <Shield className="size-5 text-primary shrink-0" aria-hidden />
              تعديل بيانات المستخدم
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              {selectedUser?.role === 'admin'
                ? 'تعديل الاسم وبيانات الدخول والدور والحالة. مسؤول النظام يمتلك الصلاحيات الكاملة ولا يحتاج ضبط صلاحيات منفصل.'
                : 'تعديل الاسم وبيانات الدخول والدور والحالة. للمشرف وموظف خدمة العملاء: أزرار إضافة المحتوى وظهور الصفحات من زر «صلاحيات» في عمود الإجراءات.'}
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
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-card border-2 border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-foreground">الدور</Label>
              <Select
                value={formData.role}
                onValueChange={(value: AppRole) =>
                  setFormData((prev) => {
                    const role = value;
                    if (role === 'admin') {
                      return {
                        ...prev,
                        role,
                        permAdminPanel: prev.role === 'admin' ? !!prev.permAdminPanel : true,
                        permContentCreate:
                          prev.role === 'admin' || prev.role === 'moderator'
                            ? !!prev.permContentCreate
                            : true,
                      };
                    }
                    if (role === 'moderator') {
                      return {
                        ...prev,
                        role,
                        permAdminPanel: false,
                        permContentCreate:
                          prev.role === 'moderator' || prev.role === 'admin'
                            ? !!prev.permContentCreate
                            : true,
                      };
                    }
                    return { ...prev, role, permAdminPanel: false, permContentCreate: false };
                  })
                }
              >
                <SelectTrigger id="edit-role" className="glass-card border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL_AR[r]}
                    </SelectItem>
                  ))}
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

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
                resetForm();
              }}
            >
              <X className="size-3.5 ml-1.5" />
              إلغاء
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
              onClick={handleEditUser}
            >
              <Check className="size-3.5 ml-1.5" />
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
                      <AvatarFallback className="bg-primary text-white">
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

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowChangePasswordDialog(false);
                setSelectedUser(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              <X className="size-3.5 ml-1.5" />
              إلغاء
            </Button>
            <Button
              size="sm"
              className="h-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              onClick={handleChangePassword}
            >
              <Check className="size-3.5 ml-1.5" />
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
                      <AvatarFallback className="bg-primary text-white">
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
              
              {(selectedUser && currentSession?.id === selectedUser.id) && (
                <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    لا يمكن حذف حسابك أثناء تسجيل الدخول الحالي. استخدم حساب مسؤول آخر إن وُجد.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
              }}
            >
              <X className="size-3.5 ml-1.5" />
              إلغاء
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              onClick={handleDeleteUser}
              disabled={!selectedUser || currentSession?.id === selectedUser?.id}
            >
              <Trash2 className="size-3.5 ml-1.5" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}