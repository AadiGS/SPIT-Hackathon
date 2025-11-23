import React from "react";
import { TestimonialCard } from "../ui/testimonial-card";
import { Marquee } from "../ui/marquee";

export function TestimonialsSection({ title, description, testimonials }) {
  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <section id="testimonials" className="relative w-full py-20 bg-[#0A0A0A]">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Trusted by </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">
              Leading Retailers
            </span>
          </h2>
          <p className="text-lg text-[#999999] max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* Testimonials Marquee */}
        <div className="relative flex flex-col gap-6 overflow-hidden">
          {/* First Row */}
          <Marquee pauseOnHover className="[--duration:40s]">
            {firstRow.map((testimonial, idx) => (
              <TestimonialCard key={idx} {...testimonial} />
            ))}
          </Marquee>

          {/* Second Row - Reverse */}
          <Marquee reverse pauseOnHover className="[--duration:40s]">
            {secondRow.map((testimonial, idx) => (
              <TestimonialCard key={idx} {...testimonial} />
            ))}
          </Marquee>

          {/* Fade Gradients */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#0A0A0A] to-transparent"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#0A0A0A] to-transparent"></div>
        </div>
      </div>
    </section>
  );
}
