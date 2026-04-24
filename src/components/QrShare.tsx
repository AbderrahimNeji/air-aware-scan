import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PUBLIC_APP_URL = "https://air-aware-app.vercel.app/";

export const QrShare = () => {
  const [open, setOpen] = useState(false);

  const shareUrl = useMemo(() => {
    return PUBLIC_APP_URL;
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
            <p className="text-xs text-emerald-700">Lien public actif, accessible sur tous les appareils.</p>
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
