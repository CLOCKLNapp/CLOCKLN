import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Clock, TrendingUp, 
  Search, MoreVertical, Palmtree,
  CheckCircle2, XCircle, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function ManagerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { api, user, company } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const response = await api.get('/dashboard/manager');
      setDashboardData(response.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const team = dashboardData?.team || [];
  const filteredTeam = team.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatHours = (hours) => {
    const h = Math.floor(hours || 0);
    const m = Math.round(((hours || 0) - h) * 60);
    return `${h}h ${m}m`;
  };

  const statCards = [
    {
      title: 'Minha Equipe',
      value: dashboardData?.total_team_members || 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Ponto Hoje',
      value: dashboardData?.clocked_in_today || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      title: 'Horas Extras (Mês)',
      value: dashboardData?.total_overtime_month || 0,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      format: formatHours,
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-[Manrope]">
              Dashboard Gerente
            </h1>
            <p className="text-muted-foreground mt-1">
              Olá, {user?.name}! Gerencie sua equipe.
            </p>
          </div>
          
          {dashboardData?.pending_vacation_requests > 0 && (
            <Button
              variant="outline"
              onClick={() => navigate('/vacation-requests')}
              className="border-amber-500/50 text-amber-400"
            >
              <Palmtree className="w-4 h-4 mr-2" />
              {dashboardData.pending_vacation_requests} Férias Pendentes
            </Button>
          )}
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className="card-hover border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold font-mono mt-2">
                        {loading ? '--' : (stat.format ? stat.format(stat.value) : stat.value)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Team list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Minha Equipe
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-team-input"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredTeam.length > 0 ? (
                <div className="space-y-3">
                  {filteredTeam.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`team-member-${member.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="font-bold text-primary">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? t('active') : t('inactive')}
                        </Badge>
                        {member.work_mode && member.work_mode !== 'onsite' && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <MapPin className="w-3 h-3 mr-1" />
                            {member.work_mode === 'remote' ? 'Remoto' : 'Híbrido'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {team.length === 0 
                      ? 'Nenhum funcionário atribuído a você'
                      : 'Nenhum membro encontrado'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
