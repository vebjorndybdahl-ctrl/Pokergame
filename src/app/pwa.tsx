"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Pwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => {
      setHidden(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setHidden(true);
    setDeferred(null);
  }

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 0.75rem 0.6rem 1rem",
        borderRadius: "999px",
        background: "rgba(3, 12, 8, 0.92)",
        border: "1px solid rgba(245, 212, 114, 0.4)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        color: "#e8efe9",
        fontSize: "0.9rem",
        backdropFilter: "blur(6px)",
      }}
    >
      <span>Installer Alpha Poker</span>
      <button
        onClick={install}
        style={{
          padding: "0.4rem 0.9rem",
          borderRadius: "999px",
          border: "none",
          fontWeight: 700,
          cursor: "pointer",
          background: "linear-gradient(180deg, #fbe6a0 0%, #eec45e 52%, #cf9f3c 100%)",
          color: "#29200a",
        }}
      >
        Installer
      </button>
      <button
        onClick={() => setHidden(true)}
        aria-label="Lukk"
        style={{
          padding: "0.2rem 0.5rem",
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color: "rgba(232, 239, 233, 0.55)",
          fontSize: "1.1rem",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
