import { useState } from "react";
import { Camera, Loader2, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VisionResult {
  lieu?: string;
  type?: string;
  sources?: string[];
  qualite?: string;
  aqi_estime?: number;
  localisation_tunisie?: string;
  analyse?: string;
  recommandations?: string[];
  error?: string;
}

export const PhotoDetector = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setResult(null);
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("pollution-vision", {
          body: { imageBase64: dataUrl },
        });
        if (error) throw error;
        setResult(data);
      } catch (e: any) {
        toast.error("Échec de l'analyse", { description: e.message });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold">Détection IA sur photo</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Téléchargez une image — l'IA détecte le lieu et estime la pollution visible.
      </p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center transition hover:border-primary hover:bg-secondary">
        {preview ? (
          <img src={preview} alt="aperçu" className="max-h-48 rounded-lg object-contain" />
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cliquer ou glisser une image</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 space-y-3 rounded-xl bg-gradient-glacier p-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {result.localisation_tunisie && (
              <Field label="Lieu identifié" value={result.localisation_tunisie} />
            )}
            {result.type && <Field label="Type" value={result.type} />}
            {result.qualite && <Field label="Qualité de l'air" value={result.qualite} />}
            {result.aqi_estime !== undefined && (
              <Field label="AQI estimé" value={String(result.aqi_estime)} />
            )}
          </div>
          {result.sources && result.sources.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Sources de pollution</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {result.sources.map((s, i) => (
                  <span key={i} className="rounded-full bg-card px-2.5 py-1 text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}
          {result.analyse && (
            <p className="text-foreground/80">{result.analyse}</p>
          )}
          {result.recommandations && result.recommandations.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-foreground/80">
              {result.recommandations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}
      {result?.error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5" /> {result.error}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-card/70 p-2.5">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);
