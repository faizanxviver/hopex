-- Add withdrawal proof features and reward settings
CREATE TABLE public.withdrawal_proofs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
    image_url text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending' NOT NULL, -- pending, approved, rejected
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_proofs TO authenticated;
GRANT ALL ON public.withdrawal_proofs TO service_role;

ALTER TABLE public.withdrawal_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proofs" ON public.withdrawal_proofs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proofs" ON public.withdrawal_proofs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view approved proofs" ON public.withdrawal_proofs
    FOR SELECT TO anon, authenticated USING (status = 'approved');

-- Update settings to include withdrawal proof reward
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS proof_reward_amount numeric DEFAULT 5;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS show_proofs_section boolean DEFAULT true;
