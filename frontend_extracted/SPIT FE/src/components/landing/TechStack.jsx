import React from 'react';
import { motion } from 'framer-motion';

const TechStack = () => {
    const technologies = [
        "Python", "FastAPI", "React", "Tailwind CSS",
        "Prophet AI", "Pandas",
        "Python", "FastAPI", "React", "Tailwind CSS",
        "Prophet AI", "Pandas"
    ];

    return (
        <section id="tech" className="py-12 border-y border-[#2E2E2E] bg-[#1E1E1E] overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
                <p className="text-sm font-semibold text-[#999999] uppercase tracking-wider">
                    Powered by Modern Technology
                </p>
            </div>

            <div className="relative flex overflow-x-hidden">
                <motion.div
                    className="flex py-4 whitespace-nowrap"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 20,
                            ease: "linear",
                        },
                    }}
                >
                    {technologies.map((tech, index) => (
                        <div
                            key={index}
                            className="mx-8 text-2xl font-bold text-[#999999] hover:text-white transition-colors cursor-default"
                        >
                            {tech}
                        </div>
                    ))}
                </motion.div>

                <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#1E1E1E] to-transparent z-10" />
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#1E1E1E] to-transparent z-10" />
            </div>
        </section>
    );
};

export default TechStack;
