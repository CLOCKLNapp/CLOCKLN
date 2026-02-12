import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Clock, RefreshCw, Maximize2, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

export default function TotemPage() {
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastClockIn, setLastClockIn] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { api, company } = useAuth();
  const { t } = useLanguage();

  const fetchQR = useCallback(async () => {
    try {
      const response = await api.get('/qr/current');
      setQrData(response.data);
      setTimeLeft(response.data.expires_in_seconds);
    } catch (error) {
      console.error('Failed to fetch QR:', error);
      toast.error(t('error'));
    }
  }, [api, t]);

  // Fetch QR code
  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchQR]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen totem-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_60%)]" />
      
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        data-testid="fullscreen-btn"
        className="absolute top-6 right-6 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Maximize2 className="w-5 h-5 text-white/70" />
      </button>

      {/* Company name */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 left-6 flex items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-bold text-white/90 font-[Manrope]">
          {company?.name || 'CLOCKLN'}
        </span>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 z-10"
      >
        {/* Clock display */}
        <div className="text-center mb-4">
          <div className="clock-digits text-6xl md:text-8xl font-black text-white tracking-wider mb-2">
            {formatTime(currentTime)}
          </div>
          <p className="text-xl text-zinc-400 font-[Manrope]">{formatDate(currentTime)}</p>
        </div>

        {/* QR Code */}
        <div className="relative">
          <motion.div
            key={qrData?.code}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="qr-container"
            data-testid="qr-code-container"
          >
            {qrData?.code ? (
              <QRCode
                value={qrData.code}
                size={280}
                level="H"
                data-testid="qr-code"
              />
            ) : (
              <div className="w-[280px] h-[280px] flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-zinc-400 animate-spin" />
              </div>
            )}
          </motion.div>
          
          {/* Scan line animation */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line opacity-50" />
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mt-4">
          <h2 className="text-2xl font-bold text-white mb-2 font-[Manrope]">
            {t('scan_this_code')}
          </h2>
          <p className="text-zinc-400">
            {t('code_expires_in')}{' '}
            <span className="font-mono text-primary font-bold">{timeLeft}</span>{' '}
            {t('seconds')}
          </p>
        </div>

        {/* Timer progress */}
        <div className="w-80 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-emerald-500"
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 30) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Last clock-in notification */}
        {lastClockIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass px-6 py-4 rounded-2xl flex items-center gap-4"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="font-semibold text-white">{lastClockIn.name}</p>
              <p className="text-sm text-zinc-400">
                {lastClockIn.action === 'clock_in' ? t('clock_in_success') : t('clock_out_success')}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <div className="glass px-6 py-3 rounded-full flex items-center gap-4">
          <Users className="w-5 h-5 text-zinc-400" />
          <span className="text-sm text-zinc-400">{t('totem_mode')}</span>
        </div>
      </div>
    </div>
  );
}
