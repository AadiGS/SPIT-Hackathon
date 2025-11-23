import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

export function TestimonialCard({ name, role, image, testimonial }) {
  return (
    <div className="relative w-[350px] cursor-pointer overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-6 hover:border-white/20 transition-colors">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback className="bg-[#2E2E2E] text-white">
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white">{name}</p>
            <p className="text-sm text-[#999999]">{role}</p>
          </div>
        </div>
        <p className="text-[#999999] leading-relaxed">{testimonial}</p>
      </div>
    </div>
  );
}
