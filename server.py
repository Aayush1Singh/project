from flask import Flask, jsonify, request
import requests
app = Flask(__name__)
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
API_USER=os.getenv("API_USER")
API_SECRET=os.getenv("API_SECRET")
API_KEY=os.getenv("API_KEY")
#********************Route for scam and Phishing website detection********************

@app.route("/Scamphishing", methods=['POST'])
def handleScams():
    try:
        if request.method == 'POST':
            data = request.get_json()
            url_to_check = data.get("url") 
            
            if not url_to_check:
                return jsonify({"error": "No URL provided"}), 400  
            
            payload = {
                "client": { "clientId": data.get("clientId"), "clientVersion": data.get("client") },
                "threatInfo": {
                    "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING"],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{ "url": url_to_check }]
                }
            }

            response = requests.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={API_KEY}",
                json=payload
            )
            if len(response.json())==0:                 # return api response
                return jsonify({"success":True,"client":data.get("client"),"Message" : "Given url is Safe to use"}),200  
            else:
                return jsonify({"success":True,"client":data.get("client"),"Message" : "Given url is not Safe to use"}),403
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500
    
#***********************Route for Explicit and voilent Conetent Detection***********************

@app.route("/violentcontent",methods=['POST'])
def handleVoilentContent():
    try:
        if request.method=='POST':
            data= request.get_json()
            imgSrc = data.get("image-url")
            if not imgSrc :
                return jsonify({"success":False,"message":"Image not found"}),404
            
            IMAGE_URL = imgSrc

            response = requests.get(
                "https://api.sightengine.com/1.0/check.json",
                params={
                    "models": "violence",
                    "api_user": API_USER,
                    "api_secret": API_SECRET,
                    "url": IMAGE_URL
                })
            
            if response.status_code!=200:
                return jsonify({"success": False, "message": "Error in external API response"}), 500
            
            if response.json()["status"]=="failure":
                return jsonify({"success":False,"message":"Image url is not valid "}),400
            
            data = response.json()

            if data["violence"]["prob"] > 0.7:   # return api response 
                return jsonify({"success":True , "message":" Violent content detected!"}),403
            else:
                return jsonify({"success":True,"message":" Image is safe."}),200
            
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500
        
#***************************Route for fake News and romour detection*************

@app.route("/fakenews",methods=['POST'])
def DetectFakeNews():
    try:
        if request.method=='POST':
            data=request.get_json()
            news=data.get("news")
            if not news:
                return jsonify({"success":False,"message":"News Not provided"})
            url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?query={news}&key={API_KEY}"
            response = requests.get(url)
            data=response.json()
            if response.status_code!=200:
                return jsonify({"success": False, "message": "Error in external API response"}), 500
            if len(data)==0:
                return jsonify({"success":False,"message":"Please Enter a valid News"})
            conclusion=data["claims"][0]["claimReview"][0]["textualRating"]
            return jsonify({"success":True,"message":conclusion}),200       #return api response 
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500

#*****************Route for Self Harm and suicide encouragement****************************

@app.route("/selfharm-suicides",methods=['POST'])
def handleselfHarm_SuicidalContent():
    try:
        if request.method=='POST':
            data= request.get_json()
            imgSrc = data.get("image-url")
            if not imgSrc :
                return jsonify({"success":False,"message":"Image not found"}),404
            
            IMAGE_URL = imgSrc

            response = requests.get(
                "https://api.sightengine.com/1.0/check.json",
                params={
                    "models": "self-harm",
                    "api_user": API_USER,
                    "api_secret": API_SECRET,
                    "url": IMAGE_URL
                })
            
            if response.status_code!=200:
                return jsonify({"success": False, "message": "Error in external API response"}), 500
            
            if response.json()["status"]=="failure":
                return jsonify({"success":False,"message":"Image url is not valid "}),400
            
            data = response.json()
            # return data

            if data["self-harm"]["prob"] > 0.5:   # return api response 
                return jsonify({"success":True , "message":" Self-harm and Suicidal content detected!"}),403
            else:
                return jsonify({"success":True,"message":" Image is safe."}),200
            
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500

