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
    <section
      className="px-4 py-16 md:py-24"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="container mx-auto max-w-3xl">
        <AnimateOnScroll className="mb-12 text-center">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--lp-accent)" }}
          >
            FAQ
          </span>
          <h2
            className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl"
            style={{ color: "var(--lp-ink)" }}
          >
            Questions you might have
          </h2>
        </AnimateOnScroll>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <AnimateOnScroll key={index} delay={index * 0.03}>
                <div
                  className="rounded-xl"
                  style={{
                    background: "var(--lp-surface)",
                    border: "1px solid color-mix(in srgb, var(--lp-ink) 12%, transparent)",
                  }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-start gap-4 p-5 text-left transition-colors"
                    style={{ color: "var(--lp-ink)" }}
                  >
                    <span
                      className="mt-0.5 flex-shrink-0 font-mono text-xs"
                      style={{ color: "color-mix(in srgb, var(--lp-ink) 50%, transparent)" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="flex-1 text-sm font-medium leading-relaxed"
                      style={{ color: "var(--lp-ink)" }}
                    >
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {isOpen ? (
                        <Minus
                          className="h-4 w-4"
                          style={{ color: "color-mix(in srgb, var(--lp-ink) 60%, transparent)" }}
                        />
                      ) : (
                        <Plus
                          className="h-4 w-4"
                          style={{ color: "color-mix(in srgb, var(--lp-ink) 60%, transparent)" }}
                        />
                      )}
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pl-14">
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "color-mix(in srgb, var(--lp-ink) 75%, transparent)" }}
                          >
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
