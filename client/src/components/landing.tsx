"use client";
import React from 'react';
import { ArrowBigRight, ArrowRight, ChevronDown, Github, GitMerge, Globe } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Navigation */}
            <nav className="relative z-20 flex items-center justify-between px-32 py-4  top-0 ">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                        <span className="text-black font-bold text-lg"> <GitMerge /></span>
                    </div>
                    <span className="text-xl font-medium">OSSage</span>
                </div>

                <div className="hidden md:flex items-center space-x-8">
                    <a href="#" className="text-gray-300 hover:text-white transition-colors">Events</a>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors">Feature</a>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors">Roadmap</a>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors">Faq</a>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-gray-300">
                        <Globe className="w-4 h-4" />
                        <span>En</span>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                    <header className="flex justify-end items-center p-4 gap-4 h-16">
                        <SignedOut>
                            <SignInButton />
                            <SignUpButton>
                                <button
                                    className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded-lg font-medium transition-colors">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            <UserButton />
                        </SignedIn>
                    </header>

                </div>
            </nav>

            {/* Main content */}
            <div className="relative z-10 flex items-center justify-between min-h-screen px-6 max-w-7xl mx-auto">
                {/* Decorative stars */}
                <div className="absolute top-20 left-20 text-green-400">
                    <div className="w-6 h-6 bg-green-400" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                </div>
                <div className="absolute top-80 left-80 text-green-400">
                    <div className="w-4 h-4 bg-green-400" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                </div>
                <div className="absolute bottom-32 left-72 text-green-400">
                    <div className="w-5 h-5 bg-green-400" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                </div>

                {/* Left side - Web3 and description */}
                <div className="flex-1 space-y-8">
                    {/* Web3 heading */}
                    <div className="relative">
                        <h1 className="text-9xl font-bold text-white leading-none">
                            <Github className=' w-8 h-8 text-green-600  animate-pulse' /> OPEN <span className=' text-green-400'> SOURCE </span>
                        </h1>
                    </div>

                    {/* Description card */}
                    <div className="bg-slate-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 max-w-sm">
                        <p className="text-gray-300 text-base leading-relaxed mb-6">
                            a decentralized protocol that automatically tracks your open-source activity and rewards you with SOL for real, meaningful contributions.                        </p>
                        <button
                            onClick={() => window.location.href = '/githubmanager'}
                            className="flex items-center justify-end space-x-2 text-white hover:text-green-400 transition-colors group">
                            <span>Explore Details</span>
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-y-1 transition-transform text-slate-400" />
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-y-1 transition-transform text-slate-400" />
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-y-1 transition-transform text-slate-400" />
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-y-1 transition-transform text-slate-400" />
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-y-1 transition-transform text-slate-400" />
                            <Github className=' w-5 h-5 text-green-600  animate-pulse' />

                        </button>


                    </div>
                </div>

                {/* Right side - 3D object and For All */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                    {/* 3D glass cube with coins */}
                    <div className="relative">
                        <div className="relative w-80 h-60 transform perspective-1000">
                            {/* 3D glass container */}
                            <div className="relative w-full h-full">
                                {/* Main glass cube */}
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-600/30 border border-gray-400/30 backdrop-blur-md transform skew-y-3 skew-x-6 rounded-2xl"></div>
                                <div className="absolute inset-2 bg-gradient-to-br from-gray-300/10 to-gray-500/20 border border-gray-300/20 backdrop-blur-sm transform skew-y-2 skew-x-4 rounded-xl"></div>

                                {/* Coins inside the cube */}
                                <div className="absolute inset-0 flex items-center justify-center space-x-6 transform translate-y-2">
                                    {/* First coin */}
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 border-2 border-green-400">
                                            <div className="text-xl font-bold text-black">⚡</div>
                                        </div>
                                        <div className="absolute -inset-3 bg-green-400/20 rounded-full blur-lg"></div>
                                    </div>

                                    {/* Second coin */}
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 border-2 border-green-400">
                                            <div className="text-xl font-bold text-black">⚡</div>
                                        </div>
                                        <div className="absolute -inset-3 bg-green-400/20 rounded-full blur-lg"></div>
                                    </div>
                                </div>

                                {/* Glass reflections */}
                                <div className="absolute top-2 left-4 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-xl blur-sm"></div>
                                <div className="absolute bottom-2 right-4 w-16 h-16 bg-gradient-to-tl from-green-400/15 to-transparent rounded-lg blur-sm"></div>
                            </div>
                        </div>
                    </div>

                    {/* For All text */}
                    <div className="text-center">
                        <h2 className="text-8xl font-bold text-white leading-none">
                            For All
                        </h2>
                    </div>
                </div>
            </div>


        </div>
    );
}