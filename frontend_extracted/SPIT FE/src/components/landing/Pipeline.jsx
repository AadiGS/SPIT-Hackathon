import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Lightbulb, TrendingUp, Users } from 'lucide-react';

const PipelineStep = ({ icon: Icon, title, step, isLast }) => (
    <div className="relative flex flex-col items-center z-10">
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: step * 0.2 }}
            className="w-20 h-20 rounded-xl bg-[#1E1E1E] backdrop-blur-lg flex items-center justify-center mb-4 border border-[#2E2E2E] shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]"
        >
            <Icon className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: step * 0.2 + 0.2 }}
            className="text-lg font-bold text-white mb-2"
        >
            {title}
        </motion.h3>

        {!isLast && (
            <div className="absolute top-10 left-1/2 w-full h-[2px] -z-10 hidden md:block">
                <div className="w-full h-full bg-[#2E2E2E] relative overflow-hidden">
                    <motion.div
                        initial={{ x: '-100%' }}
                        whileInView={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: step * 0.5 }}
                        className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                    />
                </div>
            </div>
        )}
    </div>
);

const Pipeline = () => {
    const steps = [
        { icon: Upload, title: "Data Onboarding" },
        { icon: Lightbulb, title: "Insight Layer" },
        { icon: TrendingUp, title: "Sales Forecasting" },
        { icon: Users, title: "CRM Segmentation" },
    ];

    return (
        <section id="how-it-works" className="py-20 relative overflow-hidden bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">
                        From Raw Data to <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">Immutable Truth.</span>
                    </h2>
                    <p className="text-[#999999] max-w-2xl mx-auto">
                        Our pipeline ensures that every prediction is not only accurate but also verifiable and actionable.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    {steps.map((step, index) => (
                        <PipelineStep
                            key={index}
                            icon={step.icon}
                            title={step.title}
                            step={index}
                            isLast={index === steps.length - 1}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pipeline;
