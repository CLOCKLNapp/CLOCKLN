import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, ArrowLeft, Send, Users, User,
  Info, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { toast } from 'sonner';

export default function SendNotificationPage() {
  const [employees, setEmployees] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    message: '',
    type: 'info'
  });

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [empRes, notifRes] = await Promise.all([
        api.get('/users'),
        api.get('/notifications/all')
      ]);
      setEmployees(empRes.data.filter(e => e.role === 'employee'));
      setSentNotifications(notifRes.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }

    setSending(true);
    try {
      await api.post('/notifications', {
        user_id: formData.user_id || null,
        title: formData.title,
        message: formData.message,
        type: formData.type
      });
      toast.success('Notificação enviada!');
      setFormData({ user_id: '', title: '', message: '', type: 'info' });
      fetchData();
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await api.delete(`/notifications/${notifId}`);
      toast.success('Notificação excluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const typeOptions = [
    { value: 'info', label: 'Informação', icon: Info, color: 'text-primary' },
    { value: 'success', label: 'Sucesso', icon: CheckCircle2, color: 'text-emerald-400' },
    { value: 'warning', label: 'Aviso', icon: AlertTriangle, color: 'text-amber-400' },
    { value: 'error', label: 'Urgente', icon: XCircle, color: 'text-red-400' }
  ];

  const getTypeIcon = (type) => {
    const opt = typeOptions.find(o => o.value === type);
    if (!opt) return <Info className="w-4 h-4 text-primary" />;
    const Icon = opt.icon;
    return <Icon className={`w-4 h-4 ${opt.color}`} />;
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <Bell className="w-6 h-6 text-primary" />
              Enviar Notificação
            </h1>
            <p className="text-muted-foreground">Comunique-se com seus funcionários</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Nova Notificação
                </CardTitle>
                <CardDescription>
                  Envie avisos, comunicados ou alertas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Destinatário</Label>
                    <Select
                      value={formData.user_id || 'all'}
                      onValueChange={(value) => setFormData({ ...formData, user_id: value === 'all' ? '' : value })}
                    >
                      <SelectTrigger data-testid="recipient-select">
                        <SelectValue placeholder="Selecione (ou todos)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Todos os funcionários
                          </div>
                        </SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {emp.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger data-testid="type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className={`w-4 h-4 ${opt.color}`} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Lembrete importante"
                      data-testid="title-input"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Digite a mensagem..."
                      rows={4}
                      data-testid="message-input"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-glow-blue"
                    disabled={sending}
                    data-testid="send-btn"
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Enviando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" /> Enviar Notificação
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sent Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Notificações Enviadas</CardTitle>
                <CardDescription>Histórico recente</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : sentNotifications.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {sentNotifications.slice(0, 15).map(notif => (
                      <div
                        key={notif.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">{getTypeIcon(notif.type)}</div>
                            <div>
                              <p className="font-medium text-sm">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {notif.recipient_name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(notif.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => handleDelete(notif.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma notificação enviada</p>
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
