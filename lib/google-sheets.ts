import { adminDb } from "./admin";
import { BUSINESSES, receiptNumberForBill, type Bill, type BusinessId } from "./types";

const integrationRef = adminDb.doc("integrations/googleSheets");
const headers = [
  "Bill ID", "Business", "Receipt Number", "Bill Number", "Date", "Customer", "Phone",
  "Customer GSTIN", "Bill Type", "Items", "Subtotal", "Discount", "Tax", "Total",
  "Paid", "Balance Due", "Payment Method", "Entered By", "Status", "Notes",
];

type AppsScriptResponse = {
  ok?: boolean;
  error?: string;
  spreadsheetUrl?: string;
};

function appsScriptConfig() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
  if (!url || !token)
    throw new Error("Configure GOOGLE_APPS_SCRIPT_URL and GOOGLE_APPS_SCRIPT_TOKEN to connect Google Sheets.");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
    throw new Error("GOOGLE_APPS_SCRIPT_URL must be a deployed Google Apps Script web app URL ending in /exec.");
  return { url, token };
}

async function postToAppsScript<T extends AppsScriptResponse>(payload: Record<string, unknown>) {
  const { url, token } = appsScriptConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token }),
    redirect: "follow",
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    throw new Error("Google Apps Script did not return JSON. Deploy the web app with access set to Anyone, then deploy a new version.");
  const result = await response.json() as T;
  if (!response.ok || result.ok !== true)
    throw new Error(result.error ?? `Google Apps Script request failed (${response.status}).`);
  return result;
}

function tabName(businessId: BusinessId) {
  return businessId === "sam-studio" ? "Sheet1" : "Sheet2";
}

function rowFor(bill: Bill): unknown[] {
  const names = bill.createdByNames?.length ? bill.createdByNames : bill.createdByName ? [bill.createdByName] : [];
  return [
    bill.id,
    bill.business.name,
    receiptNumberForBill(bill),
    bill.billNumber,
    new Date(bill.createdAt).toISOString(),
    bill.customer.name,
    bill.customer.phone ?? "",
    bill.customer.gstin ?? "",
    bill.billType,
    bill.items.map((item) => `${item.qty} x ${item.name}`).join(" | "),
    bill.subtotal,
    bill.discount,
    bill.tax,
    bill.total,
    bill.paidAmount,
    Math.max(0, bill.total - bill.paidAmount),
    bill.paymentMethod,
    names.join(", ") || bill.createdBy,
    bill.status,
    bill.notes ?? "",
  ];
}

export async function getGoogleSheetsLink() {
  const snapshot = await integrationRef.get();
  const spreadsheetUrl = snapshot.data()?.spreadsheetUrl;
  return typeof spreadsheetUrl === "string" ? spreadsheetUrl : null;
}

export async function connectGoogleSheets() {
  const result = await postToAppsScript({ action: "setup", headers });
  if (!result.spreadsheetUrl)
    throw new Error("Google Apps Script did not return a spreadsheet URL.");
  await integrationRef.set({
    spreadsheetUrl: result.spreadsheetUrl,
    provider: "apps-script",
    updatedAt: Date.now(),
  }, { merge: true });
  return { spreadsheetUrl: result.spreadsheetUrl };
}

export async function syncBillRecordToGoogleSheets(bill: Bill) {
  await postToAppsScript({
    action: "upsert",
    businessId: bill.businessId,
    sheetName: tabName(bill.businessId),
    headers,
    row: rowFor(bill),
  });
}

export async function syncBillWithWarning(id: string) {
  try {
    if (!await getGoogleSheetsLink()) return undefined;
    await syncBillToGoogleSheets(id);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Could not sync bill to Google Sheets.";
  }
}

export async function syncBillToGoogleSheets(id: string) {
  const snapshot = await adminDb.doc(`bills/${id}`).get();
  if (!snapshot.exists) throw new Error(`Bill ${id} was not found for Google Sheets sync.`);
  await syncBillRecordToGoogleSheets({ ...(snapshot.data() as Bill), id: snapshot.id });
}

export async function deleteBillsWithWarning(businessId: BusinessId, ids: string[]) {
  if (!ids.length) return undefined;
  try {
    if (!await getGoogleSheetsLink()) return undefined;
    await postToAppsScript({
      action: "delete",
      businessId,
      sheetName: tabName(businessId),
      ids,
    });
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Could not remove bills from Google Sheets.";
  }
}

export async function syncAllBillsToGoogleSheets() {
  for (const businessId of Object.keys(BUSINESSES) as BusinessId[]) {
    const snapshot = await adminDb.collection("bills").where("businessId", "==", businessId).get();
    const bills = snapshot.docs
      .map((document) => ({ ...(document.data() as Bill), id: document.id }))
      .sort((left, right) => left.createdAt - right.createdAt);
    await postToAppsScript({
      action: "sync",
      businessId,
      sheetName: tabName(businessId),
      headers,
      rows: bills.map(rowFor),
    });
  }
}

export async function syncAllBillsWithWarning() {
  try {
    if (!await getGoogleSheetsLink()) return undefined;
    await syncAllBillsToGoogleSheets();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Could not sync bills to Google Sheets.";
  }
}
