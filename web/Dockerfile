FROM node:24-alpine AS build
WORKDIR /src
COPY package.json pnpm-lock.yaml .npmrc ./
RUN npm install --global pnpm@10.33.0 && pnpm install --frozen-lockfile
COPY . ./
RUN pnpm run build

FROM nginx:1.31.8-alpine@sha256:713fc2ebfd92e8217db451477182ee91944b123d2b1ee9fd5a8c6e91ca6c3a11
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
