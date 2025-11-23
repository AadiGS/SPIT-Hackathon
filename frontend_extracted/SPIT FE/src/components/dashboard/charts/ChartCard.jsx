import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChartCard({ title, description, children, className }) {
    const [isEnlarged, setIsEnlarged] = useState(false);

    return (
        <>
            <div className={cn(
                "bg-card rounded-lg border border-border p-4 hover:shadow-lg transition-shadow cursor-pointer",
                className
            )}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setIsEnlarged(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <Maximize2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="chart-content">
                    {children}
                </div>
            </div>

            {/* Enlarged Modal */}
            <AnimatePresence>
                {isEnlarged && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-8"
                        onClick={() => setIsEnlarged(false)}
                    >
                        {/* Blurred Background */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                        {/* Enlarged Chart */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-card rounded-xl border border-border p-8 max-w-6xl w-full max-h-[90vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {title}
                                    </h3>
                                    {description && (
                                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                                            {description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsEnlarged(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>

                            <div className="enlarged-chart-content" style={{ height: '500px' }}>
                                {children}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
