import React, { useState } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, MessageCircle, ThumbsUp, Flag, Search } from "lucide-react";
import Header from '@/components/Header';

interface ForumPost {
  id: string;
  title: string;
  category: string;
  author: string;
  authorRole: "lawyer" | "applicant" | "verified";
  timestamp: Date;
  replies: number;
  views: number;
  helpful: number;
  content: string;
  tags: string[];
}

export default function CommunityForum() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [posts, setPosts] = useState<ForumPost[]>([
    {
      id: "1",
      title: "How to prepare for UK Skilled Worker Visa interview?",
      category: "Work Visa",
      author: "Ahmed Khan",
      authorRole: "applicant",
      timestamp: new Date("2025-12-06"),
      replies: 12,
      views: 245,
      helpful: 18,
      content: "I have my interview coming up next week. Can anyone share tips on what to expect?",
      tags: ["UK", "Interview", "Work Visa"],
    },
    {
      id: "2",
      title: "Canadian Express Entry Points Calculator",
      category: "Immigration Help",
      author: "Sarah Wilson",
      authorRole: "lawyer",
      timestamp: new Date("2025-12-05"),
      replies: 34,
      views: 512,
      helpful: 45,
      content: "Here's a comprehensive guide to understanding Express Entry points...",
      tags: ["Canada", "Express Entry", "Points"],
    },
    {
      id: "3",
      title: "Documents needed for USA H1-B sponsorship",
      category: "Work Visa",
      author: "Michael Chen",
      authorRole: "verified",
      timestamp: new Date("2025-12-04"),
      replies: 8,
      views: 178,
      helpful: 12,
      content: "Complete checklist of all documents required for H1-B visa sponsorship.",
      tags: ["USA", "H1-B", "Work Visa"],
    },
  ]);

  const categories = ["All", "Work Visa", "Study Visa", "Family Sponsorship", "Immigration Help", "Document Help"];

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "lawyer":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "verified":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Community Forum" showBack onBack={() => setLocation('/')} simple />

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search and New Post */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search forum posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button className="px-6 py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors">
            New Post
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat.toLowerCase())}
                className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition ${
                  (cat === "All" && selectedCategory === "all") || cat.toLowerCase() === selectedCategory
                    ? "bg-brand-600 text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-500 transition-colors cursor-pointer"
              >
                <div className="flex gap-4">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold hover:text-brand-600 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(post.authorRole)}`}>
                        {post.authorRole === "lawyer" ? "Lawyer" : post.authorRole === "verified" ? "Verified" : "Member"}
                      </span>
                      <span>{post.author}</span>
                      <span>{post.timestamp.toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        {post.replies} replies
                      </span>
                      <span>{post.views} views</span>
                    </div>
                  </div>

                  {/* Helpful Count */}
                  <div className="text-center">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                      <ThumbsUp size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <p className="text-xs font-bold mt-1">{post.helpful}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No posts found matching your search</p>
            </div>
          )}
        </div>

        {/* Guidelines Section */}
        <div className="mt-12 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <h3 className="font-bold mb-3">📋 Community Guidelines</h3>
          <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
            <li>• Be respectful and constructive in all discussions</li>
            <li>• Verify information before sharing, especially legal advice</li>
            <li>• No spam, harassment, or commercial promotion</li>
            <li>• Share experiences to help others</li>
            <li>• Flag inappropriate content using the report button</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
