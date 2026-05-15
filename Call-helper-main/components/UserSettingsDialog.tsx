import { useState, useRef } from 'react';
import { User, Lock, Upload, Camera, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const { user, updateUserAvatar, updateUserPassword } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ====================================================================
  // Handle Avatar Upload
  // ====================================================================
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة صالحة');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateUserAvatar(base64String);
      toast.success('تم تحديث الصورة الشخصية بنجاح');
    };
    reader.readAsDataURL(file);
  };

  // ====================================================================
  // Handle Password Change
  // ====================================================================
  const handlePasswordChange = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (oldPassword === newPassword) {
      toast.error('كلمة المرور الجديدة يجب أن تكون مختلفة');
      return;
    }

    // Update password
    const success = await updateUserPassword(oldPassword, newPassword);

    if (success) {
      toast.success('تم تغيير كلمة المرور بنجاح');
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
    } else {
      toast.error('كلمة المرور الحالية غير صحيحة');
    }
  };

  const handleRemoveAvatar = () => {
    updateUserAvatar(undefined as any);
    toast.success('تم حذف الصورة الشخصية');
  };

  // Reset password form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsChangingPassword(false);
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswords({
        old: false,
        new: false,
        confirm: false,
      });
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-panel border-2 border-border sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">إعدادات الحساب</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            قم بإدارة إعدادات حسابك الشخصي
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="glass-card border border-border p-5 rounded-xl">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0">
                <div className="relative">
                  <Avatar className="size-20 ring-4 ring-primary/20">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                        <User className="size-9" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
                  >
                    <Camera className="size-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">الصورة الشخصية</h3>
                  <p className="text-xs text-muted-foreground">
                    قم برفع صورة شخصية بحجم لا يتجاوز 2 ميجابايت
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    <Upload className="size-3.5 ml-2" />
                    تحميل صورة
                  </Button>
                  {user.avatar && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveAvatar}
                    >
                      <X className="size-3.5 ml-2" />
                      حذف
                    </Button>
                  )}
                </div>

                <div className="pt-3 border-t border-border space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">الاسم:</span>
                    <span className="text-xs font-medium text-foreground">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">البريد الإلكتروني:</span>
                    <span className="text-xs font-medium text-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">اسم المستخدم:</span>
                    <span className="text-xs font-medium text-foreground">@{user.username}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="glass-card border border-border p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">تغيير كلمة المرور</h3>
                <p className="text-xs text-muted-foreground">
                  قم بتحديث كلمة المرور الخاصة بك
                </p>
              </div>
              {!isChangingPassword && (
                <Button
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  <Lock className="size-3.5 ml-2" />
                  تغيير
                </Button>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="old-password" className="text-foreground text-xs">
                    كلمة المرور الحالية
                  </Label>
                  <div className="relative">
                    <Input
                      id="old-password"
                      type={showPasswords.old ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور الحالية"
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                      }
                      className="glass-card border border-border pl-9 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.old ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-foreground text-xs">
                    كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور الجديدة"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="glass-card border border-border pl-9 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-foreground text-xs">
                    تأكيد كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="glass-card border border-border pl-9 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handlePasswordChange}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    <Check className="size-3.5 ml-2" />
                    حفظ التغييرات
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                  >
                    <X className="size-3.5 ml-2" />
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="glass-card border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <Lock className="size-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground text-sm mb-1">نصائح الأمان</h4>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</li>
                  <li>• لا تشارك كلمة المرور مع أي شخص</li>
                  <li>• قم بتغيير كلمة المرور بشكل دوري</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}