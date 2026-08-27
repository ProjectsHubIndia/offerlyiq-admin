import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminSessionProvider } from "@/components/layout/admin-session-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin panel for management",
  icons: {
    icon: [
      {
        url: "/assets/Favicon/favicon-32x32-removebg-preview.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/assets/Favicon/favicon-16x16-removebg-preview.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: "/assets/Favicon/apple-touch-icon-removebg-preview.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AdminSessionProvider>
          <AdminLayout>{children}</AdminLayout>
        </AdminSessionProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              backgroundColor: "#ffedd5", // light orange bg
              color: "#c2410c", // darker orange text
              borderColor: "#fed7aa", // border slightly darker than bg
            },
          }}
        />
      </body>
    </html>
  );
}
