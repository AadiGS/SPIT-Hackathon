import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How it Works', href: '#how-it-works' },
        { name: 'Technology', href: '#tech' },
        { name: 'Team', href: '#team' },
    ];

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
                isScrolled ? "glass glass-dark py-4" : "bg-transparent py-6"
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex-shrink-0 cursor-pointer">
                        <span className="text-2xl font-bold text-gradient">
                            ChainForecast
                        </span>
                    </div>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
                            >
                                {link.name}
                            </a>
                        ))}
                    </div>

                    {/* Right Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Toggle Theme"
                        >
                            <motion.div
                                initial={false}
                                animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                                transition={{ duration: 0.3 }}
                            >
                                {theme === 'dark' ? (
                                    <Moon className="w-5 h-5 text-slate-300" />
                                ) : (
                                    <Sun className="w-5 h-5 text-slate-600" />
                                )}
                            </motion.div>
                        </button>

                        <button className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors">
                            Sign In
                        </button>

                        <button className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300">
                            Launch Dashboard
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {theme === 'dark' ? (
                                <Moon className="w-5 h-5 text-slate-300" />
                            ) : (
                                <Sun className="w-5 h-5 text-slate-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-slate-600 dark:text-slate-300"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden glass glass-dark border-t border-slate-200 dark:border-slate-800"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className="block px-3 py-2 text-base font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </a>
                            ))}
                            <div className="pt-4 space-y-3">
                                <button className="w-full px-3 py-2 text-center text-base font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md">
                                    Sign In
                                </button>
                                <button className="w-full px-3 py-2 text-center text-base font-bold text-white bg-gradient-to-r from-primary to-secondary rounded-md shadow-lg">
                                    Launch Dashboard
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
