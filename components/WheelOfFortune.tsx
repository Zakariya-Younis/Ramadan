'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Share2, Moon, Quote } from 'lucide-react'
import { RAMADAN_INSPIRATIONS, Inspiration } from '@/lib/data/inspirations'

export default function WheelOfFortune() {
    const [isSpinning, setIsSpinning] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [result, setResult] = useState<Inspiration | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [hasSpunToday, setHasSpunToday] = useState(false)
    const wheelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const lastSpinDate = localStorage.getItem('lastWheelSpinDate')
        const lastSpinIndex = localStorage.getItem('lastWheelSpinIndex')
        const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

        if (lastSpinDate === today && lastSpinIndex !== null) {
            setHasSpunToday(true)
            setResult(RAMADAN_INSPIRATIONS[parseInt(lastSpinIndex)])
        }
    }, [])

    const spinWheel = () => {
        if (isSpinning || hasSpunToday) return

        setIsSpinning(true)
        setResult(null)

        // Random rotation: 5-10 full spins + random offset
        const extraDegrees = Math.floor(Math.random() * 360)
        const totalRotation = rotation + (360 * 8) + extraDegrees

        setRotation(totalRotation)

        // Wait for animation to finish (match CSS transition duration)
        setTimeout(() => {
            setIsSpinning(false)

            // Calculate which segment it landed on
            // 8 segments = 45 degrees each
            const normalizedDegrees = (totalRotation % 360)
            const segmentIndex = Math.floor(((360 - normalizedDegrees) % 360) / 45)

            const selectedInspiration = RAMADAN_INSPIRATIONS[segmentIndex]
            setResult(selectedInspiration)
            setShowModal(true)
            setHasSpunToday(true)

            // Save to localStorage
            const today = new Date().toLocaleDateString('en-CA')
            localStorage.setItem('lastWheelSpinDate', today)
            localStorage.setItem('lastWheelSpinIndex', segmentIndex.toString())
        }, 4000)
    }

    const shareInspiration = () => {
        if (!result) return
        const text = `${result.type === 'ayah' ? 'آية اليوم' : 'حديث اليوم'}:\n\n"${result.content}"\n\n${result.reference}\n\nتطبيق مسابقة رمضان`
        if (navigator.share) {
            navigator.share({
                title: 'إلهام رمضاني',
                text: text,
                url: window.location.href
            }).catch(console.error)
        } else {
            navigator.clipboard.writeText(text)
            alert('تم نسخ النص للمشاركة!')
        }
    }

    return (
        <div className="flex flex-col items-center gap-6 p-6 bg-white rounded-3xl border border-border shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Sparkles className="w-24 h-24" />
            </div>

            <div className="text-center relative z-10">
                <h3 className="text-xl font-black text-neutral-800 mb-1">عجلة الهدايا الإيمانية</h3>
                <p className="text-xs text-neutral-500 font-bold italic">أدر العجلة لتحصل على آية أو حديث اليوم</p>
            </div>

            {/* Wheel UI */}
            <div className="relative w-64 h-64 md:w-72 md:h-72">
                {/* Pointer */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-amber-600 drop-shadow-md"></div>

                {/* The Wheel */}
                <div
                    ref={wheelRef}
                    className="w-full h-full rounded-full border-8 border-amber-100 shadow-2xl relative transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.15, 1) overflow-hidden"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        background: `conic-gradient(
                            #f59e0b 0deg 45deg, 
                            #d97706 45deg 90deg, 
                            #b45309 90deg 135deg, 
                            #92400e 135deg 180deg, 
                            #78350f 180deg 225deg, 
                            #92400e 225deg 270deg, 
                            #b45309 270deg 315deg, 
                            #d97706 315deg 360deg
                        )`
                    }}
                >
                    {/* Numbers or Icons on segments */}
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                            style={{
                                transform: `rotate(${i * 45 + 22.5}deg) translate(0, -90px) rotate(-${i * 45 + 22.5}deg)`
                            }}
                        >
                            <Moon className={`w-6 h-6 ${i % 2 === 0 ? 'text-white' : 'text-amber-200'} opacity-30`} />
                        </div>
                    ))}

                    {/* Center point */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border-4 border-amber-100 flex items-center justify-center z-10 shadow-lg">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                </div>
            </div>

            <button
                onClick={() => hasSpunToday ? setShowModal(true) : spinWheel()}
                disabled={isSpinning}
                className={`px-10 py-3 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 ${isSpinning
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : hasSpunToday
                        ? 'bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50'
                        : 'bg-gradient-to-r from-amber-500 to-amber-700 text-white hover:shadow-amber-500/20'
                    }`}
            >
                {isSpinning ? 'جاري السحب...' : hasSpunToday ? 'عرض إلهام اليوم ✨' : 'أدر العجلة 🎡'}
            </button>

            {/* Result Modal */}
            {showModal && result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white max-w-lg w-full rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
                        {/* Golden Header */}
                        <div className="bg-gradient-to-r from-amber-600 to-amber-400 p-8 text-center relative">
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
                                <Quote className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white">
                                {result.type === 'ayah' ? 'آية كريمة' :
                                    result.type === 'hadith' ? 'حديث شريف' :
                                        result.type === 'quote' ? 'قول مأثور' : 'نصيحة ثمينة'}
                            </h2>
                        </div>

                        {/* Content Body */}
                        <div className="p-8 md:p-12 text-center">
                            <p className="text-xl md:text-2xl font-bold text-neutral-800 leading-relaxed mb-6 font-[family-name:var(--font-amiri)]">
                                "{result.content}"
                            </p>
                            <p className="text-amber-600 font-bold mb-8 italic">
                                — {result.reference}
                            </p>

                            <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 text-right mb-8">
                                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">التفسير / الفائدة:</h4>
                                <p className="text-neutral-600 text-sm leading-relaxed font-medium">
                                    {result.explanation}
                                </p>
                            </div>

                            <button
                                onClick={shareInspiration}
                                className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black text-white py-4 rounded-2xl transition-all font-bold"
                            >
                                <Share2 className="w-5 h-5" />
                                مشاركة الإلهام
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
