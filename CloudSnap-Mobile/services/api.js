import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://yqavzbfdhjdkvxhgghjv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_MRjDk99ZXqIhFmm4eJ18kw_RJzDaiNt';

function resolveSupabaseConfig() {
  const extra = Constants.manifest && Constants.manifest.extra ? Constants.manifest.extra : {};

  const url = (extra.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const key = extra.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = resolveSupabaseConfig();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const API_BASE = `${SUPABASE_URL}/rest/v1`;

async function uploadPhoto(uri) {
  const filename = (uri.split('/').pop() || `photo_${Date.now()}.jpg`).replace(/\s+/g, '_');
  const safeName = `${Date.now()}_${filename}`;

  const file = {
    uri,
    name: filename,
    type: 'image/jpeg',
  };

  try {
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(safeName, file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${data.path}`;
    return { ok: true, data, publicUrl };
  } catch (error) {
    return { ok: false, error: error.message || 'Upload failed' };
  }
}

export default { uploadPhoto, API_BASE, supabase };
