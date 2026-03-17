
import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Camera, Share2, Zap, Scan, Users, HardDriveUpload, Receipt, ShieldCheck } from 'lucide-react'; // Icons for features

const ECommerceShowcasePage: React.FC = () => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const handleGetRecommendations = () => {
    setIsLoadingRecommendations(true);
    // Simulate an AI call with more varied responses
    setTimeout(() => {
      const simulatedRecommendations = [
        `AI: Based on '${aiPrompt}', we recommend Product X (Style: Modern, Price: $120)`, 
        `AI: You might also like: Product Y (Category: Electronics, Rating: 4.5/5)`,
        `AI: Explore related items: Product Z (New Arrival, Limited Stock)`
      ];
      setRecommendations(simulatedRecommendations);
      setIsLoadingRecommendations(false);
    }, 1500); // Simulate network latency
  };

  return (
    <MainLayout>
      <div className="col-span-1 md:col-span-2 lg:col-span-3">
        <h1 className="text-3xl font-bold mb-6 text-center lg:text-left">E-commerce 2026 Showcase</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section 1: AI-Powered Recommendations */}
          <Card className="lg:col-span-2 shadow-lg dark:shadow-xl border-none bg-gradient-to-br from-gray-900 to-black text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="h-5 w-5" />
                AI-Powered Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Discover personalized product suggestions driven by cutting-edge AI.</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ai-prompt" className="text-white">What are you looking for?</Label>
                  <Input 
                    id="ai-prompt" 
                    placeholder="e.g., 'sleek wireless headphones'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-md"
                  onClick={handleGetRecommendations}
                  disabled={isLoadingRecommendations || !aiPrompt}
                >
                  {isLoadingRecommendations ? 'Generating...' : 'Get AI Recommendations'}
                </Button>
                {/* Display recommended products */}
                {recommendations.length > 0 && (
                  <div className="mt-4 p-4 border border-dashed rounded-md bg-gray-800 text-gray-300">
                    <h3 className="font-semibold mb-2 text-white">Your Recommendations:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!isLoadingRecommendations && recommendations.length === 0 && (
                   <div className="mt-4 p-4 border border-dashed rounded-md bg-gray-800 text-gray-300 text-center">
                      Your AI-generated recommendations will appear here.
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Quick Actions/Featured */}
          <Card className="shadow-lg dark:shadow-xl border-none bg-gray-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingCart className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full flex items-center gap-2 justify-start text-white border-gray-700 hover:bg-gray-800">
                  <ShoppingCart className="h-4 w-4" />
                  View Your Cart
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2 justify-start text-white border-gray-700 hover:bg-gray-800">
                  <Camera className="h-4 w-4" />
                  AR Try-on (Demo)
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2 justify-start text-white border-gray-700 hover:bg-gray-800">
                  <Share2 className="h-4 w-4" />
                  Social Sharing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Featured E-commerce Innovations */}
          <Card className="lg:col-span-2 shadow-lg dark:shadow-xl border-none bg-gray-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Scan className="h-5 w-5" />
                Featured Innovations 2026
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <strong>Agentic Commerce:</strong> AI agents handling discovery, negotiation, and checkout.
                </li>
                <li className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-400" />
                  <strong>Immersive AR/VR:</strong> Virtual try-ons and spatial shopping experiences.
                </li>
                <li className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-pink-400" />
                  <strong>Social Commerce:</strong> In-feed purchasing and live-stream shopping.
                </li>
                <li className="flex items-center gap-2">
                  <HardDriveUpload className="h-4 w-4 text-green-400" />
                  <strong>Composable Architecture:</strong> Headless, API-first solutions for flexible omnichannel experiences.
                </li>
                <li className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-yellow-400" />
                  <strong>Next-Gen Payments:</strong> Biometric authentication and programmable money.
                </li>
                <li className="flex items-center gap-2">
                  <Scan className="h-4 w-4 text-cyan-400" />
                  <strong>Frictionless Operations:</strong> Autonomous delivery and predictive logistics.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 4: Sales & Offers */}
          <Card className="shadow-lg dark:shadow-xl border-none bg-gray-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Community & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Join our community for the latest updates and support.</p>
              <Button variant="outline" className="w-full flex items-center gap-2 justify-start text-white border-gray-700 hover:bg-gray-800">
                <Users className="h-4 w-4" />
                Join Our Community
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ECommerceShowcasePage;
