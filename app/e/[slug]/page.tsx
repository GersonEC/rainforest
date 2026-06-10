import { notFound } from "next/navigation";
import { getAttendees, getEventBySlug } from "@/lib/events";
import EventClient from "./EventClient";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const attendees = await getAttendees(event.id);

  return <EventClient event={event} initialAttendees={attendees} />;
}
