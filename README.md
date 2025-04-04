## **📄 Project Specification: Standalone Web App for Video Frame Extraction**

### **✅ Summary**

A minimalist, high-performance **Progressive Web App (PWA)** for extracting JPEG frames from user-supplied video files at a user-defined time interval. The app runs fully **offline**, uses **plain JavaScript**, **Tailwind CSS**, and **WebAssembly (ffmpeg.wasm)** to handle processing. Extracted frames are written directly into a **user-granted local folder**. Designed for use with tools like **PostShot**.

---

## **🧱 Architecture**

### **Technologies**

* **Frontend**: Plain JavaScript \+ Tailwind CSS

* **Video Processing**: [`ffmpeg.wasm`](https://github.com/ffmpegwasm/ffmpeg.wasm)

* **File System Access**: [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

* **PWA Support**: Service Worker \+ Manifest (if possible inline in html)

* **UI Mode**: Minimalist dark mode

---

## **🖥️ Features**

### **1\. Video Input**

* "Drop video here" area with click-to-open file picker

* Multiple video files accepted at once

* Supported formats: any format ffmpeg.wasm can process (e.g., MP4, MOV, AVI)

* Drop order is preserved and final

### **2\. Frame Extraction Control**

* User-defined interval: input number of seconds (e.g., `0.5` \= every half second)

* Output format: `.jpg` only

* Frame resolution options:

  * Full (original video resolution)

  * Half

  * Custom dimensions (user inputs width and height)

### **3\. File Output**

* User must select target folder before extraction begins

* All extracted `.jpg` frames written directly into this folder

* Naming convention:  
   `video_01__00-00-01.500.jpg`  
   where `video_01` corresponds to first dropped file, etc.

* If the folder already contains `.jpg` files:

  * App scans for existing files

  * Prompts user: “The folder contains files such as X, Y, Z. Delete them all before extraction?”

  * Deletes only if user confirms

### **4\. Processing Feedback**

* Display video metadata on drop:

  * Frame resolution

  * Codec

  * Framerate

  * Creation date (if available)

* Show:

  * Progress bar

  * Estimated time remaining

* Notify user when complete via:

  * Visual success message

  * Optional sound effect

### **5\. Performance & Safety**

* Focused on speed: no previews or overlays

* Estimate number of output frames:

  * If more than 10,000 frames, show warning

* No handling for variable frame rates (VFR)

* Large files attempted; fail gracefully with friendly error message

* Logging to console enabled (clean, non-spammy)

---

## **⚙️ Technical Implementation Notes**

### **File System Access**

* Use the File System Access API to get write permission

* Check for `.jpg` files in target directory before processing

### **ffmpeg.wasm**

* Load ffmpeg.wasm via CDN or local bundle

* Commands generated dynamically based on:

  * Selected video

  * Interval

  * Output resolution

Example command:

bash  
KopierenBearbeiten  
`ffmpeg -i input.mp4 -vf fps=1/0.5 -s 640x360 frame_%03d.jpg`

Then rename to final output format.

### **Web Worker (Optional)**

* Consider using a Web Worker for ffmpeg execution to avoid blocking UI

---

## **❌ Excluded Features**

* No dry run mode

* No cancel/stop button (user closes tab to abort)

* No thumbnail previews

* No user preferences stored

* No help/info section