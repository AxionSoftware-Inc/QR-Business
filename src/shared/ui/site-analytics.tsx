"use client";

import type React from "react";
import { useEffect } from "react";
import { trackSiteEventInBackend } from "@/modules/api/backend-client";
import { trackPublicCtaInV2, trackPublicViewInV2 } from "@/modules/api/v2-client";

type SiteViewTrackerProps = {
  siteId: string;
};

const trackedViews = new Set<string>();

function isV2SiteId(siteId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(siteId);
}

function isLegacyDatabaseId(siteId: string) {
  return /^\d+$/.test(siteId);
}

export function SiteViewTracker({ siteId }: SiteViewTrackerProps) {
  useEffect(() => {
    if (trackedViews.has(siteId)) return;

    if (isV2SiteId(siteId)) {
      trackedViews.add(siteId);
      void trackPublicViewInV2(siteId);
      return;
    }

    if (isLegacyDatabaseId(siteId)) {
      trackedViews.add(siteId);
      void trackSiteEventInBackend({ eventType: "view", siteId });
    }
    // Preview/mock ids intentionally emit no analytics traffic.
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
