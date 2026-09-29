import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "alcove-install-dismissed";

/**
 * Install banner for Android and Apple devices.
 *
 * - Android/Chrome fires `beforeinstallprompt`; we surface the native
 *   install dialog directly.
 * - iOS Safari never fires it, so we show the Add to Home Screen gesture
 *   (Share → Add to Home Screen) — but only when the app isn't already
 *   installed and the visitor isn't on desktop.
 */
export function InstallBanner() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (hidden || promptEvent) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    const isApple = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isApple) {
      setShowIosHint(true);
    }
  }, [hidden, promptEvent]);

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setHidden(true);
  };

  if (promptEvent) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
          <div className="min-w-0">
            <p className="text-sm font-medium">Add Alcove to your home screen</p>
            <p className="text-xs text-muted-foreground">
              Full screen, offline-ready, one tap away.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss"
              onClick={dismiss}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
          <div className="min-w-0 text-sm">
            <p className="font-medium">Add Alcove to your Home Screen</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <span aria-hidden>⎋</span> <strong>Share</strong>, then{" "}
              <strong>“Add to Home Screen”</strong>.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
