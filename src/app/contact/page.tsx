"use client";

import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="site-container py-24 md:py-40">
      <span className="eyebrow block mb-4">Contact</span>
      <h1 className="serif-headline text-[44px] md:text-[84px] mb-6">
        Get in touch.
      </h1>
      <p className="text-muted text-lg max-w-2xl mb-16">
        Have a question, partnership inquiry, or bug report? Reach out and we will get back to you.
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          {sent ? (
            <div className="bg-card rounded-[28px] p-12 text-center">
              <span className="text-4xl mb-4 block">✓</span>
              <h2 className="font-serif text-2xl mb-2">Message sent</h2>
              <p className="text-muted">We will get back to you within 48 hours.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input type="text" required className="w-full bg-card border border-line rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" required className="w-full bg-card border border-line rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Subject</label>
                <select required className="w-full bg-card border border-line rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/20">
                  <option value="">Select a topic</option>
                  <option>General inquiry</option>
                  <option>Bug report</option>
                  <option>Partnership</option>
                  <option>Press</option>
                  <option>Security disclosure</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message</label>
                <textarea required rows={5} className="w-full bg-card border border-line rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
              </div>
              <button type="submit" className="btn-primary">Send message</button>
            </form>
          )}
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="font-serif text-xl mb-2">Email</h3>
            <a href="mailto:support@siro.trade" className="text-muted hover:text-fg transition-colors">support@siro.trade</a>
          </div>
          <div>
            <h3 className="font-serif text-xl mb-2">Security</h3>
            <a href="mailto:security@siro.trade" className="text-muted hover:text-fg transition-colors">security@siro.trade</a>
          </div>
          <div>
            <h3 className="font-serif text-xl mb-2">Social</h3>
            <div className="flex gap-4">
              <a href="#" className="text-muted hover:text-fg transition-colors">Discord</a>
              <a href="#" className="text-muted hover:text-fg transition-colors">Telegram</a>
              <a href="#" className="text-muted hover:text-fg transition-colors">X</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
