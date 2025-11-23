import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignUpWizard from './SignUpWizard';
import LoginFlow from './LoginFlow';
import { WavyBackground } from '../ui/wavy-background';

export default function AuthContainer() {
    const [searchParams] = useSearchParams();
    const signupParam = searchParams.get('signup');
    const [mode, setMode] = useState(signupParam === 'true' ? 'signup' : 'login'); // 'signup' | 'login'
    
    // Update mode if query parameter changes
    useEffect(() => {
        if (signupParam === 'true') {
            setMode('signup');
        }
    }, [signupParam]);

    return (
        <WavyBackground 
            className="w-full flex items-center justify-center"
            containerClassName="min-h-screen"
            colors={["#1a1a1a", "#2d2d2d", "#404040", "#525252", "#666666"]}
            waveWidth={50}
            backgroundFill="#0A0A0A"
            blur={10}
            speed="slow"
            waveOpacity={0.3}
        >
            <div className="w-full max-w-md px-4">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Retail Analytics</h1>
                    <p className="text-gray-400 mt-2">Enterprise Platform</p>
                </div>

                {mode === 'signup' ? (
                    <SignUpWizard onSwitchToLogin={() => setMode('login')} />
                ) : (
                    <LoginFlow onSwitchToSignup={() => setMode('signup')} />
                )}

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">
                        {mode === 'signup' ? "Already have an account? " : "Don't have an account? "}
                        <button
                            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                            className="font-medium text-white hover:text-gray-300 underline underline-offset-4 transition-colors"
                        >
                            {mode === 'signup' ? "Login" : "Sign up"}
                        </button>
                    </p>
                </div>
            </div>
        </WavyBackground>
    );
}
