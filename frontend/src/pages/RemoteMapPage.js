import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, ArrowLeft, Users, Clock, 
  CheckCircle2, AlertTriangle, RefreshCw, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
import { RemoteWorkersMap } from '../components/RemoteWorkersMap';
import { toast } from 'sonner';

export default function RemoteMapPage() {
  const [workers, setWorkers] = useState([]);
  const [clockRecords, setClockRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState('7');

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersRes, recordsRes] = await Promise.all([
        api.get('/reports/remote-workers'),
        api.get(`/reports/remote-clocks?days=${daysFilter}`)
      ]);
      setWorkers(workersRes.data);
      setClockRecords(recordsRes.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysFilter]);

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clockedTodayCount = workers.filter(w => w.clocked_today).length;
  const totalRemote = workers.length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
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
                <MapPin className="w-6 h-6 text-primary" />
                Mapa de Ponto Remoto
              </h1>
              <p className="text-muted-foreground">Visualize onde seus funcionários remotos estão trabalhando</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="w-40" data-testid="days-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Funcionários Remotos</p>
                  <p className="text-2xl font-bold">{totalRemote}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ponto Hoje</p>
                  <p className="text-2xl font-bold text-emerald-400">{clockedTodayCount}/{totalRemote}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registros no Período</p>
                  <p className="text-2xl font-bold">{clockRecords.length}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Localização dos Pontos
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-2 mr-4">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Local cadastrado
                </span>
                <span className="inline-flex items-center gap-2 mr-4">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Ponto dentro do raio
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Ponto fora do raio
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[500px] bg-muted/50 rounded-xl animate-pulse flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              ) : (
                <RemoteWorkersMap 
                  workers={workers} 
                  clockRecords={clockRecords}
                  height="500px"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Records List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Registros Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clockRecords.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {clockRecords.slice(0, 20).map((record) => {
                    const isWithinRadius = (record.distance_from_home || 0) <= 200;
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isWithinRadius ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          }`}>
                            {isWithinRadius ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{record.user_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(record.clock_in)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={isWithinRadius ? 'default' : 'destructive'}>
                            {record.distance_from_home || 0}m
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isWithinRadius ? 'Dentro do raio' : 'Fora do raio'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum registro de ponto remoto no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
