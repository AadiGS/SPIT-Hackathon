import React from 'react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    author: {
      name: "Emma Thompson",
      handle: "@emmaai",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    text: "ChainForecast revolutionized our inventory management. The Prophet AI predictions are incredibly accurate, saving us thousands monthly.",
    company: "RetailCo"
  },
  {
    author: {
      name: "David Park",
      handle: "@davidtech",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    text: "The blockchain verification gives us complete confidence in our forecasts. Our stakeholders love the immutable audit trail.",
    company: "TechMart"
  },
  {
    author: {
      name: "Sofia Rodriguez",
      handle: "@sofiaml",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
    },
    text: "RFM segmentation helped us identify our most valuable customers. We've increased retention by 40% in just three months.",
    company: "FashionHub"
  },
  {
    author: {
      name: "Michael Chen",
      handle: "@mikeanalytics",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
    },
    text: "No more stockouts! The AI alerts are always on point. Our customers are happier and our bottom line shows it.",
    company: "GroceryPlus"
  },
  {
    author: {
      name: "Lisa Anderson",
      handle: "@lisadata",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    text: "Smart bundling recommendations increased our average order value by 35%. This platform pays for itself.",
    company: "ElectroStore"
  },
  {
    author: {
      name: "James Wilson",
      handle: "@jameswil",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    text: "The integration was seamless and the dashboard is intuitive. Our team was up and running in just two days.",
    company: "SportGear"
  }
];

const TestimonialCard = ({ testimonial, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-6 hover:border-white/20 transition-all duration-300 flex flex-col justify-between min-h-[280px]"
  >
    <div>
      <p className="text-[#999999] text-sm leading-relaxed mb-6">
        "{testimonial.text}"
      </p>
    </div>
    <div className="flex items-center gap-4 mt-auto">
      <img 
        src={testimonial.author.avatar} 
        alt={testimonial.author.name}
        className="w-12 h-12 rounded-full object-cover border-2 border-[#2E2E2E]"
      />
      <div>
        <p className="text-white font-semibold text-sm">{testimonial.author.name}</p>
        <p className="text-[#999999] text-xs">{testimonial.company}</p>
      </div>
    </div>
  </motion.div>
);

const Testimonials = () => {
  return (
    <section className="py-20 bg-[#0A0A0A] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">
            Trusted by <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">Retail Leaders</span>
          </h2>
          <p className="text-[#999999] max-w-2xl mx-auto">
            Join hundreds of businesses that are already using ChainForecast to predict demand, retain customers, and verify trust.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
