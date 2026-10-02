import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import { atLeast, sanitizePermissions, AREAS, type Access, type Permissions } from "@/config/permissions";

/**
 * Dashboard user accounts (everyone except the Owner, who is the
 * ADMIN_USERNAME / ADMIN_PASSWORD account from the environment).
 *
 * - Passwords are scrypt hashes with a per-user salt; never stored or returned in clear.
 * - New users get a temporary password and must change it at first sign-in.
 * - `sessionVersion` is part of every session cookie: resetting a password,
 *   disabling the account, or changing its permissions bumps it, which signs
 *   that user out everywhere on their next request.
 * - Someone with "Manage users" can only hand out up to their own level on
 *   each page, and can't edit an account that has more access than they do.
 */

const COLLECTION = "app_users";
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

export interface UserDoc {
  _id: ObjectId;
  username: string;
  name: string;
  passwordHash: string;
  salt: string;
  permissions: Permissions;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  sessionVersion: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/** What the users API returns — never the hash or salt. */
export interface PublicUser {
  id: string;
  username: string;
  name: string;
  permissions: Permissions;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  createdAt: string;
  createdBy: string;
  lastLoginAt: string;
}

const str = (v: unknown) => (v == null ? "" : String(v)).trim();

function toPublic(d: UserDoc): PublicUser {
  return {
    id: d._id.toHexString(),
    username: d.username,
    name: d.name,
    permissions: sanitizePermissions(d.permissions),
    status: d.status,
    mustChangePassword: d.mustChangePassword,
    createdAt: d.createdAt,
    createdBy: d.createdBy,
    lastLoginAt: d.lastLoginAt ?? "",
  };
}

let indexReady = false;
async function col() {
  if (!isDbConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  const c = db.collection<UserDoc>(COLLECTION);
  if (!indexReady) {
    await c.createIndex({ username: 1 }, { unique: true });
    indexReady = true;
  }
  return c;
}

// --- passwords ---------------------------------------------------------------------

export function passwordProblem(pw: string): string | undefined {
  if (pw.length < 8) return "Passwords need at least 8 characters.";
  if (pw.length > 200) return "That password is too long.";
  return undefined;
}

async function hashPassword(pw: string): Promise<{ passwordHash: string; salt: string }> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, KEYLEN);
  return { passwordHash: hash.toString("base64"), salt: salt.toString("base64") };
}

