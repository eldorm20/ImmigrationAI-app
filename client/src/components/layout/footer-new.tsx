import React from "react";
import { useLocation } from "wouter";
import { Github, Twitter, Mail, ExternalLink } from "lucide-react";

export default function Footer() {
  const [, setLocation] = useLocation();

  const sections = {
    company: [
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact Us", href: "/contact" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
    resources: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api-docs" },
      { label: "Status", href: "/status" },
      { label: "Help Center", href: "/help" },
    ],
    social: [
      { icon: Github, href: "https://github.com", label: "GitHub" },
      { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
      { icon: Mail, href: "mailto:hello@immigrationai.com", label: "Email" },
    ],
  };

  const handleNavigation = (href: string) => {
    if (href.startsWith("/")) {
      setLocation(href);
    } else if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else if (href.startsWith("mailto:")) {
      window.location.href = href;
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-100 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-blue-400 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                IA
              </div>
              <span className="font-bold text-lg">ImmigrationAI</span>
            </div>
            <p className="text-slate-400 text-sm">AI-powered immigration assistance, 24/7</p>
            <div className="flex gap-2 mt-4">
              {sections.social.map(({ icon: Icon, href, label }) => (
                <button
                  key={label}
                  onClick={() => handleNavigation(href)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100"
                  aria-label={label}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              {sections.company.map(({ label, href }) => (
                <li key={label}>
                  <button
                    onClick={() => handleNavigation(href)}
                    className="text-slate-400 hover:text-slate-100 transition-colors text-sm flex items-center gap-1 hover:gap-2"
                  >
                    {label}
                    {href.startsWith("http") && <ExternalLink size={12} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              {sections.legal.map(({ label, href }) => (
                <li key={label}>
                  <button
                    onClick={() => handleNavigation(href)}
                    className="text-slate-400 hover:text-slate-100 transition-colors text-sm"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-2">
              {sections.resources.map(({ label, href }) => (
                <li key={label}>
                  <button
                    onClick={() => handleNavigation(href)}
                    className="text-slate-400 hover:text-slate-100 transition-colors text-sm"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold mb-4">Newsletter</h4>
            <p className="text-slate-400 text-sm mb-3">Get immigration news & tips</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button className="px-3 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-slate-400 text-sm mb-4 sm:mb-0">
            © 2024 ImmigrationAI. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-6 text-slate-400 text-sm justify-center sm:justify-end">
            <span>Built with ❤️ for immigrants</span>
            <span>•</span>
            <span>Status: 24/7 Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
