import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { PollutionRow } from "@/lib/pollution";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export const AiAssistant = ({ data }: { data: PollutionRow[] }) => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 Je suis votre assistant pollution. Posez-moi des questions sur la qualité de l'air en Tunisie, comme : *Quelle ville a la pire pollution ?* ou *Que signifie un AQI de 150 ?*",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const csv = data.length
      ? "ville,gouvernorat,pm25,no2,o3,aqi\n" +
        data.map((r) => `${r.ville},${r.gouvernorat},${r.pm25},${r.no2},${r.o3},${r.aqi}`).join("\n")
      : "";

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pollution-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          pollutionData: csv,
        }),
      });

      if (resp.status === 429) {
        toast.error("Trop de requêtes, réessayez plus tard.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;

      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) =>
                m.map((msg, i) => (i === m.length - 1 ? { ...msg, content: acc } : msg))
              );
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[560px] flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="rounded-lg bg-gradient-primary p-1.5">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Assistant IA</h3>
          <p className="text-xs text-muted-foreground">Contextualisé sur les données Tunisie</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-current">
                <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> L'assistant réfléchit…
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Posez votre question…"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="bg-gradient-primary">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
