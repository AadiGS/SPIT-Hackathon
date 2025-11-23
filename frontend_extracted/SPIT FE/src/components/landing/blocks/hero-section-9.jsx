import * as React from "react"
import { useNavigate } from "react-router-dom"
import { cn } from '../../../lib/utils'
import { Button } from '../ui/button'
import { FloatingNav } from '../ui/floating-navbar'
import { Spotlight } from '../ui/spotlight'
import { ArrowRight } from 'lucide-react'

const menuItems = [
    { name: 'Features', link: '#features' },
    { name: 'How it Works', link: '#how-it-works' },
    { name: 'Testimonials', link: '#testimonials' },
    { name: 'FAQs', link: '#faq' },
]

export const HeroSection = () => {
    const navigate = useNavigate();
    
    return (
        <div>
            {/* Floating Navbar */}
            <FloatingNav navItems={menuItems} />
            
            <main>
                <div
                    aria-hidden
                    className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
                    <div
                        className="w-[35rem] h-[80rem] -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(260,80%,85%,.08)_0,hsla(260,80%,55%,.02)_50%,hsla(260,80%,45%,0)_80%)]" />
                    <div
                        className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(260,80%,85%,.06)_0,hsla(260,80%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div
                        className="h-[80rem] -translate-y-87.5 absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(260,80%,85%,.04)_0,hsla(260,80%,45%,.02)_80%,transparent_100%)]" />
                </div>

                <section className="overflow-hidden bg-[#0A0A0A] transition-colors duration-300 relative">
                    <Spotlight
                        className="-top-40 left-0 md:left-60 md:-top-20"
                        fill="white"
                    />
                    <div className="relative mx-auto max-w-7xl px-6 pt-40 pb-28 lg:pt-36 lg:pb-24">
                        <div className="relative z-10 mx-auto max-w-3xl text-center">
                            <h1 className="text-balance text-4xl font-bold md:text-5xl lg:text-7xl tracking-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">
                                    Predict Demand.
                                </span> <br />
                                <span className="text-white">
                                    Retain Customers.
                                </span> <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">
                                    Verify Trust.
                                </span>
                            </h1>
                            <p className="mx-auto my-8 max-w-2xl text-lg text-[#999999] leading-relaxed">
                                The world's first Retail Analytics Platform powered by Prophet AI and secured by Blockchain.
                                Detailed RFM segmentation meets immutable forecasting.
                            </p>

                            <div className="flex flex-wrap justify-center gap-4">
                                <Button className="group" onClick={() => navigate('/auth?signup=true')}>
                                    View Live Demo
                                    <ArrowRight
                                        className="-me-1 ms-2 opacity-60 transition-transform group-hover:translate-x-0.5"
                                        size={16}
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div
                        className="mx-auto -mt-16 max-w-7xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
                        <div
                            className="[perspective:1200px] [mask-image:linear-gradient(to_right,black_50%,transparent_100%)] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
                            <div className="[transform:rotateX(20deg);]">
                                <div className="lg:h-[44rem] relative skew-x-[.36rad] bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl overflow-hidden">
                                    <img 
                                        src="/dashboard-preview.png" 
                                        alt="Dashboard Preview" 
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}