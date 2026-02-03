'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Star, Moon, Trophy, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { DIFFICULTY_POINTS } from '@/lib/constants'

interface LeaderboardEntry {
    user_id: string
    name: string
    total_score: number
    rank: number
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const loadLeaderboard = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Get all attempts with user names
            const { data: attempts } = await supabase
                .from('attempts')
                .select('user_id, score, users(name)')

            if (attempts) {
                // Group by user and sum scores
                const userScores: { [key: string]: { name: string; total: number } } = {}

                attempts.forEach((attempt: any) => {
                    const userId = attempt.user_id
                    const userName = attempt.users?.name || 'مستخدم'
                    const score = attempt.score || 0

                    if (!userScores[userId]) {
                        userScores[userId] = { name: userName, total: 0 }
                    }
                    userScores[userId].total += score
                })

                // Convert to array and sort
                const sorted = Object.entries(userScores)
                    .map(([userId, data]) => ({
                        user_id: userId,
                        name: data.name,
                        total_score: data.total,
                        rank: 0,
                    }))
                    .sort((a, b) => b.total_score - a.total_score)
                    .map((entry, index) => ({ ...entry, rank: index + 1 }))

                setLeaderboard(sorted)
            }
            setLoading(false)
        }

        loadLeaderboard()
    }, [router, supabase])



    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-primary text-center">جاري تحميل لستة الأبطال...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4">
            <div className="max-w-2xl mx-auto py-8">
                <header className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border text-gray-400 hover:text-primary transition-colors">
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-primary font-[family-name:var(--font-amiri)]">لوحة المتصدرين</h1>
                </header>

                <div className="bg-card rounded-[2rem] border border-border shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                        <Trophy className="w-32 h-32 rotate-12" />
                    </div>

                    {leaderboard.length === 0 ? (
                        <div className="p-16 text-center">
                            <Star className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-bold text-lg">لا توجد نتائج بعد.. كن أول الفائزين!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border relative z-10">
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.user_id}
                                    className={`p-6 flex items-center justify-between transition-all hover:bg-gray-50/50 ${entry.rank === 1 ? 'bg-amber-50/50' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-black text-xl shadow-sm ${entry.rank === 1 ? 'bg-primary text-white scale-110' :
                                            entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                                                entry.rank === 3 ? 'bg-amber-100 text-amber-800' :
                                                    'bg-gray-50 text-gray-400'
                                            }`}>
                                            #{entry.rank}
                                        </div>
                                        <div>
                                            <p className="font-black text-lg text-foreground">{entry.name}</p>
                                            {entry.rank <= 3 && (
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">
                                                    {entry.rank === 1 ? 'المركز الأول' : entry.rank === 2 ? 'المركز الثاني' : 'المركز الثالث'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-primary font-black text-2xl flex items-center gap-1.5 leading-none">
                                            {entry.total_score}
                                            <Star className={`w-5 h-5 ${entry.rank === 1 ? 'fill-primary animate-pulse' : 'fill-primary/20'}`} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {entry.total_score >= 3 && entry.total_score <= 10 ? 'نقاط كليّة' : 'نقطة كليّة'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                        <Moon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-amber-900 leading-relaxed">
                        يتم تحديث الترتيب تلقائياً بمجرد إكمال أي متسابق لاختبار اليوم. تنافس مع أصدقائك في الخير!
                    </p>
                </div>
            </div>
        </div>
    )
}
