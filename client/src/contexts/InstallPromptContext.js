import React, { createContext, useContext, useEffect, useState } from 'react';

const InstallPromptContext = createContext({
  canInstall: false,
  promptInstall: async () => {},
});

export const InstallPromptProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <InstallPromptContext.Provider value={{ canInstall, promptInstall }}>
      {children}
    </InstallPromptContext.Provider>
  );
};

export const useInstallPrompt = () => useContext(InstallPromptContext);
