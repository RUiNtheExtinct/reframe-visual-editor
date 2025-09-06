"use client";

import { useEffect } from "react";
let hasTwindSetup = false;
let hasShimImported = false;

export default function TwindRuntime() {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const twindMod: typeof import("twind") = await import("twind");
        const { setup, autoprefix } = twindMod;

        // idempotent setup
        if (!hasTwindSetup) {
          setup({
            darkMode: "class",
            prefix: autoprefix,
          });
          hasTwindSetup = true;
        }

        if (!hasShimImported) {
          await import("twind/shim");
          hasShimImported = true;
        }
      } catch {
        // noop: editor preview will still render with build-time Tailwind CSS
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
