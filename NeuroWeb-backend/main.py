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

app = Flask(__name__)
load_dotenv()

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

            if nsfw_score > 0.5:
                nsfw_candidates.append({"url": img["url"], "index": index})
        except Exception as e:
            print(f"❌ NSFW classifier failed for {img['url']}: {e}")
            bad_indices.append(img["index"])

    return nsfw_candidates

# ✅ Final filtering via Sightengine
async def send_to_api_async(nsfw_candidates, bad_indices):
    final_nsfw = []
    api_user = os.getenv("SIGHTENGINE_USER", "421618219")
    api_secret = os.getenv("SIGHTENGINE_SECRET", "6evSU9RSa8jCKNCBgVFpxaLy7g2gkCke")

    for item in nsfw_candidates:
        try:
            image = fetch_image_from_url(item["url"])
            if image is None:
                bad_indices.append(item["index"])
                continue

            buffer = BytesIO()
            image.save(buffer, format="PNG")
            buffer.seek(0)

            params = {
                'models': 'nudity-2.1,weapon,text-content,gore-2.0',
                'api_user': api_user,
                'api_secret': api_secret
            }
            files = {'media': ('image.png', buffer)}
            r = requests.post('https://api.sightengine.com/1.0/check.json', files=files, data=params)
            output = r.json()

            suggestive_score = output['nudity'].get('suggestive', 0)
            very_suggestive_score = output['nudity'].get('very_suggestive', 0)
            print(f"Image {item['index']} → Suggestive: {suggestive_score}, Very Suggestive: {very_suggestive_score}")

            if suggestive_score > 0.5 or very_suggestive_score > 0.5:
                final_nsfw.append(item["index"])

        except Exception as e:
            print(f"❌ Error in Sightengine API for image {item['index']}: {e}")
            bad_indices.append(item["index"])

    return final_nsfw

# ✅ Flask Route
@app.route("/verify-images", methods=['POST'])
def verify_images():
    data = request.json
    if not data or not isinstance(data, list):
        return jsonify({"error": "Invalid input format"}), 400

    bad_indices = []
    nsfw_candidates = batch_nsfw_prediction(data, bad_indices)
    final_nsfw = asyncio.run(send_to_api_async(nsfw_candidates, bad_indices))

    return jsonify({
        "nsfw_indices": final_nsfw,
        "bad_indices": bad_indices
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
