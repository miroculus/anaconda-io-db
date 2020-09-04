FROM balenalib/raspberrypi3-alpine-node:12.16.3-build

WORKDIR /src

# This COPY will decide if we break the Caché
COPY package.json /src/package.json
COPY package-lock.json /src/package-lock.json

RUN npm install

COPY . /src/