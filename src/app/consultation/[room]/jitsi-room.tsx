"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

type JitsiApi = {
  addEventListener: (event: string, cb: (...args: unknown[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
};

/**
 * Intégration WebRTC via Jitsi Meet (External API), sans installation côté patient.
 *
 * ⚠️ Note d'implémentation / conformité : `meet.jit.si` (serveur public gratuit) est utilisé
 * ici uniquement pour la démo — il n'est PAS hébergé en France ni certifié HDS et ne doit
 * jamais recevoir de vraies données de santé. En production, pointer NEXT_PUBLIC_JITSI_DOMAIN
 * vers une instance Jitsi auto-hébergée (hébergeur certifié HDS) ou remplacer cette intégration
 * par un fournisseur contractualisé HDS (LiveKit Cloud EU, Daily, Twilio Video…).
 *
 * La "salle d'attente virtuelle" est approximée par la fonctionnalité "Lobby" de Jitsi : le
 * praticien (premier arrivé, modérateur par défaut sans JWT) l'active à l'entrée en salle, ce
 * qui retient les participants suivants jusqu'à admission manuelle. Pour un contrôle fiable du
 * rôle modérateur en production, utiliser JaaS (8x8) ou un self-host avec authentification JWT.
 */
export function JitsiRoom({
  roomName,
  displayName,
  isPractitioner,
}: {
  roomName: string;
  displayName: string;
  isPractitioner: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);

  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";
    let cancelled = false;

    function init() {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: true,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "tileview",
            "hangup",
            "fullscreen",
          ],
        },
      });
      apiRef.current = api;

      if (isPractitioner) {
        api.addEventListener("videoConferenceJoined", () => {
          api.executeCommand("toggleLobby", true);
        });
      }
    }

    if (window.JitsiMeetExternalAPI) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
    };
  }, [roomName, displayName, isPractitioner]);

  return <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-black" />;
}
