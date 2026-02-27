cd backend
api_url=${API_URL:-"/api/exaquery/"}
echo "API URL IS $api_url"

sed -i "s~__APIURL__~${api_url}~g" ../ui/dist/assets/*.js

HTML=../ui/dist python3 server.py
