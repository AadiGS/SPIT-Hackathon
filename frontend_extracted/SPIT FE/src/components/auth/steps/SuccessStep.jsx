import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CheckCircle } from 'lucide-react';

export default function SuccessStep({ onComplete, companyName = '', email = '' }) {
    return (
        <Card className="text-center shadow-lg rounded-2xl border border-gray-700">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-white">Registration Complete! 🎉</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-gray-400">
                    Your organization <span className="font-semibold text-white">{companyName}</span> has been successfully registered!
                </p>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                        <strong>Super Admin Account Created</strong>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        {email}
                    </p>
                </div>
                <p className="text-sm text-gray-500">
                    You are now logged in as Super Admin with full access to all features.
                </p>
            </CardContent>
            <CardFooter>
                <Button onClick={onComplete} className="w-full">Go to Dashboard</Button>
            </CardFooter>
        </Card>
    );
}
