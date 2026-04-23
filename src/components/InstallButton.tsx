import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallButton = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = async () => {
    if (!deferred) {
      toast.info("Pour installer", {
        description:
          "Sur iOS: Partager → Sur l'écran d'accueil. Sur Android: menu → Installer l'application.",
      });
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Application installée !");
      setInstalled(true);
    }
    setDeferred(null);
  };

  if (installed) return null;

  return (
    <Button
      onClick={onClick}
      size="lg"
      className="gap-2 bg-gradient-primary text-primary-foreground shadow-glacier hover:shadow-glacier hover:opacity-95 transition-all"
    >
      <Download className="h-4 w-4" />
      Installer l'application
    </Button>
  );
};
