import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Clock, 
  Crown, 
  Shield, 
  Trash2,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const response = await api.get('/api/admin/check');
      if (!response.data.is_superadmin) {
        toast.error('Acesso negado');
        navigate('/dashboard');
        return;
      }
      setIsSuperAdmin(true);
      await loadData();
    } catch (error) {
      toast.error('Você não tem permissão para acessar esta página');
      navigate('/dashboard');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, companiesRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/companies')
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleExempt = async (companyId, currentStatus) => {
    try {
      await api.patch(`/api/admin/companies/${companyId}/exempt?is_exempt=${!currentStatus}`);
      toast.success(currentStatus ? 'Acesso ilimitado removido' : 'Acesso ilimitado concedido!');
      loadData();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const deleteCompany = async (companyId, companyName) => {
    if (!confirm(`Tem certeza que deseja deletar "${companyName}" e TODOS os dados? Esta ação é irreversível!`)) {
      return;
    }
    try {
      await api.delete(`/api/admin/companies/${companyId}`);
      toast.success('Empresa deletada com sucesso');
      loadData();
    } catch (error) {
      toast.error('Erro ao deletar empresa');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-yellow-500" />
                <h1 className="text-xl font-bold">Super Admin</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total_companies}</p>
                    <p className="text-sm text-muted-foreground">Empresas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total_users}</p>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total_clock_records}</p>
                    <p className="text-sm text-muted-foreground">Registros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Crown className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.exempt_companies}</p>
                    <p className="text-sm text-muted-foreground">VIP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plan Distribution */}
        {stats && (
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Distribuição por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  Free: {stats.by_plan.free}
                </Badge>
                <Badge variant="default" className="text-base px-4 py-2 bg-blue-600">
                  Pro: {stats.by_plan.pro}
                </Badge>
                <Badge variant="default" className="text-base px-4 py-2 bg-purple-600">
                  Business: {stats.by_plan.business}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Companies List */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresas Cadastradas
            </CardTitle>
            <CardDescription>
              Gerencie empresas e conceda acesso ilimitado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : companies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada</p>
            ) : (
              <div className="space-y-3">
                {companies.map((company) => (
                  <div 
                    key={company.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{company.name}</h3>
                          {company.is_exempt && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{company.employee_count} funcionários</span>
                          <span>•</span>
                          <Badge variant={company.is_exempt ? 'default' : 'secondary'} className={company.is_exempt ? 'bg-yellow-600' : ''}>
                            {company.is_exempt ? 'VIP' : (company.subscription_plan || 'free').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Acesso VIP</span>
                        <Switch 
                          checked={company.is_exempt || false}
                          onCheckedChange={() => toggleExempt(company.id, company.is_exempt)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteCompany(company.id, company.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Crown className="h-8 w-8 text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-500">Acesso VIP (Ilimitado)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Empresas com acesso VIP têm todas as funcionalidades do plano Business 
                  sem limitação de funcionários e sem necessidade de pagamento. 
                  Use este recurso para sua própria empresa ou parceiros especiais.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
