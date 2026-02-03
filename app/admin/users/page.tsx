'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Users, Ban, CheckCircle, Search, Filter } from 'lucide-react'

interface User {
    id: string
    name: string
    email: string
    role: string
    is_banned: boolean
    last_active: string | null
    total_days_participated: number
    created_at: string
}

interface UserStats {
    total_score: number
    attempts_count: number
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'banned' | 'points-high' | 'points-low'>('all')

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
            await loadUsers()
        }

        checkAdminAndLoad()
    }, [router, supabase])

    const loadUsers = async () => {
        const { data } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) {
            setUsers(data)

            // Load stats for each user
            const stats: Record<string, UserStats> = {}
            for (const user of data) {
                const { data: attempts } = await supabase
                    .from('attempts')
                    .select('score')
                    .eq('user_id', user.id)

                const totalScore = attempts?.reduce((sum, a) => sum + a.score, 0) || 0
                const attemptsCount = attempts?.length || 0

                stats[user.id] = { total_score: totalScore, attempts_count: attemptsCount }
            }
            setUserStats(stats)
        }
        setLoading(false)
    }

    const handleBanUser = async (userId: string, currentBanStatus: boolean) => {
        const action = currentBanStatus ? 'إلغاء حظر' : 'حظر'
        if (confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) {
            await supabase
                .from('users')
                .update({ is_banned: !currentBanStatus })
                .eq('id', userId)

            loadUsers()
        }
    }

    const isUserActive = (lastActive: string | null) => {
        if (!lastActive) return false
        const lastActiveDate = new Date(lastActive)
        const daysSinceActive = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysSinceActive <= 2 // Active if logged in within last 2 days
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-primary">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    if (!isAdmin) return null

    const filteredUsers = users.filter(user => {
        // Search filter
        const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())

        if (!matchesSearch) return false

        // Status filter
        if (filterStatus === 'banned') return user.is_banned
        if (filterStatus === 'active') return !user.is_banned && isUserActive(user.last_active)
        if (filterStatus === 'inactive') return !user.is_banned && !isUserActive(user.last_active)

        return true
    }).sort((a, b) => {
        if (filterStatus === 'points-high') {
            const scoreA = userStats[a.id]?.total_score || 0
            const scoreB = userStats[b.id]?.total_score || 0
            return scoreB - scoreA
        }
        if (filterStatus === 'points-low') {
            const scoreA = userStats[a.id]?.total_score || 0
            const scoreB = userStats[b.id]?.total_score || 0
            return scoreA - scoreB
        }
        return 0 // Keep database order (created_at desc)
    })

    const stats = {
        total: users.length,
        active: users.filter(u => !u.is_banned && isUserActive(u.last_active)).length,
        inactive: users.filter(u => !u.is_banned && !isUserActive(u.last_active)).length,
        banned: users.filter(u => u.is_banned).length
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4">
            <div className="max-w-6xl mx-auto py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                        <Users className="w-8 h-8" />
                        إدارة المستخدمين
                    </h1>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-sm text-gray-500 hover:text-black transition-colors"
                    >
                        العودة
                    </button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card p-4 rounded-xl border border-border text-center shadow-sm">
                        <p className="text-3xl font-bold text-primary">{stats.total}</p>
                        <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-green-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                        <p className="text-sm text-gray-600">نشط</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-amber-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-amber-600">{stats.inactive}</p>
                        <p className="text-sm text-gray-600">غير نشط</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-red-100 text-center shadow-sm">
                        <p className="text-3xl font-bold text-red-600">{stats.banned}</p>
                        <p className="text-sm text-gray-600">محظور</p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-4 mb-6 flex-wrap">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو البريد الإلكتروني..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card border border-border rounded-xl pr-10 pl-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-gray-400 shadow-sm"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-card border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-sm cursor-pointer"
                    >
                        <option value="all">جميع المستخدمين</option>
                        <option value="points-high">أعلى النقاط</option>
                        <option value="points-low">أقل النقاط</option>
                        <option value="active">نشط فقط</option>
                        <option value="inactive">غير نشط فقط</option>
                        <option value="banned">محظور فقط</option>
                    </select>
                </div>

                {/* Users List */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            لا يوجد مستخدمين
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => {
                                const stats = userStats[user.id] || { total_score: 0, attempts_count: 0 }
                                const active = isUserActive(user.last_active)

                                return (
                                    <div key={user.id} className={`p-4 transition-colors ${user.is_banned ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-lg text-foreground">{user.name || 'بدون اسم'}</p>
                                                    {user.is_banned && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                            محظور
                                                        </span>
                                                    )}
                                                    {!user.is_banned && active && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                            نشط
                                                        </span>
                                                    )}
                                                    {!user.is_banned && !active && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                                            غير نشط
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.role === 'admin'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-blue-100 text-blue-700'
                                                            }`}
                                                    >
                                                        {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-gray-500 mb-2 font-mono">{user.email}</p>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-400 font-medium">مجموع النقاط</p>
                                                        <p className="text-primary font-black text-lg">{stats.total_score}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 font-medium">عدد الأيام</p>
                                                        <p className="text-blue-600 font-black text-lg">{user.total_days_participated || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 font-medium">آخر نشاط</p>
                                                        <p className="text-foreground font-semibold">
                                                            {user.last_active
                                                                ? new Date(user.last_active).toLocaleDateString('ar')
                                                                : 'لم يسجل دخول'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 font-medium">تاريخ التسجيل</p>
                                                        <p className="text-foreground font-semibold">
                                                            {new Date(user.created_at).toLocaleDateString('ar')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleBanUser(user.id, user.is_banned)}
                                                    className={`mr-4 px-4 py-2 rounded-lg font-semibold transition-colors ${user.is_banned
                                                        ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                                        : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                                        }`}
                                                >
                                                    {user.is_banned ? (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 inline ml-1" />
                                                            إلغاء الحظر
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Ban className="w-4 h-4 inline ml-1" />
                                                            حظر
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
