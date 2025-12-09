import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Check, X, DollarSign, Clock, TrendingUp } from "lucide-react";

interface VisaType {
  visaType: string;
  country: string;
  documents: string[];
  fees: number;
  processingTime: string;
  successRate: number;
}

export default function VisaComparisonPage() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["UK", "Canada"]);
  const [selectedVisa, setSelectedVisa] = useState("Work Visa");
  const [comparison, setComparison] = useState<Record<string, VisaType | null>>({});
  const [loading, setLoading] = useState(false);

  const countries = ["UK", "Canada", "USA", "Australia", "Germany", "France"];
  const visaTypes = ["Work Visa", "Student Visa", "Tourist Visa", "Entrepreneur Visa"];

  useEffect(() => {
    compareVisas();
  }, [selectedCountries, selectedVisa]);

  const compareVisas = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/visa/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countries: selectedCountries,
          visaType: selectedVisa,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComparison(data.comparison || {});
      }
    } catch (error) {
      console.error("Failed to compare visas", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country].slice(0, 4)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Visa Comparison Tool</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Compare visa requirements across different countries
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="mb-8 space-y-6">
          {/* Visa Type Selection */}
          <div>
            <label className="block text-sm font-bold mb-3">Select Visa Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {visaTypes.map((visa) => (
                <button
                  key={visa}
                  onClick={() => setSelectedVisa(visa)}
                  className={`p-3 rounded-lg font-medium transition ${
                    selectedVisa === visa
                      ? "bg-brand-600 text-white"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-500"
                  }`}
                >
                  {visa}
                </button>
              ))}
            </div>
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-bold mb-3">Select Countries (Max 4)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {countries.map((country) => (
                <button
                  key={country}
                  onClick={() => toggleCountry(country)}
                  className={`p-3 rounded-lg font-medium transition ${
                    selectedCountries.includes(country)
                      ? "bg-brand-600 text-white"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-500"
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {loading ? (
          <div className="text-center py-12">Loading comparison...</div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full">
                <thead className="border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="text-left p-4 font-bold">Criteria</th>
                    {selectedCountries.map((country) => (
                      <th key={country} className="text-left p-4 font-bold text-brand-600">
                        {country}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Processing Time */}
                  <tr>
                    <td className="p-4 font-medium flex items-center gap-2">
                      <Clock size={16} /> Processing Time
                    </td>
                    {selectedCountries.map((country) => (
                      <td key={country} className="p-4">
                        {comparison[country]?.processingTime || "N/A"}
                      </td>
                    ))}
                  </tr>

                  {/* Fees */}
                  <tr>
                    <td className="p-4 font-medium flex items-center gap-2">
                      <DollarSign size={16} /> Visa Fee
                    </td>
                    {selectedCountries.map((country) => (
                      <td key={country} className="p-4">
                        {comparison[country] ? `$${comparison[country].fees}` : "N/A"}
                      </td>
                    ))}
                  </tr>

                  {/* Success Rate */}
                  <tr>
                    <td className="p-4 font-medium flex items-center gap-2">
                      <TrendingUp size={16} /> Success Rate
                    </td>
                    {selectedCountries.map((country) => (
                      <td key={country} className="p-4">
                        {comparison[country] ? `${comparison[country].successRate}%` : "N/A"}
                      </td>
                    ))}
                  </tr>

                  {/* Required Documents */}
                  <tr>
                    <td className="p-4 font-medium">Required Documents</td>
                    {selectedCountries.map((country) => (
                      <td key={country} className="p-4">
                        {comparison[country] ? (
                          <ul className="space-y-1 text-sm">
                            {comparison[country].documents.map((doc, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check size={14} className="text-green-600" />
                                {doc}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recommendations */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <h3 className="font-bold mb-3">💡 Comparison Insights</h3>
              <ul className="space-y-2 text-sm">
                {selectedCountries.length > 0 && (
                  <>
                    <li>✓ Compare up to 4 countries side-by-side</li>
                    <li>✓ Check visa fees, processing times, and success rates</li>
                    <li>✓ View all required documents for each country</li>
                    <li>✓ Contact lawyers for personalized guidance</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
