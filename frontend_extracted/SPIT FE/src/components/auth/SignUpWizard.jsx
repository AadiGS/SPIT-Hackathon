import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrgDetailsStep from './steps/OrgDetailsStep';
import AdminEmailStep from './steps/AdminEmailStep';
import SuccessStep from './steps/SuccessStep';

import { useAuth } from '../../contexts/AuthContext';
import { companyAPI } from '../../services/api';

export default function SignUpWizard({ onSwitchToLogin }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const updateData = (newData) => {
        setFormData(prev => ({ ...prev, ...newData }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    /**
     * Handle company registration after collecting all data
     */
    const handleRegistration = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Call backend to register company
            const response = await companyAPI.registerCompany(
                formData.orgName,
                formData.orgCity,
                formData.orgOrigin,
                formData.adminEmail
            );

            // Auto-login with the returned token and user data
            login(response.access_token, response.user);

            // Move to success step
            nextStep();
        } catch (err) {
            console.error('Registration failed:', err);
            setError(err.message || 'Failed to register company');
            setIsLoading(false);
        }
    };

    /**
     * Handle completion - redirect to dashboard
     */
    const handleComplete = () => {
        navigate('/dashboard/home');
    };

    switch (step) {
        case 1:
            return <OrgDetailsStep onNext={nextStep} data={formData} updateData={updateData} />;
        
        case 2:
            return (
                <AdminEmailStep 
                    onNext={handleRegistration} 
                    data={formData} 
                    updateData={updateData}
                    isLoading={isLoading}
                    error={error}
                />
            );
        
        case 3:
            return (
                <SuccessStep 
                    onComplete={handleComplete}
                    companyName={formData.orgName}
                    email={formData.adminEmail}
                />
            );
        
        default:
            return null;
    }
}
