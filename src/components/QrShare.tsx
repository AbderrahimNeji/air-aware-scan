import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const isLocalHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

export const QrShare = () => {
  const [open, setOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const envUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
    if (envUrl) return envUrl;
    return window.location.origin;
  }, []);

  const currentHostLocal = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isLocalHost(window.location.hostname);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
          <QrCode className="h-4 w-4" /> QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Ouvrir sur mobile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-2">
          <div className="w-full space-y-2 text-center">
            <div className="text-sm font-medium">URL detectee automatiquement</div>
            <p className="break-all text-xs text-muted-foreground">{shareUrl}</p>
            {currentHostLocal && (
              <p className="text-xs text-amber-700">
                En mode local, les autres appareils ne pourront pas ouvrir l'app avec ce QR. Lancez l'app avec
                une adresse reseau ou une URL publique pour un acces universel.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-glacier">
            <QRCodeSVG value={shareUrl} size={200} fgColor="#0c4a6e" level="M" />
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">{shareUrl || "URL non definie"}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
