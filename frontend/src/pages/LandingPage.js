import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, ArrowRight, Check, Users, Building2, 
  TrendingUp, Globe, Zap, Shield, MapPin,
  FileText, Bell, Crown, ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';

const currencies = {
  EUR: { symbol: '€', rate: 1 },
  USD: { symbol: '$', rate: 1.08 }
};

const plans = {
  trial: {
    name: 'Trial',
    icon: Zap,
    maxEmployees: 5,
    monthly: 0,
    yearly: 0,
    threeYear: 0,
    fiveYear: 0,
    isTrial: true,
    features: [
      'up_to_5_employees',
      'qr_geolocation',
      'basic_reports',
      '30_days_free'
    ]
  },
  pro: {
    name: 'Pro',
    icon: Zap,
    maxEmployees: 50,
    monthly: 29.90,
    yearly: 328.90,      // 11 meses (1 mês grátis)
    threeYear: 1047.50,  // 35 meses (5 meses grátis)
    fiveYear: 1495.00,   // 48 meses (1 ano/12 meses grátis)
    features: [
      'up_to_50_employees',
      'qr_geolocation',
      'remote_clock_map',
      'basic_reports',
      'email_support'
    ]
  },
  plus: {
    name: 'Plus',
    icon: Building2,
    maxEmployees: 150,
    monthly: 59.90,
    yearly: 658.90,      // 11 meses (1 mês grátis)
    threeYear: 2096.50,  // 35 meses (5 meses grátis)
    fiveYear: 2995.00,   // 48 meses (1 ano/12 meses grátis)
    popular: true,
    features: [
      'up_to_150_employees',
      'all_pro_features',
      'advanced_reports',
      'time_bank_management',
      'priority_support'
    ]
  },
  business: {
    name: 'Business',
    icon: Crown,
    maxEmployees: 500,
    monthly: 99.90,
    yearly: 1098.90,     // 11 meses (1 mês grátis)
    threeYear: 3496.50,  // 35 meses (5 meses grátis)
    fiveYear: 4995.00,   // 48 meses (1 ano/12 meses grátis)
    features: [
      'up_to_500_employees',
      'all_plus_features',
      'manager_roles',
      'custom_branding',
      'api_access',
      'dedicated_support'
    ]
  },
  intelligent: {
    name: 'Intelligent Edition',
    icon: Shield,
    maxEmployees: 'unlimited',
    monthly: 299.90,
    yearly: 3298.90,     // 11 meses (1 mês grátis)
    threeYear: 10496.50, // 35 meses (5 meses grátis)
    fiveYear: 14995.00,  // 48 meses (1 ano/12 meses grátis)
    isPremium: true,
    features: [
      'unlimited_employees',
      'all_business_features',
      'ai_hr_operator',
      'compliance_monitor',
      'immutable_audit',
      'predictive_analytics'
    ]
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { language, setLanguage, languages, t } = useLanguage();
  const [currency, setCurrency] = useState('EUR');
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [showLanguages, setShowLanguages] = useState(false);

  const availableLanguages = languages || [];

  // Translated features for plans
  const getBasicoFeatures = () => [
    t('up_to_10_employees') || 'Até 10 funcionários',
    t('qr_geolocation') || 'QR Code & Geolocalização',
    t('basic_reports') || 'Relatórios básicos',
    t('email_support') || 'Suporte por email'
  ];

  const getIntermediarioFeatures = () => [
    t('up_to_50_employees') || 'Até 50 funcionários',
    t('all_basic_features') || 'Todas funções do Básico',
    t('remote_clock_map') || 'Mapa de ponto remoto',
    t('advanced_reports') || 'Relatórios avançados (PDF/Excel)',
    t('time_bank_management') || 'Gestão de banco de horas',
    t('priority_support') || 'Suporte prioritário'
  ];

  const getPremiumFeatures = () => [
    t('up_to_500_employees') || 'Até 500 funcionários',
    t('all_intermediario_features') || 'Todas funções do Intermediário',
    t('manager_roles') || 'Perfis de gerente',
    t('custom_branding') || 'Marca personalizada',
    t('api_access') || 'Acesso à API',
    t('dedicated_support') || 'Suporte dedicado'
  ];

  const getFeatureText = (key) => {
    const translations = {
      'up_to_5_employees': 'Até 5 funcionários',
      'up_to_50_employees': 'Até 50 funcionários', 
      'up_to_150_employees': 'Até 150 funcionários',
      'up_to_500_employees': 'Até 500 funcionários',
      'unlimited_employees': 'Funcionários ilimitados',
      'all_pro_features': 'Todas funções do Pro',
      'all_plus_features': 'Todas funções do Plus',
      'all_business_features': 'Todas funções do Business',
      'qr_geolocation': 'QR Code & Geolocalização',
      'remote_clock_map': 'Mapa de ponto remoto',
      'basic_reports': 'Relatórios básicos',
      'advanced_reports': 'Relatórios avançados (PDF/Excel)',
      'email_support': 'Suporte por email',
      'priority_support': 'Suporte prioritário',
      'dedicated_support': 'Suporte dedicado',
      'time_bank_management': 'Gestão de banco de horas',
      'manager_roles': 'Perfis de gerente',
      'custom_branding': 'Marca personalizada',
      'api_access': 'Acesso à API',
      '30_days_free': '30 dias grátis',
      'ai_hr_operator': 'CLOCKLN AI - Operador RH',
      'compliance_monitor': 'Monitor de Compliance (Alemanha)',
      'immutable_audit': 'Auditoria imutável',
      'predictive_analytics': 'Analytics preditivo'
    };
    const translated = t(key);
    return (translated && translated !== key) ? translated : translations[key] || key;
  };

  const formatPrice = (price) => {
    if (price === 0) return t('free') || 'Grátis';
    const converted = price * currencies[currency].rate;
    return `${currencies[currency].symbol}${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPriceForPeriod = (plan) => {
    switch (billingPeriod) {
      case 'yearly': return plan.yearly;
      case 'threeYear': return plan.threeYear;
      case 'fiveYear': return plan.fiveYear;
      default: return plan.monthly;
    }
  };

  const getPeriodLabel = () => {
    switch (billingPeriod) {
      case 'yearly': return '/' + t('year');
      case 'threeYear': return '';
      case 'fiveYear': return '';
      default: return '/' + t('month');
    }
  };

  const getBonusText = () => {
    switch (billingPeriod) {
      case 'yearly': return t('plus_1_month_free') || '+1 mês grátis';
      case 'threeYear': return t('plus_5_months_free') || '+5 meses grátis';
      case 'fiveYear': return t('plus_12_months_free') || '+1 ano grátis';
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight font-[Manrope]">CLOCKLN</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguages(!showLanguages)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">
                  {availableLanguages.find(l => l.code === language)?.name || 'English'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showLanguages && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLanguages(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${
                        language === lang.code ? 'bg-primary/20 text-primary' : ''
                      }`}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-zinc-300 hover:text-white"
              data-testid="login-btn"
            >
              {t('login')}
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="btn-glow-blue hidden sm:flex"
              data-testid="start-free-btn"
            >
              {t('start_for_free')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.1)_0%,transparent_50%)]" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">{t('smart_time_tracking')}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              {t('time_tracking')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                {t('modern')}
              </span>
              <br />
              {t('for_your_business')}
            </h1>
            
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              {t('landing_description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="btn-glow-blue text-lg px-8 py-6"
                data-testid="hero-start-btn"
              >
                {t('start_for_free')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8 py-6 border-zinc-700 hover:bg-zinc-800"
                data-testid="see-features-btn"
              >
                {t('see_features')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '10K+', label: t('active_users') },
              { value: '500+', label: t('companies') },
              { value: '99.9%', label: t('uptime') },
              { value: '17+', label: t('languages_count') }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-zinc-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('everything_you_need')}
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              {t('complete_solution')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: t('smart_clock_in'), description: t('smart_clock_in_desc') },
              { icon: MapPin, title: t('geolocation_feature'), description: t('geolocation_feature_desc') },
              { icon: FileText, title: t('reports_analytics'), description: t('reports_analytics_desc') },
              { icon: Shield, title: t('enterprise_security'), description: t('enterprise_security_desc') },
              { icon: Users, title: t('role_management'), description: t('role_management_desc') },
              { icon: Bell, title: t('smart_notifications'), description: t('smart_notifications_desc') }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('plans_and_pricing')}
            </h2>
            <p className="text-zinc-400 mb-8">
              {t('choose_plan_desc')}
            </p>
            
            {/* Currency Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-zinc-800 rounded-full mb-8">
              <button
                onClick={() => setCurrency('EUR')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currency === 'EUR' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                € EUR
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currency === 'USD' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>

          {/* Plan Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {Object.entries(plans).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all ${
                  selectedPlan === key
                    ? plan.isTrial 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : plan.isPremium
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-primary/20 border-primary text-white'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                } ${plan.isTrial ? 'order-first' : ''} ${plan.isPremium ? 'order-last' : ''}`}
              >
                <plan.icon className="w-4 h-4" />
                {plan.name}
                {plan.isTrial && <span className="text-xs bg-emerald-500 text-black px-2 py-0.5 rounded-full ml-1">30 dias</span>}
                {plan.isPremium && <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full ml-1">AI</span>}
              </button>
            ))}
          </div>

          {/* Employee Count */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-zinc-400">
              <Users className="w-5 h-5" />
              {plans[selectedPlan].maxEmployees === 'unlimited' 
                ? <span className="font-bold text-amber-400">Funcionários ilimitados</span>
                : <>{t('up_to') || 'Até'} <span className="font-bold text-white">{plans[selectedPlan].maxEmployees}</span> {t('employees') || 'funcionários'}</>
              }
            </div>
          </div>

          {/* Trial Info or Pricing Cards */}
          {plans[selectedPlan].isTrial ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 mb-8 text-center">
              <Zap className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-emerald-400 mb-2">30 dias grátis!</h3>
              <p className="text-zinc-400 mb-4">Teste todas as funcionalidades com até 5 funcionários.</p>
              <p className="text-sm text-zinc-500">Sem cartão de crédito. Cancele quando quiser.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-4 gap-4 mb-8">
              {[
                { id: 'monthly', label: t('monthly') || 'Mensal', price: plans[selectedPlan].monthly },
                { id: 'yearly', label: t('yearly') || 'Anual', price: plans[selectedPlan].yearly, bonus: '+1 mês grátis' },
                { id: 'threeYear', label: t('three_years') || '3 Anos', price: plans[selectedPlan].threeYear, bonus: '+5 meses grátis' },
                { id: 'fiveYear', label: t('five_years') || '5 Anos', price: plans[selectedPlan].fiveYear, bonus: '+1 ano grátis', best: true }
              ].map((period) => (
                <motion.button
                  key={period.id}
                  onClick={() => setBillingPeriod(period.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-6 rounded-2xl border text-center transition-all ${
                    billingPeriod === period.id
                      ? 'bg-zinc-800 border-primary shadow-lg shadow-primary/20'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {period.best && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
                      {t('best_value') || 'BEST VALUE'}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="font-medium">{period.label}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold mb-2">
                    {formatPrice(period.price)}
                  </div>
                  {period.bonus && (
                    <div className="text-xs text-emerald-400">{period.bonus}</div>
                  )}
                </motion.button>
              ))}
            </div>
          )}

          {/* Features List */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8">
            <h4 className="font-semibold mb-4 text-center">
              {plans[selectedPlan].name} {t('plan_includes') || 'inclui'}:
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {plans[selectedPlan].features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{getFeatureText(feature)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="btn-glow-blue text-lg px-12 py-6"
              data-testid="pricing-start-btn"
            >
              {t('get_started')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-zinc-500 mt-4">
              {t('start_free_no_card')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-3xl p-8 sm:p-12 text-center"
          >
            <Crown className="w-12 h-12 text-amber-400 mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              {t('ready_to_modernize')}
            </h2>
            <p className="text-zinc-400 mb-8">
              {t('start_free_no_card')}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="btn-glow-blue text-lg px-8 py-6"
              data-testid="cta-start-btn"
            >
              {t('create_free_account')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold font-[Manrope]">CLOCKLN</span>
            </div>
            <p className="text-sm text-zinc-500">
              © 2026 CLOCKLN. {t('all_rights_reserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
