import AnimatedGradient from "@/components/AnimatedGradient";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, QueryProvider, ThemeProvider, UserSessionSync } from "@/providers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Reframe",
  description: "Turn any React component into a live canvas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <UserSessionSync />
              <Navbar />
              <div className="relative">
                <AnimatedGradient />
                {children}
              </div>
              <Toaster />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
