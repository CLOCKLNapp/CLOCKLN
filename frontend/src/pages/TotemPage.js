import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Clock, RefreshCw, Maximize2, Users, CheckCircle2, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

export default function TotemPage() {
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentEvents, setRecentEvents] = useState([]);
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
    }
  }, [api]);

  const fetchRecentEvents = useCallback(async () => {
    try {
      const response = await api.get('/totem/recent-events');
      setRecentEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  }, [api]);

  // Fetch QR code and events
  useEffect(() => {
    fetchQR();
    fetchRecentEvents();
  }, [fetchQR, fetchRecentEvents]);

  // Countdown timer and refresh
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

  // Poll for recent events every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecentEvents();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchRecentEvents]);

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

  const formatEventTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="min-h-screen totem-bg flex relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_60%)]" />
      
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        data-testid="fullscreen-btn"
        className="absolute top-6 right-6 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors z-20"
      >
        <Maximize2 className="w-5 h-5 text-white/70" />
      </button>

      {/* Company name */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 left-6 flex items-center gap-3 z-20"
      >
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-bold text-white/90 font-[Manrope]">
          {company?.name || 'CLOCKLN'}
        </span>
      </motion.div>

      {/* Main QR Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Clock display */}
          <div className="text-center mb-2">
            <div className="clock-digits text-5xl md:text-7xl font-black text-white tracking-wider mb-2">
              {formatTime(currentTime)}
            </div>
            <p className="text-lg text-zinc-400 font-[Manrope]">{formatDate(currentTime)}</p>
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
                  size={240}
                  level="H"
                  data-testid="qr-code"
                />
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center">
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
          <div className="text-center mt-2">
            <h2 className="text-xl font-bold text-white mb-2 font-[Manrope]">
              {t('scan_this_code')}
            </h2>
            <p className="text-zinc-400">
              {t('code_expires_in')}{' '}
              <span className="font-mono text-primary font-bold">{timeLeft}</span>{' '}
              {t('seconds')}
            </p>
          </div>

          {/* Timer progress */}
          <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-emerald-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 30) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Recent Events Sidebar */}
      <div className="w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col z-10">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Registros Recentes
        </h3>

        <div className="flex-1 space-y-3 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {recentEvents.length > 0 ? (
              recentEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.8 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border ${
                    event.action === 'clock_in' 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      event.action === 'clock_in' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                    }`}>
                      {event.action === 'clock_in' ? (
                        <LogIn className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <LogOut className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{event.user_name}</p>
                      <p className={`text-sm ${
                        event.action === 'clock_in' ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        {event.action === 'clock_in' ? 'Entrada' : 'Saída'} - {formatEventTime(event.time)}
                      </p>
                    </div>
                    <CheckCircle2 className={`w-6 h-6 ${
                      event.action === 'clock_in' ? 'text-emerald-400' : 'text-blue-400'
                    }`} />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Aguardando registros...</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
            <Users className="w-4 h-4" />
            <span>{t('totem_mode')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
