import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, Check, Zap, Building2, Clock,
  ArrowLeft, CreditCard, Loader2, AlertCircle,
  ChevronRight, AlertTriangle, Gift, Sparkles
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [billingPeriods, setBillingPeriods] = useState({});
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/plans'),
        api.get('/subscription/current')
      ]);
      setPlans(plansRes.data.plans);
      setBillingPeriods(plansRes.data.billing_periods || {});
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
        billing_period: selectedPeriod,
        origin_url: window.location.origin
      });
      
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

  const periodLabels = {
    monthly: { label: 'Mensal', short: 'mês' },
    yearly_3: { label: '3 Anos', short: '3 anos', badge: '6 meses grátis' },
    yearly_5: { label: '5 Anos', short: '5 anos', badge: '1 ano grátis' }
  };

  const getPriceDisplay = (plan) => {
    if (!plan.pricing || !plan.pricing[selectedPeriod]) {
      return { price: plan.price, suffix: '/mês', savings: 0 };
    }
    
    const pricing = plan.pricing[selectedPeriod];
    
    if (selectedPeriod === 'monthly') {
      return { price: pricing.total_price, suffix: '/mês', savings: 0 };
    }
    
    return {
      price: pricing.total_price,
      monthlyEquivalent: pricing.monthly_equivalent,
      savings: pricing.savings,
      freeMonths: pricing.free_months,
      suffix: ''
    };
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
              {t('plans_subscription')}
            </h1>
            <p className="text-muted-foreground">{t('manage_plan')}</p>
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
            <span>{t('checking_payment')}</span>
          </motion.div>
        )}

        {/* Trial Expired Warning */}
        {currentSub?.trial_expired && !currentSub?.is_exempt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
          >
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="font-semibold text-red-400">{t('trial_expired_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('trial_expired_message')}</p>
            </div>
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
                  {t('current_plan')}
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
                        {currentSub.price === 0 ? t('free_trial') : `€${currentSub.price}/${t('month')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={`${
                      currentSub.trial_expired && !currentSub.is_exempt
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {currentSub.trial_expired && !currentSub.is_exempt 
                        ? t('expired') 
                        : currentSub.status === 'active' ? t('active') : currentSub.status}
                    </Badge>
                    {currentSub.is_exempt && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                        VIP
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Trial days remaining */}
                {currentSub.plan === 'trial' && currentSub.trial_days_remaining !== null && !currentSub.is_exempt && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="font-semibold text-amber-400">
                        {currentSub.trial_days_remaining} {t('days_remaining')}
                      </span>
                      <p className="text-xs text-muted-foreground">{t('trial_upgrade_hint')}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('employees')}</span>
                    <span>{currentSub.current_employees} / {currentSub.max_employees}</span>
                  </div>
                  <Progress 
                    value={(currentSub.current_employees / currentSub.max_employees) * 100} 
                    className="h-2"
                  />
                  {currentSub.current_employees >= currentSub.max_employees && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {t('employee_limit_reached')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Billing Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center gap-4"
        >
          <h2 className="text-lg font-semibold text-center">{t('choose_billing_period') || 'Escolha o período de pagamento'}</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(periodLabels).map(([key, value]) => (
              <Button
                key={key}
                variant={selectedPeriod === key ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod(key)}
                className={`relative ${selectedPeriod === key ? 'ring-2 ring-primary/50' : ''}`}
                data-testid={`period-${key}-btn`}
              >
                {value.label}
                {value.badge && (
                  <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-[10px] px-1.5 py-0.5">
                    <Gift className="w-3 h-3 mr-0.5" />
                    {value.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          {selectedPeriod !== 'monthly' && (
            <p className="text-sm text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {t('annual_discount_info') || 'Pague antecipado e ganhe meses grátis!'}
            </p>
          )}
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {loading ? (
            [1, 2].map(i => (
              <div key={i} className="h-96 bg-muted/50 rounded-lg animate-pulse" />
            ))
          ) : (
            plans.filter(plan => plan.id !== 'trial').map((plan, index) => {
              const priceDisplay = getPriceDisplay(plan);
              
              return (
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
                      {priceDisplay.savings > 0 && (
                        <Badge className="absolute top-4 right-4 bg-emerald-500">
                          {t('save') || 'Economize'} €{priceDisplay.savings}
                        </Badge>
                      )}
                      <div className={`mx-auto p-4 rounded-2xl mb-4 ${
                        plan.id === 'pro' ? 'bg-primary/10' : 'bg-amber-500/10'
                      }`}>
                        {planIcons[plan.id]}
                      </div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>
                        {plan.id === 'pro' && (t('plan_pro_desc') || 'Para pequenas empresas')}
                        {plan.id === 'business' && (t('plan_business_desc') || 'Para grandes organizações')}
                      </CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">€{priceDisplay.price}</span>
                        {selectedPeriod === 'monthly' ? (
                          <span className="text-muted-foreground">/{t('month')}</span>
                        ) : (
                          <span className="text-muted-foreground">/{periodLabels[selectedPeriod]?.short}</span>
                        )}
                      </div>
                      {selectedPeriod !== 'monthly' && priceDisplay.monthlyEquivalent && (
                        <p className="text-sm text-muted-foreground mt-1">
                          (€{priceDisplay.monthlyEquivalent}/{t('month')})
                        </p>
                      )}
                      {priceDisplay.freeMonths > 0 && (
                        <Badge variant="outline" className="mt-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          <Gift className="w-3 h-3 mr-1" />
                          +{priceDisplay.freeMonths} {priceDisplay.freeMonths === 12 ? (t('free_year') || 'meses grátis') : (t('free_months') || 'meses grátis')}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className={`w-5 h-5 ${
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
                          {t('current_plan')}
                        </Button>
                      ) : (
                        <Button 
                          className={`w-full ${
                            plan.id === 'pro' ? 'btn-glow-blue' : 
                            plan.id === 'plus' ? 'bg-purple-500 hover:bg-purple-600' : 
                            'bg-amber-500 hover:bg-amber-600'
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
                          {currentSub?.plan === 'trial' ? t('subscribe_now') : t('upgrade')}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })
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
              <CardTitle>{t('faq_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">{t('faq_change_plan')}</h4>
                <p className="text-sm text-muted-foreground">{t('faq_change_plan_answer')}</p>
              </div>
              <div>
                <h4 className="font-medium">{t('faq_billing')}</h4>
                <p className="text-sm text-muted-foreground">{t('faq_billing_answer')}</p>
              </div>
              <div>
                <h4 className="font-medium">{t('faq_annual') || 'Como funciona o desconto anual?'}</h4>
                <p className="text-sm text-muted-foreground">{t('faq_annual_answer') || 'Ao escolher um plano anual, você paga adiantado e ganha 2 meses grátis por ano. Quanto mais anos, mais economia!'}</p>
              </div>
              <div>
                <h4 className="font-medium">{t('faq_trial')}</h4>
                <p className="text-sm text-muted-foreground">{t('faq_trial_answer')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
