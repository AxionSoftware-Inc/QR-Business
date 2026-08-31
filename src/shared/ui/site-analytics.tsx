"use client";

import type React from "react";
import { useEffect } from "react";
import { trackSiteEventInBackend } from "@/modules/api/backend-client";
import { trackPublicCtaInV2 } from "@/modules/api/v2-client";

type SiteViewTrackerProps = {
  siteId: string;
};

function isV2SiteId(siteId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    siteId,
  );
}

export function SiteViewTracker({ siteId }: SiteViewTrackerProps) {
  useEffect(() => {
    if (!siteId || siteId.startsWith("site_") || isV2SiteId(siteId)) {
      // V2 records the view atomically in the server-side public read endpoint.
      // Keeping this call for V2 would double-count every page view.
      return;
    }

    void trackSiteEventInBackend({ eventType: "view", siteId });
  }, [siteId]);

  return null;
}

type TrackedLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  siteId: string;
  targetName: string;
};

export function TrackedLink({
  onClick,
  siteId,
  targetName,
  ...props
}: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        if (siteId && !siteId.startsWith("site_")) {
          if (isV2SiteId(siteId)) {
            void trackPublicCtaInV2({
              siteId,
              target: targetName,
            });
          } else {
            void trackSiteEventInBackend({
              eventType: "click",
              siteId,
              target: targetName,
            });
          }
        }
        onClick?.(event);
      }}
    />
  );
}
