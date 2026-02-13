import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palmtree, Calendar, ArrowLeft, CheckCircle2, 
  XCircle, Clock, User, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function VacationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      const response = await api.get('/vacation/requests');
      setRequests(response.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (requestId, approved) => {
    setProcessingId(requestId);
    try {
      await api.patch(`/vacation/requests/${requestId}?approved=${approved}`);
      toast.success(approved ? 'Férias aprovadas!' : 'Solicitação rejeitada');
      fetchRequests();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejeitado</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

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
              Solicitações de Férias
            </h1>
            <p className="text-muted-foreground">Gerencie as solicitações de férias dos funcionários</p>
          </div>
        </motion.div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Pendentes ({pendingRequests.length})
                </CardTitle>
                <CardDescription>Solicitações aguardando sua aprovação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg bg-background border border-border/50"
                    data-testid={`vacation-request-${request.id}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground">{request.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="font-mono text-sm">
                            {request.start_date} → {request.end_date}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.days_count} dias
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleReview(request.id, false)}
                            disabled={processingId === request.id}
                            data-testid={`reject-${request.id}`}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => handleReview(request.id, true)}
                            disabled={processingId === request.id}
                            data-testid={`approve-${request.id}`}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                            )}
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </div>
                    {request.reason && (
                      <p className="mt-3 text-sm text-muted-foreground border-t border-border/50 pt-3">
                        <span className="font-medium">Motivo:</span> {request.reason}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Processed Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : processedRequests.length > 0 ? (
                <div className="space-y-3">
                  {processedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="font-bold text-primary text-sm">
                            {request.user_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.start_date} → {request.end_date} ({request.days_count} dias)
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
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
    </AppLayout>
  );
}
