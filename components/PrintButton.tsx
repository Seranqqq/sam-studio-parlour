"use client";
import { Button } from "@/components/ui/button";

export default function PrintButton() {
  return <Button className="no-print mt-4" onClick={() => window.print()}>Print / Save as PDF</Button>;
}