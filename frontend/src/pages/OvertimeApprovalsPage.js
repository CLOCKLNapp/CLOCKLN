import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, ArrowLeft, CheckCircle2, XCircle,
  User, Calendar, Loader2, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function OvertimeApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        api.get('/overtime/pending'),
        api.get('/overtime/history?days=30')
      ]);
      setPendingRequests(pendingRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (requestId) => {
    setProcessing(requestId);
    try {
      await api.patch(`/overtime/${requestId}`, { status: 'approved' });
      toast.success('Horas extras aprovadas!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao aprovar');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectDialog) return;
    
    setProcessing(showRejectDialog);
    try {
      await api.patch(`/overtime/${showRejectDialog}`, { 
        status: 'rejected',
        notes: rejectNotes 
      });
      toast.success('Solicitação rejeitada');
      setShowRejectDialog(null);
      setRejectNotes('');
      fetchData();
    } catch (error) {
      toast.error('Erro ao rejeitar');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400">Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400">Rejeitado</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-400">Pendente</Badge>;
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
              <Clock className="w-6 h-6 text-primary" />
              Aprovação de Horas Extras
            </h1>
            <p className="text-muted-foreground">Gerencie solicitações de horas extras da equipe</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            data-testid="tab-pending"
          >
            Pendentes ({pendingRequests.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
            data-testid="tab-history"
          >
            Histórico
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'pending' ? (
          /* Pending Requests */
          pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{request.user_name}</h3>
                            <p className="text-sm text-muted-foreground">{request.user_email}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="w-4 h-4" />
                                {formatDate(request.date)}
                              </span>
                              <Badge variant="outline">
                                +{formatHours(request.overtime_hours)} extras
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Horas normais: {formatHours(request.regular_hours)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => setShowRejectDialog(request.id)}
                            disabled={processing === request.id}
                            data-testid={`reject-${request.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rejeitar
                          </Button>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleApprove(request.id)}
                            disabled={processing === request.id}
                            data-testid={`approve-${request.id}`}
                          >
                            {processing === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium">Tudo em dia!</h3>
                <p className="text-muted-foreground">Não há solicitações pendentes</p>
              </CardContent>
            </Card>
          )
        ) : (
          /* History */
          history.length > 0 ? (
            <div className="space-y-3">
              {history.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="font-bold text-sm">
                              {request.user_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{request.user_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.date)} • +{formatHours(request.overtime_hours)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(request.status)}
                          {request.reviewer_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              por {request.reviewer_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground mt-2 pl-13">
                          "{request.notes}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum registro encontrado</p>
              </CardContent>
            </Card>
          )
        )}

        {/* Reject Dialog */}
        <Dialog open={!!showRejectDialog} onOpenChange={() => setShowRejectDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Rejeitar Horas Extras
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Deseja rejeitar esta solicitação de horas extras? O funcionário será notificado.
              </p>
              <Textarea
                placeholder="Motivo da rejeição (opcional)"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(null)}>
                Cancelar
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={processing}
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
