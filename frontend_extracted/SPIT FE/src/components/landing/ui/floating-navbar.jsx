import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { ButtonCta } from "./button-shiny";

export const FloatingNav = ({
  navItems,
  className,
}) => {
  const { scrollYProgress } = useScroll();
  const navigate = useNavigate();

  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    // Keep navbar always visible
    setVisible(true);
  });

  const handleNavClick = (e, link) => {
    e.preventDefault();
    const element = document.querySelector(link);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: 0,
        }}
        animate={{
          y: 0,
          opacity: 1,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "flex max-w-fit absolute top-10 inset-x-0 mx-auto border border-[#2E2E2E] rounded-full bg-[#1E1E1E]/80 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-4 py-2 items-center justify-center space-x-6",
          className
        )}
      >
        <a href="#" className="flex items-center">
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">
            ChainForecast
          </span>
        </a>
        <div className="h-6 w-px bg-[#2E2E2E]"></div>
        {navItems.map((navItem, idx) => (
          <a
            key={`link=${idx}`}
            href={navItem.link}
            onClick={(e) => handleNavClick(e, navItem.link)}
            className={cn(
              "relative text-white items-center flex space-x-1 hover:text-[#999999] transition-colors cursor-pointer"
            )}
          >
            <span className="block sm:hidden">{navItem.icon}</span>
            <span className="hidden sm:block text-sm">{navItem.name}</span>
          </a>
        ))}
        <ButtonCta label="Login" className="w-auto h-10 px-6" onClick={() => navigate('/auth')} />
      </motion.div>
    </AnimatePresence>
  );
};
