import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, QrCode, History, Settings, 
  Clock, Users, LogOut, Tv
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

export function AppLayout({ children }) {
  const { user, logout, isHR } = useAuth();
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const employeeNavItems = [
    { icon: LayoutDashboard, label: t('home'), path: '/dashboard' },
    { icon: QrCode, label: t('scanner'), path: '/scanner' },
    { icon: History, label: t('history'), path: '/history' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  const hrNavItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
    { icon: QrCode, label: t('scanner'), path: '/scanner' },
    { icon: Tv, label: t('totem_mode'), path: '/totem' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  const navItems = isHR ? hrNavItems : employeeNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border/50 flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight font-[Manrope]">CLOCKLN</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* User info & Language */}
        <div className="p-4 border-t border-border/50 space-y-4">
          <LanguageSelector variant="ghost" />
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-bold text-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="sidebar-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-bold font-[Manrope]">CLOCKLN</span>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main content */}
      <main className="md:ml-64">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border/50 z-40">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
