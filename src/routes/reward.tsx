import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  CheckCircle2,
  Clock3,
  XCircle,
  Upload,
  ImageIcon,
  Loader2,
  ArrowLeft,
  Share2,
  MessageCircle,
  Facebook,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard } from "@/components/glass";
import { money, useStore } from "@/lib/store";
import { uploadProofImage } from "@/lib/uploads.functions";
import {
  hasPendingClaim,
  rewardCooldownLeft,
  submitRewardClaim,
  useRewardClaims,
} from "@/lib/rewards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reward")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Free Reward Task — HopeX" },
      {
        name: "description",
        content:
          "Complete one simple sharing task on WhatsApp and Facebook and receive a free HopeX reward in your withdrawable balance.",
      },
      { property: "og:title", content: "Free Reward Task — HopeX" },
      { property: "og:description", content: "Share once, earn a free reward every day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <RewardTask />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/** Uploads an image to the hosted CDN and returns the public URL. */
async function upload(file: File) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("فائل نہیں پڑھی جا سکی"));
    reader.readAsDataURL(file);
  });
  const res = await uploadProofImage({ data: { base64, name: file.name, purpose: "reward" } });
  return res.url;
}

function ProofBox({
  label,
  hint,
  icon,
  tone,
  url,
  onPick,
  busy,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: string;
  url: string;
  onPick: (f: File) => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", tone)}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-extrabold">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>

      <button
        onClick={() => ref.current?.click()}
        disabled={busy}
        className={cn(
          "mt-3 grid h-36 w-full place-items-center rounded-2xl border-2 border-dashed transition",
          url ? "border-success/50 bg-success/5" : "border-border/70 bg-background/30",
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : url ? (
          <img src={url} alt={label} className="h-full w-full rounded-2xl object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <span className="text-xs font-semibold">اسکرین شاٹ اپلوڈ کریں</span>
          </span>
        )}
      </button>

      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

function RewardTask() {
  const { db, user, refresh } = useStore();
  const { claims } = useRewardClaims();
  const [tick, setTick] = useState(() => Date.now());
  const [wa, setWa] = useState("");
  const [fb, setFb] = useState("");
  const [busyWa, setBusyWa] = useState(false);
  const [busyFb, setBusyFb] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const amount = db.settings.rewardAmount;
  const cooldownHours = db.settings.rewardCooldownHours;
  const mine = useMemo(
    () => claims.filter((c) => c.userId === user?.id),
    [claims, user?.id],
  );
  const pending = hasPendingClaim(mine);
  const left = rewardCooldownLeft(mine, cooldownHours, tick);

  if (!user) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://hopex.site";
  const refLink = `${origin}/auth?mode=signup&ref=${user.referralCode}`;
  const post = `🚀 HopeX — پاکستان کا بھروسہ مند انویسٹمنٹ پلیٹ فارم 💎

✅ روزانہ منافع سیدھا آپ کے بیلنس میں
⚡ فوری ڈپازٹ اور تیز پے آؤٹ
👥 4 لیول ریفرل کمیشن
🎁 روزانہ فری ریوارڈ ٹاسک
🔒 100% محفوظ اور شفاف

ابھی جوائن کریں 👇
${refLink}

میرا ریفرل کوڈ: ${user.referralCode}`;

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(post);
      toast.success("پوسٹ اور آپ کا لنک کاپی ہو گیا");
    } catch {
      toast.error("کاپی نہیں ہو سکا");
    }
  };

  const pick = async (file: File, which: "wa" | "fb") => {
    if (!file.type.startsWith("image/")) return toast.error("صرف تصویر اپلوڈ کریں");
    if (file.size > 8 * 1024 * 1024) return toast.error("تصویر 8MB سے کم ہونی چاہیے");
    const setBusy = which === "wa" ? setBusyWa : setBusyFb;
    setBusy(true);
    try {
      const url = await upload(file);
      (which === "wa" ? setWa : setFb)(url);
      toast.success("اسکرین شاٹ اپلوڈ ہو گیا");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "اپلوڈ ناکام");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!wa || !fb) return toast.error("دونوں اسکرین شاٹس لازمی ہیں");
    setSending(true);
    try {
      await submitRewardClaim(wa, fb);
      setWa("");
      setFb("");
      toast.success("آپ کا ٹاسک ریویو کے لیے بھیج دیا گیا ہے");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "بھیجا نہیں جا سکا");
    } finally {
      setSending(false);
    }
  };

  const locked = pending || left > 0 || !db.settings.rewardActive;

  return (
    <div dir="rtl" className="space-y-5">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4 rotate-180" /> ڈیش بورڈ
      </Link>

      {/* 3D reward hero */}
      <div className="reward-3d relative overflow-hidden rounded-[2rem] p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative">
          <span className="reward-coin mx-auto grid h-20 w-20 place-items-center rounded-[1.6rem]">
            <Gift className="h-9 w-9 text-primary-foreground" />
          </span>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
            فری ریوارڈ
          </p>
          <p className="mt-1 font-display text-4xl font-black text-gradient sm:text-5xl">
            {money(amount)}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            صرف ایک آسان ٹاسک مکمل کریں اور {money(amount)} انعام حاصل کریں — رقم منظوری کے بعد
            سیدھی آپ کے قابلِ نکاسی بیلنس میں شامل ہو جائے گی۔
          </p>
        </div>
      </div>

      {/* Step 1 — copy */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-brand text-sm font-black text-primary-foreground">
            ۱
          </span>
          <p className="font-display text-lg font-extrabold">پوسٹ اپنے لنک کے ساتھ کاپی کریں</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          نیچے بٹن دبائیں — HopeX کے بارے میں تیار شدہ پوسٹ آپ کے ذاتی ریفرل لنک کے ساتھ کاپی ہو
          جائے گی۔
        </p>
        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-2xl glass-soft p-4 text-right text-xs leading-relaxed">
          {post}
        </pre>
        <button
          onClick={copyPost}
          className="btn-glass btn-glass-primary mt-3 flex h-12 w-full items-center justify-center gap-2 text-sm font-bold"
        >
          <Copy className="h-4 w-4" /> پوسٹ + لنک کاپی کریں
        </button>
      </GlassCard>

      {/* Step 2 — proofs */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-brand text-sm font-black text-primary-foreground">
            ۲
          </span>
          <p className="font-display text-lg font-extrabold">دونوں اسکرین شاٹ اپلوڈ کریں</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          آپ نے HopeX سے جو withdraw لیا ہے اس کے اسکرین شاٹ کے ساتھ یہ پوسٹ اپنے{" "}
          <b>واٹس ایپ اسٹیٹس</b> اور <b>فیس بک</b> پر لگائیں، پھر دونوں کے الگ الگ اسکرین شاٹ یہاں
          اپلوڈ کریں۔ (نوٹ: اس ٹاسک کے لیے withdraw کا اسکرین شاٹ ہونا لازمی ہے)

        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ProofBox
            label="واٹس ایپ اسٹیٹس"
            hint="اسٹیٹس کا اسکرین شاٹ"
            tone="bg-success/15 text-success"
            icon={<MessageCircle className="h-5 w-5" />}
            url={wa}
            busy={busyWa}
            onPick={(f) => void pick(f, "wa")}
          />
          <ProofBox
            label="فیس بک پوسٹ"
            hint="فیس بک پوسٹ کا اسکرین شاٹ"
            tone="bg-primary/15 text-primary"
            icon={<Facebook className="h-5 w-5" />}
            url={fb}
            busy={busyFb}
            onPick={(f) => void pick(f, "fb")}
          />
        </div>

        {locked ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4 text-center text-sm">
            {!db.settings.rewardActive ? (
              <span className="text-muted-foreground">یہ ٹاسک فی الحال بند ہے۔</span>
            ) : pending ? (
              <span className="font-semibold text-primary">
                آپ کا ٹاسک ریویو میں ہے — منظوری کے بعد رقم شامل ہو جائے گی۔
              </span>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">اگلا ٹاسک اس وقت کے بعد</p>
                <p className="mt-1 font-display text-2xl font-black tabular-nums text-gold">
                  {clock(left)}
                </p>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={sending || !wa || !fb}
            className="btn-glass btn-glass-gold mt-4 flex h-13 w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            جمع کروائیں
          </button>
        )}
      </GlassCard>

      {/* History */}
      <GlassCard className="p-5">
        <p className="font-display text-lg font-extrabold">ٹاسک ہسٹری</p>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">ابھی کوئی ٹاسک جمع نہیں کروایا گیا۔</p>
        ) : (
          <div className="mt-3 divide-y divide-border/40">
            {mine.map((c) => {
              const map = {
                pending: {
                  icon: Clock3,
                  tone: "bg-primary/15 text-primary",
                  label: "ریویو میں",
                },
                approved: {
                  icon: CheckCircle2,
                  tone: "bg-success/15 text-success",
                  label: "مکمل",
                },
                rejected: {
                  icon: XCircle,
                  tone: "bg-destructive/15 text-destructive",
                  label: "مسترد",
                },
              }[c.status];
              const Icon = map.icon;
              return (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <span
                    className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", map.tone)}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{map.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                      {c.adminNote ? ` — ${c.adminNote}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p
                      className={cn(
                        "text-sm font-extrabold",
                        c.status === "approved" ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {money(c.status === "approved" ? c.amount : amount)}
                    </p>
                    <div className="mt-0.5 flex justify-end gap-1">
                      {[c.whatsappProof, c.facebookProof].filter(Boolean).map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
