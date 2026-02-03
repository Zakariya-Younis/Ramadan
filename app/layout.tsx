import type { Metadata } from "next";
import { Cairo, Amiri, Reem_Kufi } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
    subsets: ["arabic"],
    weight: ["400", "600", "700"],
    variable: "--font-cairo"
});

const amiri = Amiri({
    subsets: ["arabic"],
    weight: ["400", "700"],
    variable: "--font-amiri"
});

const reemKufi = Reem_Kufi({
    subsets: ["arabic"],
    weight: ["400", "700"],
    variable: "--font-reem-kufi"
});

export const metadata: Metadata = {
    title: "مسابقة رمضان",
    description: "تحديات يومية للشهر الفضيل",
    icons: {
        icon: '/vercel.jpg',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ar" dir="rtl">
            <body className={`${cairo.variable} ${amiri.variable} ${reemKufi.variable}`}>{children}</body>
        </html>
    );
}
