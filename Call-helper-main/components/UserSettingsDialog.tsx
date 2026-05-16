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
import { useI18nLayout } from '../hooks/useI18nLayout';
import { toast } from 'sonner';

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const { user, updateUserAvatar, updateUserPassword } = useAuth();
  const { t } = useI18nLayout();
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
      toast.error(t('userSettings.imageTooLarge'));
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('userSettings.invalidImage'));
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateUserAvatar(base64String);
      toast.success(t('userSettings.avatarUpdated'));
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
      toast.error(t('userSettings.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('userSettings.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('userSettings.passwordMinLength'));
      return;
    }

    if (oldPassword === newPassword) {
      toast.error(t('userSettings.passwordSame'));
      return;
    }

    // Update password
    const success = await updateUserPassword(oldPassword, newPassword);

    if (success) {
      toast.success(t('userSettings.passwordChanged'));
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
    } else {
      toast.error(t('userSettings.wrongPassword'));
    }
  };

  const handleRemoveAvatar = () => {
    updateUserAvatar(undefined as any);
    toast.success(t('userSettings.avatarRemoved'));
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
          <DialogTitle className="text-2xl font-bold text-foreground">{t('userSettings.title')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('userSettings.description')}
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
                      <AvatarFallback className="bg-primary text-white">
                        <User className="size-9" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground text-white rounded-full hover:from-primary hover:to-primary transition-all shadow-lg"
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
                  <h3 className="text-base font-bold text-foreground mb-1">{t('userSettings.avatar')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('userSettings.avatarHint')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
                  >
                    <Upload className="size-3.5 ml-2" />
                    {t('userSettings.uploadPhoto')}
                  </Button>
                  {user.avatar && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveAvatar}
                    >
                      <X className="size-3.5 ml-2" />
                      {t('userSettings.removePhoto')}
                    </Button>
                  )}
                </div>

                <div className="pt-3 border-t border-border space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('userSettings.name')}:</span>
                    <span className="text-xs font-medium text-foreground">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('userSettings.email')}:</span>
                    <span className="text-xs font-medium text-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('userSettings.username')}:</span>
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
                <h3 className="text-base font-bold text-foreground mb-1">{t('userSettings.changePassword')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('userSettings.changePasswordHint')}
                </p>
              </div>
              {!isChangingPassword && (
                <Button
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
                >
                  <Lock className="size-3.5 ml-2" />
                  {t('userSettings.change')}
                </Button>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="old-password" className="text-foreground text-xs">
                    {t('userSettings.currentPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="old-password"
                      type={showPasswords.old ? 'text' : 'password'}
                      placeholder={t('userSettings.currentPasswordPlaceholder')}
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
                    {t('userSettings.newPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder={t('userSettings.newPasswordPlaceholder')}
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
                    {t('userSettings.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder={t('userSettings.confirmPasswordPlaceholder')}
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
                    className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
                  >
                    <Check className="size-3.5 ml-2" />
                    {t('userSettings.save')}
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
                    {t('actions.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="glass-card border border-primary/20 dark:border-cyan-800 bg-primary-soft/50 dark:bg-primary-soft/20 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <Lock className="size-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground text-sm mb-1">{t('userSettings.securityTips')}</h4>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• {t('userSettings.tipStrong')}</li>
                  <li>• {t('userSettings.tipShare')}</li>
                  <li>• {t('userSettings.tipRotate')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}