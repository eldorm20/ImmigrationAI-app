import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Globe, TrendingUp, Award, Briefcase, GraduationCap, Languages } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface CRSResult {
    crsScore: number;
    eligible: boolean;
    cutoff: number;
    pointsNeeded: number;
    estimatedWaitTime: string;
    breakdown: {
        age: number;
        language: number;
        education: number;
        experience: number;
    };
    recommendations: string[];
    nextSteps: string[];
}

export default function CanadaAssessment() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CRSResult | null>(null);
    const [formData, setFormData] = useState({
        nocCode: '',
        age: '',
        englishLevel: '',
        frenchLevel: '0',
        educationLevel: '',
        canadianEducation: false,
        yearsExperience: '',
        canadianExperience: '0',
        maritalStatus: 'single'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await apiRequest('/canada/assessment/canada/crs-score', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    age: parseInt(formData.age),
                    englishLevel: parseInt(formData.englishLevel),
                    frenchLevel: parseInt(formData.frenchLevel),
                    yearsExperience: parseInt(formData.yearsExperience),
                    canadianExperience: parseInt(formData.canadian Experience)
                })
            });

            setResult(response);
        } catch (error) {
            console.error('CRS calculation failed:', error);
            alert('Failed to calculate CRS score. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Globe className="h-6 w-6 text-red-600" />
                        <CardTitle className="text-2xl">Canada Express Entry CRS Calculator</CardTitle>
                    </div>
                    <CardDescription>
                        Calculate your Comprehensive Ranking System (CRS) score and check your eligibility for Canadian permanent residence
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* NOC Code */}
                        <div className="space-y-2">
                            <Label htmlFor="nocCode">National Occupation Classification (NOC) Code</Label>
                            <Input
                                id="nocCode"
                                placeholder="e.g., 21232 (Software Developer)"
                                value={formData.nocCode}
                                onChange={(e) => updateField('nocCode', e.target.value)}
                                required
                            />
                            <p className="text-sm text-gray-500">
                                Find your NOC code at{' '}
                                <a href="https://noc.esdc.gc.ca" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                    noc.esdc.gc.ca
                                </a>
                            </p>
                        </div>

                        {/* Age */}
                        <div className="space-y-2">
                            <Label htmlFor="age">Age</Label>
                            <Input
                                id="age"
                                type="number"
                                min="18"
                                max="65"
                                value={formData.age}
                                onChange={(e) => updateField('age', e.target.value)}
                                required
                            />
                        </div>

                        {/* English Level */}
                        <div className="space-y-2">
                            <Label htmlFor="englishLevel">
                                <div className="flex items-center space-x-2">
                                    <Languages className="h-4 w-4" />
                                    <span>English Language Proficiency (CLB Level)</span>
                                </div>
                            </Label>
                            <Select value={formData.englishLevel} onValueChange={(val) => updateField('englishLevel', val)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select CLB level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">CLB 5 (IELTS 5.0)</SelectItem>
                                    <SelectItem value="7">CLB 7 (IELTS 6.0)</SelectItem>
                                    <SelectItem value="9">CLB 9 (IELTS 7.0+)</SelectItem>
                                    <SelectItem value="10">CLB 10 (IELTS 7.5+)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Education */}
                        <div className="space-y-2">
                            <Label htmlFor="educationLevel">
                                <div className="flex items-center space-x-2">
                                    <GraduationCap className="h-4 w-4" />
                                    <span>Education Level</span>
                                </div>
                            </Label>
                            <Select value={formData.educationLevel} onValueChange={(val) => updateField('educationLevel', val)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select education level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High School">High School</SelectItem>
                                    <SelectItem value="College">College Diploma</SelectItem>
                                    <SelectItem value="Bachelor">Bachelor's Degree</SelectItem>
                                    <SelectItem value="Masters">Master's Degree</SelectItem>
                                    <SelectItem value="PhD">PhD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Years of Experience */}
                        <div className="space-y-2">
                            <Label htmlFor="yearsExperience">
                                <div className="flex items-center space-x-2">
                                    <Briefcase className="h-4 w-4" />
                                    <span>Years of Work Experience</span>
                                </div>
                            </Label>
                            <Input
                                id="yearsExperience"
                                type="number"
                                min="0"
                                max="20"
                                value={formData.yearsExperience}
                                onChange={(e) => updateField('yearsExperience', e.target.value)}
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Calculating...' : 'Calculate CRS Score'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <Card className="border-2 border-green-500">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl">Your CRS Score: {result.crsScore}</CardTitle>
                                <CardDescription>
                                    Current cutoff: {result.cutoff} points • {result.eligible ? '✅ Eligible' : '❌ Not currently eligible'}
                                </CardDescription>
                            </div>
                            <Award className={`h-16 w-16 ${result.eligible ? 'text-green-600' : 'text-yellow-600'}`} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Score Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{result.breakdown.age}</div>
                                <div className="text-sm text-gray-600">Age</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{result.breakdown.language}</div>
                                <div className="text-sm text-gray-600">Language</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{result.breakdown.education}</div>
                                <div className="text-sm text-gray-600">Education</div>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                <div className="text-2xl font-bold text-orange-600">{result.breakdown.experience}</div>
                                <div className="text-sm text-gray-600">Experience</div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {!result.eligible && result.recommendations.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center space-x-2">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <span>How to Improve Your Score</span>
                                </h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                    {result.recommendations.map((rec, idx) => (
                                        <li key={idx}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Next Steps */}
                        <div className="space-y-2">
                            <h3 className="font-semibold">Next Steps</h3>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                {result.nextSteps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
