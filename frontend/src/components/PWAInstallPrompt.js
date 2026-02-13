import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './ui/button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if should show iOS prompt
    if (iOS && !standalone) {
      const lastPrompt = localStorage.getItem('pwa-ios-prompt');
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (!lastPrompt || parseInt(lastPrompt) < dayAgo) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('PWA install outcome:', outcome);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-ios-prompt', Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Instalar CLOCKLN</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {isIOS 
                    ? 'Toque em "Compartilhar" e depois "Adicionar à Tela Inicial"'
                    : 'Instale o app para acesso rápido e notificações'
                  }
                </p>
              </div>
              <button 
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {!isIOS && deferredPrompt && (
              <Button
                onClick={handleInstall}
                className="w-full mt-3 btn-glow-blue"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Instalar Agora
              </Button>
            )}
            
            {isIOS && (
              <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-center text-muted-foreground">
                  📱 Safari → <span className="text-primary">⎙</span> → "Adicionar à Tela de Início"
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
