-- ============================================================================
-- Network module — Phase 1 schema port from NetworkOS
-- All tables prefixed with network_ to avoid collisions.
-- Skips user_roles, waitlist, api_tokens (Kujituma already has equivalents).
-- ============================================================================

-- network_contacts -----------------------------------------------------------
CREATE TABLE public.network_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  whatsapp_number TEXT,
  email TEXT,
  influence_type TEXT NOT NULL DEFAULT 'Other' CHECK (
    influence_type IN (
      'Regulator','Lawyer','Politician','Founder','Investor','Operator',
      'Media','Banker','Family','Friend','Other'
    )
  ),
  country TEXT,
  region TEXT,
  sector TEXT,
  influence_score INTEGER DEFAULT 3 CHECK (influence_score >= 1 AND influence_score <= 5),
  relationship_strength TEXT DEFAULT 'Cold' CHECK (
    relationship_strength IN ('Cold','Warm','Strong','Trusted')
  ),
  strategic_importance INTEGER DEFAULT 3 CHECK (strategic_importance >= 1 AND strategic_importance <= 5),
  last_interaction_date DATE,
  birthday DATE,
  first_met_year INTEGER,
  first_met_month INTEGER,
  living_location TEXT,
  is_inner_circle BOOLEAN NOT NULL DEFAULT false,
  muted_from_brief BOOLEAN NOT NULL DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_contacts TO authenticated;
GRANT ALL ON public.network_contacts TO service_role;

ALTER TABLE public.network_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network contacts"
  ON public.network_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own network contacts"
  ON public.network_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network contacts"
  ON public.network_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network contacts"
  ON public.network_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_network_contacts_user_id ON public.network_contacts(user_id);
CREATE INDEX idx_network_contacts_influence_score ON public.network_contacts(influence_score);
CREATE INDEX idx_network_contacts_birthday ON public.network_contacts(birthday);

CREATE TRIGGER update_network_contacts_updated_at
  BEFORE UPDATE ON public.network_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- network_interactions -------------------------------------------------------
CREATE TABLE public.network_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.network_contacts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('Call','Meeting','Dinner','Conference','Event','Message')),
  direction TEXT,
  summary TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_interactions TO authenticated;
GRANT ALL ON public.network_interactions TO service_role;

ALTER TABLE public.network_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network interactions"
  ON public.network_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own network interactions"
  ON public.network_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network interactions"
  ON public.network_interactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network interactions"
  ON public.network_interactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_network_interactions_contact_id ON public.network_interactions(contact_id);
CREATE INDEX idx_network_interactions_user_id ON public.network_interactions(user_id);
CREATE INDEX idx_network_interactions_follow_up_date ON public.network_interactions(follow_up_date);

-- network_contact_events -----------------------------------------------------
CREATE TABLE public.network_contact_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.network_contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_contact_events TO authenticated;
GRANT ALL ON public.network_contact_events TO service_role;

ALTER TABLE public.network_contact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network contact events"
  ON public.network_contact_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own network contact events"
  ON public.network_contact_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network contact events"
  ON public.network_contact_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network contact events"
  ON public.network_contact_events FOR DELETE USING (auth.uid() = user_id);

-- network_contact_key_facts --------------------------------------------------
CREATE TABLE public.network_contact_key_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.network_contacts(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_contact_key_facts TO authenticated;
GRANT ALL ON public.network_contact_key_facts TO service_role;

ALTER TABLE public.network_contact_key_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network contact key facts"
  ON public.network_contact_key_facts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own network contact key facts"
  ON public.network_contact_key_facts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network contact key facts"
  ON public.network_contact_key_facts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network contact key facts"
  ON public.network_contact_key_facts FOR DELETE USING (auth.uid() = user_id);

-- network_message_templates --------------------------------------------------
CREATE TABLE public.network_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_message_templates TO authenticated;
GRANT ALL ON public.network_message_templates TO service_role;

ALTER TABLE public.network_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network templates"
  ON public.network_message_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own network templates"
  ON public.network_message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network templates"
  ON public.network_message_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network templates"
  ON public.network_message_templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_network_message_templates_updated_at
  BEFORE UPDATE ON public.network_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- network_contact_resources --------------------------------------------------
CREATE TABLE public.network_contact_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.network_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_contact_resources TO authenticated;
GRANT ALL ON public.network_contact_resources TO service_role;

ALTER TABLE public.network_contact_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network contact resources"
  ON public.network_contact_resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own network contact resources"
  ON public.network_contact_resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network contact resources"
  ON public.network_contact_resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network contact resources"
  ON public.network_contact_resources FOR DELETE USING (auth.uid() = user_id);
