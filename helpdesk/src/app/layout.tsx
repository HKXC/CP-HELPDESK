import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CP Helpdesk — ระบบแจ้งซ่อมครุภัณฑ์",
  description: "ระบบรับแจ้งปัญหา แจ้งซ่อมอุปกรณ์ IT/ครุภัณฑ์ ติดตามสถานะ จัดการงานช่าง และรายงาน",
  icons: { icon: "/logo/cp-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Thai:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased">
        <noscript>
          <div style={{ padding: "24px", textAlign: "center", fontFamily: "sans-serif" }}>
            ระบบ CP Helpdesk ต้องเปิดใช้งาน JavaScript จึงจะทำงานได้ — กรุณาเปิด JavaScript แล้วโหลดหน้าใหม่อีกครั้ง
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
