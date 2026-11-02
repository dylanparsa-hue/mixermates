"use client";
import { EventPageContent } from "./event-page-content";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
import {
  currencyMYR,
  eventDateLabel,
  eventAccessLabel,
  locationVisibilityLabel,
  zonedInstant,
} from "@/lib/event-config";
export function EventSetupPreview({ slug }: any) {
  const [event, setEvent] = useState<any>(null),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    (async()=>{
      const visible=await api("events/"+slug);
      try {
        const setup=await api("setup"),draft=setup.events.find((e:any)=>e.slug===slug);
        if(draft?.creatorState?.payload){
          const {id,version,creationKey,...snapshot}=JSON.parse(draft.creatorState.payload);
          const instant=(s:string)=>{try{return zonedInstant(s,snapshot.timezone).toISOString();}catch{return new Date(0).toISOString();}};
          return {...visible,...snapshot,startsAt:instant(snapshot.startsLocal),endsAt:instant(snapshot.endsLocal)};
        }
      }catch { /* Existing authorized staff previews use their event projection. */ }
      return visible;
    })()
      .then(setEvent)
      .catch((e: any) => setError(e.message));
  }, [slug]);
  if (!event)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Loading saved event preview…"}
      </p>
    );
  return (
    <div className="page-width setup-page">
      <div className="setup-row">
        <div>
          <Link href="/organizer?tab=My+events">Back to My events</Link>
          <h1>Saved event preview</h1>
          <p>Authenticated preview. Real ticket sales remain disabled.</p>
        </div>
        <div className="setup-actions">
          <button
            className="button secondary"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            Desktop
          </button>
          <button
            className="button secondary"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            Mobile
          </button>
        </div>
      </div>
      <div className={mobile ? "designer-preview viewport-mobile" : "designer-preview"}><EventPageContent event={event} preview/></div>
    </div>
  );
}
