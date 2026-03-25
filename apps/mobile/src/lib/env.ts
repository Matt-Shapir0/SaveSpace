const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name}. Add it to apps/mobile/.env or your Expo environment.`);
  }

  return value;
}

export const env = {
  supabaseUrl: requireEnv(supabaseUrl, "EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: requireEnv(supabaseAnonKey, "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  apiUrl: requireEnv(apiUrl, "EXPO_PUBLIC_API_URL"),
};
