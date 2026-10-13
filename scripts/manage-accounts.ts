import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { getAuth } from "../lib/auth";
import { getDatabase } from "../lib/server/database";
import { DATA_DIR } from "../lib/server/runtime";

async function main() {
  const [command, suppliedEmail] = process.argv.slice(2);
  if (!["list", "promote", "demote", "status", "test-account"].includes(command)) {
    throw new Error("Usage: npm run accounts -- list | status | promote EMAIL | demote EMAIL | test-account");
  }
  await getAuth(); // Applies auth and admin schema migrations before account access.
  const db = getDatabase();
  try {
    if (command === "test-account") {
      const email = "testuser@narrator.invalid";
      if (db.prepare("SELECT id FROM user WHERE email=?").get(email)) throw new Error("The test account already exists. Its password and permissions were left unchanged.");
      const password = await hashPassword("123456");
      const result = await (await getAuth()).api.signUpEmail({ body: { email, name: "testuser", password: randomUUID() } });
      const changed = db.prepare("UPDATE account SET password=?,updatedAt=? WHERE userId=? AND providerId='credential'").run(password, Date.now(), result.user.id);
      if (changed.changes !== 1) throw new Error("Could not provision the test credentials.");
      console.log("Created ordinary author testuser / 123456. This public test account can upload books; do not use it for private manuscripts.");
      return;
    }
    if (command === "list") {
      console.table(db.prepare("SELECT id,name,email,role,banned FROM user ORDER BY createdAt DESC").all());
      return;
    }
    if (command === "status") {
      const counts = db.prepare(`SELECT
        (SELECT COUNT(*) FROM user) AS accounts,
        (SELECT COUNT(*) FROM books) AS manuscripts,
        (SELECT COUNT(*) FROM request_events) AS savedEvents,
        (SELECT COUNT(*) FROM jobs WHERE status='queued') AS queued,
        (SELECT COUNT(*) FROM jobs WHERE status='processing') AS processing,
        (SELECT COUNT(*) FROM worker_heartbeat WHERE last_seen>?) AS liveWorkers`).get(Date.now() - 30_000);
      console.log(JSON.stringify({ dataDirectory: DATA_DIR, ...counts as object }, null, 2));
      return;
    }
    const email = suppliedEmail?.trim().toLowerCase();
    if (!email) throw new Error("Specify the email of an existing account.");
    if (command === "promote" && email === "testuser@narrator.invalid") throw new Error("The public test account cannot become an administrator.");
    db.transaction(() => {
      const user = db.prepare("SELECT id,role,banned FROM user WHERE lower(email)=?").get(email) as { id: string; role: string | null; banned: number } | undefined;
      if (!user) throw new Error("Account not found. Create it through /signup first.");
      if (user.banned) throw new Error("Restore this account before assigning operator access.");
      const admin = user.role?.split(",").includes("admin");
      if (command === "demote" && admin) {
        const count = db.prepare("SELECT COUNT(*) AS total FROM user WHERE role='admin' AND COALESCE(banned,0)=0").get() as { total: number };
        if (count.total <= 1) throw new Error("Cannot demote the last active administrator.");
      }
      db.prepare("UPDATE user SET role=?,updatedAt=? WHERE id=?").run(command === "promote" ? "admin" : "user", Date.now(), user.id);
      db.prepare("DELETE FROM session WHERE userId=?").run(user.id);
    }).immediate();
    console.log(`${email}: ${command === "promote" ? "administrator" : "author"}. Sign in again to apply the new role.`);
  } finally { db.close(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Account command failed."); process.exitCode = 1; });
