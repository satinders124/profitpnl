import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import { JournalEntry } from "@/types/journal";

function userCollection(uid: string, name: string) {
  return collection(db, "users", uid, name);
}

// ─────────────────────────────────────────────
// Trades
// ─────────────────────────────────────────────

export async function getTrades(uid: string): Promise<Trade[]> {
  const q = query(userCollection(uid, "trades"), orderBy("date", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Trade, "id">),
  }));
}

export async function saveTrade(uid: string, trade: Partial<Trade>) {
  const ref = userCollection(uid, "trades");

  if (trade.id) {
    const { id, ...data } = trade;
    await setDoc(doc(db, "users", uid, "trades", id), data, { merge: true });
    return id;
  }

  const { id, ...data } = trade;
  const created = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });

  return created.id;
}

export async function deleteTrade(uid: string, tradeId: string) {
  await deleteDoc(doc(db, "users", uid, "trades", tradeId));
}

// ─────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────

export async function getAccounts(uid: string): Promise<TradingAccount[]> {
  const snap = await getDocs(userCollection(uid, "accounts"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<TradingAccount, "id">),
  }));
}

export async function saveAccount(
  uid: string,
  account: Partial<TradingAccount>
) {
  const ref = userCollection(uid, "accounts");

  if (account.id) {
    const { id, ...data } = account;
    await setDoc(doc(db, "users", uid, "accounts", id), data, {
      merge: true,
    });
    return id;
  }

  const { id, ...data } = account;
  const created = await addDoc(ref, data);
  return created.id;
}

export async function deleteAccount(uid: string, accountId: string) {
  await deleteDoc(doc(db, "users", uid, "accounts", accountId));
}

// ─────────────────────────────────────────────
// Playbook
// ─────────────────────────────────────────────

export async function getPlaybook(uid: string): Promise<PlaybookSetup[]> {
  const snap = await getDocs(userCollection(uid, "playbook"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<PlaybookSetup, "id">),
  }));
}

export async function savePlaybookSetup(
  uid: string,
  setup: Partial<PlaybookSetup>
) {
  const ref = userCollection(uid, "playbook");

  if (setup.id) {
    const { id, ...data } = setup;
    await setDoc(doc(db, "users", uid, "playbook", id), data, {
      merge: true,
    });
    return id;
  }

  const { id, ...data } = setup;
  const created = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });

  return created.id;
}

export async function deletePlaybookSetup(uid: string, setupId: string) {
  await deleteDoc(doc(db, "users", uid, "playbook", setupId));
}

// ─────────────────────────────────────────────
// Psychology journal
// ─────────────────────────────────────────────

export async function getJournals(uid: string): Promise<JournalEntry[]> {
  const q = query(userCollection(uid, "journals"), orderBy("date", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<JournalEntry, "id">),
  }));
}

export async function saveJournal(uid: string, journal: Partial<JournalEntry>) {
  const ref = userCollection(uid, "journals");

  if (journal.id) {
    const { id, ...data } = journal;
    await setDoc(doc(db, "users", uid, "journals", id), data, { merge: true });
    return id;
  }

  const { id, ...data } = journal;
  const created = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });

  return created.id;
}

export async function deleteJournal(uid: string, journalId: string) {
  await deleteDoc(doc(db, "users", uid, "journals", journalId));
}
