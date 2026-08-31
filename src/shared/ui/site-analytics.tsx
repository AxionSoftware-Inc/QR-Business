"use client";

import type React from "react";
import { useEffect } from "react";
import { trackPublicCtaInV2, trackPublicViewInV2 } from "@/modules/api/v2-client";

type SiteViewTrackerProps={siteId:string};
const trackedViews=new Set<string>();
function isV2SiteId(siteId:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(siteId);}

export function SiteViewTracker({siteId}:SiteViewTrackerProps){
  useEffect(()=>{if(!isV2SiteId(siteId)||trackedViews.has(siteId))return;trackedViews.add(siteId);void trackPublicViewInV2(siteId);},[siteId]);
  return null;
}

type TrackedLinkProps=React.AnchorHTMLAttributes<HTMLAnchorElement>&{siteId:string;targetName:string};
export function TrackedLink({onClick,siteId,targetName,...props}:TrackedLinkProps){return <a {...props} onClick={(event)=>{if(isV2SiteId(siteId))void trackPublicCtaInV2({siteId,target:targetName});onClick?.(event);}}/>;}
