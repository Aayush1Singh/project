# How to Use Guide<br>
*This is a how to use guide for the server*<br>
*This is a server of our hackskill hackathon project*<bar>

Step 1: Clone this repo. to your local machine <br>
Step 2: Install all the required packages using command : ***pip install -r requirements.txt***<br>
step 3: About Routes : <br><br>

***Route*** 1️⃣ : for for scam and Phishing website detection<br><br>

**Input format** : Make a **POST** request to route */Scamphishing* <br>
    {<br>
  "clientId":"10x1",<br>
  "client":"vivek-patel-here",<br>
   "url":"http://testsafebrowsing.appspot.com/s/phishing.html"<br>
    }<br><br>


**Output format** : Return a json Response<br>
{<br>
  "Message": "Given url is not Safe to use",<br>
  "client": "vivek-patel-here",<br>
  "success": true<br>
}<br><br>

***Route*** 2️⃣ : for Explicit and voilent Conetent Detection<br><br>

**Input format** : Make a **POST** request to route */violentcontent* <br>
    {<br>
  "image-url":"https://sightengine.com/assets/img/examples/example7.jpg"<br>
}<br><br>


**Output format** : Return a json Response<br>
{<br>
  "message": " Image is safe.",<br>
  "success": true<br>
}<br><br>

***Route*** 3️⃣ : for fake News and romour detection<br><br>

**Input format** : Make a **POST** request to route */fakenews* <br>
    {<br>
  "news":"Covid-19 leads to infertility"<br>
}<br>


**Output format** : Return a json Response<br>
{<br>
  "message": "There is no evidence to support this claim and now studies are emerging to help disprove it.",<br>
  "success": true<br>
}<br><br>

***Route*** 4️⃣ : for Self Harm and suicide encouragement<br><br>

**Input format** : Make a **POST** request to route */selfharm-suicides* <br>
    {<br>
  "image-url":"https://content.health.harvard.edu/wp-content/uploads/2023/04/43fd6e5f-3a64-4be0-8783-16dee5261a8b.jpg"<br>
}<br>


**Output format** : Return a json Response<br>
{<br>
  "message": " Self-harm and Suicidal content detected!",<br>
  "success": true<br>
}<br>

***Route*** 5️⃣ : for for Cyber bullying and hate speech<br><br>

**Input format** : Make a **POST** request to route */hatespeech-cyberbullying* <br>
    {<br>
  "img-url":"",<br>
  "txt-content":"Are you idiot!"<br>
}<br>


**Output format** : Return a json Response<br>
{<br>
  "image_analysis": null,<br>
  "message": "Processing successful",<br>
  "success": true,<br>
  "text_analysis": [<br>
    "insulting",<br>
    "toxic"<br>
  ]<br>
}<br><br>

***Route*** 6️⃣ : for for Extremism & Terrorism Recruitment<br><br>

**Input format** : Make a **POST** request to route */extremism* <br>
    {<br>
  "text":"I will kill everyone"<br>
}<br>


**Output format** : Return a json Response<br>
{<br>
  "message": "Extremism and Terrorism content detected!",<br>
  "success": true<br>
}<br>

***Route*** 7️⃣ : for Privacy violation and Doxing<br><br>

**Input format** : Make a **POST** request to route */doxing* <br>
    {<br>
  "text":"John Doe's phone number is 9876543210 and his email is johndoe@example.com"<br>
}<br>


**Output format** : Return a json Response<br>
{<br>
  "details": [<br>
    {<br>
      "end": 73,<br>
      "match": "johndoe@example.com",<br>
      "start": 55,<br>
      "type": "email"<br>
    }<br>
  ],<br>
  "message": "⚠️ Doxing threat detected!",<br>
  "success": true<br>
}<br>

### **********************End Here*******************



