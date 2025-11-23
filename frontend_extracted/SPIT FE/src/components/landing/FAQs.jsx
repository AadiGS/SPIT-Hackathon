import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export default function FAQs() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How does ChainForecast ensure forecast accuracy?',
            answer: 'ChainForecast ensures accuracy by combining historical sales trends, seasonality patterns, and product‑level semantic features (extracted using RoBERTa). The system uses a time‑series model to predict demand and continuously improves through real‑time data updates and performance monitoring, ensuring forecasts remain stable, reliable, and relevant.',
        },
        {
            id: 'item-2',
            question: 'What is blockchain verification and why does it matter?',
            answer: 'Blockchain verification records key forecasting steps—such as model outputs, data signatures, and updates—on an immutable ledger. This ensures transparency, tamper‑proof audit trails, and eliminates data manipulation risks, which is crucial for businesses relying on accurate forecasting for operational decisions.',
        },
        {
            id: 'item-3',
            question: 'How does RFM segmentation work?',
            answer: 'RFM segmentation classifies customers based on: Recency – how recently they purchased, Frequency – how often they purchase, and Monetary – how much they spend. ChainForecast uses RFM to group customers into actionable clusters, enabling targeted marketing, personalized recommendations, and better demand insights.',
        },
        {
            id: 'item-4',
            question: 'Can I integrate ChainForecast with my existing tools?',
            answer: 'Yes. ChainForecast supports easy integration with existing CRMs, dashboards, inventory systems, and data pipelines using standard APIs. The system can plug into your current workflows without disrupting your existing infrastructure.',
        },
        {
            id: 'item-5',
            question: 'What kind of support do you offer?',
            answer: 'ChainForecast offers technical onboarding, API setup guidance, model performance monitoring, and continuous support to ensure smooth deployment and stable forecasting operations.',
        },
    ];

    return (
        <section id="faq" className="bg-[#0A0A0A] py-16 md:py-24">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="text-center">
                    <h2 className="text-4xl font-semibold">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-600 via-white to-gray-600">
                            Frequently Asked Questions
                        </span>
                    </h2>
                    <p className="text-[#999999] mt-4 text-balance text-lg">
                        Discover quick and comprehensive answers to common questions about our platform, services, and features.
                    </p>
                </div>

                <div className="mt-12">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-[#0A0A0A] rounded-xl w-full px-8 py-3 shadow-lg"
                    >
                        {faqItems.map((item) => (
                            <AccordionItem
                                key={item.id}
                                value={item.id}
                                className="border-[#2E2E2E] border-dotted"
                            >
                                <AccordionTrigger className="cursor-pointer text-base text-white hover:no-underline hover:text-white/80">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-base text-[#999999]">{item.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <p className="text-[#999999] mt-6">
                        Can't find what you're looking for? Contact our{' '}
                        <a
                            href="#contact"
                            className="text-white font-medium hover:underline"
                        >
                            customer support team
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}
