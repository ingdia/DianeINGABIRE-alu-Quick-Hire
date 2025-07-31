# Step 1: Specify the Base Image
# We start with an official Node.js image. '18-alpine' is a great choice because it's a
# Long-Term Support (LTS) version and 'alpine' makes the final image very small and secure.
FROM node:18-alpine

# Step 2: Set the Working Directory
# This creates a directory inside the container where our application code will live.
WORKDIR /usr/src/app

# Step 3: Copy package files and install dependencies
# This is a critical optimization step. We copy only the package files first. Docker caches
# this layer. If we don't change our dependencies (package.json), this layer won't be
# rebuilt, making future builds much faster.
COPY package*.json ./
RUN npm install

# Step 4: Copy the rest of the application code
# Now that dependencies are installed, copy all other files (server.js, public/, views/, etc.)
# into the working directory inside the container.
COPY . .

# Step 5: Expose the application port
# This line informs Docker that the application inside the container will listen on port 3000.
# This does not publish the port, it's a form of documentation.
EXPOSE 3000

# Step 6: Define the command to run the application
# This is the command that will be executed when a container is started from this image.
# It runs the 'start' script from our package.json, which is 'node server.js'.
CMD [ "npm", "start" ]