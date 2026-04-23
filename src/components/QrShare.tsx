import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const QrShare = () => {
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "";
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
          <div className="rounded-2xl bg-white p-4 shadow-glacier">
            <QRCodeSVG value={url} size={200} fgColor="#0c4a6e" level="M" />
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
