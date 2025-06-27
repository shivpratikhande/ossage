"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/router'; // or 'next/navigation' for App Router

export default function GitHubSuccess() {
  const router = useRouter();

  useEffect(() => {
    const username = router.query.username;
    if (username) {
      // Redirect to main page with username parameter
      router.push(`/?username=${username}`);
    }
  }, [router.query.username]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to GitHub...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}