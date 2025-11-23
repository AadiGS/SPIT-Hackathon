import React from 'react';
import { InfiniteSlider } from '../ui/infinite-slider';
import { ProgressiveBlur } from '../ui/progressive-blur';

const logos = [
  {
    id: "logo-1",
    description: "Python",
    image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    className: "h-12 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity",
  },
  {
    id: "logo-2",
    description: "React",
    image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
    className: "h-12 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity",
  },
  {
    id: "logo-4",
    description: "Tailwind CSS",
    image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg",
    className: "h-12 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity",
  },
  {
    id: "logo-5",
    description: "JavaScript",
    image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    className: "h-12 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity",
  },
];

export function LogosSlider() {
  return (
    <section className="py-20 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">
            Powered by <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">Industry Leaders</span>
          </h2>
          <p className="text-[#999999] max-w-2xl mx-auto">
            Built with cutting-edge technology from the world's most trusted platforms
          </p>
        </div>
        
        <div className='relative h-[100px] w-full overflow-hidden'>
          <InfiniteSlider 
            className='flex h-full w-full items-center' 
            duration={30}
            gap={48}
          >
            {logos.map((logo) => (
              <div 
                key={logo.id} 
                className='flex w-32 items-center justify-center'
              >
                <img
                  src={logo.image}
                  alt={logo.description}
                  className={logo.className}
                />
              </div>
            ))}
          </InfiniteSlider>
          <ProgressiveBlur
            className='pointer-events-none absolute top-0 left-0 h-full w-[200px]'
            direction='left'
            blurIntensity={1}
          />
          <ProgressiveBlur
            className='pointer-events-none absolute top-0 right-0 h-full w-[200px]'
            direction='right'
            blurIntensity={1}
          />
        </div>
      </div>
    </section>
  );
}
