'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Moon } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                },
                emailRedirectTo: `${window.location.origin}/dashboard`
            }
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
        } else if (data.user) {
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: data.user.id,
                    email: data.user.email,
                    name: name,
                })

            if (insertError) {
                await supabase
                    .from('users')
                    .update({ name })
                    .eq('id', data.user.id)
            }

            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md bg-card p-10 rounded-3xl shadow-xl border border-border relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Moon className="w-24 h-24 rotate-12" />
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-center text-primary mb-2">حساب جديد</h1>
                    <p className="text-center text-gray-400 font-bold mb-8">انضم إلى مجتمع مسابقة رمضان</p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-black text-gray-700 mb-2">
                                الاسم بالكامل
                            </label>
                            <input
                                id="name"
                                type="text"
                                placeholder=" أكتب اسمك هنا"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none placeholder-gray-400 font-medium transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-black text-gray-700 mb-2">
                                البريد الإلكتروني
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="example@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none placeholder-gray-400 font-medium transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-black text-gray-700 mb-2">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none placeholder-gray-400 font-medium transition-all"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 mr-1">يجب أن تكون 6 أحرف على الأقل</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-amber-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-gold-500/20 active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                        >
                            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : 'إنشاء الحساب'}
                        </button>

                        <div className="text-center mt-8">
                            <p className="text-gray-500 text-sm font-bold">
                                لديك حساب بالفعل؟{' '}
                                <Link href="/login" className="text-primary hover:text-amber-800 underline underline-offset-4">
                                    سجل دخولك هنا
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
