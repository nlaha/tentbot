# tentbot

## Usage:
Make a .env file or set docker environment variables with the following values filled out:
```
TOKEN=<your_discord_bot_token>
REDIS_HOSTNAME=<redis_db_host>
REDIS_DB=0
REDIS_PORT=<redis_db_port>
REDIS_USERNAME=<redis_db_username>
REDIS_PASSWORD=<redis_db_password>
CACHE_SIZE=10
TENOR_KEY=<tenor_api_key>
MONGODB_URL=<mongodb_uri>
MONGODB_DBNAME=<mongodb_database_name>
WEBAPP_HOST=<public_url_or_ip_of_webapp>
WEBAPP_PORT=<port_for_webapp>
```

run `npm install`

run `node main.js`
