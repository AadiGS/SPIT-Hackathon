import React from 'react';
import { motion } from 'framer-motion';
import { HeroSection } from './blocks/hero-section-9';
import BentoGrid from './BentoGrid';
import Pipeline from './Pipeline';
import { LogosSlider } from './blocks/logos-slider';
import { TestimonialsSection } from './blocks/testimonials-with-marquee';
import FAQs from './FAQs';
import Footer from './Footer';

const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Operations, RetailCo",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    testimonial: "ChainForecast transformed our inventory management. The Prophet AI predictions reduced stockouts by 40% and cut excess inventory by 25%. The blockchain audit trail gave our stakeholders complete confidence in our demand forecasting."
  },
  {
    name: "Marcus Johnson",
    role: "Chief Data Officer, MegaMart",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    testimonial: "The RFM segmentation paired with AI-driven bundling recommendations increased our average order value by 32%. What sets ChainForecast apart is the immutable record of every forecast—our board loves the transparency."
  },
  {
    name: "Priya Patel",
    role: "Analytics Director, FashionHub",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    testimonial: "Implementing ChainForecast was seamless. Within weeks, we saw dramatic improvements in seasonal demand planning. The blockchain verification ensures our stakeholders can audit every prediction and recommendation with full traceability."
  },
  {
    name: "David Kim",
    role: "CEO, GroceryPlus",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    testimonial: "This platform is a game-changer. The combination of Prophet forecasting and blockchain transparency solved our biggest pain points: inaccurate predictions and lack of accountability. ROI was positive in under 6 months."
  },
  {
    name: "Elena Rodriguez",
    role: "Supply Chain Manager, TechRetail",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    testimonial: "ChainForecast's smart contract integration with our CRM was revolutionary. Every customer interaction now feeds into verifiable demand signals. The audit trail has become essential for our quarterly reviews."
  },
  {
    name: "James Wilson",
    role: "Head of Analytics, ShopSmart",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    testimonial: "The AI models are incredibly accurate, but what really impressed us was the blockchain layer. For the first time, we can prove to investors exactly how we arrived at each forecast. It's changed how we communicate business intelligence."
  }
];

export default function LandingPage() {
  return (
    <motion.div 
      className="min-h-screen bg-[#0A0A0A] text-white transition-colors duration-300 font-sans selection:bg-white/20"
      initial={{ filter: "blur(10px)", opacity: 0 }}
      animate={{ filter: "blur(0px)", opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <HeroSection />
      <LogosSlider />
      <BentoGrid />
      <Pipeline />
      <TestimonialsSection 
        title="Trusted by Leading Retailers"
        description="See how ChainForecast is transforming inventory management and demand forecasting across the retail industry"
        testimonials={testimonials}
      />
      <FAQs />
      <Footer />
    </motion.div>
  );
}

