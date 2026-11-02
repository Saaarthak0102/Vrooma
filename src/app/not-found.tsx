import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center font-sans antialiased bg-[#EEF0F3] text-[#0F1720]">
        <div className="max-w-md text-center p-8 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F1720]">404</h1>
          <h2 className="text-lg font-bold text-[#0F1720]">Page Not Found</h2>
          <p className="text-sm text-gray-600">
            The vehicle listing or page you requested could not be found.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-full bg-[#121A24] text-white text-xs font-semibold"
            >
              Return to Showroom
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

