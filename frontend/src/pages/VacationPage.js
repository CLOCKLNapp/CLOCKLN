import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Palmtree, Calendar, ArrowLeft, Send, 
  Clock, CheckCircle2, XCircle, Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function VacationPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [absenceData, setAbsenceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAbsences = async () => {
      try {
        const response = await api.get('/absences/my');
        setAbsenceData(response.data);
      } catch (error) {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchAbsences();
  }, [api, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/vacation/request', {
        start_date: startDate,
        end_date: endDate,
        reason
      });
      toast.success(`Vacation request submitted! ${response.data.days_requested} days requested.`);
      setStartDate('');
      setEndDate('');
      setReason('');
      // Refresh data
      const absResp = await api.get('/absences/my');
      setAbsenceData(absResp.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
    }
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
            <h1 className="text-2xl font-bold font-[Manrope] flex items-center gap-2">
              <Palmtree className="w-6 h-6 text-emerald-400" />
              Férias / Vacation
            </h1>
            <p className="text-muted-foreground">Gerencie suas férias</p>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-4xl font-bold font-mono text-emerald-400">
                    {loading ? '--' : absenceData?.vacation_days_remaining || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Dias Restantes</p>
                </div>
                <div>
                  <p className="text-4xl font-bold font-mono text-amber-400">
                    {loading ? '--' : absenceData?.vacation_days_used || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Dias Usados</p>
                </div>
                <div>
                  <p className="text-4xl font-bold font-mono text-primary">
                    {loading ? '--' : absenceData?.vacation_days_total || 30}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Total Anual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Solicitar Férias
                </CardTitle>
                <CardDescription>
                  Envie uma solicitação para aprovação do RH
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Início</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="start-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fim</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        data-testid="end-date-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo (opcional)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Viagem em família, descanso..."
                      rows={3}
                      data-testid="reason-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full btn-glow-blue"
                    disabled={isSubmitting}
                    data-testid="submit-vacation-btn"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Enviar Solicitação
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Requests History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Minhas Solicitações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : absenceData?.vacation_requests?.length > 0 ? (
                  <div className="space-y-3">
                    {absenceData.vacation_requests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {request.start_date} → {request.end_date}
                            </span>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {request.days_count} dias
                          </span>
                          {request.reason && (
                            <span className="text-muted-foreground truncate max-w-[150px]">
                              {request.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Palmtree className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma solicitação</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
