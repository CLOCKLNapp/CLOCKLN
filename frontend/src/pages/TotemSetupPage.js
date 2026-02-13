import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Tv, Smartphone, Tablet, Monitor, Download,
  ArrowLeft, CheckCircle2, Copy, ExternalLink,
  Wifi, Globe, Shield, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function TotemSetupPage() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  const { company } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const totemUrl = `${window.location.origin}/totem`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(totemUrl);
    setCopiedUrl(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const devices = [
    { name: 'iPad', icon: Tablet, size: '9.7" - 12.9"', os: 'iPadOS' },
    { name: 'Android Tablet', icon: Tablet, size: '8" - 13"', os: 'Android 8+' },
    { name: 'Samsung Galaxy Tab', icon: Tablet, size: '10.1" - 14.6"', os: 'Android' },
    { name: 'Microsoft Surface', icon: Monitor, size: '10" - 15"', os: 'Windows' },
    { name: 'Chromebook', icon: Monitor, size: '11" - 15"', os: 'Chrome OS' },
    { name: 'Qualquer Navegador', icon: Globe, size: 'Qualquer', os: 'Web' },
  ];

  const steps = [
    {
      number: 1,
      title: 'Conecte o dispositivo à internet',
      description: 'Wi-Fi ou cabo ethernet. Conexão estável é essencial.',
      icon: Wifi,
    },
    {
      number: 2,
      title: 'Abra o navegador',
      description: 'Chrome, Safari, Firefox ou Edge. Qualquer navegador moderno.',
      icon: Globe,
    },
    {
      number: 3,
      title: 'Acesse a URL do Totem',
      description: 'Digite ou escaneie o QR code com a URL do totem.',
      icon: ExternalLink,
    },
    {
      number: 4,
      title: 'Faça login como RH',
      description: 'Use suas credenciais de administrador para autenticar.',
      icon: Shield,
    },
    {
      number: 5,
      title: 'Ative o modo tela cheia',
      description: 'Clique no botão de tela cheia para experiência imersiva.',
      icon: Tv,
    },
    {
      number: 6,
      title: 'Pronto!',
      description: 'O totem está configurado e pronto para uso.',
      icon: Zap,
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-5xl mx-auto">
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
              <Tv className="w-6 h-6 text-primary" />
              Instalação do Totem
            </h1>
            <p className="text-muted-foreground">Configure o CLOCKLN em qualquer tablet ou terminal</p>
          </div>
        </motion.div>

        {/* URL Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">URL do Totem para {company?.name}</p>
                  <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                    <code className="flex-1 text-sm font-mono truncate">{totemUrl}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyToClipboard}
                      data-testid="copy-url-btn"
                    >
                      {copiedUrl ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="btn-glow-blue"
                  onClick={() => window.open(totemUrl, '_blank')}
                  data-testid="open-totem-btn"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Totem
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="setup">Instalação</TabsTrigger>
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
            <TabsTrigger value="tips">Dicas</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4"
            >
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="font-bold text-primary">{step.number}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <step.icon className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">{step.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Dispositivos Compatíveis</CardTitle>
                  <CardDescription>
                    O CLOCKLN funciona em qualquer dispositivo com navegador moderno
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((device, index) => (
                      <motion.div
                        key={device.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3"
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <device.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.size} • {device.os}
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-400">100% Web-Based</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Não precisa instalar nenhum aplicativo. Funciona direto no navegador.
                          Basta acessar a URL e fazer login.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Dicas de Instalação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" />
                      iPad / iPhone
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                      <li>Abra o Safari e acesse a URL do totem</li>
                      <li>Toque no botão "Compartilhar" (quadrado com seta)</li>
                      <li>Selecione "Adicionar à Tela de Início"</li>
                      <li>O CLOCKLN aparecerá como um app na tela inicial</li>
                      <li>Ative o "Acesso Guiado" nas configurações para travar o app</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Tablet className="w-4 h-4 text-primary" />
                      Android Tablet
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                      <li>Abra o Chrome e acesse a URL do totem</li>
                      <li>Toque nos 3 pontos (menu) no canto superior</li>
                      <li>Selecione "Adicionar à tela inicial"</li>
                      <li>Use o modo "Fixação de tela" para travar o app</li>
                      <li>Configurações → Segurança → Fixação de tela</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary" />
                      Totem Dedicado / Kiosk
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                      <li>Configure o dispositivo em modo kiosk</li>
                      <li>Defina a URL do totem como página inicial</li>
                      <li>Desative barras de navegação</li>
                      <li>Configure inicialização automática</li>
                      <li>Conecte fonte de energia permanente</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-semibold mb-2 text-amber-400">⚡ Dica Pro</h4>
                    <p className="text-sm text-muted-foreground">
                      Para empresas com muitos funcionários, recomendamos usar um tablet de pelo menos 10" 
                      e posicionar em local de fácil acesso. O QR Code é renovado automaticamente a cada 30 segundos 
                      para máxima segurança.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
