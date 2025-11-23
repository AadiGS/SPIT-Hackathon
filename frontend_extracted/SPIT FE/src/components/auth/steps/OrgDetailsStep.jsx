import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Button } from '../../ui/Button';

export default function OrgDetailsStep({ onNext, data, updateData }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.orgName && data.orgCity && data.orgOrigin) {
            onNext();
        }
    };

    return (
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Organization Details</CardTitle>
                <CardDescription>Tell us about your company</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input
                            id="orgName"
                            placeholder="Acme Corp"
                            value={data.orgName || ''}
                            onChange={(e) => updateData({ orgName: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="orgCity">City</Label>
                        <Input
                            id="orgCity"
                            placeholder="New York"
                            value={data.orgCity || ''}
                            onChange={(e) => updateData({ orgCity: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="orgOrigin">Origin (Country/Region)</Label>
                        <Input
                            id="orgOrigin"
                            placeholder="USA"
                            value={data.orgOrigin || ''}
                            onChange={(e) => updateData({ orgOrigin: e.target.value })}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" className="w-full">Next</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
