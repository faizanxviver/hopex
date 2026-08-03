import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- types ---------------- */

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface RewardClaim {
  id: string;
  userId: string;
  amount: number;
  whatsappProof: string;
  facebookProof: string;
  status: ClaimStatus;
  adminNote: string;
  reviewedAt: string | null;
  createdAt: string;
}

export interface LeaderPlan {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  checkHours: number;
  requiredInvestment: number;
  deadlineAt: string;
  status: "active" | "passed" | "failed" | "removed";
  createdAt: string;
}

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

const toClaim = (r: Row): RewardClaim => ({
  id: r.id as string,
  userId: r.user_id as string,
  amount: num(r.amount),
  whatsappProof: (r.whatsapp_proof as string) ?? "",
  facebookProof: (r.facebook_proof as string) ?? "",
  status: (r.status as ClaimStatus) ?? "pending",
  adminNote: (r.admin_note as string) ?? "",
  reviewedAt: (r.reviewed_at as string) ?? null,
  createdAt: r.created_at as string,
});

const toLeaderPlan = (r: Row): LeaderPlan => ({
  id: r.id as string,
  userId: r.user_id as string,
  planId: r.plan_id as string,
  planName: r.plan_name as string,
  amount: num(r.amount),
  checkHours: Number(r.check_hours ?? 24),
  requiredInvestment: num(r.required_investment),
  deadlineAt: r.deadline_at as string,
  status: (r.status as LeaderPlan["status"]) ?? "active",
  createdAt: r.created_at as string,
});

/* ---------------- queries ---------------- */

const sb = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      order: (c: string, o?: { ascending?: boolean }) => PromiseLike<{ data: Row[] | null }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function fetchRewardClaims(): Promise<RewardClaim[]> {
  const { data } = await sb.from("reward_claims").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(toClaim);
}

export async function fetchLeaderPlans(): Promise<LeaderPlan[]> {
  const { data } = await sb.from("leader_plans").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(toLeaderPlan);
}

/** Live list of reward claims visible to the current user (own rows, or all for admins). */
export function useRewardClaims() {
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setClaims(await fetchRewardClaims());
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    const channel = supabase
      .channel("hopex-rewards")
      .on("postgres_changes", { event: "*", schema: "public", table: "reward_claims" }, () => {
        void reload();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload]);

  return { claims, loading, reload };
}

export function useLeaderPlans() {
  const [plans, setPlans] = useState<LeaderPlan[]>([]);

  const reload = useCallback(async () => {
    setPlans(await fetchLeaderPlans());
  }, []);

  useEffect(() => {
    void reload();
    const channel = supabase
      .channel("hopex-leader-plans")
      .on("postgres_changes", { event: "*", schema: "public", table: "leader_plans" }, () => {
        void reload();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload]);

  return { plans, reload };
}

/* ---------------- mutations ---------------- */

const clean = (m: string) => m.replace(/^.*?:\s*/, "");

export async function submitRewardClaim(whatsapp: string, facebook: string) {
  const { error } = await sb.rpc("submit_reward_claim", { _whatsapp: whatsapp, _facebook: facebook });
  if (error) throw new Error(clean(error.message));
}

export async function reviewRewardClaim(id: string, approve: boolean, note = "") {
  const { error } = await sb.rpc("review_reward_claim", { _id: id, _approve: approve, _note: note });
  if (error) throw new Error(clean(error.message));
}

export async function activateLeaderPlan(input: {
  userId: string;
  planId: string;
  amount: number;
  checkHours: number;
  required: number;
}) {
  const { error } = await sb.rpc("admin_activate_leader_plan", {
    _user_id: input.userId,
    _plan_id: input.planId,
    _amount: input.amount,
    _check_hours: input.checkHours,
    _required: input.required,
  });
  if (error) throw new Error(clean(error.message));
}

export async function removeLeaderPlan(id: string) {
  const { error } = await sb.rpc("admin_remove_leader_plan", { _id: id });
  if (error) throw new Error(clean(error.message));
}

export async function adjustUserBalance(
  userId: string,
  amount: number,
  kind: "deposit" | "withdraw",
  note = "",
) {
  const { error } = await sb.rpc("admin_adjust_balance", {
    _user_id: userId,
    _amount: amount,
    _kind: kind,
    _note: note,
  });
  if (error) throw new Error(clean(error.message));
}

export async function runLeaderPlanChecks() {
  const { error } = await sb.rpc("run_leader_plan_checks");
  if (error) throw new Error(clean(error.message));
}

/* ---------------- helpers ---------------- */

/** Milliseconds left before the user may run the reward task again. */
export function rewardCooldownLeft(claims: RewardClaim[], hours: number, atMs = Date.now()) {
  const approved = claims
    .filter((c) => c.status === "approved" && c.reviewedAt)
    .map((c) => new Date(c.reviewedAt as string).getTime())
    .sort((a, b) => b - a)[0];
  if (!approved) return 0;
  return Math.max(0, approved + hours * 3600000 - atMs);
}

export const hasPendingClaim = (claims: RewardClaim[]) => claims.some((c) => c.status === "pending");
