FROM node:10.19.0

WORKDIR /src

# This COPY will decide if we break the Caché
COPY package.json /src/package.json
COPY package-lock.json /src/package-lock.json

RUN npm install

COPY . /src/
