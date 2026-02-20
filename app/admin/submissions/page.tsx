'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    Loader2,
    ClipboardList,
    Search,
    Filter,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Trophy,
    BarChart3,
    Hash
} from 'lucide-react'

interface Submission {
    id: string
    created_at: string
    is_correct: boolean
    score: number
    user_answer: number
    session: {
        session_date: string
        user: {
            name: string
            email: string
        }
    }
    question: {
        question_text: string
        difficulty: string
        is_bonus: boolean
        options: string[]
        correct_option: number
    }
}

export default function AdminSubmissionsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'incorrect' | 'timeout'>('all')
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const checkAdminAndLoad = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (userData?.role !== 'admin') {
                router.push('/dashboard')
                return
            }

            setIsAdmin(true)
            await loadSubmissions()
        }

        checkAdminAndLoad()
    }, [router, supabase])

    const loadSubmissions = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('user_answers')
            .select(`
                id,
                created_at,
                is_correct,
                score,
                user_answer,
                session:daily_sessions (
                    session_date,
                    user:users (
                        name,
                        email
                    )
                ),
                question:questions (
                    question_text,
                    difficulty,
                    is_bonus,
                    options,
                    correct_option
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching submissions:', error)
        } else {
            setSubmissions(data as any)
        }
        setLoading(false)
    }

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-primary">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    if (!isAdmin) return null

    const filteredSubmissions = submissions.filter(sub => {
        const matchesSearch =
            sub.session?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.session?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.question?.question_text?.toLowerCase().includes(searchQuery.toLowerCase())

        if (!matchesSearch) return false

        if (filterStatus === 'correct') return sub.is_correct
        if (filterStatus === 'incorrect') return !sub.is_correct && sub.user_answer !== -1
        if (filterStatus === 'timeout') return sub.user_answer === -1

        return true
    })

    // Stats calculations
    const totalAttempts = filteredSubmissions.length
    const correctAnswers = filteredSubmissions.filter(s => s.is_correct).length
    const successRate = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0
    const totalPoints = filteredSubmissions.reduce((sum, s) => sum + s.score, 0)

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-neutral-800 flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            سجل الإجابات التفصيلي
                        </h1>
                        <p className="text-neutral-500 font-medium mt-1">متابعة دقيقة لكل محاولات المتسابقين</p>
                    </div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-6 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-600 font-bold hover:bg-neutral-50 transition-colors shadow-sm"
                    >
                        العودة للوحة الإدارة
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                                <Hash className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-neutral-400">إجمالي المحاولات</p>
                                <p className="text-2xl font-black text-neutral-800">{totalAttempts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-500 rounded-2xl">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-neutral-400">نسبة النجاح</p>
                                <p className="text-2xl font-black text-neutral-800">{successRate}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-neutral-400">إجمالي النقاط الموزعة</p>
                                <p className="text-2xl font-black text-neutral-800">{totalPoints}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-neutral-400">أحدث محاولة</p>
                                <p className="text-sm font-black text-neutral-800">
                                    {filteredSubmissions[0] ? new Date(filteredSubmissions[0].created_at).toLocaleDateString('ar-EG') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="بحث باسم المتسابق أو السؤال..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pr-10 pl-4 py-3 text-neutral-800 focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-neutral-400 shadow-inner"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pr-10 pl-4 py-3 text-neutral-800 focus:ring-2 focus:ring-primary/20 focus:outline-none appearance-none cursor-pointer shadow-inner"
                            >
                                <option value="all">كل الحالات</option>
                                <option value="correct">إجابات صحيحة</option>
                                <option value="incorrect">إجابات خاطئة</option>
                                <option value="timeout">انتهى الوقت</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-100">
                                    <th className="px-6 py-4 text-right text-xs font-black text-neutral-400 uppercase tracking-wider w-10"></th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-neutral-400 uppercase tracking-wider">المتسابق</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-neutral-400 uppercase tracking-wider">السؤال</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-neutral-400 uppercase tracking-wider">نوع / صعوبة</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-neutral-400 uppercase tracking-wider">الحالة</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-neutral-400 uppercase tracking-wider text-center">النقاط</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 italic">
                                            لا توجد سجلات مطابقة للبحث...
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSubmissions.map((sub) => {
                                        const isExpanded = expandedRows.has(sub.id)
                                        return (
                                            <React.Fragment key={sub.id}>
                                                <tr
                                                    onClick={() => toggleRow(sub.id)}
                                                    className={`cursor-pointer hover:bg-neutral-50/80 transition-colors group ${isExpanded ? 'bg-neutral-50' : ''}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-neutral-800 text-sm">{sub.session?.user?.name || 'مجهول'}</div>
                                                                <div className="text-[10px] text-neutral-400 font-mono leading-none">{sub.session?.user?.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-start gap-2 max-w-xs">
                                                            <span className="text-sm font-medium text-neutral-700 leading-snug line-clamp-1">
                                                                {sub.question?.question_text}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${sub.question?.is_bonus
                                                                    ? 'bg-purple-100 text-purple-700'
                                                                    : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {sub.question?.is_bonus ? 'بونص' : 'أساسي'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-neutral-400">
                                                                {sub.question?.difficulty === 'easy' ? 'سهل' :
                                                                    sub.question?.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {sub.user_answer === -1 ? (
                                                            <div className="flex items-center gap-1.5 text-amber-600">
                                                                <Clock className="w-4 h-4" />
                                                                <span className="text-xs font-black">انتهاء الوقت</span>
                                                            </div>
                                                        ) : sub.is_correct ? (
                                                            <div className="flex items-center gap-1.5 text-green-600">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                <span className="text-xs font-black">إجابة صحيحة</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-red-600">
                                                                <XCircle className="w-4 h-4" />
                                                                <span className="text-xs font-black">إجابة خاطئة</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-black text-neutral-700 text-center text-sm">
                                                        {sub.score > 0 ? `+${sub.score}` : '0'}
                                                    </td>
                                                </tr>
                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <tr className="bg-neutral-50/50">
                                                        <td colSpan={6} className="px-6 py-6">
                                                            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
                                                                <div className="flex flex-col md:flex-row gap-8">
                                                                    <div className="flex-1">
                                                                        <h4 className="text-sm font-black text-neutral-400 mb-4 flex items-center gap-2">
                                                                            <HelpCircle className="w-4 h-4" />
                                                                            تفاصيل السؤال
                                                                        </h4>
                                                                        <p className="text-lg font-bold text-neutral-800 mb-6 leading-relaxed">
                                                                            {sub.question?.question_text}
                                                                        </p>

                                                                        <div className="space-y-3">
                                                                            {sub.question?.options.map((opt, idx) => {
                                                                                const isUserChoice = sub.user_answer === idx
                                                                                const isCorrectAnswer = sub.question?.correct_option === idx

                                                                                let bgColor = 'bg-neutral-50'
                                                                                let borderColor = 'border-neutral-100'
                                                                                let textColor = 'text-neutral-600'
                                                                                let indicator = null

                                                                                if (isCorrectAnswer) {
                                                                                    bgColor = 'bg-green-50'
                                                                                    borderColor = 'border-green-200'
                                                                                    textColor = 'text-green-700'
                                                                                    indicator = <span className="mr-auto text-[10px] font-black uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">الجواب الصحيح</span>
                                                                                }

                                                                                if (isUserChoice && !sub.is_correct) {
                                                                                    bgColor = 'bg-red-50'
                                                                                    borderColor = 'border-red-200'
                                                                                    textColor = 'text-red-700'
                                                                                    indicator = <span className="mr-auto text-[10px] font-black uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded-full">اختيار المتسابق</span>
                                                                                } else if (isUserChoice && sub.is_correct) {
                                                                                    indicator = <span className="mr-auto text-[10px] font-black uppercase text-green-600 bg-green-200 px-2 py-0.5 rounded-full">اختيار موفق</span>
                                                                                }

                                                                                return (
                                                                                    <div
                                                                                        key={idx}
                                                                                        className={`flex items-center gap-3 p-3 rounded-xl border ${borderColor} ${bgColor} ${textColor} font-bold text-sm`}
                                                                                    >
                                                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${isUserChoice ? 'bg-current text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                                                                                            {String.fromCharCode(65 + idx)}
                                                                                        </div>
                                                                                        {opt}
                                                                                        {indicator}
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <div className="w-full md:w-64 flex flex-col gap-4 border-r border-neutral-100 pr-8">
                                                                        <div>
                                                                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">وقت الإرسال</p>
                                                                            <p className="text-sm font-bold text-neutral-800">
                                                                                {new Date(sub.created_at).toLocaleString('ar-EG')}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">نتيجة المحاولة</p>
                                                                            <div className="flex items-center gap-2">
                                                                                {sub.user_answer === -1 ? (
                                                                                    <span className="text-sm font-black text-amber-600">فشل (انتهاء وقت)</span>
                                                                                ) : sub.is_correct ? (
                                                                                    <span className="text-sm font-black text-green-600">ناجحة (+{sub.score})</span>
                                                                                ) : (
                                                                                    <span className="text-sm font-black text-red-600">غير صحيحة (0)</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-auto pt-4 border-t border-dotted border-neutral-200">
                                                                            <p className="text-[10px] font-medium text-neutral-400 italic">
                                                                                معرف السجل:
                                                                                <br />
                                                                                <span className="font-mono text-[8px]">{sub.id}</span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
