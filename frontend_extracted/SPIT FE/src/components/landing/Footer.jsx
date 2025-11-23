import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Github, Twitter, Linkedin, Facebook, Instagram, Youtube } from 'lucide-react';

const footerLinks = [
    {
        label: 'Product',
        links: [
            { title: 'Features', href: '#features' },
            { title: 'Pricing', href: '#pricing' },
            { title: 'Testimonials', href: '#testimonials' },
            { title: 'Integration', href: '/' },
        ],
    },
    {
        label: 'Company',
        links: [
            { title: 'FAQs', href: '/faqs' },
            { title: 'About Us', href: '/about' },
            { title: 'Privacy Policy', href: '/privacy' },
            { title: 'Terms of Services', href: '/terms' },
        ],
    },
    {
        label: 'Resources',
        links: [
            { title: 'Blog', href: '/blog' },
            { title: 'Changelog', href: '/changelog' },
            { title: 'Brand', href: '/brand' },
            { title: 'Help', href: '/help' },
        ],
    },
    {
        label: 'Social Links',
        links: [
            { title: 'Facebook', href: '#', icon: Facebook },
            { title: 'Instagram', href: '#', icon: Instagram },
            { title: 'Youtube', href: '#', icon: Youtube },
            { title: 'LinkedIn', href: '#', icon: Linkedin },
        ],
    },
];

function AnimatedContainer({ className, delay = 0.1, children }) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return children;
    }

    return (
        <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

const Footer = () => {
    return (
        <footer className="md:rounded-t-6xl relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-4xl border-t border-[#2E2E2E] bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 lg:py-16">
            <div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

            <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
                <AnimatedContainer className="space-y-4">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">
                        ChainForecast
                    </span>
                    <p className="text-[#999999] mt-8 text-sm md:mt-0">
                        © {new Date().getFullYear()} ChainForecast. All rights reserved.
                    </p>
                </AnimatedContainer>

                <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
                    {footerLinks.map((section, index) => (
                        <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                            <div className="mb-10 md:mb-0">
                                <h3 className="text-xs text-white">{section.label}</h3>
                                <ul className="text-[#999999] mt-4 space-y-2 text-sm">
                                    {section.links.map((link) => (
                                        <li key={link.title}>
                                            <a
                                                href={link.href}
                                                className="hover:text-white inline-flex items-center transition-all duration-300"
                                            >
                                                {link.icon && <link.icon className="me-1 size-4" />}
                                                {link.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimatedContainer>
                    ))}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
