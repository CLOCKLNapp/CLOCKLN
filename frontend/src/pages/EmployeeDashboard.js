import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, Timer, TrendingUp, Calendar, 
  QrCode, History, LogOut, ChevronRight,
  CheckCircle2, Circle, Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function EmployeeDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { api, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard/employee');
        setDashboardData(response.data);
      } catch (error) {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [api, t]);

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const isClockedIn = dashboardData?.current_status?.status === 'clocked_in';

  const statCards = [
    {
      title: t('total_hours'),
      value: dashboardData?.total_hours_month || 0,
      format: formatHours,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('overtime'),
      value: dashboardData?.overtime_hours_month || 0,
      format: formatHours,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
    },
    {
      title: t('time_bank'),
      value: dashboardData?.time_bank || 0,
      format: formatHours,
      icon: Timer,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      title: t('days_worked'),
      value: dashboardData?.days_worked || 0,
      format: (v) => v.toString(),
      icon: Calendar,
      color: 'text-violet-400',
      bgColor: 'bg-violet-400/10',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Welcome header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-[Manrope]">
              {t('welcome_back')}, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">{t('dashboard')}</p>
          </div>
          
          <Button
            size="lg"
            className={`btn-glow-${isClockedIn ? 'blue' : 'green'} ${
              isClockedIn ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            onClick={() => navigate('/scanner')}
            data-testid="scan-qr-btn"
          >
            <QrCode className="w-5 h-5 mr-2" />
            {isClockedIn ? t('clock_out') : t('clock_in')}
          </Button>
        </motion.div>

        {/* Current status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border-2 ${isClockedIn ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isClockedIn ? 'bg-emerald-500/20' : 'bg-muted'}`}>
                    {isClockedIn ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <Circle className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {isClockedIn ? t('currently_clocked_in') : t('not_clocked_in')}
                    </p>
                    {isClockedIn && dashboardData?.current_status?.clock_in_time && (
                      <p className="text-muted-foreground">
                        {t('clock_in')}: {formatTime(dashboardData.current_status.clock_in_time)}
                      </p>
                    )}
                  </div>
                </div>
                
                {isClockedIn && dashboardData?.current_status?.elapsed_hours && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t('today')}</p>
                    <p className="font-mono text-2xl font-bold text-emerald-400">
                      {formatHours(dashboardData.current_status.elapsed_hours)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className="card-hover border-border/50">
                <CardContent className="p-4 md:p-6">
                  <div className={`inline-flex p-2 rounded-lg ${stat.bgColor} mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl md:text-2xl font-bold font-mono mt-1">
                    {loading ? '--' : stat.format(stat.value)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                {t('recent_activity')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                {t('history')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : dashboardData?.recent_records?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recent_records.slice(0, 5).map((record, index) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{record.date}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(record.clock_in)} - {record.clock_out ? formatTime(record.clock_out) : t('currently_clocked_in')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold">
                          {record.total_hours ? formatHours(record.total_hours) : '--'}
                        </p>
                        {record.overtime_hours > 0 && (
                          <p className="text-xs text-amber-400">
                            +{formatHours(record.overtime_hours)} {t('overtime').toLowerCase()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
