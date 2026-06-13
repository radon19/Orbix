import type { Metadata } from "next";
import "./globals.css"; 

export const metadata: Metadata = {
  title: "Orbix | Live Satellite Tracking & Collision Detection",
  description: "Real-time 3D satellite tracking, orbit visualization, and collision threat detection using live Celestrak NORAD data.",
  keywords: ["satellite", "tracking", "NORAD", "ISS", "collision detection", "3D globe"],
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#000", color: "#fff" }}>
        {children}
      </body>
    </html>
  );
}