from PIL import Image
from transformers import pipeline

img = Image.open("image.png")
classifier = pipeline("image-classification", model="Falconsai/nsfw_image_detection",use_fast=True)
response = classifier(img)
print(response[0]["score"])