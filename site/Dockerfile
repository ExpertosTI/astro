# Dockerfile ultra-liviano para servir la exportación estática
FROM nginx:alpine

# Copiar los archivos ya construidos localmente
COPY out /usr/share/nginx/html

# Copiar configuración de NGINX para el proxy interno
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
