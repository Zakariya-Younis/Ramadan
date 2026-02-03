'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Circle, Clock, AlertTriangle, Trophy, Moon } from 'lucide-react'
import { DIFFICULTY_POINTS, QUIZ_TIMER_SECONDS } from '@/lib/constants'

interface Question {
    id: string
    question_text: string
    options: string[]
    correct_option: number
    difficulty: 'easy' | 'medium' | 'hard'
    is_bonus: boolean
}

interface Session {
    id: string
    user_id: string
    session_date: string
    question_ids: string[]
    current_question_index: number
    total_score: number
    completed: boolean
    has_bonus: boolean
    last_question_start_time?: string
}

interface Answer {
    question_id: string
    is_correct: boolean
    score: number
    user_answer?: number
}



const DIFFICULTY_LABELS = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب'
}

export default function QuizPage() {
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState<Session | null>(null)
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
    const [bonusQuestion, setBonusQuestion] = useState<Question | null>(null)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Answer[]>([])
    const [showResult, setShowResult] = useState(false)
    const [isBanned, setIsBanned] = useState(false)
    const [timeLeft, setTimeLeft] = useState(QUIZ_TIMER_SECONDS)
    const [showStartConfirm, setShowStartConfirm] = useState(false)
    const [isTimeUp, setIsTimeUp] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        loadQuizSession()
    }, [])

    useEffect(() => {
        // If we have a current question (resuming), do NOT pause even if confirmation is shown
        // The confirmation acts as a "screen" but time must tick.
        if (!currentQuestion || showResult || submitting) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleTimeout()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [currentQuestion, showResult, submitting]) // Removed showStartConfirm dependency

    const handleTimeout = async (skipStateCheck = false) => {
        if ((!currentQuestion || !session) && !skipStateCheck) return

        // If we're already submitting, ignore unless forced
        if (submitting && !skipStateCheck) return

        setSubmitting(true)
        setIsTimeUp(true)

        const isCorrect = false
        const score = 0

        try {
            if (!session) throw new Error('No session active')

            // 1. Fetch freshest session data
            const { data: freshSession, error: fetchError } = await supabase
                .from('daily_sessions')
                .select('total_score, current_question_index, session_date')
                .eq('id', session.id)
                .single()

            if (fetchError) throw fetchError

            const currentQ = currentQuestion
            if (!currentQ) throw new Error('No question active')

            // 2. Save answer
            await supabase.from('user_answers').insert({
                session_id: session.id,
                question_id: currentQ.id,
                user_answer: -1, // -1 indicates timeout/no answer
                is_correct: isCorrect,
                score: score
            })

            // 3. Update session
            const newTotalScore = (freshSession?.total_score || 0) + score
            const nextIndex = (freshSession?.current_question_index || 0) + 1
            const isCompleted = nextIndex >= 3

            await supabase
                .from('daily_sessions')
                .update({
                    current_question_index: nextIndex,
                    total_score: newTotalScore,
                    completed: isCompleted,
                    last_question_start_time: isCompleted ? null : new Date().toISOString()
                })
                .eq('id', session.id)

            // 4. Update attempts table for leaderboard
            const today = new Date().toISOString().split('T')[0]
            const sDate = freshSession?.session_date || today
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                await supabase.from('attempts').upsert({
                    user_id: user.id,
                    attempt_date: sDate,
                    score: newTotalScore
                }, { onConflict: 'user_id,attempt_date' })

                if (isCompleted) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('total_days_participated')
                        .eq('id', user.id)
                        .single()

                    await supabase
                        .from('users')
                        .update({ total_days_participated: (userData?.total_days_participated || 0) + 1 })
                        .eq('id', user.id)
                }
            }

            if (currentQ) {
                setAnswers([...answers, { question_id: currentQ.id, is_correct: isCorrect, score }])
            }
            setShowResult(true)

            setTimeout(() => {
                setShowResult(false)
                setIsTimeUp(false)
                setSelectedOption(null)
                setSubmitting(false)
                setTimeLeft(25) // Reset timer

                if (isCompleted) {
                    setSession(prev => prev ? { ...prev, completed: true, total_score: newTotalScore } : null)
                    if (user) {
                        loadBonusQuestion(user.id, sDate, session.id)
                    }
                } else {
                    setSession(prev => prev ? { ...prev, current_question_index: nextIndex, total_score: newTotalScore } : null)
                    setCurrentQuestion(null)
                    setTimeLeft(25)
                    if (session?.question_ids[nextIndex]) {
                        loadQuestion(session.question_ids[nextIndex])
                    }
                }
            }, 2000)

        } catch (err) {
            console.error('Timeout Error:', err)
            setSubmitting(false)
        }
    }

    const loadQuizSession = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        // Check if user exists in public table and is banned
        let { data: userData } = await supabase
            .from('users')
            .select('is_banned')
            .eq('id', user.id)
            .single()

        // If user doesn't exist in public table (but exists in auth), recreate them
        if (!userData) {
            console.log('User missing from public table, recreating...')
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                    role: 'user',
                    last_active: new Date().toISOString()
                })

            if (insertError) {
                console.error('Failed to recreate user:', insertError)
                alert('فشل تهيئة بيانات المستخدم. يرجى تسجيل الخروج والدخول مرة أخرى.')
                return
            }

            // Re-fetch user data
            const { data: newUserData } = await supabase
                .from('users')
                .select('is_banned')
                .eq('id', user.id)
                .single()

            userData = newUserData
        }

        if (userData?.is_banned) {
            setIsBanned(true)
            setLoading(false)
            return
        }

        const today = new Date().toISOString().split('T')[0]

        // Check for existing session
        const { data: existingSession } = await supabase
            .from('daily_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('session_date', today)
            .single()

        if (existingSession) {
            setSession(existingSession)

            // Load answers for this session
            const { data: sessionAnswers } = await supabase
                .from('user_answers')
                .select('question_id, is_correct, score, user_answer')
                .eq('session_id', existingSession.id)

            if (sessionAnswers) {
                setAnswers(sessionAnswers)
            }

            if (existingSession.completed) {
                // Load bonus question if available and not answered
                await loadBonusQuestion(user.id, today, existingSession.id)
                setLoading(false)
                return
            }

            // Load current question
            const questionId = existingSession.question_ids[existingSession.current_question_index]

            // Calculate remaining time
            if (existingSession.last_question_start_time) {
                const startTime = new Date(existingSession.last_question_start_time).getTime()
                const now = new Date().getTime()
                const elapsedSeconds = Math.floor((now - startTime) / 1000)
                const remaining = QUIZ_TIMER_SECONDS - elapsedSeconds

                if (remaining <= 0) {
                    // Time already up while away
                    setTimeLeft(0)
                    await loadQuestion(questionId)
                    setTimeout(() => handleTimeout(true), 100)
                } else {
                    setTimeLeft(remaining)
                    await loadQuestion(questionId)
                }
            } else {
                // If last_question_start_time is missing (e.g., old data or error), 
                // we treat this as a "new start" for this question but we MUST lock it in DB
                // to prevent repeated refreshing to reset the timer.
                // We set it to NOW.
                const nowStr = new Date().toISOString()

                await supabase
                    .from('daily_sessions')
                    .update({ last_question_start_time: nowStr })
                    .eq('id', existingSession.id)

                setTimeLeft(QUIZ_TIMER_SECONDS)
                await loadQuestion(questionId)
            }


        } else {
            // No session exists
            setShowStartConfirm(true)
        }

        // If we have an active session, user is technically 'resuming'.
        // The requirement is 'When entering the quiz, ask confirmation'.
        // If we show it now, the background timer is already ticking (calculated above).
        // This effectively penalizes them for leaving, which fits 'Anti-cheat'.
        // We will just show the confirm dialog if it's not completed.
        if (existingSession && !existingSession.completed) {
            setShowStartConfirm(true)
        }

        setLoading(false)
    }

    const startQuiz = async () => {
        // If we already have a session loaded (resume case), just close the modal
        if (session && !session.completed) {
            setShowStartConfirm(false)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setLoading(true)
            await createNewSession(user.id, new Date().toISOString().split('T')[0])
            setShowStartConfirm(false)
            setLoading(false)
        }
    }

    const createNewSession = async (userId: string, date: string) => {
        // Get user's previous sessions
        const { data: userSessions } = await supabase
            .from('daily_sessions')
            .select('id')
            .eq('user_id', userId)

        const sessionIds = userSessions?.map(s => s.id) || []

        let answeredIds: string[] = []

        // Get answered questions if there are any sessions
        if (sessionIds.length > 0) {
            const { data: answeredQuestions } = await supabase
                .from('user_answers')
                .select('question_id')
                .in('session_id', sessionIds)

            answeredIds = answeredQuestions?.map(a => a.question_id) || []
        }

        // Get one question of each difficulty
        const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']
        const selectedQuestions: Question[] = []
        const debugInfo: any = {}

        for (const diff of difficulties) {
            // Debug: Check count first
            const { count } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('difficulty', diff)

            debugInfo[diff] = count

            const { data: questions, error } = await supabase
                .from('questions')
                .select('*')
                .eq('difficulty', diff)
                .eq('is_bonus', false)
                .not('id', 'in', `(${answeredIds.length > 0 ? answeredIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
                .limit(20)

            if (questions && questions.length > 0) {
                const randomIndex = Math.floor(Math.random() * questions.length)
                selectedQuestions.push(questions[randomIndex])
            } else {
                console.error(`No questions found for ${diff}. Error:`, error)
            }
        }

        if (selectedQuestions.length < 3) {
            // Not enough questions in the bank
            // Show error in UI instead of alert
            const missingDiff = difficulties[selectedQuestions.length]
            setLoading(false)
            // Ideally we should have a state for error, but for now we can alert with more info
            alert(`عذراً، لا يوجد أسئلة كافية!
            نبحث عن سؤال: ${missingDiff}
            تم العثور على: ${selectedQuestions.length}
            
            تشخيص قاعدة البيانات:
            سهل: ${debugInfo.easy || 0}
            متوسط: ${debugInfo.medium || 0}
            صعب: ${debugInfo.hard || 0}
            
            الحل: تأكد من تشغيل ملف questions_data.sql في Supabase`)
            return
        }

        const questionIds = selectedQuestions.map(q => q.id)

        // Create session
        const { data: newSession, error: createError } = await supabase
            .from('daily_sessions')
            .insert({
                user_id: userId,
                session_date: date,
                question_ids: questionIds,
                current_question_index: 0,
                total_score: 0,
                completed: false,
                last_question_start_time: new Date().toISOString()
            })
            .select()
            .single()

        if (newSession) {
            setSession(newSession)
            await loadQuestion(questionIds[0])
            setTimeLeft(25) // Initialize timer for first question
        } else if (createError?.code === '23505') {
            console.log('Session already exists, loading existing session...')
            // Duplicate key error - session already exists, let's load it
            const { data: existingSession } = await supabase
                .from('daily_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('session_date', date)
                .single()

            if (existingSession) {
                // Reuse the load logic logic basically
                setSession(existingSession)

                // If completed, just return (UI will update)
                if (existingSession.completed) {
                    setLoading(false)
                    return
                }

                const qId = existingSession.question_ids[existingSession.current_question_index]

                // Recalculate time for consistency (copy of loadLogic)
                if (existingSession.last_question_start_time) {
                    const startTime = new Date(existingSession.last_question_start_time).getTime()
                    const now = new Date().getTime()
                    const elapsedSeconds = Math.floor((now - startTime) / 1000)
                    const remaining = 25 - elapsedSeconds
                    setTimeLeft(remaining > 0 ? remaining : 0)
                    if (remaining <= 0) {
                        // Immediate timeout trigger logic if needed, but safe to just load and let effect handle?
                        // Better to match loadQuizSession logic exactly but simpler here:
                        setTimeout(() => handleTimeout(true), 100)
                    }
                } else {
                    setTimeLeft(25)
                }

                await loadQuestion(qId)
            }
        } else {
            console.error('Failed to create session - Complete Error Object:', JSON.stringify(createError, null, 2))
            alert(`فشل إنشاء الجلسة: ${createError?.message || 'خطأ غير معروف'}\nالتفاصيل: ${createError?.details || ''}\nالرمز: ${createError?.code || ''}`)
        }
    }

    const loadQuestion = async (questionId: string) => {
        const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single()

        if (data) {
            setCurrentQuestion(data)
            // Do NOT reset timer here, as it overrides the remaining time calculation
        }
    }

    const loadBonusQuestion = async (userId: string, date: string, sessionId: string) => {
        // Check if there's a bonus question for today
        const { data: bonus } = await supabase
            .from('questions')
            .select('*')
            .eq('is_bonus', true)
            .eq('bonus_date', date)
            .single()

        if (bonus) {
            // Check if user already answered it
            const { data: bonusAnswer } = await supabase
                .from('user_answers')
                .select('*')
                .eq('session_id', sessionId)
                .eq('question_id', bonus.id)
                .single()

            if (!bonusAnswer) {
                setBonusQuestion(bonus)
                setTimeLeft(25)

                // Update session with start time for bonus question (if not already set, or just update it)
                // Note: Ideally we should update the DB here to allow bonus persistence too
                await supabase
                    .from('daily_sessions')
                    .update({ last_question_start_time: new Date().toISOString() })
                    .eq('id', sessionId)
            }
        }
    }

    const handleSubmit = async () => {
        if (selectedOption === null || !currentQuestion || !session) return

        setSubmitting(true)

        const isCorrect = selectedOption === currentQuestion.correct_option
        const score = isCorrect ? DIFFICULTY_POINTS[currentQuestion.difficulty as keyof typeof DIFFICULTY_POINTS] : 0

        try {
            // 1. Fetch freshest session data to avoid state staleness
            const { data: freshSession, error: fetchError } = await supabase
                .from('daily_sessions')
                .select('total_score, current_question_index, session_date')
                .eq('id', session.id)
                .single()

            if (fetchError) throw fetchError

            const currentQ = currentQuestion
            if (!currentQ) throw new Error('No question active')

            // 2. Save answer
            const { error: answerError } = await supabase.from('user_answers').insert({
                session_id: session.id,
                question_id: currentQ.id,
                user_answer: selectedOption,
                is_correct: isCorrect,
                score: score
            })
            if (answerError) console.error('Error saving answer:', answerError)

            // 3. Update session
            const newTotalScore = (freshSession?.total_score || 0) + score
            const nextIndex = (freshSession?.current_question_index || 0) + 1
            const isCompleted = nextIndex >= 3

            const { error: sessionUpdateError } = await supabase
                .from('daily_sessions')
                .update({
                    current_question_index: nextIndex,
                    total_score: newTotalScore,
                    completed: isCompleted,
                    last_question_start_time: isCompleted ? null : new Date().toISOString()
                })
                .eq('id', session.id)

            if (sessionUpdateError) console.error('Error updating session:', sessionUpdateError)

            // 4. Update attempts table for leaderboard
            const today = new Date().toISOString().split('T')[0]
            const sDate = freshSession?.session_date || today

            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { error: upsertError } = await supabase.from('attempts').upsert({
                    user_id: user.id,
                    attempt_date: sDate,
                    score: newTotalScore
                }, { onConflict: 'user_id,attempt_date' })

                if (upsertError) console.error('Error upserting attempts:', upsertError)

                // 5. Update total_days_participated
                if (isCompleted) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('total_days_participated')
                        .eq('id', user.id)
                        .single()

                    await supabase
                        .from('users')
                        .update({ total_days_participated: (userData?.total_days_participated || 0) + 1 })
                        .eq('id', user.id)
                }
            }

            const currentQFinal = currentQuestion // Re-check after potential await
            if (currentQFinal) {
                setAnswers([...answers, { question_id: currentQFinal.id, is_correct: isCorrect, score }])
            }
            setShowResult(true)

            setTimeout(() => {
                setShowResult(false)
                setSelectedOption(null)
                setSubmitting(false)

                if (isCompleted) {
                    setSession(prev => prev ? { ...prev, completed: true, total_score: newTotalScore } : null)
                    if (user) {
                        loadBonusQuestion(user.id, sDate, session.id)
                    }
                } else {
                    setSession(prev => prev ? { ...prev, current_question_index: nextIndex, total_score: newTotalScore } : null)
                    setCurrentQuestion(null)
                    setTimeLeft(QUIZ_TIMER_SECONDS)
                    if (session?.question_ids[nextIndex]) {
                        loadQuestion(session.question_ids[nextIndex])
                    }
                }
            }, 2000)

        } catch (err) {
            console.error('Submit Error:', err)
            setSubmitting(false)
            alert('حدث خطأ أثناء حفظ الإجابة. يرجى المحاولة مرة أخرى.')
        }
    }

    const handleBonusSubmit = async () => {
        if (selectedOption === null || !bonusQuestion || !session) return

        setSubmitting(true)

        const isCorrect = selectedOption === bonusQuestion.correct_option
        const score = isCorrect ? DIFFICULTY_POINTS.bonus : 0

        try {
            // 1. Fetch freshest session data
            const { data: freshSession, error: fetchError } = await supabase
                .from('daily_sessions')
                .select('total_score, session_date')
                .eq('id', session.id)
                .single()

            if (fetchError) throw fetchError

            // 2. Save answer
            await supabase.from('user_answers').insert({
                session_id: session.id,
                question_id: bonusQuestion.id,
                user_answer: selectedOption,
                is_correct: isCorrect,
                score: score
            })

            // 3. Update session
            const newTotalScore = (freshSession?.total_score || 0) + score
            await supabase
                .from('daily_sessions')
                .update({
                    total_score: newTotalScore,
                    has_bonus: true,
                    last_question_start_time: null
                })
                .eq('id', session.id)

            // 4. Update attempts
            const today = new Date().toISOString().split('T')[0]
            const sDate = freshSession?.session_date || today
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                await supabase.from('attempts').upsert({
                    user_id: user.id,
                    attempt_date: sDate,
                    score: newTotalScore
                }, { onConflict: 'user_id,attempt_date' })
            }

            setAnswers([...answers, { question_id: bonusQuestion.id, is_correct: isCorrect, score }])
            setShowResult(true)

            setTimeout(() => {
                setBonusQuestion(null)
                setShowResult(false)
                setSelectedOption(null)
                setSubmitting(false)
                setSession(prev => prev ? { ...prev, total_score: newTotalScore, has_bonus: true } : null)
                setTimeLeft(QUIZ_TIMER_SECONDS)
            }, 2000)

        } catch (err) {
            console.error('Bonus Submit Error:', err)
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-midnight-900 flex items-center justify-center text-gold-500">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    if (showStartConfirm) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card p-10 rounded-3xl border border-border max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Moon className="w-24 h-24 rotate-12" />
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-primary mb-3">مسابقة اليوم</h1>
                        <p className="text-gray-500 font-bold mb-8">
                            هل أنت مستعد لبدء التحدي واختبار معلوماتك؟
                        </p>

                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-8 flex items-start gap-3 text-right">
                            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                            <p className="text-red-700 text-sm font-bold leading-relaxed">
                                انتبه: بمجرد البدء، سيبدأ العداد التنازلي (25 ثانية لكل سؤال) ولن يتوقف حتى لو قمت بإغلاق الصفحة.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={startQuiz}
                                className="w-full bg-primary hover:bg-amber-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-gold-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                            >
                                ابدأ الآن 🚀
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-3 rounded-2xl transition-colors"
                            >
                                إلغاء العودة
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (isBanned) {
        return (
            <div className="min-h-screen bg-midnight-900 text-white p-4">
                <div className="max-w-2xl mx-auto py-8 text-center">
                    <h1 className="text-3xl font-bold text-red-400 mb-4">تم حظر حسابك</h1>
                    <p className="text-gray-400 mb-8">للأسف، تم حظر حسابك من قبل الإدارة. يرجى التواصل مع الدعم.</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold py-3 px-6 rounded-lg"
                    >
                        العودة إلى لوحة التحكم
                    </button>
                </div>
            </div>
        )
    }

    // Show bonus question if available
    if (bonusQuestion && session?.completed) {
        return (
            <div className="min-h-screen bg-midnight-900 text-white p-4">
                <div className="max-w-2xl mx-auto py-8">
                    <div className="bg-gradient-to-r from-gold-600 to-gold-400 p-6 rounded-2xl mb-8 text-center">
                        <h1 className="text-3xl font-bold text-midnight-950 mb-2">🎁 سؤال بونص!</h1>
                        <p className="text-midnight-900">فرصة للحصول على 20 نقطة إضافية!</p>
                    </div>

                    {!showResult ? (
                        <div className="bg-midnight-950 p-6 rounded-2xl border border-gold-600/30">
                            <p className="text-xl mb-6">{bonusQuestion.question_text}</p>

                            <div className="space-y-3">
                                {bonusQuestion.options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedOption(index)}
                                        className={`w-full text-right p-4 rounded-lg border-2 transition-all ${selectedOption === index
                                            ? 'border-gold-500 bg-gold-900/30'
                                            : 'border-gray-700 hover:border-gold-600/50'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleBonusSubmit}
                                disabled={selectedOption === null || submitting}
                                className="w-full mt-6 bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'إرسال الإجابة'}
                            </button>
                        </div>
                    ) : (
                        <div className={`p-8 rounded-3xl text-center border shadow-sm ${isTimeUp
                            ? 'bg-orange-50 border-orange-200 text-orange-800'
                            : answers[answers.length - 1]?.is_correct
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                            {isTimeUp ? (
                                <>
                                    <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black mb-2">انتهى الوقت! ⏰</h3>
                                    <p className="text-lg font-bold">للأسف، لم تقم بالإجابة في الوقت المحدد.</p>
                                    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-orange-100 inline-block">
                                        <p className="text-sm font-bold">الإجابة الصحيحة:</p>
                                        <p className="text-base font-black">{currentQuestion?.options[currentQuestion.correct_option]}</p>
                                    </div>
                                </>
                            ) : answers[answers.length - 1]?.is_correct ? (
                                <>
                                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black mb-2">إجابة صحيحة! 🎉</h3>
                                    <p className="text-3xl font-black">+{answers[answers.length - 1].score} نقطة</p>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black mb-2">للأسف، إجابة خاطئة</h3>
                                    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-red-100 inline-block">
                                        <p className="text-sm font-bold">الإجابة الصحيحة:</p>
                                        <p className="text-base font-black">{currentQuestion?.options[currentQuestion.correct_option]}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Show completion screen
    if (session?.completed && !bonusQuestion) {
        const correctAnswers = answers.slice(0, 3).filter(a => a.is_correct).length
        const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

        return (
            <div className="min-h-screen bg-background text-foreground p-4">
                <div className="max-w-2xl mx-auto py-8 text-center">
                    <div className="mb-6">
                        <p className="text-gray-500 font-bold">لقد أكملت أسئلة اليوم بنجاح</p>
                        <p className="text-gray-400 text-xs mt-2 font-bold">{today}</p>
                    </div>

                    <div className="bg-card p-10 rounded-3xl border border-border mb-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Moon className="w-24 h-24 rotate-12" />
                        </div>
                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs mb-4">مجموع نقاطك اليوم</p>
                        <p className="text-7xl font-black text-primary mb-2">{session?.total_score}</p>

                        <div className="flex justify-center gap-6 mb-6">
                            {answers.slice(0, 3).map((answer, index) => (
                                <div key={index} className="text-center">
                                    {answer.is_correct ? (
                                        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
                                    ) : (
                                        <XCircle className="w-14 h-14 text-red-400 mx-auto" />
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                        {index === 0 ? 'سهل' : index === 1 ? 'متوسط' : 'صعب'}
                                    </p>
                                    <p className="text-xs font-bold mt-1" style={{ color: answer.is_correct ? '#4ade80' : '#f87171' }}>
                                        {answer.score} نقطة
                                    </p>
                                </div>
                            ))}
                        </div>



                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
                            <p className="text-amber-800 font-bold text-sm flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600" />
                                أسئلة جديدة غداً!
                            </p>
                            <p className="text-amber-700/80 text-xs mt-1">عد غداً للحصول على 3 أسئلة جديدة</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
                        <button
                            onClick={() => router.push('/leaderboard')}
                            className="w-full bg-gradient-to-r from-primary to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2"
                        >

                            لوحة المتصدرين
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full bg-card hover:bg-gray-50 text-foreground font-bold py-3 px-6 rounded-xl border border-border transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            القائمة الرئيسية
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Show current question
    if (!currentQuestion || !session) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4">
                <div className="max-w-2xl mx-auto py-8 text-center">
                    <p className="text-gray-500">جاري التحميل...</p>
                </div>
            </div>
        )
    }

    const currentIndex = session.current_question_index

    return (
        <div className="min-h-screen bg-background text-foreground p-4">
            <div className="max-w-2xl mx-auto py-8">
                {/* Progress Indicator */}
                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2].map((index) => (
                        <div key={index} className="text-center">
                            {index < currentIndex ? (
                                <CheckCircle2 className={`w-12 h-12 mx-auto ${answers[index]?.is_correct ? 'text-green-500' : 'text-red-500'
                                    }`} />
                            ) : index === currentIndex ? (
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                                    <Circle className="relative w-12 h-12 mx-auto text-primary fill-primary/10" />
                                </div>
                            ) : (
                                <Circle className="w-12 h-12 mx-auto text-gray-300" />
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                                {index === 0 ? 'سهل (5)' : index === 1 ? 'متوسط (10)' : 'صعب (15)'}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="bg-midnight-950 p-6 rounded-2xl border border-gold-600/30 mb-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${currentQuestion.difficulty === 'easy'
                            ? 'bg-green-900/30 text-green-400'
                            : currentQuestion.difficulty === 'medium'
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                            {DIFFICULTY_LABELS[currentQuestion.difficulty]}
                        </span>
                        <span className="text-gray-400 text-sm">السؤال {currentIndex + 1} من 3</span>
                    </div>

                    {/* Timer */}
                    <div className="flex justify-center mb-6">
                        <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-4 ${timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse' : 'border-gold-500 text-gold-500'}`}>
                            <span className="text-xl font-bold">{timeLeft}</span>
                            <Clock className="w-4 h-4 absolute -top-2 bg-midnight-950 p-0.5" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gold-400 mb-6">سؤال اليوم</h2>

                    {!showResult ? (
                        <>
                            <p className="text-xl mb-6">{currentQuestion.question_text}</p>

                            <div className="space-y-3">
                                {currentQuestion.options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedOption(index)}
                                        className={`w-full text-right p-4 rounded-lg border-2 transition-all ${selectedOption === index
                                            ? 'border-gold-500 bg-gold-900/30'
                                            : 'border-gray-700 hover:border-gold-600/50'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={selectedOption === null || submitting}
                                className="w-full mt-6 bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'إرسال الإجابة'}
                            </button>

                            {currentIndex < 2 && (
                                <p className="text-center text-gray-400 text-sm mt-4">
                                    السؤال القادم {currentIndex === 0 ? 'متوسط' : 'صعب'} قليلاً، هل أنت مستعد؟ 💪
                                </p>
                            )}
                        </>
                    ) : (
                        <div className={`p-6 rounded-xl text-center ${answers[currentIndex]?.is_correct
                            ? 'bg-green-900/30 border-2 border-green-500'
                            : 'bg-red-900/30 border-2 border-red-500'
                            }`}>
                            {answers[currentIndex]?.is_correct ? (
                                <>
                                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-green-400 mb-2">إجابة صحيحة! 🎉</h3>
                                    <p className="text-lg">+{answers[currentIndex].score} نقطة</p>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-red-400 mb-2">للأسف، إجابة خاطئة</h3>
                                    <p className="text-lg">الإجابة الصحيحة: {currentQuestion.options[currentQuestion.correct_option]}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <p className="text-gray-400 text-sm">مجموع النقاط: {session.total_score}</p>
                </div>
            </div>
        </div>
    )
}
