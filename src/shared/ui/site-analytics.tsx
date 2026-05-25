"use client";

import type React from "react";
import { useEffect } from "react";
import { trackSiteEventInBackend } from "@/modules/api/backend-client";

type SiteViewTrackerProps = {
  siteId: string;
};

export function SiteViewTracker({ siteId }: SiteViewTrackerProps) {
  useEffect(() => {
    if (!siteId || siteId.startsWith("site_")) {
      return;
    }

    trackSiteEventInBackend({ eventType: "view", siteId });
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
          trackSiteEventInBackend({
            eventType: "click",
            siteId,
            target: targetName,
          });
        }
        onClick?.(event);
      }}
    />
  );
}
