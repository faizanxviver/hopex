import { useEffect, useState } from "react";
import { money, useStore } from "@/lib/store";
import { GlassCard } from "@/components/glass";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function WithdrawalProofsCarousel() {
  const { db } = useStore();
  const [proofs, setProofs] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("withdrawal_proofs" as any)
        .select("amount, image_url")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setProofs(data);
    };
    fetch();
  }, []);

  if (!db.settings.showProofsSection || proofs.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 overflow-hidden">
      <h2 className="text-center font-display text-2xl font-black mb-8 flex items-center justify-center gap-3">
        <ShieldCheck className="h-6 w-6 text-success" />
        Verified Payouts
      </h2>
      <div className="flex gap-4 animate-scroll hover:pause-scroll">
        {[...proofs, ...proofs].map((p, i) => (
          <GlassCard 
            key={i} 
            className="w-48 h-64 shrink-0 p-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="h-full w-full relative group">
              <img 
                src={p.image_url} 
                alt="Proof" 
                className="h-full w-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-success">Verified Payout</p>
                <p className="font-display text-lg font-black text-white">{money(p.amount)}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