#***********************Route for Cyber bullying and hate speech*************************
@app.route('/hatespeech-cyberbullying', methods=['POST'])
def handleHateCyberBullying():
    try:
        if request.method == 'POST':
            data = request.get_json()
            imgSrc = data.get('img-url')
            textSrc = data.get('txt-content')

            if not imgSrc and not textSrc:
                return jsonify({"success": False, "message": "Image and Text not found"}), 404

            imgResp = None
            textResp = None

            if imgSrc:
                imgResponse = requests.post("https://api.sightengine.com/1.0/check.json",params={
                    "models": "offensive-2.0",
                    "api_user": API_USER,
                    "api_secret": API_SECRET,
                    "url": imgSrc
                    })
                
                if imgResponse.status_code!=200:
                    return jsonify({"success": False, "message": "Error in external API response in image detection"}), 500
            
                if imgResponse.json()["status"]=="failure":
                    return jsonify({"success":False,"message":"Image url is not valid "}),400
            
                imgdata = imgResponse.json()

                if imgdata["offensive-2.0"]["prob"] > 0.5:   
                    imgResp = "Cyber-bullying content detected!"
                else:
                    imgResp=" Image is safe."
                
            if textSrc:
                textResponse = requests.post("https://api.sightengine.com/1.0/text/check.json",params={
                    "text": textSrc,
                    "api_user": API_USER,
                    "api_secret": API_SECRET,
                     "mode": "ml",
                     "lang": "en"
                    })
                
                if textResponse.status_code!=200:
                    return jsonify({"success": False, "message": "Error in external API response in text detection"}), 500
            
                if textResponse.json()["status"]=="failure":
                    return jsonify({"success":False,"message":"text is not valid "}),400
            
                textdata = textResponse.json()
                textResp=[]
                if textdata["moderation_classes"]["discriminatory"]>0.6:
                    textResp.append("discriminatory")
                if textdata["moderation_classes"]["insulting"]>0.6:
                    textResp.append("insulting")
                if textdata["moderation_classes"]["sexual"]>0.6:
                    textResp.append("sexual")
                if textdata["moderation_classes"]["toxic"]>0.6:
                    textResp.append("toxic")
                if textdata["moderation_classes"]["violent"]>0.6:
                    textResp.append("violent")

            return jsonify({                        # return api response 
                "success": True,
                "message": "Processing successful",
                "text_analysis": textResp,
                "image_analysis": imgResp
            }), 200
                    
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500
        
#*****************Route for Extremism & Terrorism Recruitment*****************************
@app.route("/extremism",methods=['POST'])
def HandleExtremism():
    try:
        if request.method=='POST':
            data= request.get_json()
            txtSrc = data.get("text")
            if not txtSrc :
                return jsonify({"success":False,"message":"text not found"}),404

            response = requests.get("https://api.sightengine.com/1.0/text/check.json",params={
                    "text": txtSrc,
                    "api_user": API_USER,
                    "api_secret": API_SECRET,
                    "mode": "ml",
                    "lang": "en"
                    })
            
            data = response.json()
            if response.status_code!=200:
                return jsonify({"success": False, "message": "Error in external API response."}), 500
            
            if response.json()["status"]=="failure":
                return jsonify({"success":False,"message":"Text is not valid "}),400
               
                
            if data["moderation_classes"]["discriminatory"]>0.5 or data["moderation_classes"]["violent"]>0.5:  # return api response 
                return jsonify({"success":True , "message":"Extremism and Terrorism content detected!"}),403
            else:
                return jsonify({"success":True,"message":" Text is not Extremism ."}),200
            
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500
#*******************Route for Privacy violation and Doxing*****************************************
@app.route("/doxing",methods=['POST'])
def handlePrivacyThreatAndDoxing():
    try:
        if request.method=='POST':
            data = request.get_json()
            text = data.get("text")
            
            if not text :
                return jsonify({"success":False,"message" :"Not Text Found"}),404
            
            response = requests.get("https://api.sightengine.com/1.0/text/check.json",params={"text": text,"api_user": API_USER,"api_secret": API_SECRET,"mode":"standard","categories": "personal","lang":"en" }) # This checks for doxing and personal info leaks          
            data = response.json()
            
            # return jsonify(data)
            if response.status_code!=200:
                return jsonify({"success": False, "message": "Error in external API response."}), 500
            
            if response.json()["status"]=="failure":
                return jsonify({"success":False,"message":"Text is not valid "}),400
            
            if "personal" in data and "matches" in data["personal"] and data["personal"]["matches"]:
                return {"success": True, "message": "⚠️ Doxing threat detected!", "details": data["personal"]["matches"]}
            else:
                return {"success": True, "message": "✅ No doxing threats found."}
    except Exception as e :
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500
        
        
if __name__ == "__main__":
    app.run(debug=True)