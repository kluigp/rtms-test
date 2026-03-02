# Base image
FROM ubuntu:22.04

# Install build tools and required libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    python3 \
    python3-pip \
    git \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Upgrade libstdc++ to get GLIBCXX_3.4.32
RUN add-apt-repository ppa:ubuntu-toolchain-r/test -y && \
    apt-get update && \
    apt-get install -y libstdc++6 && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

RUN useradd -m node

# Ensure logs directory and initial log file exist
RUN mkdir -p /usr/src/app/logs \
    && touch /usr/src/app/logs/node_1 \
    && chown -R node:node /usr/src/app/logs

# Default command
CMD ["node", "index.js"]