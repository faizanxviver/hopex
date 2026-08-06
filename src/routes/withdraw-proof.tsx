import { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  Camera, 
  Gift, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard } from "@/components/glass";
import { money, useStore } from "@/lib/store";
import { uploadProofImage } from "@/lib/uploads.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/withdraw-proof")({
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <WithdrawProof />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function WithdrawProof() {
  const { db, user, refresh } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Get the most recent completed withdrawal to attach the proof to
  const lastWithdrawal = db.transactions.find(
    (t) => t.userId === user?.id && t.type === "withdraw" && t.status === "completed"
  );

  if (!user) return null;

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image");
    
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.readAsDataURL(file);
      });
      
      const res = await uploadProofImage({ 
        data: { base64, name: file.name, purpose: "branding" } 
      });
      setUrl(res.url);
      toast.success("Screenshot uploaded!");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!url) return;
    if (!lastWithdrawal) return toast.error("No completed withdrawal found");
    
    setSubmitting(true);
    try {
      // Add to withdrawal_proofs table using any for type safety against out-of-date types
      const { error } = await (supabase.from("withdrawal_proofs" as any) as any).insert({
        user_id: user.id,
        transaction_id: lastWithdrawal.id,
        image_url: url,
        amount: db.settings.proofRewardAmount,
        status: "pending"
      });

      if (error) throw error;

      toast.success("Proof submitted! Reward will be added after review.");
      void refresh();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 py-4">
      <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black">Congratulations!</h1>
        <p className="text-sm text-muted-foreground">Your withdrawal was successful.</p>
      </div>

      <GlassCard className="p-6 text-center" glow>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-gold">
          <Gift className="h-7 w-7" />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold">Earn {money(db.settings.proofRewardAmount)} Bonus</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Upload a screenshot of your payment receipt (JazzCash/Easypaisa) to receive an extra reward.
        </p>

        <div 
          onClick={() => !busy && !url && fileRef.current?.click()}
          className="group relative mt-6 flex h-64 w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-border/60 bg-background/30 transition-all hover:border-primary/50"
        >
          {busy ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-xs font-bold text-muted-foreground">Uploading...</p>
            </div>
          ) : url ? (
            <>
              <img src={url} alt="Proof" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button 
                  onClick={(e) => { e.stopPropagation(); setUrl(""); }}
                  className="rounded-xl bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md"
                >
                  Change Screenshot
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-bold text-muted-foreground">Click to upload receipt</p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">Receiver details will be automatically hidden</p>
            </div>
          )}
        </div>

        <input 
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePick}
        />

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-primary/5 p-4 text-left">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Our AI automatically blurs sensitive receiver information before submitting to admin. Your sender details remain visible for verification.
          </p>
        </div>

        <button
          onClick={submit}
          disabled={!url || submitting}
          className="btn-glass btn-glass-primary mt-6 flex h-13 w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit Proof for Reward
        </button>

        <Link to="/dashboard" className="mt-4 block text-xs font-medium text-muted-foreground hover:underline">
          Skip for now
        </Link>
      </GlassCard>
    </div>
  );
}
