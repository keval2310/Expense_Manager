import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// API base URL
export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-e150488f`;
