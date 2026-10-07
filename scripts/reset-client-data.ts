import { loadEnvConfig } from "@next/env";
import { adminDb } from "../lib/admin";

loadEnvConfig(process.cwd());

async function deleteCollection(collectionName: string) {
  const snapshot = await adminDb.collection(collectionName).get();
  if (snapshot.empty) return;

  const chunkSize = 500;
  for (let i = 0; i < snapshot.docs.length; i += chunkSize) {
    const batch = adminDb.batch();
    for (const doc of snapshot.docs.slice(i, i + chunkSize)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

async function resetBusinesses() {
  const businesses = await adminDb.collection("businesses").get();
  for (const doc of businesses.docs) {
    await doc.ref.set({ counters: { normal: 0, gst: 0, receipt: 0 } }, { merge: true });
  }
}

async function main() {
  const collections = ["bills", "billItems", "payments", "receiptReservations", "summaries", "customers"];

  for (const name of collections) {
    await deleteCollection(name);
    console.log(`Cleared ${name}`);
  }

  await resetBusinesses();
  console.log("Reset business counters to zero.");
  console.log("Receipt numbers will start again from REC-000001.");
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
