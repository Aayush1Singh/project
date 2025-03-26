# Harmful Content Detector Chrome Extension

## How to Install and Use

### Step 1: Clone the Repository
Clone this repository to your local machine:
```sh
git clone https://github.com/Aayush1Singh/hack2Skill-server.git
cd hack2Skill-server/frontend-extension
```
### Step 2: Open Chrome Extensions Page


1. Open Google Chrome.
2. Navigate to `chrome://extensions` in the address bar.

### Step 3: Enable Developer Mode
1. In the top right corner, toggle the switch to enable "Developer mode".

### Step 4: Load the Extension
1. Click on the "Load unpacked" button.
2. Select the `hack2Skill-server/frontend-extension` directory from the cloned repository.

### Step 5: Verify Installation
1. The extension should now appear in your list of installed extensions.
2. You can pin the extension to the toolbar for easy access.

### Step 6: Using the Extension
1. Click on the extension icon in the toolbar.
2. Use the popup interface to enable detection, view stats, and clear cache.

### Additional Information
- The extension detects and highlights harmful content on web pages.
- It communicates with a backend server to analyze content.

### Backend Server Setup
Refer to the `Readme.md` file in the `backend-flask` directory for instructions on setting up the backend server.

### Permissions
The extension requires the following permissions:
- `activeTab`
- `scripting`
- `storage`
- `http://127.0.0.1:5000`

### Manifest File
The `manifest.json` file includes the necessary configurations for the extension:
```json
{
  "manifest_version": 3,
  "name": "Harmful Content Detector",
  "version": "1.0",
  "description": "Detects and highlights harmful content on web pages.",
  "permissions": ["activeTab", "scripting", "storage", "http://127.0.0.1:5000"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["Readability.js", "content.js"],
      "run_at": "document_end"
    }
  ],
  "host_permissions": ["*://*/"],
  "action": {
    "default_popup": "popup.html"
  }
}
```
