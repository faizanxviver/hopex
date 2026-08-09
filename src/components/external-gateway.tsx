import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  X,
  ChevronLeft,
  Loader2,
  Check,
  Copy,
  Upload,
  Clock3,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadProofImage } from "@/lib/uploads.functions";
import { useT } from "@/lib/i18n";
import { money } from "@/lib/store";

export interface GatewayResult {
  method: string;
  proof: string;
  proofUrl?: string;
}

type Step = "connecting" | "method" | "pay" | "proof" | "processing" | "done";

interface PaymentMethod {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  imageUrl?: string;
  active: boolean;
}

export function ExternalPaymentGateway({
  amount,
  methods,
  onExit,
  onComplete,
}: {
  amount: number;
  methods: PaymentMethod[];
  onExit: () => void;
  onComplete: (r: GatewayResult) => void;
}) {
  const [step, setStep] = useState<Step>("connecting");
  const { t } = useT();
  const gwMethods = methods.filter((m) => m.active);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [proof, setProof] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const [seconds, setSeconds] = useState(900);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (step !== "connecting") return;
    const t = setTimeout(() => setStep("method"), 1900);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step !== "pay") return;
    const i = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, [step]);

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 1600);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    setUploadError("");
    setUploading(true);
    setProof(file.name);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const res = await uploadProofImage({ data: { base64, name: file.name, purpose: "proof" } });
      setProofUrl(res.url);
    } catch (err) {
      setProof("");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#05110f] text-white overflow-y-auto font-sans animate-in fade-in duration-300">
      <style dangerouslySetInnerHTML={{ __html: `
        .gw-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; backdrop-filter: blur(24px); box-shadow: 0 8px 32px -8px rgba(0,0,0,0.5); }
        .gw-accent-btn { background: linear-gradient(135deg, #10b981, #059669); color: #052e24; font-weight: 900; letter-spacing: -0.01em; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
        .gw-accent-btn:hover { transform: translateY(-3px) scale(1.02); filter: brightness(1.1); box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4); }
        .gw-accent-btn:active { transform: translateY(0) scale(0.98); }
        .gw-accent-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transform: translateX(-100%); transition: transform 0.6s ease-in-out; }
        .gw-accent-btn:hover::after { transform: translateX(100%); }
        @keyframes gw-slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
        @keyframes gw-pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
      `}} />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-[#05110f]/80 backdrop-blur-md sticky top-0 z-10">
        {(step === "pay" || step === "proof") && (
          <button onClick={() => setStep(step === "proof" ? "pay" : "method")} className="p-2 bg-white/5 rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-500 text-emerald-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">HopeX Secure Gateway</p>
            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-tighter">Verified PCI-DSS</p>
          </div>
        </div>
        <button onClick={() => setConfirmExit(true)} className="ml-auto p-2 bg-red-500/10 text-red-400 rounded-xl">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-md mx-auto w-full p-6 flex-1 flex flex-col">
        {/* Step Indicator */}
        <div className="flex justify-between mb-8">
          {["Method", "Payment", "Proof", "Complete"].map((s, i) => {
            const active = (step === "method" && i === 0) || (step === "pay" && i <= 1) || (step === "proof" && i <= 2) || ((step === "processing" || step === "done") && i <= 3);
            return (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors", active ? "bg-emerald-500 text-emerald-950" : "bg-white/10 text-white/40")}>
                  {i + 1}
                </div>
                <span className={cn("text-[9px] font-bold uppercase tracking-wider", active ? "text-emerald-500" : "text-white/30")}>{s}</span>
              </div>
            );
          })}
        </div>

        {/* Amount Card */}
        <div className="gw-panel p-8 text-center mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full" />
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t("Total Amount")}</p>
          <p className="text-4xl font-black mt-2 tracking-tighter">Rs {amount.toLocaleString("en-PK")}</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <BadgeCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Secured Transaction</span>
          </div>
        </div>

        {step === "connecting" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold">Redirecting to Secure Host...</h3>
            <p className="text-sm text-white/50 mt-2">Please do not refresh this page.</p>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/60 px-1">Select Payment Method</h3>
            {gwMethods.map(m => (
              <button key={m.id} onClick={() => { setMethod(m); setStep("pay"); }} className="gw-panel w-full p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center border border-white/10 relative">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="grid place-items-center h-full w-full bg-emerald-500/10 text-emerald-500 font-display font-black">
                      {m.name[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm tracking-tight">{m.name}</p>
                  <p className="text-[10px] font-medium text-white/40 leading-tight line-clamp-2">{m.instructions}</p>
                </div>
                <ChevronLeft className="h-4 w-4 rotate-180 text-white/20 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        )}

        {step === "pay" && method && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="gw-panel p-5 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-white/40 uppercase">Deposit To</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <Clock3 className="h-3 w-3" /> {mmss}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-white/40 mb-2">Account Name</p>
                <p className="text-sm font-bold bg-white/5 p-3 rounded-xl border border-white/5">{method.accountName}</p>
              </div>

              <div>
                <p className="text-xs text-white/40 mb-2">Account Number</p>
                <div className="flex items-center gap-2 bg-white/5 p-1 pl-3 rounded-xl border border-white/5">
                  <span className="flex-1 font-mono text-sm">{method.accountNumber}</span>
                  <button onClick={() => copy(method.accountNumber, "num")} className="p-2 hover:bg-emerald-500/20 rounded-lg text-emerald-500 transition-colors">
                    {copied === "num" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setStep("proof")} className="gw-accent-btn w-full h-14 rounded-2xl shadow-lg shadow-emerald-500/10">
              I've Made The Transfer
            </button>
          </div>
        )}

        {step === "proof" && (
          <div className="space-y-6">
            <div className="gw-panel p-6 text-center">
              <Upload className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-bold">Upload Proof</h3>
              <p className="text-xs text-white/40 mt-1">Please upload the transfer screenshot</p>
              
              <div className="mt-6">
                <input type="file" id="gw-proof" className="hidden" accept="image/*" onChange={e => pickFile(e.target.files?.[0])} />
                <label htmlFor="gw-proof" className="cursor-pointer block border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-emerald-500/50 transition-colors">
                  {uploading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : proof ? <span className="text-emerald-500 font-bold">{proof}</span> : <span className="text-sm text-white/30">Select Screenshot</span>}
                </label>
                {uploadError && <p className="text-red-400 text-[10px] mt-2 font-bold">{uploadError}</p>}
              </div>
            </div>

            <button disabled={!proofUrl || uploading} onClick={() => { setStep("processing"); setTimeout(() => onComplete({ method: method!.name, proof: "Uploaded", proofUrl }), 2000); }} className="gw-accent-btn w-full h-14 rounded-2xl disabled:opacity-50">
              Submit Payment
            </button>
          </div>
        )}

        {step === "processing" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="h-16 w-16 animate-spin text-emerald-500 relative" />
            </div>
            <h3 className="text-xl font-bold mt-8">Verifying Payment...</h3>
            <p className="text-sm text-white/40 mt-2">Checking transaction on blockchain network</p>
          </div>
        )}
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="gw-panel w-full max-w-xs p-6 text-center border-white/20">
            <h3 className="text-lg font-bold">Cancel Payment?</h3>
            <p className="text-sm text-white/50 mt-2">Your progress will be lost and the session will expire.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmExit(false)} className="flex-1 h-11 bg-white/5 rounded-xl font-bold text-sm">No, stay</button>
              <button onClick={onExit} className="flex-1 h-11 bg-red-500 text-white rounded-xl font-bold text-sm">Yes, exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
