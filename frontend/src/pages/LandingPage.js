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
  pro: {
    name: 'Pro',
    icon: Zap,
    maxEmployees: 50,
    monthly: 29,
    yearly: 290,
    threeYear: 790,
    fiveYear: 1190,
    lifetime: 1999,
    features: [
      'Up to 50 employees',
      'QR Code & Geolocation',
      'Remote clock-in map',
      'Basic reports',
      'Email support'
    ]
  },
  business: {
    name: 'Business',
    icon: Building2,
    maxEmployees: 500,
    monthly: 99,
    yearly: 990,
    threeYear: 2640,
    fiveYear: 4450,
    lifetime: 7499,
    popular: true,
    features: [
      'Up to 500 employees',
      'All Pro features',
      'Manager roles',
      'Advanced reports (PDF/Excel)',
      'Time bank management',
      'Priority support',
      'Custom branding'
    ]
  }
};

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '500+', label: 'Companies' },
  { value: '99.9%', label: 'Uptime' },
  { value: '17+', label: 'Languages' }
];

const features = [
  { 
    icon: Clock, 
    title: 'Smart Clock-in', 
    description: 'QR Code scanning and NFC for fast, accurate time tracking at kiosks.'
  },
  { 
    icon: MapPin, 
    title: 'Geolocation', 
    description: 'Track remote workers with GPS validation within configurable radius.'
  },
  { 
    icon: FileText, 
    title: 'Reports & Analytics', 
    description: 'Generate detailed PDF and Excel reports. Track hours, overtime, and more.'
  },
  { 
    icon: Shield, 
    title: 'Enterprise Security', 
    description: 'LGPD/GDPR compliant. Multi-tenant architecture with data isolation.'
  },
  { 
    icon: Users, 
    title: 'Role Management', 
    description: 'Separate views for Employees, Managers, and HR with custom permissions.'
  },
  { 
    icon: Bell, 
    title: 'Smart Notifications', 
    description: 'Automated alerts for overtime, missed clock-ins, and approvals.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { language, setLanguage, languages } = useLanguage();
  const [currency, setCurrency] = useState('EUR');
  const [selectedPlan, setSelectedPlan] = useState('business');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [showLanguages, setShowLanguages] = useState(false);

  const availableLanguages = languages || [];

  const formatPrice = (price) => {
    const converted = Math.round(price * currencies[currency].rate);
    return `${currencies[currency].symbol}${converted.toLocaleString()}`;
  };

  const getPriceForPeriod = (plan) => {
    switch (billingPeriod) {
      case 'yearly': return plan.yearly;
      case 'threeYear': return plan.threeYear;
      case 'fiveYear': return plan.fiveYear;
      case 'lifetime': return plan.lifetime;
      default: return plan.monthly;
    }
  };

  const getPeriodLabel = () => {
    switch (billingPeriod) {
      case 'yearly': return '/year';
      case 'threeYear': return '';
      case 'fiveYear': return '';
      case 'lifetime': return '';
      default: return '/month';
    }
  };

  const getBonusText = () => {
    switch (billingPeriod) {
      case 'yearly': return '+2 months free';
      case 'threeYear': return '+6 months free';
      case 'fiveYear': return '+12 months free';
      case 'lifetime': return 'Forever access';
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
              Login
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="btn-glow-blue hidden sm:flex"
              data-testid="start-free-btn"
            >
              Start for Free
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
              <span className="text-sm text-primary font-medium">Smart Time Tracking</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Time Tracking{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                Modern
              </span>
              <br />
              for Your Business
            </h1>
            
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Simplify time tracking with QR Code, geolocation and smart reports.
              Secure, multilingual and ready for global use.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="btn-glow-blue text-lg px-8 py-6"
                data-testid="hero-start-btn"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8 py-6 border-zinc-700 hover:bg-zinc-800"
                data-testid="see-features-btn"
              >
                See Features
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
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
              Everything You Need
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Complete time management solution for modern businesses
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
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
              Plans and Pricing
            </h2>
            <p className="text-zinc-400 mb-8">
              Choose the ideal plan for your company. Cancel anytime.
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
          <div className="flex justify-center gap-4 mb-8">
            {Object.entries(plans).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all ${
                  selectedPlan === key
                    ? 'bg-primary/20 border-primary text-white'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <plan.icon className="w-4 h-4" />
                {plan.name}
              </button>
            ))}
          </div>

          {/* Employee Count */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-zinc-400">
              <Users className="w-5 h-5" />
              Up to <span className="font-bold text-white">{plans[selectedPlan].maxEmployees}</span> employees
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { id: 'monthly', label: 'Monthly', price: plans[selectedPlan].monthly },
              { id: 'threeYear', label: '3 Years', price: plans[selectedPlan].threeYear, bonus: '+6 months free' },
              { id: 'fiveYear', label: '5 Years', price: plans[selectedPlan].fiveYear, bonus: '+12 months free' },
              { id: 'lifetime', label: 'Lifetime', price: plans[selectedPlan].lifetime, bonus: 'Forever access', best: true }
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
                    BEST VALUE
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mb-3">
                  {period.id === 'lifetime' ? (
                    <span className="text-amber-400">∞</span>
                  ) : (
                    <Crown className="w-4 h-4 text-primary" />
                  )}
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

          {/* Features List */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8">
            <h4 className="font-semibold mb-4 text-center">
              {plans[selectedPlan].name} Plan includes:
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {plans[selectedPlan].features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{feature}</span>
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
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-zinc-500 mt-4">
              Start with free plan. No credit card required.
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
              Ready to Modernize?
            </h2>
            <p className="text-zinc-400 mb-8">
              Start for free. No credit card required.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="btn-glow-blue text-lg px-8 py-6"
              data-testid="cta-start-btn"
            >
              Create Free Account
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
              © 2026 CLOCKLN. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
