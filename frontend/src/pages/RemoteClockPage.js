import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, CheckCircle2, XCircle, Loader2, 
  Clock, Home, Navigation, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function RemoteClockPage() {
  const [location, setLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isClocking, setIsClocking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [clockStatus, setClockStatus] = useState(null);

  const { api, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isRemoteWorker = user?.work_mode === 'remote' || user?.work_mode === 'hybrid';
  const hasHomeLocation = user?.home_location?.lat && user?.home_location?.lng;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/clock/status');
        setClockStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };
    fetchStatus();
  }, [api]);

  const getLocation = () => {
    setIsGettingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo seu navegador');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsGettingLocation(false);
      },
      (err) => {
        let message = 'Erro ao obter localização';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Permissão de localização negada. Por favor, permita o acesso à sua localização.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Localização indisponível. Verifique se o GPS está ativado.';
            break;
          case err.TIMEOUT:
            message = 'Tempo esgotado ao obter localização. Tente novamente.';
            break;
        }
        setError(message);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleClock = async () => {
    if (!location) {
      toast.error('Obtenha sua localização primeiro');
      return;
    }

    setIsClocking(true);
    try {
      const response = await api.post('/clock/geolocation', {
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      setResult({
        success: true,
        action: response.data.action,
        time: response.data.time,
        totalHours: response.data.total_hours,
        distance: response.data.distance_from_home,
        message: response.data.message
      });
      
      toast.success(response.data.action === 'clock_in' 
        ? 'Entrada remota registrada!' 
        : 'Saída remota registrada!');
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.detail || 'Erro ao registrar ponto'
      });
      toast.error(error.response?.data?.detail || 'Erro ao registrar ponto');
    } finally {
      setIsClocking(false);
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isClockedIn = clockStatus?.status === 'clocked_in';

  if (!isRemoteWorker) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="border-amber-500/30 bg-amber-500/5 max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground mb-4">
                O ponto remoto está disponível apenas para funcionários cadastrados como <strong>Remoto</strong> ou <strong>Híbrido</strong>.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Se você trabalha remotamente, solicite ao RH para atualizar seu modo de trabalho.
              </p>
              <Button onClick={() => navigate('/scanner')}>
                Usar QR Code no Totem
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!hasHomeLocation) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="border-amber-500/30 bg-amber-500/5 max-w-md">
            <CardContent className="p-8 text-center">
              <Home className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Localização não Configurada</h2>
              <p className="text-muted-foreground mb-4">
                Sua localização de trabalho remoto ainda não foi configurada.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Entre em contato com o RH para cadastrar o endereço de onde você trabalha remotamente.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-[Manrope]">Ponto Remoto</h1>
          <p className="text-muted-foreground">Registre seu ponto de casa</p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border-2 ${isClockedIn ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/50'}`}>
            <CardContent className="p-6 text-center">
              {isClockedIn ? (
                <div>
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-lg text-emerald-400">Ponto Ativo</p>
                  <p className="text-muted-foreground">
                    Entrada: {clockStatus?.clock_in_time ? formatTime(clockStatus.clock_in_time) : '--:--'}
                  </p>
                </div>
              ) : (
                <div>
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="font-semibold text-lg">Sem Ponto Ativo</p>
                  <p className="text-muted-foreground">Registre sua entrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Result Card */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className={`border-2 ${result.success ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                <CardContent className="p-6 text-center">
                  {result.success ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold mb-2">
                        {result.action === 'clock_in' ? 'Entrada Registrada!' : 'Saída Registrada!'}
                      </h2>
                      <p className="font-mono text-3xl text-emerald-400 mb-4">
                        {formatTime(result.time)}
                      </p>
                      {result.distance !== undefined && (
                        <p className="text-sm text-muted-foreground">
                          Distância do local registrado: {result.distance}m
                        </p>
                      )}
                      {result.totalHours && (
                        <p className="text-lg mt-2">
                          Total de horas: <span className="font-bold">{result.totalHours.toFixed(2)}h</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                      <h2 className="text-xl font-bold text-red-400 mb-2">Erro</h2>
                      <p className="text-muted-foreground">{result.message}</p>
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setResult(null);
                      setLocation(null);
                    }}
                  >
                    Novo Registro
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location & Clock Section */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {error && (
              <Alert className="border-red-500/30 bg-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            {/* Location Card */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                {location ? (
                  <div className="text-center">
                    <div className="inline-flex p-3 rounded-xl bg-emerald-500/20 mb-4">
                      <Navigation className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="font-semibold text-emerald-400 mb-2">Localização Obtida!</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Precisão: ~{Math.round(location.accuracy)}m
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={getLocation}
                    >
                      Atualizar Localização
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex p-3 rounded-xl bg-muted mb-4">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-semibold mb-2">Obtenha sua Localização</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique no botão abaixo para permitir acesso à sua localização
                    </p>
                    <Button
                      onClick={getLocation}
                      disabled={isGettingLocation}
                      className="btn-glow-blue"
                    >
                      {isGettingLocation ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Obtendo...
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 mr-2" />
                          Obter Localização
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clock Button */}
            {location && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  size="lg"
                  className={`w-full h-16 text-lg ${
                    isClockedIn 
                      ? 'bg-red-600 hover:bg-red-500' 
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                  onClick={handleClock}
                  disabled={isClocking}
                  data-testid="geo-clock-btn"
                >
                  {isClocking ? (
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  ) : (
                    <Clock className="w-6 h-6 mr-2" />
                  )}
                  {isClockedIn ? 'Registrar Saída' : 'Registrar Entrada'}
                </Button>
              </motion.div>
            )}

            {/* Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Seu Local de Trabalho Remoto</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lat: {user?.home_location?.lat?.toFixed(6)}, Lng: {user?.home_location?.lng?.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Raio permitido: {user?.location_radius_meters || 100}m
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
