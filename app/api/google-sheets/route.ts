import { route } from "@/lib/admin";
import {
  connectGoogleSheets,
  getGoogleSheetsLink,
  syncAllBillsToGoogleSheets,
} from "@/lib/google-sheets";

export const runtime = "nodejs";

export const GET = route(async () => ({
  spreadsheetUrl: await getGoogleSheetsLink(),
}));

export const POST = route(async () => {
  const spreadsheet = await connectGoogleSheets();
  let syncError: string | undefined;
  try {
    await syncAllBillsToGoogleSheets();
  } catch (error) {
    syncError = error instanceof Error ? error.message : "Could not sync existing bills.";
  }
  return { spreadsheetUrl: spreadsheet.spreadsheetUrl, syncError };
});
