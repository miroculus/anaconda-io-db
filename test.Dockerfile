FROM balenalib/raspberrypi3-alpine-node:12.16.3-build

WORKDIR /src

# This COPY will decide if we break the Caché
COPY package.json /src/package.json
COPY package-lock.json /src/package-lock.json

ARG NODE_BINARIES_MIRROR

RUN npm install --node_sqlite3_binary_host_mirror=${NODE_BINARIES_MIRROR}

COPY . /src/