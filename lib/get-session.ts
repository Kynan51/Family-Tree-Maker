import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export async function getServerSession() {
  // Get cookies from the request
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Replace 'sb-<project-ref>-auth-token' with your actual Supabase project ref
  // TODO: Make this dynamic if you change project ref
  const accessToken = cookieStore.get("sb-pqcdstmuqohhaqoungvu-auth-token")?.value;

  if (!accessToken) {
    // No session cookie found
    return null;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Try to get the user from the token
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user };
} 