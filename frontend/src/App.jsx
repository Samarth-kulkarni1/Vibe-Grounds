import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Heart, Star, Search, Loader } from 'lucide-react';

const MoodRestaurantFinder = () => {
  const [mood, setMood] = useState('');
  const [location, setLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [city, setCity] = useState('Bengaluru');
  const [isChangingCity, setIsChangingCity] = useState(false);

  const moods = {
    romantic: {
      text: 'romantic, candlelight, fine dining, couple',
    },
    casual: {
      text: 'casual, chill, hangout, burger, pizza',
    },
    energetic: {
      text: 'party, lively, pub, dance, dj',
    },
    peaceful: {
      text: 'quiet, tea, garden, cozy',
    },
    adventurous: {
      text: 'street food, spicy, fusion, exotic',
    },
    cozy: {
      text: 'cozy, home-style, comfort food',
    },
  };

  const defaultLocation = { lat: 12.9716, lng: 77.5946 };

  useEffect(() => {
    getUserLocation();
    loadFavorites();
  }, []);

const getUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation({ lat, lng });

        try {
          const res = await axios.get(
            "https://api.geoapify.com/v1/geocode/reverse",
            {
              params: {
                lat,
                lon: lng,
                apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY,
              },
            }
          );

          if (res.data.features.length > 0) {
            setCity(res.data.features[0].properties.city);
          }
        } catch (err) {
          console.log("Couldn't fetch city");
        }
      },
      () => {
        console.log("Using default Bengaluru");
        setLocation(defaultLocation);
        setCity("Bengaluru");
      }
    );
  } else {
    setLocation(defaultLocation);
    setCity("Bengaluru");
  }
};

  const loadFavorites = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.map((f) => f.placeId));
      }
    } catch {
      console.log('Could not load favorites');
    }
  };

  const handleCityChange = async () => {
    if (!city) return;
    setIsChangingCity(true);
    try {
      const res = await axios.get(`https://api.geoapify.com/v1/geocode/search`, {
        params: { text: city, apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY },
      });

      if (res.data.features.length > 0) {
        const { lat, lon } = res.data.features[0].properties;
        setLocation({ lat, lng: lon });
        setError('');
      } else {
        setError('City not found. Try another name.');
      }
    } catch {
      setError('Failed to find city.');
    } finally {
      setIsChangingCity(false);
    }
  };

  const searchRestaurants = async (selectedMood) => {
    if (!location) {
      setError('Getting your location...');
      return;
    }

    setMood(selectedMood);
    setLoading(true);
    setError('');
    setRestaurants([]);

    try {
      const response = await fetch('http://localhost:5000/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          location: location,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch restaurants');
      }

      const data = await response.json();
      setRestaurants(data.restaurants || []);
      if (data.restaurants.length === 0) {
        setError('No restaurants found for this mood. Try another!');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}. Check backend connection.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (restaurant) => {
    const isFav = favorites.includes(restaurant.place_id);
    try {
      if (isFav) {
        await fetch(`http://localhost:5000/api/favorites/${restaurant.place_id}`, {
          method: 'DELETE',
        });
        setFavorites(favorites.filter((id) => id !== restaurant.place_id));
      } else {
        await fetch('http://localhost:5000/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId: restaurant.place_id,
            name: restaurant.name,
            address: restaurant.vicinity,
            rating: restaurant.rating,
          }),
        });
        setFavorites([...favorites, restaurant.place_id]);
      }
    } catch {
      console.log('Could not update favorite');
    }
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            Find Your Perfect Meal
          </h1>
          <p className="text-xl text-gray-600">Based on your mood</p>

          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>
              {location ? `Location: ${city}` : 'Using Bengaluru as default'}
            </span>
          </div>

          {/* Change City Input */}
          <div className="flex justify-center mt-4 gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name..."
              className="px-4 py-2 border rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={handleCityChange}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
              disabled={isChangingCity}
            >
              {isChangingCity ? 'Loading...' : 'Change'}
            </button>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setMood('explore')}
            className={`px-6 py-3 rounded-l-xl font-medium transition ${
              mood !== 'favorites'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => setMood('favorites')}
            className={`px-6 py-3 rounded-r-xl font-medium transition ${
              mood === 'favorites'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Favorites ❤️
          </button>
        </div>

        {/* EXPLORE TAB */}
        {mood !== 'favorites' && (
          <>
            {/* Mood Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                How are you feeling?
              </h2>

              <div className="flex flex-wrap justify-center gap-3">
                {Object.keys(moods).map((key) => (
                  <button
                    key={key}
                    onClick={() => searchRestaurants(key)}
                    className={`px-6 py-3 rounded-xl transition-all font-medium ${
                      mood === key
                        ? 'bg-purple-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-gray-600">Finding restaurants...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
                {error}
              </div>
            )}

            {/* Results */}
            {restaurants.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  Recommended for You ({restaurants.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {restaurants.map((restaurant) => (
                    <div
                      key={restaurant.place_id}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-semibold text-gray-800 flex-1">
                            {restaurant.name}
                          </h3>
                          <button
                            onClick={() => toggleFavorite(restaurant)}
                            className="ml-2"
                          >
                            <Heart
                              className={`w-6 h-6 ${
                                favorites.includes(restaurant.place_id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-gray-400'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-700">
                            {restaurant.rating || 'N/A'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">
                          {restaurant.vicinity}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            restaurant.name
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                        >
                          View on Maps
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* FAVORITES TAB */}
        {mood === 'favorites' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Your Favorite Restaurants ❤️
            </h2>

            {favorites.length === 0 ? (
              <p className="text-gray-600 text-center py-6">
                No favorites yet. Go explore and add some!
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {restaurants
                  .filter((r) => favorites.includes(r.place_id))
                  .map((restaurant) => (
                    <div
                      key={restaurant.place_id}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-semibold text-gray-800 flex-1">
                            {restaurant.name}
                          </h3>
                          <button
                            onClick={() => toggleFavorite(restaurant)}
                            className="ml-2"
                          >
                            <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                          </button>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">
                          {restaurant.vicinity}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            restaurant.name
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                        >
                          View on Maps
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
};

export default MoodRestaurantFinder;
