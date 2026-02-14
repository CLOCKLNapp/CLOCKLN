import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, CheckCircle2, XCircle, Loader2, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanLock = useRef(false);

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleScan = async (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0 || scanLock.current || isProcessing) return;
    
    const code = detectedCodes[0]?.rawValue;
    if (!code) return;

    scanLock.current = true;
    setIsProcessing(true);
    setIsScanning(false);

    try {
      const response = await api.post('/clock/scan', { qr_code: code });
      setResult({
        success: true,
        action: response.data.action,
        time: response.data.time,
        totalHours: response.data.total_hours,
        message: response.data.action === 'clock_in' ? t('clock_in_success') : t('clock_out_success'),
      });
      toast.success(response.data.action === 'clock_in' ? t('clock_in_success') : t('clock_out_success'));
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.detail || t('error'),
      });
      toast.error(error.response?.data?.detail || t('error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setIsScanning(true);
    scanLock.current = false;
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - with safe area padding for mobile notch */}
      <header className="flex items-center gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          data-testid="back-btn"
          className="min-w-[44px] min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold font-[Manrope]">{t('scan_qr')}</h1>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {isScanning && !result && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm"
            >
              <div className="relative rounded-3xl overflow-hidden border-2 border-primary/30 bg-black">
                <Scanner
                  onScan={handleScan}
                  onError={(error) => console.error(error)}
                  constraints={{ facingMode: 'environment' }}
                  components={{ finder: false }}
                  styles={{
                    container: { width: '100%', paddingTop: '100%', position: 'relative' },
                    video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
                  }}
                />
                
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner markers */}
                  <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-lg" />
                  
                  {/* Scan line */}
                  <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                </div>
              </div>

              <p className="text-center text-muted-foreground mt-6">
                {t('scan_to_clock')}
              </p>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="text-lg text-muted-foreground">{t('loading')}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm text-center"
            >
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                result.success ? 'bg-emerald-500/20' : 'bg-destructive/20'
              }`}>
                {result.success ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                ) : (
                  <XCircle className="w-12 h-12 text-destructive" />
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2 font-[Manrope]">
                {result.success ? (result.action === 'clock_in' ? t('clock_in') : t('clock_out')) : t('error')}
              </h2>
              
              <p className={`text-lg mb-6 ${result.success ? 'text-emerald-400' : 'text-destructive'}`}>
                {result.message}
              </p>

              {result.success && (
                <div className="glass p-6 rounded-2xl mb-6 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Clock className="w-6 h-6 text-primary" />
                    <span className="font-mono text-3xl font-bold text-white">
                      {formatTime(result.time)}
                    </span>
                  </div>
                  
                  {result.totalHours && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-sm text-muted-foreground">{t('total_hours')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {result.totalHours.toFixed(2)} {t('hours')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                  data-testid="scan-again-btn"
                >
                  {t('scan_qr')}
                </Button>
                <Button
                  className="flex-1 btn-glow-blue"
                  onClick={() => navigate('/dashboard')}
                  data-testid="go-dashboard-btn"
                >
                  {t('dashboard')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
