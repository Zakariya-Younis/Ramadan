'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Star, Medal, Trophy, Flame, Info, Moon, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
    const [user, setUser] = useState<any>(null)
    const [userName, setUserName] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [streak, setStreak] = useState(0)
    const [todayScore, setTodayScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    const [countdownLabel, setCountdownLabel] = useState('العد التنازلي لرمضان')
    const [prayerTimes, setPrayerTimes] = useState<{ Fajr: string; Maghrib: string } | null>(null)
    const [hijriDate, setHijriDate] = useState('')
    const [isQuizEnabled, setIsQuizEnabled] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        // Hijri Date
        const hDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umaq-nu-latn', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date())
        setHijriDate(hDate)

        // Dynamic Countdown Timer
        const ramadanStartDate = new Date('2026-02-18T00:00:00')

        const fetchPrayerTimes = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=4`)
                const data = await response.json()
                if (data.code === 200) {
                    setPrayerTimes({
                        Fajr: data.data.timings.Fajr,
                        Maghrib: data.data.timings.Maghrib
                    })
                }
            } catch (error) {
                console.error('Error fetching prayer times:', error)
            }
        }

        // Get user location
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude),
                (err) => console.log('Geolocation disabled or failed:', err)
            )
        }

        const updateTimer = () => {
            const now = new Date()
            const nowTime = now.getTime()

            // 1. Check if Ramadan hasn't started yet
            if (nowTime < ramadanStartDate.getTime()) {
                const diff = ramadanStartDate.getTime() - nowTime
                setCountdownLabel('العد التنازلي لرمضان')
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                })
                return
            }

            // 2. During Ramadan: Count down to Iftar or Suhoor
            // Default times (Iftar 18:30, Suhoor 04:30) used as fallback if API fails
            let iftarStr = prayerTimes?.Maghrib || "18:30"
            let suhoorStr = prayerTimes?.Fajr || "04:30"

            const iftarTime = new Date(now)
            const [ifH, ifM] = iftarStr.split(':').map(Number)
            iftarTime.setHours(ifH, ifM, 0, 0)

            const suhoorTime = new Date(now)
            const [suH, suM] = suhoorStr.split(':').map(Number)
            suhoorTime.setHours(suH, suM, 0, 0)

            let targetTime: Date
            let label: string

            if (nowTime < suhoorTime.getTime()) {
                targetTime = suhoorTime
                label = 'الوقت المتبقي للسحور'
            } else if (nowTime < iftarTime.getTime()) {
                targetTime = iftarTime
                label = 'الوقت المتبقي للإفطار'
            } else {
                // Next day's suhoor
                const nextSuhoor = new Date(suhoorTime)
                nextSuhoor.setDate(nextSuhoor.getDate() + 1)
                targetTime = nextSuhoor
                label = 'الوقت المتبقي لسحور الغد'
            }

            const diff = targetTime.getTime() - nowTime
            setCountdownLabel(label)
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            })
        }

        const timer = setInterval(updateTimer, 1000)
        updateTimer() // Initial call
        loadQuizSetting()

        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            } else {
                setUser(user)
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', user.id)
                    .single()

                if (userData) {
                    setUserName(userData.name || '')
                }
                calculateStreak(user.id)
                calculateTodayScore(user.id)
            }
            setLoading(false)
        }
        checkUser()
        return () => clearInterval(timer)
    }, [router, supabase, prayerTimes])

    const loadQuizSetting = async () => {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'quiz_enabled')
            .single()

        if (data) {
            setIsQuizEnabled(data.value === true)
        }
    }

    const calculateStreak = async (userId: string) => {
        const { data: sessions } = await supabase
            .from('daily_sessions')
            .select('session_date')
            .eq('user_id', userId)
            .eq('completed', true)
            .order('session_date', { ascending: false })

        if (!sessions || sessions.length === 0) {
            setStreak(0)
            return
        }

        const dates = sessions.map(s => s.session_date)
        let currentStreak = 0
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

        if (dates[0] !== today && dates[0] !== yesterday) {
            setStreak(0)
            return
        }

        let checkDate = new Date(dates[0])
        for (let i = 0; i < dates.length; i++) {
            const sessionDate = dates[i]
            const expectedDate = checkDate.toISOString().split('T')[0]

            if (sessionDate === expectedDate) {
                currentStreak++
                checkDate.setDate(checkDate.getDate() - 1)
            } else {
                break
            }
        }
        setStreak(currentStreak)
    }

    const calculateTodayScore = async (userId: string) => {
        const today = new Date().toISOString().split('T')[0]
        const { data: session } = await supabase
            .from('daily_sessions')
            .select('total_score')
            .eq('user_id', userId)
            .eq('session_date', today)
            .single()

        if (session) {
            setTodayScore(session.total_score || 0)
        }
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary">جاري التحميل...</div>

    return (
        <div className="min-h-screen bg-background text-foreground p-4">
            <header className="flex justify-between items-center py-4 px-2 border-b border-border mb-8">
                <div className="flex flex-col items-start">
                    <h1 className="text-3xl font-bold text-primary font-[family-name:var(--font-amiri)]">مسابقة رمضان</h1>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mt-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        {hijriDate}
                    </div>
                </div>
                <button
                    onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                    className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-4 rounded-full transition-colors"
                >
                    الخروج
                </button>
            </header>

            <main className="max-w-md mx-auto space-y-6">
                {/* Countdown Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-700 to-amber-900 p-6 rounded-3xl text-white shadow-xl shadow-gold-900/10">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <Moon className="absolute -top-4 -left-4 w-32 h-32 rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {countdownLabel}
                        </p>
                        <div className="flex gap-4 items-center">
                            {timeLeft.days > 0 && (
                                <>
                                    <div className="flex flex-col">
                                        <span className="text-4xl font-black">{timeLeft.days}</span>
                                        <span className="text-[10px] text-amber-200 font-bold">يوم</span>
                                    </div>
                                    <div className="text-3xl font-light text-amber-400/50">:</div>
                                </>
                            )}
                            <div className="flex flex-col">
                                <span className="text-4xl font-black">{String(timeLeft.hours).padStart(2, '0')}</span>
                                <span className="text-[10px] text-amber-200 font-bold">ساعة</span>
                            </div>
                            <div className="text-3xl font-light text-amber-400/50">:</div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-black">{String(timeLeft.minutes).padStart(2, '0')}</span>
                                <span className="text-[10px] text-amber-200 font-bold">دقيقة</span>
                            </div>
                            {(timeLeft.days === 0) && (
                                <>
                                    <div className="text-3xl font-light text-amber-400/50">:</div>
                                    <div className="flex flex-col">
                                        <span className="text-4xl font-black">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                        <span className="text-[10px] text-amber-200 font-bold">ثانية</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm relative">
                    <div className="absolute top-4 left-4">
                        <Star className="text-amber-400 w-5 h-5 fill-amber-400" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-foreground">أهلاً، {userName || 'يا صائم'}!</h2>
                    <p className="text-gray-500 text-sm mb-6 font-medium">جاهز لمضاعفة حسناتك واختبار معلوماتك؟</p>

                    {isQuizEnabled ? (
                        <Link href="/quiz" className="block w-full bg-primary hover:bg-amber-800 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-gold-500/20 flex items-center justify-center gap-3 text-lg">
                            الأسئلة اليومية
                            <Moon className="w-5 h-5 fill-white" />
                        </Link>
                    ) : (
                        <div className="block w-full bg-gray-100 text-gray-400 font-black py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border border-dashed border-gray-300">
                            <span className="text-lg">الأسئلة اليومية (مغلقة حالياً)</span>
                            <span className="text-[10px] font-bold text-gray-400">ستفتح قريباً بإذن الله</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card p-6 rounded-3xl border border-border flex flex-col items-center justify-center gap-2 group hover:border-green-500/50 transition-all hover:shadow-md shadow-sm">
                        <Trophy className="text-orange-700 w-8 h-8 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-2xl text-orange-700">{todayScore}</span>
                        <span className="font-bold text-[10px] text-gray-400 uppercase tracking-widest text-center">نقاط اليوم</span>
                    </div>

                    <div className="bg-card p-6 rounded-3xl border border-border flex flex-col items-center justify-center gap-2 group hover:border-orange-500/50 transition-all hover:shadow-md shadow-sm">
                        <Flame className={`w-10 h-10 transition-all duration-300 ${streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-gray-300'}`} />
                        <span className="font-black text-2xl text-foreground">{streak} أيام</span>
                        <span className="font-bold text-xs text-gray-400 uppercase tracking-widest text-center">سلسلة التفاعل</span>
                    </div>

                    <Link href="/leaderboard" className="col-span-2 bg-gradient-to-r from-primary to-amber-600 p-5 rounded-3xl text-white hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-500/20 active:scale-95 group">
                        <span className="font-black">عرض لوحة المتصدرين</span>
                        <Medal className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    </Link>

                    <Link href="/guide" className="col-span-2 bg-card p-5 rounded-3xl border border-border hover:border-primary/50 transition-all hover:shadow-md flex items-center justify-center gap-3 group shadow-sm bg-gradient-to-r from-background to-amber-50/10">
                        <span className="font-bold text-sm text-gray-700 group-hover:text-black transition-colors">دليل استخدام المنصة</span>
                        <Info className="text-primary w-6 h-6 group-hover:rotate-12 transition-transform" />
                    </Link>
                </div>
            </main>
        </div>
    )
}
