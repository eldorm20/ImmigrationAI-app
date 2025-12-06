import React from "react";
import { Mail, MessageCircle, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Footer = () => {
  const { t, lang } = useI18n();

  return (
    <footer className="bg-slate-900 dark:bg-black text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-brand-400">ImmigrationAI</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Empowering immigration dreams with AI-powered solutions for professionals and applicants worldwide.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-md mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/research" className="hover:text-white transition-colors">Research Library</a></li>
              <li><a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
            </ul>
          </div>

          {/* Community & Support */}
          <div>
            <h4 className="font-bold text-md mb-4">Community & Support</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="https://t.me/uzbsociety" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                >
                  <MessageCircle size={16} />
                  <span>Uzbek Society Group</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://t.me/uzbek_immigrant" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                >
                  <MessageCircle size={16} />
                  <span>Uzbek Immigrant Channel</span>
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@immigrationai.com" 
                  className="text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                >
                  <Mail size={16} />
                  <span>Email Support</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Company */}
          <div>
            <h4 className="font-bold text-md mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-800 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="text-sm text-slate-400">
              <p>© 2025 ImmigrationAI. All rights reserved.</p>
              <p className="mt-2 text-xs">
                Join our community on Telegram to connect with other immigrants and get support.
              </p>
            </div>
            
            <div className="flex gap-4 justify-end">
              <a 
                href="https://t.me/uzbsociety" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-brand-600 transition-colors"
                title="Telegram Uzbek Society"
              >
                <MessageCircle size={18} />
              </a>
              <a 
                href="https://t.me/uzbek_immigrant" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-brand-600 transition-colors"
                title="Telegram Uzbek Immigrant"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
