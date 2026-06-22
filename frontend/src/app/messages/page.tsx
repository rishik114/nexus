import Link from "next/link";

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-bg text-txt flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold mb-3">Messages</h1>
        <p className="text-sm text-txt2 mb-4">Direct messages are available in the backend, but the dedicated inbox UI is not built yet.</p>
        <Link href="/" className="text-accent font-semibold">
          Back to home
        </Link>
      </div>
    </div>
  );
}
