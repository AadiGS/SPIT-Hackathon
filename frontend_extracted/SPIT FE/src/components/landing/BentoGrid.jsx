import React from "react";
import { cn } from "../../lib/utils";
import { BentoGrid, BentoGridItem } from "./ui/bento-grid";
import {
    IconBoxAlignRightFilled,
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import DisplayCards from "./ui/display-cards";
import { Package, TrendingUp, ShoppingCart, Lock, CheckCircle2, Clock } from "lucide-react";

export default function BentoGridSection() {
    return (
        <section id="features" className="py-20 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
                <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">
                    One Platform. <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">Five Department Views.</span>
                </h2>
                <p className="text-[#999999] max-w-2xl mx-auto">
                    Unified intelligence for your entire organization. From marketing to finance, everyone gets the data they need.
                </p>
            </div>
            <BentoGrid className="max-w-4xl mx-auto md:auto-rows-[20rem]">
                {items.map((item, i) => (
                    <BentoGridItem
                        key={i}
                        title={item.title}
                        description={item.description}
                        header={item.header}
                        className={cn("[&>p:text-lg]", item.className)}
                        icon={item.icon} />
                ))}
            </BentoGrid>
        </section>
    );
}

const SkeletonOne = () => {
    const segments = [
        { label: "Champions", value: 85, color: "#10b981" },
        { label: "Loyal", value: 72, color: "#06b6d4" },
        { label: "At Risk", value: 45, color: "#f59e0b" },
        { label: "Lost", value: 28, color: "#ef4444" },
        { label: "New", value: 58, color: "#8b5cf6" },
    ];

    const maxValue = Math.max(...segments.map(s => s.value));
    const points = segments.map((segment, i) => {
        const x = (i / (segments.length - 1)) * 100;
        const y = 100 - (segment.value / maxValue) * 80;
        return { x, y, ...segment };
    });

    const pathData = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    return (
        <motion.div
            initial="initial"
            whileHover="hover"
            className="flex flex-1 w-full h-full min-h-[6rem] bg-gradient-to-br from-[#1E1E1E] to-[#0A0A0A] rounded-lg p-4 flex-col">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#2E2E2E" strokeWidth="0.5" />
                ))}
                
                {/* Gradient area under line */}
                <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 0.8 }}
                    d={`${pathData} L 100 100 L 0 100 Z`}
                    fill="url(#gradient)" />
                
                {/* Main line */}
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d={pathData}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    strokeLinecap="round" />
                
                {/* Data points */}
                {points.map((point, i) => (
                    <motion.g key={i}>
                        <motion.circle
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                            cx={point.x}
                            cy={point.y}
                            r="2"
                            fill={point.color}
                            className="cursor-pointer" />
                        <motion.circle
                            initial={{ scale: 0 }}
                            whileHover={{ scale: 1.5 }}
                            cx={point.x}
                            cy={point.y}
                            r="1.5"
                            fill="white"
                            className="cursor-pointer" />
                    </motion.g>
                ))}
                
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="25%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="75%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="flex justify-between mt-2 text-[9px] text-[#999999]">
                {segments.map((segment, i) => (
                    <span key={i} className="flex-1 text-center">{segment.label}</span>
                ))}
            </div>
        </motion.div>
    );
};
const SkeletonTwo = () => {
    const data = [
        { week: 1, value: 45 },
        { week: 2, value: 62 },
        { week: 3, value: 58 },
        { week: 4, value: 75 },
        { week: 5, value: 72 },
        { week: 6, value: 88 },
    ];
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
        <motion.div
            initial="initial"
            animate="animate"
            whileHover="hover"
            className="flex flex-1 w-full h-full min-h-[6rem] bg-gradient-to-br from-[#1E1E1E] to-[#0A0A0A] rounded-lg p-4 flex-col justify-end">
            <div className="flex items-end justify-between h-full gap-2">
                {data.map((item, i) => (
                    <motion.div
                        key={"chart-bar-" + i}
                        initial={{ height: 0 }}
                        animate={{ 
                            height: `${(item.value / maxValue) * 100}%`,
                        }}
                        transition={{
                            duration: 0.5,
                            delay: i * 0.1,
                            ease: "easeOut"
                        }}
                        whileHover={{
                            height: `${(item.value / maxValue) * 100 + 5}%`,
                            transition: { duration: 0.2 }
                        }}
                        className="flex-1 bg-gradient-to-t from-pink-500 to-violet-500 rounded-t-sm relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2E2E2E] text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            ${item.value}K
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-[#999999]">
                {data.map((item, i) => (
                    <span key={`label-${i}`} className="flex-1 text-center">W{item.week}</span>
                ))}
            </div>
        </motion.div>
    );
};
const SkeletonThree = () => {
    const messages = [
        { 
            type: "user", 
            text: "Show me top insights",
            time: "Just now"
        },
        { 
            type: "ai", 
            text: "Revenue up 23% vs last quarter. Champions segment growing.",
            time: "2s ago"
        },
        { 
            type: "ai", 
            text: "SKU-129 stockout risk in 4 days. Recommend reorder.",
            time: "2s ago"
        },
    ];

    return (
        <motion.div
            initial="initial"
            animate="animate"
            className="flex flex-1 w-full h-full min-h-[6rem] bg-gradient-to-br from-[#1E1E1E] to-[#0A0A0A] rounded-lg p-4 flex-col gap-2 overflow-hidden">
            {messages.map((message, i) => (
                <motion.div
                    key={i}
                    initial={{ x: message.type === "user" ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                        duration: 0.5,
                        delay: i * 0.3,
                        ease: "easeOut"
                    }}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg p-2 ${
                        message.type === "user" 
                            ? "bg-gradient-to-r from-violet-500 to-pink-500" 
                            : "bg-white dark:bg-black border border-neutral-100 dark:border-white/[0.2]"
                    }`}>
                        <p className={`text-xs ${message.type === "user" ? "text-white" : "text-neutral-700 dark:text-neutral-300"}`}>
                            {message.text}
                        </p>
                        <span className={`text-[9px] ${message.type === "user" ? "text-white/70" : "text-neutral-400"}`}>
                            {message.time}
                        </span>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};
const SkeletonFour = () => {
    const bundleCards = [
        {
            icon: <Package className="size-4 text-pink-300" />,
            title: "Premium Bundle",
            description: "Top 3 SKUs • 42% LTV",
            date: "Generated now",
            iconClassName: "text-pink-500",
            titleClassName: "text-pink-500",
            className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-[#0A0A0A]/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
        },
        {
            icon: <TrendingUp className="size-4 text-violet-300" />,
            title: "Value Pack",
            description: "High Volume SKUs • 35% LTV",
            date: "Active",
            iconClassName: "text-violet-500",
            titleClassName: "text-violet-500",
            className: "[grid-area:stack] translate-x-12 translate-y-8 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-[#0A0A0A]/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
        },
        {
            icon: <ShoppingCart className="size-4 text-blue-300" />,
            title: "Starter Bundle",
            description: "New Customer SKUs • 28% LTV",
            date: "Recommended",
            iconClassName: "text-blue-500",
            titleClassName: "text-blue-500",
            className: "[grid-area:stack] translate-x-24 translate-y-16 hover:translate-y-8",
        },
    ];

    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] items-center justify-center bg-gradient-to-br from-[#1E1E1E] to-[#0A0A0A] rounded-lg p-4 overflow-hidden">
            <DisplayCards cards={bundleCards} />
        </div>
    );
};
const SkeletonFive = () => {
    const variants = {
        initial: {
            x: 0,
        },
        animate: {
            x: 10,
            rotate: 5,
            transition: {
                duration: 0.2,
            },
        },
    };
    const variantsSecond = {
        initial: {
            x: 0,
        },
        animate: {
            x: -10,
            rotate: -5,
            transition: {
                duration: 0.2,
            },
        },
    };

    return (
        <motion.div
            initial="initial"
            whileHover="animate"
            className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2">
            <motion.div
                variants={variants}
                className="flex flex-row rounded-2xl border border-neutral-100 dark:border-white/[0.2] p-2  items-start space-x-2 bg-white dark:bg-black">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shrink-0" />
                <p className="text-xs text-neutral-500">
                    Inventory levels for SKU-129 are critically low. Predicted stockout in 48 hours.
                </p>
            </motion.div>
            <motion.div
                variants={variantsSecond}
                className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center justify-end space-x-2 w-3/4 ml-auto bg-white dark:bg-black">
                <p className="text-xs text-neutral-500">Initiating Reorder.</p>
                <div
                    className="h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shrink-0" />
            </motion.div>
        </motion.div>
    );
};
const items = [
    {
        title: "RFM Segmentation",
        description: (
            <span className="text-sm">
                Target 'Champions' and 'At-Risk' users with AI-generated offers.
            </span>
        ),
        header: <SkeletonOne />,
        className: "md:col-span-1",
        icon: <IconClipboardCopy className="h-4 w-4 text-neutral-500" />,
    },
    {
        title: "4-Week Prophet Forecasts",
        description: (
            <span className="text-sm">
                Predict revenue trends with 98% accuracy using Prophet AI.
            </span>
        ),
        header: <SkeletonTwo />,
        className: "md:col-span-1",
        icon: <IconFileBroken className="h-4 w-4 text-neutral-500" />,
    },
    {
        title: "AI Insights Assistant",
        description: (
            <span className="text-sm">
                Intelligent chatbot summarizes all insights on your dashboard.
            </span>
        ),
        header: <SkeletonThree />,
        className: "md:col-span-1",
        icon: <IconSignature className="h-4 w-4 text-neutral-500" />,
    },
    {
        title: "Smart Bundling",
        description: (
            <span className="text-sm">
                Discover which SKUs drive the highest LTV and create bundles.
            </span>
        ),
        header: <SkeletonFour />,
        className: "md:col-span-2",
        icon: <IconTableColumn className="h-4 w-4 text-neutral-500" />,
    },

    {
        title: "Stockout Prevention",
        description: (
            <span className="text-sm">
                AI alerts for inventory depletion before it happens.
            </span>
        ),
        header: <SkeletonFive />,
        className: "md:col-span-1",
        icon: <IconBoxAlignRightFilled className="h-4 w-4 text-neutral-500" />,
    },
];
