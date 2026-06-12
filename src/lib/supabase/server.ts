import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase-klient til Server Components og Server Actions */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Kaldt fra Server Component uden mulighed for at sætte cookies - ok
          }
        },
      },
    }
  );
}
