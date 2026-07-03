const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();


const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mood-restaurants')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const favoriteSchema = new mongoose.Schema({
  placeId: { type: String, required: true, unique: true },
  name: String,
  address: String,
  rating: Number,
  savedAt: { type: Date, default: Date.now }
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

const moodKeywords = {
  romantic: 'romantic,fine dining,candlelit',
  casual: 'casual,cafe,coffee',
  energetic: 'sports bar,pub,lively',
  peaceful: 'quiet,garden,serene',
  adventurous: 'exotic,fusion,ethnic',
  cozy: 'cozy,intimate,comfort food'
};

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.post('/api/restaurants', async (req, res) => {
  try {
    const { mood, location } = req.body;
    const apiKey = process.env.GEOAPIFY_API_KEY;

    console.log('Received request:', { mood, location, hasApiKey: !!apiKey });

    if (!apiKey) {
      return res.status(500).json({ error: 'Geoapify API key not configured' });
    }

    // 💡 Mood-based configuration for Geoapify
    const moodMap = {
      romantic: {
        categories: 'catering.restaurant,catering.cafe',
        text: 'romantic, candlelight, fine dining, couple',
        radius: 3000
      },
      casual: {
        categories: 'catering.cafe,catering.fast_food',
        text: 'casual, chill, hangout, burger, pizza',
        radius: 2500
      },
      energetic: {
        categories: 'entertainment.bar,entertainment.nightclub',
        text: 'party, lively, pub, dance, dj',
        radius: 4000
      },
      peaceful: {
        categories: 'catering.cafe,leisure.park',
        text: 'quiet, tea, garden, cozy',
        radius: 2000
      },
      adventurous: {
        categories: 'catering.restaurant',
        text: 'street food, spicy, fusion, exotic',
        radius: 6000
      },
      cozy: {
        categories: 'catering.cafe,catering.restaurant',
        text: 'cozy, home-style, comfort food',
        radius: 2500
      }
    };

    const config = moodMap[mood] || moodMap.casual;
    const { lat, lng } = location;

    const geoapifyUrl = 'https://api.geoapify.com/v2/places';
    console.log('Fetching from Geoapify API...');

    const response = await axios.get(geoapifyUrl, {
      params: {
        categories: config.categories,
        text: config.text,
        filter: `circle:${lng},${lat},${config.radius}`,
        bias: `proximity:${lng},${lat}`,
        limit: 20,
        apiKey: apiKey
      }
    });

    console.log('Geoapify API response received');

    const features = response.data.features || [];

    const restaurants = features.map((place) => ({
      place_id: place.properties.place_id || place.properties.datasource.raw.id,
      name: place.properties.name,
      vicinity: place.properties.formatted || place.properties.address_line2,
      rating: place.properties.rank?.popularity || 4.0,
      types: place.properties.categories || ['restaurant'],
      geometry: {
        location: {
          lat: place.properties.lat,
          lng: place.properties.lon
        }
      }
    }));

    console.log(`Found ${restaurants.length} restaurants`);
    res.json({ restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error.message);
    res.status(500).json({
      error: 'Failed to fetch restaurants',
      details: error.message
    });
  }
});


app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await Favorite.find().sort({ savedAt: -1 });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { placeId, name, address, rating } = req.body;
    const favorite = new Favorite({ placeId, name, address, rating });
    await favorite.save();
    res.status(201).json(favorite);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Already in favorites' });
    } else {
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  }
});

app.delete('/api/favorites/:placeId', async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ placeId: req.params.placeId });
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});