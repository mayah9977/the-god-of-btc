// app/layout.tsx
import "./globals.css";
import FCMRegister from "@/components/FCMRegister";

export const metadata = { title: "The God of BTC" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FCMRegister /> {/* ✅ 이 줄이 실제로 있어야 register 호출이 발생 */}
        {children}
      </body>
    </html>
  );
}



