import { createServerClient } from "@/lib/supabase-server";

/**
 * Verifies the user's identity using the Authorization header.
 * Throws an error if the user is not authenticated.
 * 
 * @param req The incoming request
 * @returns The authenticated user object
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient();
  
  // Important: use getUser(), NOT getSession(). 
  // getUser() re-verifies the JWT with the Supabase Auth server.
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid or expired session");
  }

  return user;
}
