"use client";

import type React from "react";
import { useEffect } from "react";
import { trackSiteEventInBackend } from "@/modules/api/backend-client";
import { trackPublicCtaInV2 } from "@/modules/api/v2-client";

type SiteViewTrackerProps = {
  siteId: string;
};

function isV2SiteId(siteId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(siteId);
}

function isLegacyDatabaseId(siteId: string) {
  return /^\d+$/.test(siteId);
}

export function SiteViewTracker({ siteId }: SiteViewTrackerProps) {
  useEffect(() => {
    if (!isLegacyDatabaseId(siteId)) {
      // V2 view events are recorded server-side on public read. Preview/mock ids
      // must never emit analytics traffic.
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

export function TrackedLink({ onClick, siteId, targetName, ...props }: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        if (isV2SiteId(siteId)) {
          void trackPublicCtaInV2({ siteId, target: targetName });
        } else if (isLegacyDatabaseId(siteId)) {
          void trackSiteEventInBackend({ eventType: "click", siteId, target: targetName });
        }
        onClick?.(event);
      }}
    />
  );
}
