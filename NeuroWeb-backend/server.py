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
GEMINI_LIST=eval(os.getenv('GEMINI_KEY_LIST'))
prompt = """Analyze the following text to detect harmful content. Each content section ends with a unique identifier in the format "#FP~x".

### Task:
1. Identify harmful content based on the predefined categories below.
2. Return only the **identifiers (FP~x)** of the sections containing harmful content, separated by commas.
3. If no harmful content is found, return an empty string ("").

### Harmful Content Categories:
1. **Hate Speech & Cyberbullying** Content that includes racist, sexist, homophobic, religiously offensive, or derogatory remarks targeting individuals or groups. This covers threats, insults, bullying, harassment, and personal attacks intended to cause harm or incite hatred.
2. **Misinformation & Fake News** False, misleading, or manipulated information presented as factual. This includes fabricated stories, conspiracy theories, medical misinformation (e.g., fake cures), or political propaganda intended to deceive.
3. **Online Scams & Fraud** Attempts to deceive users for financial gain or steal personal data. This includes phishing scams, Ponzi schemes, fraudulent investment offers, impersonation fraud, fake job offers, and identity theft attempts.
4. **Explicit & Violent Content** Graphic material depicting severe violence, gore, mutilation, torture, child abuse, revenge porn, sexual exploitation, or depictions of self-harm. This category covers highly disturbing or traumatizing content.
5. **Self-Harm & Suicide Encouragement** Content that promotes, encourages, or glorifies self-harm, suicide, eating disorders, or mental distress. This includes suggestions or methods for self-harm, suicide pacts, or content that shames individuals into self-harm.
6. **Extremism & Terrorism Recruitment** Content that promotes radical ideologies, terrorist propaganda, violent extremism, or recruitment for extremist groups. This includes calls for violence, justifications of terrorist acts, or materials that aim to radicalize.
7. **Privacy Violations & Doxing** Unauthorized sharing of private information, such as full names, addresses, phone numbers, bank details, or personal conversations. This includes doxing (publicly exposing personal details), leaked sensitive data, or encouraging surveillance without consent.

### Output Rules:
- **Only return the identifiers (FP~x)**, separated by commas (e.g., "FP~2,FP~3").
- Do not include category names, explanations, or any extra text.
- The output must be a single-line string.

### Example:
#### Input:
"I love LLM #FP~1. This promotes violence #FP~2. This encourages bullying #FP~3"
#### Output:
"FP~2,FP~3"

### Now analyze the following text:
{text}
"""

llmList=[];
prompt_template = PromptTemplate(input_variables=['text'], template=prompt)

for i in GEMINI_LIST:
    try:
        temp = GoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=i, temperature=1)
        chain = LLMChain(llm=temp, prompt=prompt_template)
        llmList.append(chain)
    except Exception as e:
        print(f"Error during LLM initialization: {e}")
counter=0
counter_lock = asyncio.Lock()  # Lock for counter updates
async def increaseCounter():
    global counter 
    async with counter_lock:  # Ensure only one update at a time
        counter=counter+1;
        counter %=len(GEMINI_LIST)
semaphore = asyncio.Semaphore(len(GEMINI_LIST))

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
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def handlePrivacyViolation(text2):
    async with semaphore:   
        # Run the chain 
        try: 
            await increaseCounter()
            result =await llmList[counter].ainvoke({'text': text2})
            print("Identified Harmful IDs:", result)
            return result['text'] if 'text' in result else None  # Return result safely
        except Exception as ex:
            print(f"Error during chain invocation: {ex}")
            return ""
#*********************Route for text moderation using gemini*********************************
@app.route('/analyze-content', methods=['POST'])
async def analyze_content():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400
        text=data.get('text')
        output=await handlePrivacyViolation(text)
        return jsonify({'success':True, "output":output})

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
    app.run(host="0.0.0.0",threaded=False)
