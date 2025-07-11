# Incrypt Stego Flask Backend

## Setup

1. Ensure you have Python 3.8+ installed.
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Place `gpt1_pointillist_stego.py` in the `api/` directory (same folder as `encode_api.py`).

## Running the API

```sh
python3 api/encode_api.py
```

The server will start at `http://localhost:5000`.

## Testing the API

You can test with `curl`:

```sh
curl -X POST http://localhost:5000/api/encode \
  -F "portrait=@/path/to/your/portrait.png" \
  -F "bits=8" \
  -o encoded.png
```

Or use the provided frontend by updating the encode action to POST to `http://localhost:5000/api/encode`.

## Notes
- The first run will download the GPT-1 model and may take a while.
- The output will be a PNG file containing the encoded data. 