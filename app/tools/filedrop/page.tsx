import { Suspense } from "react";
import FileDropClient from "./FileDropClient";

export default function FileDropPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-foreground/40">Chargement...</p>
        </div>
      }
    >
      <FileDropClient />
    </Suspense>
  );
}
