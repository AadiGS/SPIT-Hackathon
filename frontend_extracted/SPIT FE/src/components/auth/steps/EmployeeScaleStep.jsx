import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { EmployeeCountDropdown } from '../../ui/EmployeeCountDropdown';
import { Label } from '../../ui/Label';
import { Button } from '../../ui/Button';

export default function EmployeeScaleStep({ onNext, data, updateData }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.employeeCount) {
            onNext();
        }
    };

    return (
        <Card className="shadow-lg rounded-2xl border border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">Company Size</CardTitle>
                <CardDescription className="text-gray-400">How many employees do you have?</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="employeeCount">Employee Count</Label>
                        <EmployeeCountDropdown
                            value={data.employeeCount || ''}
                            onChange={(value) => updateData({ employeeCount: value })}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">Next</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
