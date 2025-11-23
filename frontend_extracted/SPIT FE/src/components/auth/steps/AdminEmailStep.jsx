import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Button } from '../../ui/Button';

export default function AdminEmailStep({ onNext, data, updateData, isLoading = false, error = null }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.adminEmail && !isLoading) {
            onNext();
        }
    };

    return (
        <Card className="shadow-lg rounded-2xl border border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">Admin Contact</CardTitle>
                <CardDescription className="text-gray-400">Enter the administrator's email address.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="adminEmail">Email ID</Label>
                        <Input
                            id="adminEmail"
                            type="email"
                            placeholder="admin@example.com"
                            value={data.adminEmail || ''}
                            onChange={(e) => updateData({ adminEmail: e.target.value })}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Registering Company...
                            </>
                        ) : (
                            'Register Company'
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
