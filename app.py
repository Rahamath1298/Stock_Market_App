import os
from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

API_KEY = 'e163e4023044401db55aa68919412cd5'

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    """Search for stock symbols."""
    keywords = request.json.get('keywords')
    if not keywords:
        return jsonify({'status': 'error', 'message': 'Keywords are required.'})

    base_url = 'https://api.twelvedata.com/symbol_search'
    params = {
        'symbol': keywords,
        'apikey': API_KEY
    }
    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if 'data' in data:
            return jsonify({'status': 'success', 'results': data['data']})
        else:
            return jsonify({'status': 'error', 'message': data.get('message', 'Unknown error')})
    except requests.exceptions.Timeout:
        return jsonify({'status': 'error', 'message': 'Request timed out. Please try again later.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error occurred: {e}'})

@app.route('/realtime/<symbol>', methods=['GET'])
def realtime(symbol):
    """Fetch real-time stock data."""
    base_url = 'https://api.twelvedata.com/time_series'
    params = {
        'symbol': symbol,
        'interval': '1min',
        'apikey': API_KEY,
        'outputsize': 1
    }
    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if 'values' in data:
            return jsonify({'status': 'success', 'data': data['values'][0]})
        else:
            return jsonify({'status': 'error', 'message': data.get('message', 'Unknown error')})
    except requests.exceptions.Timeout:
        return jsonify({'status': 'error', 'message': 'Request timed out. Please try again later.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error occurred: {e}'})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))  # Use the PORT from the environment
    app.run(host='0.0.0.0', port=port, debug=True)
