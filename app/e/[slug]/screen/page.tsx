import { notFound } from "next/navigation";
import { getAttendees, getEventBySlug } from "@/lib/events";
import ScreenClient from "./ScreenClient";

export const dynamic = "force-dynamic";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const attendees = await getAttendees(event.id);

  return <ScreenClient event={event} initialAttendees={attendees} />;
}
