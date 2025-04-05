import requests
import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import asyncio
import numpy as np
from io import BytesIO
from transformers import pipeline
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import os
from flask_cors import CORS
import asyncio
import aiohttp

app = Flask(__name__)
CORS(app)
load_dotenv()
api_keys=[['1861897728','dVZMNttNhrjSrCGVTSdFfGAA3Kw8N9LB'],["421618219","6evSU9RSa8jCKNCBgVFpxaLy7g2gkCke"],['720767819','CcNxxJdRSimKuQ4RwZsNiDnMxKHWmxJr'],['1157867926','bZDXeHTEdMBfAfeaP5i4xijfHFPCyM9y']]
# ✅ NSFW Classifier using Transformers
classifier = pipeline("image-classification", model="Falconsai/nsfw_image_detection", use_fast=True)
# ✅ Load MobileNetV2 Model
model = models.mobilenet_v2(pretrained=True)
model.eval()

# ✅ Image Transformations
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# ✅ Attempt to fetch or extract image from webpage
def fetch_image_from_url(url):
    try:
        response = requests.get(url, timeout=10)
        content_type = response.headers.get("Content-Type", "")
        if 'image' in content_type:
            return Image.open(BytesIO(response.content)).convert("RGB")
        else:
            soup = BeautifulSoup(response.text, 'html.parser')
            img_tag = soup.find("img")
            if img_tag and img_tag.get("src"):
                img_url = img_tag["src"]
                if not img_url.startswith("http"):
                    from urllib.parse import urljoin
                    img_url = urljoin(url, img_url)
                img_response = requests.get(img_url, timeout=10)
                return Image.open(BytesIO(img_response.content)).convert("RGB")
    except Exception as e:
        print(f"❌ Failed to fetch image from {url}: {e}")
    return None

# ✅ Load and transform image
def load_image(image_source):
    try:
        if image_source["url"].startswith("http"):
            image = fetch_image_from_url(image_source["url"])
        else:
            image = Image.open(image_source["url"]).convert("RGB")

        if image:
            return image_source["index"], transform(image)
    except Exception as e:
        print(f"Error loading image {image_source['url']}: {e}")
    return None

# ✅ Pre-filter NSFW using Transformer
def batch_nsfw_prediction(image_sources, bad_indices):
    nsfw_indices = []
    nsfw_candidates = []

    for img in image_sources:
        image_data = load_image(img)
        if image_data is None:
            bad_indices.append(img["index"])
            continue

        index, tensor = image_data
        image_pil = transforms.ToPILImage()(tensor)
        try:
            response = classifier(image_pil)
            nsfw_score = response[0]["score"] if response else 0
            print(f"Image {index} -> NSFW Score: {nsfw_score}")

            if nsfw_score > 0.98:
                nsfw_candidates.append({"url": img["url"], "index": index})
        except Exception as e:
            print(f"❌ NSFW classifier failed for {img['url']}: {e}")
            bad_indices.append(img["index"])

    return nsfw_candidates

# ✅ Final filtering via Sightengine
counter = 0
counter_lock = asyncio.Lock()

async def increaseCounter(api_keys):
    """Round-robin counter to rotate API keys"""
    global counter
    async with counter_lock:
        counter = (counter + 1) % len(api_keys)

semaphore = asyncio.Semaphore(5)  # Limit concurrency based on system capacity

