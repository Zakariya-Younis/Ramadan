'use client'

import { LayoutGrid, Users, Settings, ArrowRight, ShieldCheck, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
    const adminTools = [
        {
            title: "إدارة الأسئلة",
            description: "إضافة وتعديل وحذف أسئلة المسابقة اليومية",
            icon: <LayoutGrid className="w-8 h-8" />,
            link: "/admin/questions",
            color: "bg-blue-500",
            hover: "hover:bg-blue-600"
        },
        {
            title: "إدارة المستخدمين",
            description: "عرض إحصائيات المتسابقين وإدارة الحسابات والترتيب",
            icon: <Users className="w-8 h-8" />,
            link: "/admin/users",
            color: "bg-amber-500",
            hover: "hover:bg-amber-600"
        },
        {
            title: "سجل الإجابات",
            description: "تقرير مفصل عن كل سؤال: من حله، متى، وكيف كانت النتيجة",
            icon: <ClipboardList className="w-8 h-8" />,
            link: "/admin/submissions",
            color: "bg-emerald-500",
            hover: "hover:bg-emerald-600"
        }
    ]

    return (
        <div className="min-h-screen bg-neutral-50 p-6 md:p-12" dir="rtl">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-sm font-bold text-primary uppercase tracking-wider">لوحة التحكم</span>
                        </div>
                        <h1 className="text-4xl font-[family-name:var(--font-amiri)] font-bold text-neutral-800">إدارة مسابقة رمضان</h1>
                    </div>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-neutral-500 hover:text-primary font-bold transition-colors group"
                    >
                        العودة للوحة المتسابق
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                    </Link>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {adminTools.map((tool, index) => (
                        <Link
                            key={index}
                            href={tool.link}
                            className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 hover:shadow-xl hover:border-primary/20 transition-all duration-300 group"
                        >
                            <div className={`w-16 h-16 ${tool.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                {tool.icon}
                            </div>
                            <h2 className="text-2xl font-black text-neutral-800 mb-3">{tool.title}</h2>
                            <p className="text-neutral-500 font-medium leading-relaxed mb-6">
                                {tool.description}
                            </p>
                            <div className="flex items-center gap-2 text-primary font-black group-hover:gap-4 transition-all">
                                الدخول والتحكم
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* System Stats (Placeholder for future expansion) */}
                <div className="mt-12 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
                    <div className="flex items-center gap-3 mb-6">
                        <Settings className="w-5 h-5 text-neutral-400" />
                        <h3 className="text-lg font-bold text-neutral-800">إعدادات النظام</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 italic text-neutral-400 text-sm text-center">
                            إحصائيات النظام ستظهر هنا قريباً...
                        </div>
                        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 italic text-neutral-400 text-sm text-center">
                            مؤشرات الأداء النشطة...
                        </div>
                        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 italic text-neutral-400 text-sm text-center">
                            تقارير المسابقة...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
