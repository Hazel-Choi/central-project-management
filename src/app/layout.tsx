import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Portfolio",
  description: "Cross-client DevOps & Jira ticket reporting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#F7F5F0] font-sans text-stone-900">
        {children}
      </body>
    </html>
  );
}
