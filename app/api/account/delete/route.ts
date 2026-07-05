import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "@/lib/auth-utils";

export async function POST(req: Request) {
  try {
    // 1. Authenticate User
    const user = await getAuthenticatedUser(req);
    const uid = user.id;

    const supabase = createServerClient();

    // 2. Delete all user data from related tables
    const tables = ["trades", "journals", "playbook", "accounts"];
    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq("user_id", uid);
      } catch (e) {
        console.error(`Error deleting from ${table}:`, e);
        // Continue deleting from other tables even if one fails
      }
    }

    // 3. Delete the profile
    await supabase.from("profiles").delete().eq("id", uid);

    // 4. Delete the Auth user using service role
    const { error: authError } = await supabase.auth.admin.deleteUser(uid);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return NextResponse.json({ error: "Failed to remove auth record" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
