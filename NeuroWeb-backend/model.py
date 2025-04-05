# this example uses requests
import requests
import json

params = {
  'models': 'nudity-2.1,weapon,text-content,gore-2.0',
  'api_user': '421618219',
  'api_secret': '6evSU9RSa8jCKNCBgVFpxaLy7g2gkCke'
}
files = {'media': open('image.png', 'rb')}
r = requests.post('https://api.sightengine.com/1.0/check.json', files=files, data=params)

output = json.loads(r.text)
print(output)