import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "../components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "RouteDeals - NYC ⇆ Florida Flight + Hotel Packages",
  description: "Find rare flight + stay bargains from NYC to Florida. Data-driven deals with book-now alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
