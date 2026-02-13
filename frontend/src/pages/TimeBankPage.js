import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, ArrowLeft, TrendingUp, TrendingDown,
  History, Plus, Minus, Calendar, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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

export default function TimeBankPage() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [useHours, setUseHours] = useState('');
  const [useDate, setUseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        api.get('/timebank/balance'),
        api.get('/timebank/transactions?limit=50')
      ]);
      setBalance(balanceRes.data);
      setTransactions(txRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUseHours = async () => {
    const hours = parseFloat(useHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Digite um número válido de horas');
      return;
    }
    
    if (hours > (balance?.balance_hours || 0)) {
      toast.error('Saldo insuficiente');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/timebank/use?hours=${hours}&date=${useDate}`);
      toast.success('Horas compensadas com sucesso!');
      setShowUseDialog(false);
      setUseHours('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao compensar horas');
    } finally {
      setProcessing(false);
    }
  };

  const formatHours = (hours) => {
    const absHours = Math.abs(hours);
    const h = Math.floor(absHours);
    const m = Math.round((absHours - h) * 60);
    const sign = hours < 0 ? '-' : '+';
    return `${sign}${h}h ${m}m`;
  };

  const formatBalance = (hours) => {
    const absHours = Math.abs(hours);
    const h = Math.floor(absHours);
    const m = Math.round((absHours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'overtime':
        return <Plus className="w-4 h-4 text-emerald-400" />;
      case 'compensation':
        return <Minus className="w-4 h-4 text-amber-400" />;
      case 'adjustment':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'overtime':
        return <Badge className="bg-emerald-500/20 text-emerald-400">Hora Extra</Badge>;
      case 'compensation':
        return <Badge className="bg-amber-500/20 text-amber-400">Compensação</Badge>;
      case 'adjustment':
        return <Badge className="bg-primary/20 text-primary">Ajuste</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400">Expirado</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
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
              Banco de Horas
            </h1>
            <p className="text-muted-foreground">Seu saldo de horas extras</p>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-2">Saldo Atual</p>
              {loading ? (
                <div className="h-16 bg-muted/30 rounded-lg animate-pulse mx-auto w-48" />
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    {(balance?.balance_hours || 0) >= 0 ? (
                      <TrendingUp className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-red-400" />
                    )}
                    <span className={`text-5xl font-bold font-mono ${
                      (balance?.balance_hours || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatBalance(balance?.balance_hours || 0)}
                    </span>
                  </div>
                  {balance?.last_updated && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Última atualização: {formatDate(balance.last_updated)}
                    </p>
                  )}
                </>
              )}
              
              {(balance?.balance_hours || 0) > 0 && (
                <Button
                  className="mt-6 btn-glow-blue"
                  onClick={() => setShowUseDialog(true)}
                  data-testid="use-hours-btn"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Usar Horas (Compensar)
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Movimentações
              </CardTitle>
              <CardDescription>Suas últimas transações no banco de horas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getTransactionBadge(tx.type)}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${
                        tx.hours >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {formatHours(tx.hours)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma movimentação ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Horas extras aprovadas aparecerão aqui
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Use Hours Dialog */}
        <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Compensar Horas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Saldo disponível: <span className="font-bold text-emerald-400">
                  {formatBalance(balance?.balance_hours || 0)}
                </span>
              </p>
              <div className="space-y-2">
                <Label>Horas a compensar</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={balance?.balance_hours || 0}
                  value={useHours}
                  onChange={(e) => setUseHours(e.target.value)}
                  placeholder="Ex: 2.5"
                  data-testid="use-hours-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Data da compensação</Label>
                <Input
                  type="date"
                  value={useDate}
                  onChange={(e) => setUseDate(e.target.value)}
                  data-testid="use-date-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUseDialog(false)}>
                Cancelar
              </Button>
              <Button 
                className="btn-glow-blue"
                onClick={handleUseHours}
                disabled={processing || !useHours}
                data-testid="confirm-use-btn"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmar Compensação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
