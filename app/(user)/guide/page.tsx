'use client'

import { ArrowRight, Star, Trophy, Flame, Gift, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { DIFFICULTY_POINTS, MAX_DAILY_POINTS } from '@/lib/constants'

export default function GuidePage() {
    return (
        <div className="min-h-screen bg-background text-foreground p-4">
            <header className="flex items-center gap-4 py-4 px-2 border-b border-border mb-8">
                <Link href="/dashboard" className="text-gray-500 hover:text-black transition-colors">
                    <ArrowRight className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold text-primary">شرح المنصة</h1>
            </header>

            <main className="max-w-2xl mx-auto space-y-8 pb-12">
                {/* Intro */}
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-primary">كيف تعمل المسابقة؟</h2>
                    <p className="text-gray-600">
                        مسابقة رمضانية تفاعلية تهدف لاختبار معلوماتك الدينية وزيادة حصيلتك المعرفية خلال الشهر الفضيل.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid gap-6">
                    {/* Daily Quiz */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex gap-4 items-start hover:border-primary/20 transition-colors">
                        <div>
                            <Star className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-2">الاختبار اليومي</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                كل يوم ستحصل على 3 أسئلة جديدة بمستويات صعوبة مختلفة:
                                <br />• <span className="text-green-600 font-medium">سؤال سهل</span> ({DIFFICULTY_POINTS.easy} نقاط)
                                <br />• <span className="text-yellow-600 font-medium">سؤال متوسط</span> ({DIFFICULTY_POINTS.medium} نقاط)
                                <br />• <span className="text-red-600 font-medium">سؤال صعب</span> ({DIFFICULTY_POINTS.hard} نقطة)
                                <br />
                                المجموع اليومي: {MAX_DAILY_POINTS} نقطة.
                            </p>
                        </div>
                    </div>

                    {/* Streak */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex gap-4 items-start hover:border-primary/20 transition-colors">
                        <div>
                            <Flame className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-2">نظام السلسلة (Streak)</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                حافظ على استمراريتك! كل يوم تشارك فيه تزيد سلسلتك ميزة النار. إذا فوتّ يوماً واحداً، ستعود السلسلة إلى الصفر.
                            </p>
                        </div>
                    </div>

                    {/* Bonus */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex gap-4 items-start hover:border-primary/20 transition-colors">
                        <div>
                            <Gift className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-2">أسئلة إضافية</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                في أيام محددة ومميزة خلال الشهر ، ستظهر أسئلة إضافية بقيمة 20 نقطة! لا تفوتها.
                            </p>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex gap-4 items-start hover:border-primary/20 transition-colors">
                        <div>
                            <Trophy className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-2">لوحة المتصدرين</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                نافس أحبابك وكن في صدارة الترتيب! يتم ترتيب المشاركين بناءً على مجموع النقاط الكلي.
                            </p>
                        </div>
                    </div>

                    {/* Anti-Cheat */}
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex gap-4 items-start shadow-sm">
                        <div>
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-600 mb-2">تنبيه هام</h3>
                            <p className="text-red-700/80 text-sm leading-relaxed">
                                المحاولة مسموحة مرة واحدة فقط يومياً. لا يمكنك إعادة الاختبار أو تحديث الصفحة للحصول على أسئلة مختلفة.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-4">
                    <Link
                        href="/quiz"
                        className="bg-primary hover:bg-gold-600 text-white font-bold py-4 px-12 rounded-xl transition-transform hover:scale-105 shadow-lg shadow-gold-500/20"
                    >
                        ابدأ التحدي الآن!
                    </Link>
                </div>
            </main>
        </div>
    )
}
