#!/bin/bash

echo "🚀 Setting up RouteDeals Real Scraper Environment..."

# Update system packages
sudo apt-get update -y

# Install Chrome dependencies for Puppeteer
sudo apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  ca-certificates \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget \
  curl

# Install Google Chrome (for better compatibility)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt-get update -y
sudo apt-get install -y google-chrome-stable

# Install project dependencies - npm install is handled by updateContentCommand
echo "📦 Dependencies will be installed by devcontainer updateContentCommand"

# Create scraper directories
mkdir -p scrapers/real
mkdir -p logs
mkdir -p data

# Set permissions
chmod +x .devcontainer/setup.sh

echo "✅ Real scraper environment ready!"
echo "🌐 Chrome version: $(google-chrome --version)"
echo "🎯 Ready to scrape REAL travel data!"
echo ""
echo "Next steps:"
echo "1. Set up your API keys in .env.local"
echo "2. Run: npm run dev (for Next.js)"
echo "3. Run: npx convex dev --typecheck=disable (for Convex)"
echo "4. Visit: http://localhost:3000" 