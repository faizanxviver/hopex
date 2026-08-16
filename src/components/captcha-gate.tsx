import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshCw, ShieldCheck, Loader2, Check } from "lucide-react";
import { useStore } from "@/lib/store";

const KEY = "hopex_captcha_ok";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

/** Branded full-screen human-verification gate shown before the site loads. */
export function CaptchaGate({ children }: { children: ReactNode }) {
  const { db } = useStore();
  const name = db.settings.siteName || "HopeX";
  const logo = db.settings.siteLogo;

  const [ready, setReady] = useState(false);
  const [passed, setPassed] = useState(false);
  const [code, setCode] = useState("ABCDE");
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") setPassed(true);
    } catch {
      /* ignore */
    }
    setCode(makeCode());
    setReady(true);
  }, []);

  const chars = useMemo(
    () =>
      code.split("").map((c, i) => ({
        c,
        rotate: ((i * 37) % 31) - 15,
        y: ((i * 53) % 9) - 4,
        size: 26 + ((i * 17) % 10),
      })),
    [code],
  );

  function refresh() {
    setCode(makeCode());
    setValue("");
    setError(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    if (value.trim().toUpperCase() !== code) {
      setError(true);
      refresh();
      return;
    }
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setDone(true);
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      setTimeout(() => setPassed(true), 700);
    }, 900);
  }

  if (!ready) return null;
  if (passed) return <>{children}</>;

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-background px-4 py-8">
      <div className="aurora" />

      <div className="glass w-full max-w-sm rounded-3xl p-6 text-center shadow-[var(--shadow-elegant)]">
        <span className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-2xl gradient-brand font-display text-xl font-black text-primary-foreground">
          {logo ? (
            <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
          ) : (
            (name[0] ?? "H")
          )}
        </span>
        <h1 className="mt-4 font-display text-2xl font-black">{name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Security check — verify you are human to continue
        </p>

        {done ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-6">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </span>
            <p className="text-sm font-bold text-success">Verified — opening {name}…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex h-16 flex-1 select-none items-center justify-center gap-1 overflow-hidden rounded-2xl glass-soft">
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />
                {chars.map((x, i) => (
                  <span
                    key={i}
                    className="font-display font-black text-gradient"
                    style={{
                      transform: `rotate(${x.rotate}deg) translateY(${x.y}px)`,
                      fontSize: x.size,
                    }}
                  >
                    {x.c}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={refresh}
                aria-label="New code"
                className="btn-glass grid h-16 w-12 place-items-center text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value.toUpperCase());
                setError(false);
              }}
              maxLength={5}
              autoComplete="off"
              placeholder="Enter the code"
              className="w-full rounded-2xl glass-soft px-4 py-3 text-center font-display text-lg font-black tracking-[0.4em] outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
            />

            {error ? (
              <p className="text-xs font-semibold text-destructive">
                Incorrect code — please try the new one.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={checking || value.length < 5}
              className="btn-glass btn-glass-primary flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:opacity-50"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Verify &amp; continue
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-5 text-[10px] uppercase tracking-widest text-muted-foreground">
          Protected by {name} Security
        </p>
      </div>
    </div>
  );
}
