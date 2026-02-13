import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Tv, Smartphone, Tablet, Monitor, Download,
  ArrowLeft, CheckCircle2, Copy, ExternalLink,
  Wifi, Globe, Shield, Zap, Lock, Apple, 
  Chrome, Settings, Play, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
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
      title: 'Ative o Modo Quiosque',
      description: 'Trave o dispositivo para usar apenas o CLOCKLN.',
      icon: Lock,
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
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="setup">Instalação</TabsTrigger>
            <TabsTrigger value="kiosk">Modo Quiosque</TabsTrigger>
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

          {/* Kiosk Mode Tab */}
          <TabsContent value="kiosk" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <AlertDescription className="text-amber-200">
                  O Modo Quiosque trava o tablet para usar APENAS o CLOCKLN. 
                  Funcionários não conseguirão acessar outras apps ou configurações.
                </AlertDescription>
              </Alert>

              {/* iPad Kiosk */}
              <Card className="border-border/50 mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="w-5 h-5" />
                    iPad / iPhone - Acesso Guiado
                  </CardTitle>
                  <CardDescription>
                    O "Acesso Guiado" do iOS trava o dispositivo em um único app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-emerald-400">Configuração Inicial (uma vez)</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Vá em <span className="text-white">Ajustes → Acessibilidade → Acesso Guiado</span></li>
                      <li>Ative o <span className="text-white">Acesso Guiado</span></li>
                      <li>Toque em <span className="text-white">Ajustes de Código</span></li>
                      <li>Defina um código (só RH deve saber)</li>
                      <li>Ative <span className="text-white">Face ID / Touch ID</span> para mais segurança</li>
                    </ol>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-primary">Como Ativar o Modo Quiosque</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Abra o Safari e acesse a URL do CLOCKLN</li>
                      <li>Clique 3x no botão lateral (ou Home)</li>
                      <li>Toque em <span className="text-white">Iniciar</span> no canto superior</li>
                      <li>O iPad está travado no CLOCKLN!</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-red-400">Como Desativar (só RH)</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Clique 3x no botão lateral</li>
                      <li>Digite o código ou use Face ID</li>
                      <li>Toque em <span className="text-white">Encerrar</span> no canto superior</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* Android Kiosk */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    Android - Fixação de Tela
                  </CardTitle>
                  <CardDescription>
                    O Android permite "fixar" uma tela para impedir navegação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-emerald-400">Configuração Inicial</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Vá em <span className="text-white">Configurações → Segurança → Fixação de tela</span></li>
                      <li>Ative a <span className="text-white">Fixação de tela</span></li>
                      <li>Ative <span className="text-white">"Solicitar PIN antes de desafixar"</span></li>
                      <li>Defina um PIN de segurança</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-primary">Como Fixar o CLOCKLN</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Abra o Chrome e acesse a URL do CLOCKLN</li>
                      <li>Toque no botão de <span className="text-white">Apps recentes</span> (quadrado)</li>
                      <li>Toque no ícone do Chrome na parte superior</li>
                      <li>Selecione <span className="text-white">"Fixar"</span></li>
                      <li>A tela está travada!</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-red-400">Como Desafixar (só RH)</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Mantenha pressionado <span className="text-white">Voltar + Apps recentes</span> por 3 segundos</li>
                      <li>Digite o PIN configurado</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* Chrome Kiosk */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="w-5 h-5 text-blue-400" />
                    Windows / Chromebook - Modo Quiosque
                  </CardTitle>
                  <CardDescription>
                    Configure o Chrome para abrir apenas o CLOCKLN
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-emerald-400">Chrome em Modo Quiosque (Windows)</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Crie um atalho do Chrome na área de trabalho</li>
                      <li>Clique com botão direito → Propriedades</li>
                      <li>No campo "Destino", adicione ao final:
                        <code className="block mt-1 p-2 bg-black/50 rounded text-xs">
                          --kiosk {totemUrl}
                        </code>
                      </li>
                      <li>Configure o Windows para iniciar automaticamente este atalho</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-primary">Chromebook - Modo Quiosque</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                      <li>Acesse <span className="text-white">admin.google.com</span> (Chrome Enterprise)</li>
                      <li>Vá em Dispositivos → Chrome → Configurações</li>
                      <li>Ative "Modo quiosque de sessão única"</li>
                      <li>Configure a URL do CLOCKLN como página inicial</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-semibold text-amber-400 mb-2">⚡ Dica Pro - Totem Dedicado</h4>
                    <p className="text-sm text-muted-foreground">
                      Para totens dedicados, recomendamos usar software de quiosque como:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
                      <li><span className="text-white">Fully Kiosk Browser</span> (Android) - Gratuito</li>
                      <li><span className="text-white">Kiosk Pro</span> (iPad) - Pago</li>
                      <li><span className="text-white">Chrome Kiosk Mode</span> (Windows) - Gratuito</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
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
                  <CardTitle>Dicas de Configuração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      Configurações Recomendadas
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                      <li>Desative notificações do sistema</li>
                      <li>Ative o modo "Não Perturbe"</li>
                      <li>Configure brilho automático ou fixo em 70%</li>
                      <li>Desative atualizações automáticas</li>
                      <li>Conecte a uma fonte de energia permanente</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Segurança
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                      <li>Use o modo quiosque para evitar acesso a outras apps</li>
                      <li>O PIN do modo quiosque deve ser diferente do PIN do CLOCKLN</li>
                      <li>Apenas RH deve conhecer o PIN para desbloquear</li>
                      <li>O QR Code expira a cada 30 segundos (segurança contra fotos)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Performance
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                      <li>Use Wi-Fi 5GHz para menor latência</li>
                      <li>Reinicie o dispositivo semanalmente</li>
                      <li>Limpe o cache do navegador mensalmente</li>
                      <li>Tablet de pelo menos 10" para melhor visibilidade</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="font-semibold mb-2 text-primary">💡 Posicionamento Ideal</h4>
                    <p className="text-sm text-muted-foreground">
                      Posicione o totem na entrada principal, em local de fácil acesso para todos os funcionários.
                      Altura recomendada: 1,20m a 1,50m do chão. Evite luz solar direta na tela.
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
