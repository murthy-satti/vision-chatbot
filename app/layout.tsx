import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "Vision",
  description: "Vision ChatBot Developed using Next.js, Tailwind CSS, and Gemini API",
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
