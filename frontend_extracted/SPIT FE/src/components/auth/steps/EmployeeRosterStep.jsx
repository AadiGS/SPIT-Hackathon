import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { DepartmentDropdown } from '../../ui/DepartmentDropdown';
import { Button } from '../../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

export default function EmployeeRosterStep({ onNext, data, updateData }) {
    const [employees, setEmployees] = React.useState(data.employees || [{ name: '', email: '', designation: '' }]);

    const handleAddRow = () => {
        setEmployees([...employees, { name: '', email: '', designation: '' }]);
    };

    const handleRemoveRow = (index) => {
        const newEmployees = employees.filter((_, i) => i !== index);
        setEmployees(newEmployees);
    };

    const handleChange = (index, field, value) => {
        const newEmployees = [...employees];
        newEmployees[index][field] = value;
        setEmployees(newEmployees);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validEmployees = employees.filter(e => e.name && e.email);
        if (validEmployees.length > 0) {
            updateData({ employees: validEmployees });
            onNext();
        }
    };

    return (
        <Card className="shadow-lg rounded-2xl border border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">Employee Roster</CardTitle>
                <CardDescription className="text-gray-400">Add your team members.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {employees.map((emp, index) => (
                        <div key={index} className="space-y-3 border-b pb-4 mb-4 last:border-0 last:mb-0 last:pb-0 relative">
                            {employees.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRow(index)} className="absolute right-0 top-0 text-gray-400 hover:text-white hover:bg-gray-700 h-6 w-6">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input
                                    value={emp.name}
                                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Email</Label>
                                <Input
                                    value={emp.email}
                                    onChange={(e) => handleChange(index, 'email', e.target.value)}
                                    placeholder="john@example.com"
                                    type="email"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Department</Label>
                                <DepartmentDropdown
                                    value={emp.designation}
                                    onChange={(value) => handleChange(index, 'designation', value)}
                                    isAdminTaken={employees.some((e, i) => i !== index && e.designation === 'Admin')}
                                />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddRow} className="w-full mt-2">
                        <Plus className="h-4 w-4 mr-2" /> Add Employee
                    </Button>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">Complete Registration</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
