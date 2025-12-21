import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "Vision AI",
  description: "Vision ChatBot Developed using Next.js, Tailwind CSS, and Gemini API",
  icons: {
    icon: "/logo.jpg",      
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
