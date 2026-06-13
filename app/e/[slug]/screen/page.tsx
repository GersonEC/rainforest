import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
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
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const joinUrl = host ? `${protocol}://${host}/e/${event.slug}` : `/e/${event.slug}`;
  const joinQr = await QRCode.toDataURL(joinUrl, {
    width: 260,
    margin: 1,
    color: { dark: "#06110D", light: "#ffffff" },
  }).catch(() => null);

  return <ScreenClient event={event} initialAttendees={attendees} joinQr={joinQr} />;
}
