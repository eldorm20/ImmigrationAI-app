import React, { useState } from "react";
import { useLocation } from "wouter";
import Header from '@/components/Header';
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Search, Calendar, User, Tag } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: number;
  image?: string;
}

export default function BlogPage() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");

  const blogPosts: BlogPost[] = [
    {
      id: "1",
      title: "Top Immigration Visa Requirements for 2025",
      excerpt: "Learn about the latest visa requirements and changes in immigration policies for European countries.",
      author: "Sarah Williams",
      date: "December 2024",
      category: "Visa Guides",
      readTime: 5,
    },
    {
      id: "2",
      title: "How to Prepare Your Immigration Application",
      excerpt: "A comprehensive guide on document preparation, interviews, and common mistakes to avoid in immigration applications.",
      author: "James Smith",
      date: "November 2024",
      category: "Application Tips",
      readTime: 8,
    },
    {
      id: "3",
      title: "Understanding Immigration Law Changes",
      excerpt: "Recent updates in immigration law and what they mean for your application. Expert insights on policy changes.",
      author: "Dr. Maria Garcia",
      date: "October 2024",
      category: "Legal Updates",
      readTime: 10,
    },
    {
      id: "4",
      title: "Success Stories: Real Immigration Journeys",
      excerpt: "Inspiring stories from individuals who successfully navigated the immigration process with our AI assistance.",
      author: "Community Team",
      date: "September 2024",
      category: "Success Stories",
      readTime: 6,
    },
    {
      id: "5",
      title: "Digital Tools for Immigration Planning",
      excerpt: "Explore the best digital tools and resources available to streamline your immigration planning process.",
      author: "Tech Team",
      date: "August 2024",
      category: "Tools & Resources",
      readTime: 7,
    },
    {
      id: "6",
      title: "Timeline: What to Expect During Your Journey",
      excerpt: "Understanding the typical timeline for various immigration processes and how to prepare accordingly.",
      author: "Lisa Anderson",
      date: "July 2024",
      category: "Planning Guides",
      readTime: 9,
    },
  ];

  const filteredPosts = blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Immigration Blog" showBack onBack={() => setLocation('/')} simple />

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search blog posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Blog Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow cursor-pointer hover:border-brand-500/50 dark:hover:border-brand-500/50"
              >
                {/* Post Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={14} className="text-brand-600 dark:text-brand-400" />
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                {/* Post Meta */}
                <div className="px-6 pb-6 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar size={14} />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <User size={14} />
                      <span>{post.author}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {post.readTime} min read
                    </span>
                  </div>
                </div>

                {/* Read More */}
                <div className="px-6 pb-6">
                  <button className="w-full py-2 px-4 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors text-sm">
                    Read Article
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No blog posts found matching "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-brand-600 dark:text-brand-400 font-bold hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Newsletter Section */}
        <div className="mt-20 bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-brand-100 mb-6 max-w-md">
            Subscribe to our newsletter for the latest immigration news, tips, and success stories.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button className="px-6 py-3 bg-white text-brand-600 font-bold rounded-lg hover:bg-brand-50 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
