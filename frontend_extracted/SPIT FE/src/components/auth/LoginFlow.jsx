import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

export default function LoginFlow({ onSwitchToSignup }) {
    const [step, setStep] = useState('email'); // 'email' | 'otp'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const response = await authAPI.requestOTP(email);
            console.log('OTP requested:', response);
            setStep('otp');
        } catch (err) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const response = await authAPI.verifyOTP(email, otp);
            login(response.access_token, response.user);
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'otp') {
        return (
            <Card className="shadow-lg rounded-2xl border border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white">Enter OTP</CardTitle>
                    <CardDescription className="text-gray-400">
                        OTP sent to {email} (Use: 123456 for demo)
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="otp">6-Digit OTP</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setStep('email')}
                            disabled={loading}
                        >
                            Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg rounded-2xl border border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">Welcome Back</CardTitle>
                <CardDescription className="text-gray-400">Login to access your analytics.</CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="loginEmail">Email ID</Label>
                        <Input
                            id="loginEmail"
                            type="email"
                            placeholder="admin@techinnovations.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <p className="text-xs text-gray-400">
                            Test: admin@techinnovations.com or admin@medicare.com
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
