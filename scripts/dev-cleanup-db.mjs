import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const KEEP_EMAIL = "mcarpiolazo@gmail.com".toLowerCase();
const EXECUTE = process.argv.includes("--execute");

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function listAllAuthUsers(adminClient) {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  const adminClient = getAdminClient();

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, email, full_name, workspace_id, role, is_deleted, workspaces(name)")
    .order("created_at", { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  const allProfiles = profiles ?? [];
  const keepProfile = allProfiles.find(
    (profile) => profile.email.toLowerCase() === KEEP_EMAIL
  );

  if (!keepProfile) {
    throw new Error(`Could not find a profile for keep email: ${KEEP_EMAIL}`);
  }

  const keepWorkspaceId = keepProfile.workspace_id;
  const workspacesToDelete = new Map();
  const profilesToDelete = allProfiles.filter((profile) => {
    if (profile.email.toLowerCase() === KEEP_EMAIL) {
      return false;
    }

    if (profile.workspace_id && profile.workspace_id !== keepWorkspaceId) {
      workspacesToDelete.set(
        profile.workspace_id,
        profile.workspaces?.name || profile.workspace_id
      );
    }

    return true;
  });

  const authUsers = await listAllAuthUsers(adminClient);
  const authUsersToDelete = authUsers.filter(
    (user) => (user.email || "").toLowerCase() !== KEEP_EMAIL
  );

  const orphanProfilesToDelete = profilesToDelete.filter(
    (profile) => profile.workspace_id === keepWorkspaceId || profile.workspace_id === null
  );

  console.log("");
  console.log(EXECUTE ? "DESTRUCTIVE RUN" : "DRY RUN");
  console.log(`Keep email: ${KEEP_EMAIL}`);
  console.log(`Keep profile id: ${keepProfile.id}`);
  console.log(`Keep workspace id: ${keepWorkspaceId ?? "(none)"}`);
  console.log("");

  console.log(`Workspaces to delete: ${workspacesToDelete.size}`);
  for (const [workspaceId, workspaceName] of workspacesToDelete.entries()) {
    console.log(`  - ${workspaceName} (${workspaceId})`);
  }

  console.log("");
  console.log(`Profiles to delete: ${profilesToDelete.length}`);
  for (const profile of profilesToDelete) {
    console.log(
      `  - ${profile.email} | ${profile.full_name} | workspace=${profile.workspace_id ?? "none"}`
    );
  }

  console.log("");
  console.log(`Auth users to delete: ${authUsersToDelete.length}`);
  for (const user of authUsersToDelete) {
    console.log(`  - ${user.email || user.id}`);
  }

  if (!EXECUTE) {
    console.log("");
    console.log("No changes made. Re-run with --execute to apply.");
    return;
  }

  console.log("");
  console.log("Deleting non-kept workspaces...");
  const workspaceIds = [...workspacesToDelete.keys()];
  if (workspaceIds.length > 0) {
    const { error } = await adminClient
      .from("workspaces")
      .delete()
      .in("id", workspaceIds);

    if (error) {
      throw error;
    }
  }

  console.log("Deleting remaining non-kept profiles...");
  if (orphanProfilesToDelete.length > 0) {
    const { error } = await adminClient
      .from("profiles")
      .delete()
      .in(
        "id",
        orphanProfilesToDelete.map((profile) => profile.id)
      );

    if (error) {
      throw error;
    }
  }

  console.log("Deleting non-kept auth users...");
  for (const user of authUsersToDelete) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }
    console.log(`  deleted auth user: ${user.email || user.id}`);
  }

  console.log("");
  console.log("Cleanup complete.");
}

main().catch((error) => {
  console.error("");
  console.error("Cleanup failed:");
  console.error(error);
  process.exit(1);
});
