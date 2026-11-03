This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Access

The dashboard and billing APIs do not require sign-in. Anyone who can reach the deployment can view billing data and use the billing APIs. Use deployment- or network-level access controls if this data must remain private.

## Google Sheets billing sync

The app sends bill data to the Apps Script web app in `scripts/google-sheets-appscript.gs`. Paste that file into the Apps Script project attached to the target spreadsheet. The spreadsheet must contain **Sheet1** for Sam Studio and **Sheet2** for THRESH SALOON; the script creates either tab if it is missing.

In Apps Script **Project Settings → Script properties**, set `SYNC_TOKEN` to the same random secret as `GOOGLE_APPS_SCRIPT_TOKEN`. Set `GOOGLE_APPS_SCRIPT_URL` to the deployed `/exec` URL in `.env.local` and the production environment. Deploy the script as a web app that executes as your Google account and allows access to **Anyone**, then deploy a new version. The script checks the shared token before writing any rows.

In app **Settings**, choose **Connect Google Sheets** to initialize the tabs and import existing bills. New bills, edits, payment updates, cancellations, and deletions are synced automatically. The Settings button can be used to retry syncing existing bills after a temporary error.

Receipt numbers are independently counted per business and include a business prefix, starting with `SS-REC-01` for Sam Studio and `PL-REC-01` for THRESH SALOON. Existing receipt sequences continue without reusing numbers.

## Recording a missed payment

Open a business dashboard's **Payments** page to record money already received against an outstanding bill. The payment is written on the server in a Firestore transaction, which updates the bill and creates one payment-history record using an idempotent payment ID. Use **Add missing bill** to create a bill that was not recorded at the time of purchase. This app does not integrate with an online payment provider; recording a payment is a manual confirmation and must only be used after the money has actually been received.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