async def fetch_image_async(url):
    """Fetch image asynchronously"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return Image.open(BytesIO(await response.read()))
            return None

async def process_image(session, item, bad_indices, api_keys):
    """Process a single image asynchronously using an available API key"""
    async with semaphore:
        await increaseCounter(api_keys)  # Rotate API key
        api_user, api_secret = api_keys[counter]

        try:
            image = await fetch_image_async(item["url"])
            if image is None:
                bad_indices.append(item["index"])
                return None

            # Create a FormData object for the multipart upload
            form_data = aiohttp.FormData()
            form_data.add_field('api_user', api_user)
            form_data.add_field('api_secret', api_secret)
            form_data.add_field('models', 'nudity-2.1,weapon,gore-2.0')
            
            # Add the image file
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            buffer.seek(0)
            form_data.add_field('media', buffer, filename='image.png', content_type='image/png')

            async with session.post('https://api.sightengine.com/1.0/check.json', data=form_data) as response:
                output = await response.json()

            if output.get("status") != "success":
                print(f"❌ API error for image {item['index']}: {output.get('error', {}).get('message')}")
                bad_indices.append(item["index"])
                return None

            suggestive_score = output['nudity'].get('suggestive', 0)
            very_suggestive_score = output['nudity'].get('very_suggestive', 0)
            print(f"Image {item['index']} → Suggestive: {suggestive_score}, Very Suggestive: {very_suggestive_score}")

            return item["index"] if suggestive_score > 0.5 or very_suggestive_score > 0.5 else None

        except Exception as e:
            print(f"❌ Error processing image {item['index']}: {e}")
            bad_indices.append(item["index"])
            return None


async def send_to_api_async(nsfw_candidates, bad_indices, api_keys):
    """Process multiple images concurrently using SightEngine API"""
    async with aiohttp.ClientSession() as session:
        tasks = [process_image(session, item, bad_indices, api_keys) for item in nsfw_candidates]
        results = await asyncio.gather(*tasks)

    return [index for index in results if index is not None]  # Filter out None results# ✅ Flask Route
# @app.route("/analyze-images", methods=['POST'])
def verify_images():
    print('hellllo')
    data = request.json
    data=data['images']
    print(data)
    if not data or not isinstance(data, list):
        return jsonify({"error": "Invalid input format"}), 400

    bad_indices = []
    nsfw_candidates = batch_nsfw_prediction(data, bad_indices)
    final_nsfw = asyncio.run(send_to_api_async(nsfw_candidates, bad_indices,api_keys))

    return jsonify({
        "nsfw_indices": final_nsfw,
        "bad_indices": bad_indices
    })
    

# if __name__ == "__main__":
#     print('SERVER STARTED')
#     app.run(host="0.0.0.0", debug=True)
    
    
    
    
    
    
    
    
    
    # async def send_to_api_async(nsfw_candidates, bad_indices):
#     final_nsfw = []
#     api_user = os.getenv("SIGHTENGINE_USER", "421618219")
#     api_secret = os.getenv("SIGHTENGINE_SECRET", "6evSU9RSa8jCKNCBgVFpxaLy7g2gkCke")

#     for item in nsfw_candidates:
#         try:
#             image = fetch_image_from_url(item["url"])
#             if image is None:
#                 bad_indices.append(item["index"])
#                 continue

#             buffer = BytesIO()
#             image.save(buffer, format="PNG")
#             buffer.seek(0)

#             params = {
#                 'models': 'nudity-2.1,weapon,text-content,gore-2.0',
#                 'api_user': api_user,
#                 'api_secret': api_secret
#             }
#             files = {'media': ('image.png', buffer)}
#             r = requests.post('https://api.sightengine.com/1.0/check.json', files=files, data=params)
#             output = r.json()
#             if output.get("status") != "success":
#                 print(f"❌ API error for image {item['index']}: {output.get('error', {}).get('message')}")
#                 bad_indices.append(item["index"])
#                 continue
#             suggestive_score = output['nudity'].get('suggestive', 0)
#             very_suggestive_score = output['nudity'].get('very_suggestive', 0)
#             print(f"Image {item['index']} → Suggestive: {suggestive_score}, Very Suggestive: {very_suggestive_score}")

#             if suggestive_score > 0.5 or very_suggestive_score > 0.5:
#                 final_nsfw.append(item["index"])

#         except Exception as e:
#             print(f"❌ Error in Sightengine API for image {item['index']}: {e}")
#             bad_indices.append(item["index"])

#     return final_nsfw