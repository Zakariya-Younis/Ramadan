'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Loader2, Gift } from 'lucide-react'

interface Question {
    id: string
    question_text: string
    options: string[]
    correct_option: number
    difficulty: 'easy' | 'medium' | 'hard'
    is_bonus: boolean
    bonus_date: string | null
}

const DIFFICULTY_LABELS = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب'
}

const DIFFICULTY_COLORS = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-800',
    hard: 'bg-red-100 text-red-700'
}

export default function AdminQuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [showForm, setShowForm] = useState(false)

    // Form state
    const [questionText, setQuestionText] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctOption, setCorrectOption] = useState(0)
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
    const [isBonus, setIsBonus] = useState(false)
    const [bonusDate, setBonusDate] = useState('')

    // Filter state
    const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
    const [showBonusOnly, setShowBonusOnly] = useState(false)
    const [isQuizEnabled, setIsQuizEnabled] = useState(true)
    const [togglingQuiz, setTogglingQuiz] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const checkAdminAndLoad = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Check if user is admin
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
            loadQuestions()
            loadQuizSetting()
        }

        checkAdminAndLoad()
    }, [router, supabase])

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

    const loadQuestions = async () => {
        const { data } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) {
            setQuestions(data)
        }
        setLoading(false)
    }

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault()

        const { error } = await supabase.from('questions').insert({
            question_text: questionText,
            options: options,
            correct_option: correctOption,
            difficulty: difficulty,
            is_bonus: isBonus,
            bonus_date: isBonus ? bonusDate : null
        })

        if (!error) {
            setQuestionText('')
            setOptions(['', '', '', ''])
            setCorrectOption(0)
            setDifficulty('easy')
            setIsBonus(false)
            setBonusDate('')
            setShowForm(false)
            loadQuestions()
        }
    }

    const handleDeleteQuestion = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            await supabase.from('questions').delete().eq('id', id)
            loadQuestions()
        }
    }

    const toggleQuizStatus = async () => {
        setTogglingQuiz(true)
        const nextStatus = !isQuizEnabled

        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'quiz_enabled', value: nextStatus })

        if (!error) {
            setIsQuizEnabled(nextStatus)
        }
        setTogglingQuiz(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-primary">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    if (!isAdmin) return null

    const filteredQuestions = questions.filter(q => {
        if (showBonusOnly && !q.is_bonus) return false
        if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
        return true
    })

    const stats = {
        total: questions.length,
        easy: questions.filter(q => q.difficulty === 'easy' && !q.is_bonus).length,
        medium: questions.filter(q => q.difficulty === 'medium' && !q.is_bonus).length,
        hard: questions.filter(q => q.difficulty === 'hard' && !q.is_bonus).length,
        bonus: questions.filter(q => q.is_bonus).length
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4">
            <div className="max-w-6xl mx-auto py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-primary">إدارة الأسئلة</h1>
                    <div className="flex items-center gap-4">
                        {/* Quiz Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>{isQuizEnabled ? 'مفعلة' : 'معطلة'}</span>

                            <button
                                onClick={toggleQuizStatus}
                                style={{
                                    width: '40px',
                                    height: '20px',
                                    borderRadius: '20px',
                                    backgroundColor: isQuizEnabled ? '#22c55e' : '#94a3b8',
                                    border: 'none',
                                    position: 'relative',
                                    cursor: 'pointer'
                                }}
                            >
                                <div
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px',
                                        left: isQuizEnabled ? '22px' : '2px',
                                        transition: '0.2s'
                                    }}
                                />
                            </button>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-sm text-gray-500 hover:text-black transition-colors"
                        >
                            العودة
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-card p-4 rounded-xl border border-border text-center shadow-sm">
                        <p className="text-3xl font-bold text-primary">{stats.total}</p>
                        <p className="text-sm text-gray-600">إجمالي الأسئلة</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-green-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-green-600">{stats.easy}</p>
                        <p className="text-sm text-gray-600">سهل</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-amber-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-amber-600">{stats.medium}</p>
                        <p className="text-sm text-gray-600">متوسط</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-red-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-red-600">{stats.hard}</p>
                        <p className="text-sm text-gray-600">صعب</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-amber-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-primary">{stats.bonus}</p>
                        <p className="text-sm text-gray-600">بونص</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6 flex-wrap">
                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value as any)}
                        className="bg-card border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-sm cursor-pointer"
                    >
                        <option value="all">جميع المستويات</option>
                        <option value="easy">سهل فقط</option>
                        <option value="medium">متوسط فقط</option>
                        <option value="hard">صعب فقط</option>
                    </select>

                    <button
                        onClick={() => setShowBonusOnly(!showBonusOnly)}
                        className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 font-bold ${showBonusOnly
                            ? 'border-primary bg-amber-50 text-primary shadow-sm'
                            : 'border-border bg-card text-gray-500 hover:border-primary/50'
                            }`}
                    >
                        <Gift className="w-5 h-5" />
                        أسئلة البونص فقط
                    </button>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="mb-6 bg-primary hover:bg-gold-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-gold-500/20 transition-transform active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    إضافة سؤال جديد
                </button>

                {showForm && (
                    <form onSubmit={handleAddQuestion} className="bg-card p-6 rounded-2xl border border-border mb-6 space-y-4 shadow-md">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">نص السؤال</label>
                            <textarea
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-gray-400"
                                rows={3}
                                required
                            />
                        </div>

                        {options.map((option, index) => (
                            <div key={index}>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    الخيار {index + 1}
                                </label>
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                        const newOptions = [...options]
                                        newOptions[index] = e.target.value
                                        setOptions(newOptions)
                                    }}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    required
                                />
                            </div>
                        ))}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">الإجابة الصحيحة</label>
                            <select
                                value={correctOption}
                                onChange={(e) => setCorrectOption(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer"
                            >
                                {options.map((_, index) => (
                                    <option key={index} value={index}>الخيار {index + 1}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">مستوى الصعوبة</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as any)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer"
                            >
                                <option value="easy">سهل (5 نقاط)</option>
                                <option value="medium">متوسط (10 نقاط)</option>
                                <option value="hard">صعب (15 نقطة)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isBonus"
                                checked={isBonus}
                                onChange={(e) => setIsBonus(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="isBonus" className="text-sm font-bold text-gray-700">
                                سؤال بونص (20 نقطة) 🎁
                            </label>
                        </div>

                        {isBonus && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">تاريخ البونص</label>
                                <input
                                    type="date"
                                    value={bonusDate}
                                    onChange={(e) => setBonusDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    required={isBonus}
                                />
                                <p className="text-xs text-gray-500 mt-1 font-medium">سيظهر هذا السؤال في التاريخ المحدد فقط</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-gold-600 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95"
                        >
                            حفظ السؤال
                        </button>
                    </form>
                )}

                <div className="space-y-4">
                    {filteredQuestions.map((question) => (
                        <div key={question.id} className={`bg-card p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${question.is_bonus ? 'border-primary/30' : 'border-border'
                            }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex gap-2 mb-2">
                                        <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${DIFFICULTY_COLORS[question.difficulty]
                                            }`}>
                                            {DIFFICULTY_LABELS[question.difficulty]}
                                        </span>
                                        {question.is_bonus && (
                                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                                                <Gift className="w-3 h-3 text-primary" />
                                                بونص - {question.bonus_date}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-bold text-foreground text-lg mb-2">{question.question_text}</p>
                                    <div className="text-sm text-gray-600 space-y-1 bg-background/50 p-3 rounded-lg border border-border/50">
                                        {question.options.map((opt, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 ${idx === question.correct_option ? 'text-green-600 font-bold' : ''}`}>
                                                <span className="w-4 text-gray-400">{idx + 1}.</span> {opt} {idx === question.correct_option && '✓'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteQuestion(question.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-2"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredQuestions.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                            لا توجد أسئلة تطابق الفلتر المحدد
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
