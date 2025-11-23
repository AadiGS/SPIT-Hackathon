import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Button } from '../../ui/Button';

export default function OtpVerificationStep({ onNext, onBack, email, title = "Verify OTP" }) {
    const [otp, setOtp] = React.useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validation: accept 6 digit code
        if (otp.length >= 6) {
            onNext();
        }
    };

    return (
        <Card className="shadow-lg rounded-2xl border border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">{title}</CardTitle>
                <CardDescription className="text-gray-400">Enter the code sent to {email}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="otp">OTP Code</Label>
                        <Input
                            id="otp"
                            type="text"
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            className="text-center text-2xl tracking-widest"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button type="submit" className="w-full" disabled={otp.length < 6}>
                        Verify
                    </Button>
                    {onBack && (
                        <Button type="button" variant="ghost" onClick={onBack} className="w-full">
                            Back
                        </Button>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}
