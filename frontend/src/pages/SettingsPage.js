import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, User, Key, ArrowLeft, Check, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [pin, setPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const { api, user, logout, updateUserLanguage } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();
  const navigate = useNavigate();

  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang);
    try {
      await updateUserLanguage(newLang);
      toast.success(t('success'));
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  const handleUpdatePin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      toast.error('PIN must be 4-6 digits');
      return;
    }

    setIsUpdatingPin(true);
    try {
      await api.patch(`/settings/pin?pin=${pin}`);
      toast.success(t('success'));
      setPin('');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-[Manrope]">{t('settings')}</h1>
            <p className="text-muted-foreground">{t('profile')}</p>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {t('profile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold">{user?.name}</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <p className="text-sm text-primary capitalize">{user?.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t('language')}
              </CardTitle>
              <CardDescription>
                {t('choose_language')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full" data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        {lang.nativeName}
                        <span className="text-muted-foreground text-xs">
                          ({lang.name})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* PIN Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                {t('change_pin')}
              </CardTitle>
              <CardDescription>
                Set a 4-6 digit PIN for quick login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('pin')}</Label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 4-6 digits"
                  maxLength={6}
                  data-testid="pin-input"
                />
              </div>
              <Button
                onClick={handleUpdatePin}
                disabled={isUpdatingPin || pin.length < 4}
                data-testid="update-pin-btn"
              >
                {isUpdatingPin ? 'Updating...' : t('save')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
