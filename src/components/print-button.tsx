"use client";

import { btnSolid } from "@/components/editorial";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${btnSolid} print:hidden`}
    >
      PRINT / SAVE PDF
    </button>
  );
}
