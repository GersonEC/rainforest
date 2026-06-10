import type { Metadata } from "next";
import HostClient from "./HostClient";

export const metadata: Metadata = {
  title: "Host · Event Networking Graph",
};

export default function HostPage() {
  return <HostClient />;
}
