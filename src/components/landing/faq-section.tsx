"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { AnimateOnScroll } from "./animate-on-scroll";

const faqs = [
  {
    question: "Is Beespo affiliated with The Church of Jesus Christ of Latter-day Saints?",
    answer:
      "No. Beespo is independent software created by members to help other members. We are not affiliated with, endorsed by, or connected to the Church or any of its official programs. We simply saw a need and built a solution.",
  },
  {
    question: "Who is Beespo for?",
    answer:
      "Beespo is designed for bishoprics, branch presidencies, stake presidencies, and organization leaders (Relief Society, Elders Quorum, Young Men, Young Women, Primary, etc.) who want to coordinate more effectively. If you run meetings, track callings, or manage tasks for your ward or stake, Beespo is for you.",
  },
  {
    question: "Who built Beespo?",
    answer:
      "Beespo was built by active Church members who have served in bishoprics, elders quorum presidencies, and other leadership callings. We experienced the pain of scattered spreadsheets and fragmented communication firsthand, so we built the tool we wished we had.",
  },
  {
    question: "Is my data secure and private?",
    answer:
      "Absolutely. Your data is encrypted in transit and at rest. We use industry-standard security practices and never share your information with third parties. Each workspace is completely isolated, and only invited members can access it.",
  },
  {
    question: "Can multiple people in my ward use Beespo together?",
    answer:
      "Yes, that's the whole point. Beespo is designed for collaboration. Invite your counselors, executive secretary, clerks, and organization presidents to the same workspace. Everyone sees the same information, stays aligned, and can contribute.",
  },
  {
    question: "Does Beespo replace or integrate with LCR?",
    answer:
      "Beespo does not replace LCR and is not connected to it. LCR remains the official system of record for the Church. Beespo is a coordination layer for the day-to-day work of running meetings, tracking callings in progress, and managing tasks that fall outside LCR's scope.",
  },
  {
    question: "How much will Beespo cost?",
    answer:
      "We're still finalizing pricing, but our goal is to make Beespo accessible to every ward and branch. Join the waitlist to be notified when we announce pricing and to receive early-access discounts.",
  },
  {
    question: "Can I import my existing spreadsheets?",
    answer:
      "Yes. Beespo's custom tables feature allows you to import CSV files, so you can bring over your existing member lists, volunteer schedules, or any other data you've been tracking in spreadsheets.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "Beespo is a web application that works beautifully on mobile browsers. We've optimized the experience for phones and tablets so you can access your meetings, tasks, and notes from anywhere. Native apps may come in the future.",
  },
  {
    question: "When will Beespo be available?",
    answer:
      "We're currently in private beta with select wards. Join the waitlist to secure your spot. We'll notify you as soon as we're ready to onboard new users, and waitlist members will get priority access.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-24 px-4 bg-neutral-50">
      <div className="container mx-auto max-w-3xl">
        <AnimateOnScroll className="text-center mb-12">
          <span className="text-xs font-mono text-neutral-400 tracking-widest uppercase">
            FAQ
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold mt-2 tracking-tight">
            Questions you might have
          </h2>
        </AnimateOnScroll>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <AnimateOnScroll key={index} delay={index * 0.03}>
              <div className="bg-white border border-neutral-200">
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                  className="w-full flex items-start gap-4 p-5 text-left hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-xs font-mono text-neutral-400 mt-0.5 flex-shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm font-medium text-neutral-900 leading-relaxed">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {openIndex === index ? (
                      <Minus className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <Plus className="w-4 h-4 text-neutral-400" />
                    )}
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pl-14">
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