async function passwordMatches(pw: string, d: Pick<UserDoc, "passwordHash" | "salt">): Promise<boolean> {
  const hash = await scrypt(pw, Buffer.from(d.salt, "base64"), KEYLEN);
  const expected = Buffer.from(d.passwordHash, "base64");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

// --- sign-in -----------------------------------------------------------------------

/** Check a non-Owner sign-in. Returns the account or a generic error. */
export async function authenticateUser(
  username: string,
  password: string,
): Promise<{ user?: UserDoc; error?: string }> {
  try {
    const c = await col();
    if (!c) return { error: "Incorrect username or password." };
    const d = await c.findOne({ username: username.toLowerCase() });
    // Same message whether the user exists or not.
    if (!d || !(await passwordMatches(password, d))) return { error: "Incorrect username or password." };
    if (d.status !== "active") return { error: "This account is disabled — ask an admin." };
    await c.updateOne({ _id: d._id }, { $set: { lastLoginAt: new Date().toISOString() } });
    return { user: d };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/** The live account behind a session, or null if it's gone, disabled, or the session is stale. */
export async function loadSessionUser(uid: string, version: number): Promise<UserDoc | null> {
  if (!ObjectId.isValid(uid)) return null;
  try {
    const c = await col();
    if (!c) return null;
    const d = await c.findOne({ _id: new ObjectId(uid) });
    if (!d || d.status !== "active" || d.sessionVersion !== version) return null;
    return d;
  } catch {
    return null;
  }
}

// --- management --------------------------------------------------------------------

export interface Actor extends Access {
  id?: string;
  username: string;
}

function canManageUsers(actor: Actor) {
  return actor.isOwner || atLeast(actor.permissions.users, "manage");
}

/** Every area at or below the actor's own level — the most they may grant. */
function withinActor(actor: Actor, perms: Permissions): string | undefined {
  if (actor.isOwner) return undefined;
  for (const a of AREAS) {
    if (!atLeast(actor.permissions[a.key], perms[a.key] ?? "none")) {
      return `You can't give more access than you have yourself (${a.label}).`;
    }
  }
  return undefined;
}

export async function listUsers(actor: Actor): Promise<{ users?: PublicUser[]; error?: string }> {
  if (!actor.isOwner && !atLeast(actor.permissions.users, "view")) return { error: "You don't have access to users." };
  if (!isDbConfigured()) return { error: "No database configured — connect MongoDB to add users." };
  try {
    const c = await col();
    if (!c) return { error: DB_UNAVAILABLE };
    const docs = await c.find().sort({ createdAt: -1 }).toArray();
    return { users: docs.map(toPublic) };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function createUser(
  actor: Actor,
  input: Record<string, unknown>,
): Promise<{ user?: PublicUser; error?: string }> {
  if (!canManageUsers(actor)) return { error: "You can't manage users." };
  const username = str(input.username).toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { error: "Usernames are 3–32 characters: letters, numbers, dots, dashes, underscores." };
  }
  if (username === str(process.env.ADMIN_USERNAME).toLowerCase()) return { error: "That username belongs to the Owner." };
  const name = str(input.name) || username;
  const password = String(input.password ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const permissions = sanitizePermissions(input.permissions);
  const tooMuch = withinActor(actor, permissions);
  if (tooMuch) return { error: tooMuch };

  try {
    const c = await col();
    if (!c) return { error: DB_UNAVAILABLE };
    const now = new Date().toISOString();
    const doc: Omit<UserDoc, "_id"> = {
      username,
      name,
      ...(await hashPassword(password)),
      permissions,
      status: "active",
      mustChangePassword: true,
      sessionVersion: 1,
      createdAt: now,
      createdBy: actor.username,
      updatedAt: now,
    };
    const res = await c.insertOne(doc as UserDoc);
    return { user: toPublic({ ...doc, _id: res.insertedId } as UserDoc) };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: `There's already a user called ${username}.` };
    return { error: DB_UNAVAILABLE };
  }
}

/** Edit name / permissions / status, or set a new temporary password. */
export async function updateUser(
  actor: Actor,
  id: string,
  input: Record<string, unknown>,
): Promise<{ user?: PublicUser; error?: string }> {
  if (!canManageUsers(actor)) return { error: "You can't manage users." };
  if (!ObjectId.isValid(id)) return { error: "Invalid user." };
  try {
    const c = await col();
    if (!c) return { error: DB_UNAVAILABLE };
    const existing = await c.findOne({ _id: new ObjectId(id) });
    if (!existing) return { error: "That user no longer exists." };
    const self = actor.id === id;
    // Nobody but the Owner edits an account that has more access than they do.
    if (withinActor(actor, sanitizePermissions(existing.permissions))) {
      return { error: "That user has access you don't — only someone with at least their access can edit them." };
    }

    const set: Partial<UserDoc> = { updatedAt: new Date().toISOString() };
    let signOut = false;
    if (input.name !== undefined) set.name = str(input.name) || existing.username;
    if (input.permissions !== undefined) {
      const permissions = sanitizePermissions(input.permissions);
      const tooMuch = withinActor(actor, permissions);
      if (tooMuch) return { error: tooMuch };
      set.permissions = permissions;
      signOut = true;
    }
    if (input.status !== undefined) {
      const status = input.status === "disabled" ? "disabled" : "active";
      if (self && status === "disabled") return { error: "You can't disable your own account." };
      set.status = status;
      if (status === "disabled") signOut = true;
    }
    if (input.password !== undefined && String(input.password) !== "") {
      const password = String(input.password);
      const problem = passwordProblem(password);
      if (problem) return { error: problem };
      Object.assign(set, await hashPassword(password));
      set.mustChangePassword = true;
      signOut = true;
    }
    // Permission changes apply on the next request anyway (they're read live);
    // a version bump also ends sessions so a reset / disable bites immediately.
    const update: Record<string, unknown> = { $set: set };
    if (signOut && !self) update.$inc = { sessionVersion: 1 };
    await c.updateOne({ _id: existing._id }, update);
    const fresh = await c.findOne({ _id: existing._id });
    return fresh ? { user: toPublic(fresh) } : { error: "That user no longer exists." };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function deleteUser(actor: Actor, id: string): Promise<{ error?: string }> {
  if (!canManageUsers(actor)) return { error: "You can't manage users." };
  if (!ObjectId.isValid(id)) return { error: "Invalid user." };
  if (actor.id === id) return { error: "You can't delete your own account." };
  try {
    const c = await col();
    if (!c) return { error: DB_UNAVAILABLE };
    const existing = await c.findOne({ _id: new ObjectId(id) });
    if (!existing) return {};
    if (withinActor(actor, sanitizePermissions(existing.permissions))) {
      return { error: "That user has access you don't — you can't delete them." };
    }
    await c.deleteOne({ _id: existing._id });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/** A signed-in user changing their own password (required after a temporary one). */
export async function changeOwnPassword(
  uid: string,
  current: string,
  next: string,
): Promise<{ sessionVersion?: number; error?: string }> {
  if (!ObjectId.isValid(uid)) return { error: "Invalid user." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (current === next) return { error: "Choose a password different from the current one." };
  try {
    const c = await col();
    if (!c) return { error: DB_UNAVAILABLE };
    const d = await c.findOne({ _id: new ObjectId(uid) });
    if (!d || !(await passwordMatches(current, d))) return { error: "Your current password is wrong." };
    const sessionVersion = d.sessionVersion + 1;
    await c.updateOne(
      { _id: d._id },
      { $set: { ...(await hashPassword(next)), mustChangePassword: false, sessionVersion, updatedAt: new Date().toISOString() } },
    );
    return { sessionVersion };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}
