import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, Check, Zap, Building2, Clock,
  ArrowLeft, CreditCard, Loader2, AlertCircle,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/plans'),
        api.get('/subscription/current')
      ]);
      setPlans(plansRes.data.plans);
      setCurrentSub(subRes.data);
    } catch (error) {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    setChecking(true);
    const maxAttempts = 5;
    const pollInterval = 2000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await api.get(`/subscription/status/${sessionId}`);
        
        if (response.data.status === 'completed') {
          toast.success(response.data.message);
          fetchData();
          // Clean URL
          window.history.replaceState({}, '', '/subscription');
          setChecking(false);
          return;
        } else if (response.data.status === 'expired') {
          toast.error(response.data.message);
          setChecking(false);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }
    
    toast.info('Verificação expirou. Atualize a página.');
    setChecking(false);
  };

  useEffect(() => {
    fetchData();
    
    // Check if returning from Stripe
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, []);

  const handleUpgrade = async (planId) => {
    if (planId === currentSub?.plan) {
      toast.info(t('this_is_current_plan'));
      return;
    }
    
    if (planId === 'trial') {
      toast.info(t('trial_no_downgrade'));
      return;
    }

    setUpgrading(true);
    try {
      const response = await api.post('/subscription/checkout', {
        plan: planId,
        origin_url: window.location.origin
      });
      
      // Redirect to Stripe
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(t('checkout_error'));
      setUpgrading(false);
    }
  };

  const planIcons = {
    trial: <Clock className="w-8 h-8" />,
    pro: <Zap className="w-8 h-8" />,
    business: <Building2 className="w-8 h-8" />
  };

  const planColors = {
    trial: 'border-slate-500',
    pro: 'border-primary ring-2 ring-primary/20',
    business: 'border-amber-500'
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
              <Crown className="w-6 h-6 text-amber-400" />
              Planos e Assinatura
            </h1>
            <p className="text-muted-foreground">Gerencie seu plano CLOCKLN</p>
          </div>
        </motion.div>

        {/* Checking payment status */}
        {checking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Verificando status do pagamento...</span>
          </motion.div>
        )}

        {/* Current subscription */}
        {currentSub && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Plano Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      {planIcons[currentSub.plan]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{currentSub.plan_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentSub.price === 0 ? 'Gratuito' : `$${currentSub.price}/mês`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {currentSub.status === 'active' ? 'Ativo' : currentSub.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Funcionários</span>
                    <span>{currentSub.current_employees} / {currentSub.max_employees}</span>
                  </div>
                  <Progress 
                    value={(currentSub.current_employees / currentSub.max_employees) * 100} 
                    className="h-2"
                  />
                  {currentSub.current_employees >= currentSub.max_employees && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Limite de funcionários atingido
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-96 bg-muted/50 rounded-lg animate-pulse" />
            ))
          ) : (
            plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card 
                  className={`h-full flex flex-col border-2 transition-all hover:shadow-lg ${
                    planColors[plan.id] || 'border-border'
                  } ${currentSub?.plan === plan.id ? 'bg-muted/20' : ''}`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  <CardHeader className="text-center">
                    <div className={`mx-auto p-4 rounded-2xl mb-4 ${
                      plan.id === 'free' ? 'bg-slate-500/10' :
                      plan.id === 'pro' ? 'bg-primary/10' : 'bg-amber-500/10'
                    }`}>
                      {planIcons[plan.id]}
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.id === 'free' && 'Para pequenos times'}
                      {plan.id === 'pro' && 'Para empresas em crescimento'}
                      {plan.id === 'business' && 'Para grandes organizações'}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {plan.price === 0 ? 'Grátis' : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && <span className="text-muted-foreground">/mês</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className={`w-5 h-5 ${
                            plan.id === 'free' ? 'text-slate-400' :
                            plan.id === 'pro' ? 'text-primary' : 'text-amber-400'
                          }`} />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {currentSub?.plan === plan.id ? (
                      <Button variant="outline" className="w-full" disabled>
                        Plano Atual
                      </Button>
                    ) : plan.price === 0 ? (
                      <Button variant="outline" className="w-full" disabled>
                        Plano Básico
                      </Button>
                    ) : (
                      <Button 
                        className={`w-full ${
                          plan.id === 'pro' ? 'btn-glow-blue' : 'bg-amber-500 hover:bg-amber-600'
                        }`}
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgrading}
                        data-testid={`upgrade-${plan.id}-btn`}
                      >
                        {upgrading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        Fazer Upgrade
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Perguntas Frequentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Posso mudar de plano a qualquer momento?</h4>
                <p className="text-sm text-muted-foreground">Sim, você pode fazer upgrade a qualquer momento. O novo plano é ativado imediatamente.</p>
              </div>
              <div>
                <h4 className="font-medium">Como funciona a cobrança?</h4>
                <p className="text-sm text-muted-foreground">A cobrança é mensal, processada via Stripe com total segurança.</p>
              </div>
              <div>
                <h4 className="font-medium">O que acontece se eu exceder o limite de funcionários?</h4>
                <p className="text-sm text-muted-foreground">Você não poderá adicionar novos funcionários até fazer upgrade ou remover funcionários existentes.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
