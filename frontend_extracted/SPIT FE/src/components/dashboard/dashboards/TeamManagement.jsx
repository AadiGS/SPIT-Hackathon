import React, { useState, useEffect } from 'react';
import { UserPlus, Search, X, Shield, Users as UsersIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { companyAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function TeamManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // New user form state
    const [newUser, setNewUser] = useState({
        email: '',
        role: 'marketing'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Fetch users and roles on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Fetch users and roles in parallel
            const [usersResponse, rolesResponse] = await Promise.all([
                companyAPI.listUsers(),
                companyAPI.getRoles()
            ]);
            
            setUsers(usersResponse.users);
            setCompanyInfo(usersResponse.company);
            setRoles(rolesResponse.roles);
        } catch (err) {
            console.error('Failed to load team data:', err);
            setError(err.message || 'Failed to load team data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await companyAPI.createUser(newUser.email, newUser.role);
            
            // Refresh user list
            await fetchData();
            
            // Reset form and close modal
            setNewUser({ email: '', role: 'marketing' });
            setIsAddModalOpen(false);
        } catch (err) {
            console.error('Failed to create user:', err);
            setSubmitError(err.message || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            await companyAPI.updateUserStatus(userId, !currentStatus);
            
            // Update local state
            setUsers(users.map(u => 
                u.id === userId ? { ...u, is_active: !currentStatus } : u
            ));
        } catch (err) {
            console.error('Failed to update user status:', err);
            alert(err.message || 'Failed to update user status');
        }
    };

    const filteredUsers = users.filter(u => {
        const query = searchQuery.toLowerCase();
        return (
            u.email.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query) ||
            u.role_display.toLowerCase().includes(query) ||
            (u.is_active ? 'enabled' : 'disabled').includes(query)
        );
    });

    const getRoleBadgeColor = (role) => {
        const colors = {
            super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            marketing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            sales: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            product_management: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            operations: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            accounting_finance: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
        };
        return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h2 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">
                        Error Loading Team
                    </h2>
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                    <Button onClick={fetchData} className="mt-4">Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Team Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {companyInfo?.name && `Manage ${companyInfo.name}'s team members and roles`}
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Team Member
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Members</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{users.length}</p>
                            </div>
                            <UsersIcon className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                                    {users.filter(u => u.is_active).length}
                                </p>
                            </div>
                            <Shield className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disabled</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                                    {users.filter(u => !u.is_active).length}
                                </p>
                            </div>
                            <X className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Directory */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Team Directory</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <Input
                                placeholder="Search team members..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Email</th>
                                    <th scope="col" className="px-6 py-3">Role</th>
                                    <th scope="col" className="px-6 py-3">Permissions</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((teamUser) => (
                                    <tr key={teamUser.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {teamUser.email}
                                            {teamUser.id === user?.id && (
                                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(teamUser.role)}`}>
                                                {teamUser.role_display}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {teamUser.permissions.slice(0, 3).map((perm) => (
                                                    <span key={perm} className="text-xs text-gray-600 dark:text-gray-400">
                                                        {perm}
                                                    </span>
                                                ))}
                                                {teamUser.permissions.length > 3 && (
                                                    <span className="text-xs text-gray-500">+{teamUser.permissions.length - 3} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${teamUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {teamUser.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {teamUser.id !== user?.id && (
                                                <button
                                                    onClick={() => toggleUserStatus(teamUser.id, teamUser.is_active)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${teamUser.is_active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                                                    title={teamUser.is_active ? 'Disable user' : 'Enable user'}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${teamUser.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No team members found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add Team Member Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 border border-border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Team Member</h2>
                            <button 
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setSubmitError(null);
                                }} 
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Address
                                </label>
                                <Input
                                    required
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="user@example.com"
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    They will login using OTP (123456)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Role
                                </label>
                                <select
                                    required
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    disabled={isSubmitting}
                                >
                                    {roles.map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.display}
                                        </option>
                                    ))}
                                </select>
                                
                                {/* Show permissions for selected role */}
                                {roles.find(r => r.value === newUser.role) && (
                                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            This role has access to:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {roles.find(r => r.value === newUser.role).permissions.map((perm) => (
                                                <span key={perm} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                                    {perm}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {submitError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setSubmitError(null);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Adding...' : 'Add Member'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
