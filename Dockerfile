FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client \
    && docker-php-ext-install mysqli \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY . /var/www/html
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf

RUN mkdir -p /var/www/html/frontend/assets/uploads /var/www/html/logs \
    && chown -R www-data:www-data /var/www/html/frontend/assets/uploads /var/www/html/logs

EXPOSE 80
