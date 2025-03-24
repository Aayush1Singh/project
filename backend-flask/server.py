from flask import Flask, jsonify, request
import requests
app = Flask(__name__)
import os
from dotenv import load_dotenv
from flask_cors import CORS  # Import CORS module
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_google_genai import GoogleGenerativeAI
import re
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio
CORS(app) 
# Load environment variables from .env file
load_dotenv()
API_USER=os.getenv("API_USER")
API_SECRET=os.getenv("API_SECRET")
API_KEY=os.getenv("API_KEY")
GOOGLE_KEY=os.getenv('GEMINI_API_KEY')

def extract_segments(text):
    # Regex to split content while keeping markers
    segments = re.split(r"(#FP~\d+)", text)
    
    # Create a dictionary of {marker: content}
    content_map = {}
    for i in range(1, len(segments), 2):  # Step 2 for markers, Step 2+1 for content
        marker = segments[i].strip()
        content = segments[i + 1].strip() if i + 1 < len(segments) else ""
        content_map[marker] = content
    
    return content_map
semaphore = asyncio.Semaphore(3)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def handlePrivacyViolation(text2):
    try:
        llm = GoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GOOGLE_KEY, temperature=0.5)
    except Exception as e:
        print(f"Error during LLM initialization: {e}")
        return  # Stop execution if LLM fails to initialize
    prompt = """
    Below is a continuous text where each content section ends with a unique identifier in the format #FP~x.
    Analyze the text and identify harmful content by category. For each harmful content found, return its corresponding identifier along with the identified category.

    ### Harmful Content Categories:
    1. Hate Speech & Cyberbullying – Offensive, racist, sexist, or threatening content.
    2. Misinformation & Fake News – Spread of false or misleading information.
    3. Online Scams & Fraud – Phishing, financial fraud, and identity theft.
    4. Explicit & Violent Content – Graphic violence, child exploitation, and revenge porn.
    5. Self-Harm & Suicide Encouragement – Content promoting self-harm or mental distress.
    6. Extremism & Terrorism Recruitment – Radicalization and terrorist propaganda.
    7. Privacy Violations & Doxing – Unauthorized data leaks, surveillance, and personal info exposure.

    ### Example Input:
    I love LLM #FP~1. This is inappropriate content that promotes violence #FP~2. This is another content that promotes bullying #FP3

    ### Example Output:
    FP~2,FP~3
    **Do not include category names, descriptions, or explanations. Only output the identifiers.**
    Do not add anything else
    Now analyze the following text:
    {text}
    """

    prompt_template = PromptTemplate(input_variables=['text'], template=prompt)
    chain = LLMChain(llm=llm, prompt=prompt_template)
    async with semaphore:   
        # Run the chain 
        try: 
            result =await chain.ainvoke({'text': text2})
            print('hello boi 10')
            print("Identified Harmful IDs:", result)
            return result['text'] if 'text' in result else None  # Return result safely
        except Exception as ex:
            print(f"Error during chain invocation: {ex}")
            return ""

@app.route('/analyze-content', methods=['POST'])
async def analyze_content():
    try:
        print('hello')
        data = request.get_json()
        # print(data)
        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400
        
        content_type = data.get("type")  # 'url', 'image', 'text'
        content = data.get("content")
        text=data.get('text')
        # print('hello',text)
        output=await handlePrivacyViolation(text)
        # print(output)
        return jsonify({'success':True, "output":output});
        if not content_type or not content:
            return jsonify({"success": False, "message": "Invalid data format"}), 400

        # Route data to appropriate endpoints
        if content_type == "url":
            # Forward URL for scam/phishing detection
            response = requests.post("http://localhost:5000/Scamphishing", json={"url": content})
        elif content_type == "image":
            # Forward image for violent/self-harm detection
            response = requests.post("http://localhost:5000/violentcontent", json={"image-url": content})
        elif content_type == "text":
            # Forward text for fake news/hate speech detection
            response = requests.post("http://localhost:5000/hatespeech-cyberbullying", json={"txt-content": content})
        else:
            return jsonify({"success": False, "message": "Unsupported content type"}), 400
        
        # Return the result of the forwarded request
        return response.json(), response.status_code

    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500

#********************Route for scam and Phishing website detection********************

@app.route("/scamphishing", methods=['POST'])
def handleScams():
    try:
        if request.method == 'POST':
            data = request.get_json()
            urls = data.get("urls") 
            
            if not len(urls):
                return jsonify({"error": "No URL provided"}), 400  
            
            payloadUrls = [] # It will be sent along with payload while hitting google safe browsing end point.
            for url in urls :
                newUrl={"url":url.get("url")}
                payloadUrls.append(newUrl)
            
            #payload for google safe Browsing
            payload = {
                "client": { "clientId":"Hack2Skill" , "clientVersion": "Team Sparkz" },
                "threatInfo": {
                    "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING"],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": payloadUrls       # <-- payloadUrls used here!
                }
            }
            
            # making api call 
            response = requests.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={API_KEY}",
                json=payload
            )
            
            data = response.json()
            
            # Return the response if site does not contain any malicious url
            if not len(data):
                return jsonify({"success":True,"message":"No malicious url detected on this webpage! ","ids": []}),200 
            
            #Extracting all the malicious websites!
            maliciousUrls=[]
            for i in data.get("matches"):
                maliciousUrls.append(i.get("threat").get("url"))
            
            #Return ids of all the malicious url found by google Safe browsing
            malicious_Url_Ids=[]
            for x in urls:
                for u in maliciousUrls:
                    if u == x.get("url"):
                        malicious_Url_Ids.append(x.get("index"))
                        break
                
            return jsonify({"success":True,"message":"Several malicious urls detected on this webpage! ","ids": malicious_Url_Ids}),401

                
    except Exception as e:
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500

       
if __name__ == "__main__":
    app.run(debug=True,threaded=False)
