import { useEffect, useState } from "react";
import {
  Copy,
  Check,
  ShieldCheck,
  X,
  Upload,
  Lock,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  BadgeCheck,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadProofImage } from "@/lib/uploads.functions";
import { useStore, type PaymentMethod } from "@/lib/store";
import { useT } from "@/lib/i18n";

export interface GatewayResult {
  method: string;
  proof: string;
  proofUrl?: string;
}

type Step = "connecting" | "method" | "pay" | "proof" | "processing" | "done";

export function PaymentGateway({
  amount,
  onExit,
  onComplete,
}: {
  amount: number;
  onExit: () => void;
  onComplete: (r: GatewayResult) => void;
}) {
  const [step, setStep] = useState<Step>("connecting");
  const { db } = useStore();
  const { t } = useT();
  const gwMethods = db.methods.filter((m) => m.active);
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
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image must be under 8MB.");
      return;
    }
    setUploadError("");
    setUploading(true);
    setProof(file.name);
    setProofUrl("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read the file"));
        reader.readAsDataURL(file);
      });
      const res = await uploadProofImage({ data: { base64, name: file.name, purpose: "proof" } });
      setProofUrl(res.url);
    } catch (err) {
      setProof("");
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    setStep("processing");
    setTimeout(() => setStep("done"), 2200);
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="gateway-scope fixed inset-0 z-[100] flex flex-col overflow-y-auto">
      {/* Gateway top bar */}
      <div
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--gw-line)" }}
      >
        {step === "pay" || step === "proof" ? (
          <button
            onClick={() => setStep(step === "proof" ? "pay" : "method")}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: "#ffffff10" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{
              background: "linear-gradient(135deg,var(--gw-accent),var(--gw-accent-2))",
              color: "#04231b",
            }}
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide">SecurePay Gateway</p>
            <p className="truncate text-[11px]" style={{ color: "var(--gw-dim)" }}>
              PCI-DSS · 256-bit TLS encrypted
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden items-center gap-1 rounded-full px-3 py-1 text-[11px] sm:flex"
            style={{ background: "#ffffff10", color: "var(--gw-dim)" }}
          >
            <Lock className="h-3 w-3" /> Secure session
          </span>
          <button
            onClick={() => setConfirmExit(true)}
            aria-label="Exit gateway"
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: "#ff4d4d22", color: "#ff9c9c" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {/* labelled step rail */}
        {(() => {
          const order: Step[] = ["connecting", "method", "pay", "proof", "processing", "done"];
          const idx = order.indexOf(step);
          const labels = ["Method", "Pay", "Proof", "Done"];
          const active = Math.min(3, Math.max(0, idx - 1));
          return (
            <div className="mb-6 flex items-center">
              {labels.map((l, i) => (
                <div key={l} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-black transition"
                      style={
                        i <= active
                          ? {
                              background:
                                "linear-gradient(135deg,var(--gw-accent),var(--gw-accent-2))",
                              color: "#04231b",
                              boxShadow: "0 0 0 4px #ffffff10",
                            }
                          : { background: "#ffffff10", color: "var(--gw-dim)" }
                      }
                    >
                      {i < active ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: i <= active ? "var(--gw-accent)" : "var(--gw-dim)" }}
                    >
                      {l}
                    </span>
                  </div>
                  {i < labels.length - 1 ? (
                    <span
                      className="mx-1 -mt-4 h-[3px] flex-1 rounded-full transition-all"
                      style={{
                        background:
                          i < active
                            ? "linear-gradient(90deg,var(--gw-accent),var(--gw-accent-2))"
                            : "#ffffff14",
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          );
        })()}

        {/* amount summary */}
        <div className="relative mb-6 overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/40 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[100px]"
            style={{ background: "var(--gw-accent)", opacity: 0.15 }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full blur-[100px]"
            style={{ background: "var(--gw-accent-2)", opacity: 0.1 }}
          />
          
          <p
            className="relative text-[10px] font-black uppercase tracking-[0.3em]"
            style={{ color: "var(--gw-dim)" }}
          >
            {t("Secure Payment Amount")}
          </p>
          <p className="relative mt-2 font-display text-5xl font-black tracking-tight text-white">
            <span className="text-2xl align-top mr-1 opacity-50">Rs</span>
            {amount.toLocaleString("en-PK")}
          </p>
          <div className="relative mt-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <p className="text-xs font-bold" style={{ color: "var(--gw-dim)" }}>
              Order #{String(Math.abs(amount * 7919)).slice(0, 8)}
            </p>
          </div>
        </div>

          <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"
              style={{ background: "#ffffff10", color: "var(--gw-dim)" }}
            >
              <BadgeCheck className="h-3 w-3" /> Verified merchant
            </span>
            <span
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"
              style={{ background: "#ffffff10", color: "var(--gw-dim)" }}
            >
              <Lock className="h-3 w-3" /> Escrow protected
            </span>
            {step === "pay" ? (
              <span
                className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ background: "#ffffff10", color: "var(--gw-accent)" }}
              >
                <Clock3 className="h-3 w-3" /> {mmss}
              </span>
            ) : null}
          </div>


        {step === "connecting" ? (
          <div className="gw-panel flex flex-col items-center gap-4 p-10 text-center">
            <span className="relative grid h-16 w-16 place-items-center">
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ background: "var(--gw-accent)", opacity: 0.18 }}
              />
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--gw-accent)" }} />
            </span>
            <p className="text-lg font-bold">Going to payment gateway…</p>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "#ffffff14" }}
            >
              <span
                className="block h-full w-1/3 rounded-full"
                style={{
                  background: "linear-gradient(90deg,var(--gw-accent),var(--gw-accent-2))",
                  animation: "gw-slide 1.4s ease-in-out infinite",
                }}
              />
            </div>
            <ul className="w-full space-y-1.5 text-left text-xs" style={{ color: "var(--gw-dim)" }}>
              <li>· Verifying merchant certificate</li>
              <li>· Opening encrypted 256-bit TLS channel</li>
              <li>· Loading available payment methods</li>
            </ul>
          </div>
        ) : null}

        {step === "method" ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Select a payment method</p>
            <p className="text-xs" style={{ color: "var(--gw-dim)" }}>
              Choose where you want to send Rs {amount.toLocaleString("en-PK")}.
            </p>
            {gwMethods.length === 0 ? (
              <p className="gw-panel p-5 text-sm" style={{ color: "var(--gw-dim)" }}>
                No payment methods are available right now. Please try again shortly.
              </p>
            ) : null}
            {gwMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMethod(m);
                  setStep("pay");
                }}
                className="gw-panel flex w-full items-center gap-3 p-4 text-left transition hover:-translate-y-0.5"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                  style={{ background: "#ffffff10", color: "var(--gw-accent)" }}
                >
                  {m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt={m.name}
                      className="h-11 w-11 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="text-sm font-black">{m.name[0]}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{m.name}</span>
                  <span className="block truncate text-xs" style={{ color: "var(--gw-dim)" }}>
                    {m.instructions}
                  </span>
                </span>
                <span
                  className="hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:block"
                  style={{ background: "#ffffff10", color: "var(--gw-accent)" }}
                >
                  Instant
                </span>
                <ChevronLeft className="h-4 w-4 rotate-180" style={{ color: "var(--gw-dim)" }} />
              </button>
            ))}
          </div>
        ) : null}

        {step === "pay" && method ? (
          <div className="space-y-4">
            <div className="gw-panel p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{method.name}</p>
                <span
                  className="rounded-full px-3 py-1 text-[11px]"
                  style={{ background: "#ffffff10" }}
                >
                  expires in {mmss}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--gw-dim)" }}>
                {method.accountName}
              </p>

              <div
                className="mt-4 flex items-center gap-2 rounded-xl px-3 py-3"
                style={{ background: "#ffffff0d", border: "1px dashed var(--gw-line)" }}
              >
                <p className="min-w-0 flex-1 break-all font-mono text-sm">{method.accountNumber}</p>
                <button
                  onClick={() => copy(method.accountNumber, "acct")}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: "#ffffff14", color: "var(--gw-accent)" }}
                >
                  {copied === "acct" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied === "acct" ? "Copied" : "Copy"}
                </button>
              </div>

              <div
                className="mt-3 flex items-center gap-2 rounded-xl px-3 py-3"
                style={{ background: "#ffffff0d", border: "1px dashed var(--gw-line)" }}
              >
                <p className="min-w-0 flex-1 font-mono text-sm">
                  Rs {amount.toLocaleString("en-PK")}
                </p>
                <button
                  onClick={() => copy(String(amount), "amt")}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: "#ffffff14", color: "var(--gw-accent)" }}
                >
                  {copied === "amt" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied === "amt" ? "Copied" : "Copy"}
                </button>
              </div>

              <ol className="mt-4 space-y-1.5 text-xs" style={{ color: "var(--gw-dim)" }}>
                <li>1. Copy the account number above and open your payment app.</li>
                <li>2. Send exactly Rs {amount.toLocaleString("en-PK")} to that account.</li>
                <li>3. Take a screenshot of the successful payment.</li>
                <li>4. Continue and upload the screenshot to confirm.</li>
              </ol>
            </div>

            <button
              onClick={() => setStep("proof")}
              className="gw-accent-btn h-12 w-full rounded-xl"
            >
              I have paid — continue
            </button>
          </div>
        ) : null}

        {step === "proof" && method ? (
          <div className="space-y-4">
            <div className="gw-panel p-5">
              <p className="text-sm font-bold">Confirm your payment</p>
              <p className="mt-1 text-xs" style={{ color: "var(--gw-dim)" }}>
                Just upload the payment screenshot — no transaction ID needed.
              </p>

              <label className="mt-4 block text-xs" style={{ color: "var(--gw-dim)" }}>
                Payment screenshot (required)
              </label>

              <label
                className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-4 py-5 text-sm"
                style={{ border: "1px dashed var(--gw-line)", background: "#ffffff08" }}
              >
                {uploading ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    style={{ color: "var(--gw-accent)" }}
                  />
                ) : (
                  <Upload className="h-4 w-4 shrink-0" style={{ color: "var(--gw-accent)" }} />
                )}
                <span className="truncate">
                  {uploading ? "Uploading screenshot…" : proof || "Tap to upload proof of payment"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void pickFile(e.target.files?.[0])}
                />
              </label>
              {proofUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={proofUrl}
                    alt="Payment screenshot preview"
                    className="h-16 w-16 rounded-lg object-cover"
                    style={{ border: "1px solid var(--gw-line)" }}
                  />
                  <p
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--gw-accent)" }}
                  >
                    <Check className="h-3.5 w-3.5" /> Screenshot uploaded
                  </p>
                </div>
              ) : null}
              {uploadError ? (
                <p className="mt-2 text-xs" style={{ color: "#ff8a8a" }}>
                  {uploadError}
                </p>
              ) : null}
            </div>

            <button
              disabled={!proofUrl || uploading}
              onClick={submit}
              className={cn(
                "h-12 w-full rounded-xl gw-accent-btn",
                (!proofUrl || uploading) && "opacity-40",
              )}
            >
              {uploading ? "Uploading screenshot…" : "Submit payment"}
            </button>
          </div>
        ) : null}

        {step === "processing" ? (
          <div className="gw-panel flex flex-col items-center gap-4 p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--gw-accent)" }} />
            <p className="text-lg font-bold">Verifying your payment…</p>
            <p className="text-sm" style={{ color: "var(--gw-dim)" }}>
              Do not close this window.
            </p>
          </div>
        ) : null}

        {step === "done" && method ? (
          <div className="gw-panel flex flex-col items-center gap-3 p-10 text-center">
            <CheckCircle2 className="h-14 w-14" style={{ color: "var(--gw-accent)" }} />
            <p className="text-xl font-black">Payment submitted</p>
            <p className="text-sm" style={{ color: "var(--gw-dim)" }}>
              Rs {amount.toLocaleString("en-PK")} via {method.name} has been sent for verification.
              You will be notified once the funds are credited.
            </p>
            <button
              onClick={() => onComplete({ method: method.name, proof, proofUrl })}
              className="gw-accent-btn mt-3 h-12 w-full rounded-xl"
            >
              Exit gateway
            </button>
          </div>
        ) : null}

        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t pt-4 text-[11px]"
          style={{ borderColor: "var(--gw-line)", color: "var(--gw-dim)" }}
        >
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" /> 256-bit TLS
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> PCI-DSS Level 1
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <BadgeCheck className="h-3 w-3" /> Escrow protected
          </span>
        </div>
        <p className="mt-2 text-center text-[11px]" style={{ color: "var(--gw-dim)" }}>
          Powered by SecurePay · Never share your OTP or password with anyone.
        </p>
      </div>

      {confirmExit ? (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4">
          <div
            className="gw-panel w-full max-w-sm p-6 text-center"
            style={{ background: "var(--gw-panel)" }}
          >
            <p className="text-lg font-bold">Cancel this payment?</p>
            <p className="mt-2 text-sm" style={{ color: "var(--gw-dim)" }}>
              Your transaction is not complete. If you exit now, nothing will be submitted.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmExit(false)}
                className="h-11 flex-1 rounded-xl text-sm font-semibold"
                style={{ background: "#ffffff12" }}
              >
                Stay
              </button>
              <button
                onClick={onExit}
                className="h-11 flex-1 rounded-xl text-sm font-bold"
                style={{ background: "#ff4d4d", color: "#2b0000" }}
              >
                Exit anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
