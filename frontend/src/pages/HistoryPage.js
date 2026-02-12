import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/clock/history?days=60');
        setRecords(response.data);
      } catch (error) {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [api, t]);

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatHours = (hours) => {
    if (!hours) return '--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group records by month
  const groupedRecords = records.reduce((acc, record) => {
    const month = new Date(record.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(record);
    return acc;
  }, {});

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
            <h1 className="text-2xl font-bold font-[Manrope]">{t('history')}</h1>
            <p className="text-muted-foreground">Last 60 days</p>
          </div>
        </motion.div>

        {/* Records */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : Object.keys(groupedRecords).length > 0 ? (
          Object.entries(groupedRecords).map(([month, monthRecords], monthIndex) => (
            <motion.div
              key={month}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: monthIndex * 0.1 }}
            >
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">{month}</h2>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  {monthRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className={`flex items-center justify-between p-4 ${
                        index !== monthRecords.length - 1 ? 'border-b border-border/50' : ''
                      }`}
                      data-testid={`history-record-${record.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{formatDate(record.date)}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatTime(record.clock_in)} - {record.clock_out ? formatTime(record.clock_out) : t('currently_clocked_in')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-lg">
                          {formatHours(record.total_hours)}
                        </p>
                        {record.overtime_hours > 0 && (
                          <p className="text-xs text-amber-400">
                            +{formatHours(record.overtime_hours)} OT
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No records found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
