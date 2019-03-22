FROM node:8.11.4

WORKDIR /src

# This COPY will decide if we break the Caché
COPY package.json /src/package.json
COPY package-lock.json /src/package-lock.json

RUN npm install

COPY . /src/

CMD ["npm", "start"]
