import GitHubWebhookManager from "@/components/github";
import LandingPage from "@/components/landing";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <LandingPage/>
      <GitHubWebhookManager/>
    </div>

  )}