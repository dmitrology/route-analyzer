"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateRange, getRarityLabel, getRarityColor } from "@/lib/utils";
import { Plane, Hotel, Calendar, Filter, Search, MapPin, Clock } from "lucide-react";

type Deal = {
  _id: string;
  airline?: string;
  flightNumber?: string;
  origin?: string;
  dest?: string;
  date?: string;
  price?: number;
  url?: string;
};

export default function DealsPage() {
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDest, setSelectedDest] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(1500);
  const [minNights, setMinNights] = useState<number>(3);
  const [hotDealsOnly, setHotDealsOnly] = useState<boolean>(false);

  const packages = useQuery(api.database.getPackages, {
    origin: selectedOrigin ? selectedOrigin as "JFK" | "LGA" | "EWR" : undefined,
    dest: selectedDest ? selectedDest as "MCO" | "FLL" | "MIA" | "TPA" : undefined,
    hotDealsOnly,
  });

  const scrapeStatus = useQuery(api.database.getScrapeStatus);

  // Filter packages based on local filters
  const filteredPackages = packages?.filter(pkg => 
    pkg.totalUsd <= maxPrice && 
    pkg.stayNights >= minNights
  ) || [];

  const origins = ['JFK', 'LGA', 'EWR'];
  const destinations = [
    { code: 'MCO', name: 'Orlando' },
    { code: 'FLL', name: 'Fort Lauderdale' },
    { code: 'MIA', name: 'Miami' },
    { code: 'TPA', name: 'Tampa' }
  ];

  const deals = useQuery(api.analytics.getTopDeals, { limit: 20 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Deals</h1>
              <p className="text-gray-600">
                {filteredPackages.length} packages found • Last updated {scrapeStatus ? new Date(Math.max(...scrapeStatus.recent.map(log => log.timestamp))).toLocaleTimeString() : 'unknown'}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Origin Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Airport
                  </label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => setSelectedOrigin(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All NYC Airports</option>
                    {origins.map(origin => (
                      <option key={origin} value={origin}>{origin}</option>
                    ))}
                  </select>
                </div>

                {/* Destination Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <select
                    value={selectedDest}
                    onChange={(e) => setSelectedDest(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Florida</option>
                    {destinations.map(dest => (
                      <option key={dest.code} value={dest.code}>
                        {dest.name} ({dest.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Total Price: {formatCurrency(maxPrice)}
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>$200</span>
                    <span>$2000</span>
                  </div>
                </div>

                {/* Nights Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Nights
                  </label>
                  <select
                    value={minNights}
                    onChange={(e) => setMinNights(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={3}>3+ nights</option>
                    <option value={5}>5+ nights</option>
                    <option value={7}>7+ nights</option>
                    <option value={14}>14+ nights</option>
                  </select>
                </div>

                {/* Hot Deals Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hotDealsOnly"
                    checked={hotDealsOnly}
                    onChange={(e) => setHotDealsOnly(e.target.checked)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="hotDealsOnly" className="text-sm font-medium text-gray-700">
                    🔥 Hot deals only
                  </label>
                </div>

                {/* Clear Filters */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedOrigin("");
                    setSelectedDest("");
                    setMaxPrice(1500);
                    setMinNights(3);
                    setHotDealsOnly(false);
                  }}
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Deals Grid */}
          <div className="lg:col-span-3">
            {packages === undefined ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPackages.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No packages match your filters
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search criteria or clearing some filters.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedOrigin("");
                      setSelectedDest("");
                      setMaxPrice(1500);
                      setMinNights(3);
                      setHotDealsOnly(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {filteredPackages.length} Packages Available
                  </h2>
                  <select className="p-2 border border-gray-300 rounded-md text-sm">
                    <option>Sort by: Best Value</option>
                    <option>Sort by: Price (Low to High)</option>
                    <option>Sort by: Price (High to Low)</option>
                    <option>Sort by: Departure Date</option>
                    <option>Sort by: Rarity</option>
                  </select>
                </div>

                {/* Packages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPackages.map((pkg) => (
                    <Card key={pkg._id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-transparent hover:border-l-orange-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <CardTitle className="text-lg">
                              {pkg.origin} → {pkg.dest}
                            </CardTitle>
                          </div>
                          <div className="flex items-center space-x-2">
                            {pkg.isHotDeal && (
                              <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                                🔥 HOT
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(pkg.rarityScore)}`}>
                              {getRarityLabel(pkg.rarityScore)}
                            </span>
                          </div>
                        </div>
                        <CardDescription className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateRange(pkg.departDate, pkg.returnDate)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{pkg.stayNights} nights</span>
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Price Breakdown */}
                          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Plane className="h-4 w-4 text-blue-500" />
                              <div>
                                <div className="text-sm text-gray-600">Flight</div>
                                <div className="font-medium">{formatCurrency(pkg.flightUsd)}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Hotel className="h-4 w-4 text-green-500" />
                              <div>
                                <div className="text-sm text-gray-600">Hotel</div>
                                <div className="font-medium">{formatCurrency(pkg.hotelUsd)}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Total Price & Savings */}
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl font-bold text-gray-900">
                                {formatCurrency(pkg.totalUsd)}
                              </span>
                              <div className="text-right">
                                <div className="text-sm text-green-600 font-medium">
                                  Save {Math.round(pkg.pctSaved * 100)}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  vs normal pricing
                                </div>
                              </div>
                            </div>
                            
                            {/* Price Drop Probability */}
                            <div className="flex items-center justify-between text-sm mb-4">
                              <span className="text-gray-600">Price drop chance:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${pkg.pDrop * 100}%` }}
                                  ></div>
                                </div>
                                <span className="font-medium text-gray-900">
                                  {Math.round(pkg.pDrop * 100)}%
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            <Button 
                              className={`w-full ${pkg.isHotDeal 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                                : 'bg-blue-600 hover:bg-blue-700'
                              } text-white font-medium`}
                            >
                              {pkg.isHotDeal ? '🔥 Book This Hot Deal' : 'Book Package'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Load More Button */}
                {filteredPackages.length >= 20 && (
                  <div className="text-center pt-8">
                    <Button variant="outline" size="lg">
                      Load More Packages
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Top Deals</h2>
          <div className="grid gap-6">
            {deals?.map((deal: Deal) => (
              <div key={deal._id} className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-2">
                  {deal.origin} → {deal.dest}
                </h2>
                <p className="text-gray-600 mb-4">
                  {deal.airline} {deal.flightNumber} - {deal.date}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-green-600">
                    ${deal.price}
                  </span>
                  <button 
                    onClick={() => window.open(deal.url, '_blank')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 