# **ffmpeg.wasm Single-Page App Specification**

## **Overview and Requirements**

This specification describes a single-page web application that demonstrates in-browser video transcoding using **ffmpeg.wasm**. The app will automatically load a remote video and convert it from WebM to MP4 on page load, using only client-side resources (WebAssembly). Key requirements include:

* **Automatic Transcoding on Load:** On page load, fetch the remote video file **"Big Buck Bunny"** (10s WebM clip) from the provided URL and immediately begin transcoding it to MP4 format without user intervention.

* **Single-Threaded ffmpeg.wasm:** Use the **single-thread** version of ffmpeg.wasm (`@ffmpeg/core`) to avoid multi-threading complexities (no SharedArrayBuffer requirement). The ffmpeg.wasm library should be loaded via CDN using modern JavaScript modules.

* **Single HTML File Setup:** The entire app should consist of a single HTML file with inline `<script type="module">` and minimal styling. No external dependencies, bundlers, or separate assets (aside from the CDN assets and remote video) are used.

* **Progress Feedback:** Provide minimal progress information during the transcoding process (e.g., a simple text or progress bar indicator that updates as the conversion proceeds).

* **Video Output Playback:** After conversion, display the resulting MP4 in a standard HTML5 `<video>` player. The video should **not autoplay**; instead, present a play button (using the browser’s native controls) so the user can start playback.

* **Error Handling:** Implement basic error handling. If any step fails (loading ffmpeg, fetching the video, transcoding), catch the error and display the **full error stack trace** on the page (e.g., in a `<pre>` block) so developers can easily copy/paste it for debugging.

## **Architectural Decisions**

### **Using ffmpeg.wasm via CDN (No Build Tools)**

The app will include ffmpeg.wasm directly from a CDN in **UMD** format. This allows us to use ffmpeg’s functionality without a build process:

**CDN Choice:** We’ll use the official ffmpeg.wasm distribution on jsDelivr (or unpkg) so that a `<script>` tag can provide the library. For example:

 \<script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.min.js"\>\</script\>

*  This script exposes a global `FFmpeg` object with the necessary API (such as `FFmpeg.createFFmpeg` and `FFmpeg.fetchFile`).

* **Single-Thread Core:** We prefer the single-threaded WASM core to avoid needing `SharedArrayBuffer` and cross-origin isolation. Multi-threaded ffmpeg.wasm (which uses `@ffmpeg/core-mt`) requires special HTTP headers and browser support for shared memory. By using the single-thread core (`@ffmpeg/core-st`), the app runs in any modern browser without cross-origin isolation, at the cost of performance. The single-thread approach is simpler and more compatible for a quick demo.

**No Worker Setup Headaches:** ffmpeg.wasm spawns a Web Worker internally to run FFmpeg. Loading via CDN can sometimes fail to locate the core WASM worker script. To handle this, we will explicitly specify the `corePath` option pointing to the single-thread core bundle on the CDN. This ensures the worker loads the correct script. For example:

 FFmpeg.createFFmpeg({  
    corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.15/dist/ffmpeg-core.js",  
    ...  
});

*  This architectural choice sidesteps any path issues of the worker script by directly referencing the correct file. (The exact version number should match the loaded `@ffmpeg/ffmpeg` version to ensure compatibility.)

### **Minimal Single-Page Structure**

All HTML, CSS (if any), and JS reside in one file to simplify deployment (e.g., easy to copy into a Codespace or embed in a blog). Design decisions for this structure:

* We will use a standard HTML5 document with a `<head>` and `<body>`. Within the body, minimal UI elements are declared (like a status/progress indicator, the video element, and an area for errors).

* The ffmpeg.wasm library is included via a script tag **before** our inline script. This ensures the library is loaded and the `FFmpeg` object is available to use in our script.

* The inline script (written in vanilla JS) will immediately execute on load, orchestrating the transcoding process. We’ll use an **async IIFE** (Immediately Invoked Function Expression) or similar to allow use of `await` syntax for readability (since the script is not a module in this simple setup).

* No external CSS or frameworks will be used. If any styling is needed (e.g., to ensure error text is preformatted), we will use either basic HTML elements like `<pre>` or very minimal inline styles.

This single-file approach makes it easy to run in environments like GitHub Codespaces (just open the HTML in a preview) or any static server. It assumes internet connectivity to fetch the CDN script and the remote video file.

### **Progress Feedback UI**

The goal is to inform the user (developer) that the conversion is in progress without elaborate UI components:

* We plan to use either a simple text node (e.g., “Progress: 45%”) or the native `<progress>` HTML element. Both approaches are very minimal and require no custom styling.

* ffmpeg.wasm provides a **progress callback** that gives a ratio of completion. We will leverage this: when creating the ffmpeg instance, pass a `progress: ({ ratio }) => { ... }` callback. This callback will update our DOM element periodically. For example, if using text: `statusElem.textContent = "Progress: " + Math.round(ratio*100) + "%";`.

* We will also update status text at major steps (e.g., “Loading ffmpeg…”, “Downloading video…”, “Transcoding…” and “Done\!”) to make the process clear. This text is mainly for developer visibility, as the actual processing is automatic.

* The progress information will be very concise – likely just a single line or a single progress bar – to keep the interface clean.

The reason for not using a more complex progress bar or spinner library is to maintain zero dependencies and focus on demonstrating ffmpeg.wasm. The built-in browser UI elements suffice for a developer-oriented demo.

### **Video Output and Playback**

To display the result, we include an HTML5 `<video>` element. Design considerations:

* The `<video>` element will have the `controls` attribute so that a play button (and standard video controls) are available. **Autoplay is disabled** by default (and we will not call `video.play()` programmatically) – this aligns with the requirement to prefer manual play.

* We won’t set `autoplay`; instead, once the video’s `src` is set to the generated blob URL, the user can click play. We prefer using `URL.createObjectURL` to serve the transcoded blob to the video element.

* The video element can be present in the HTML from the start (with no source until ready), or created dynamically. In our implementation we will likely put it in the HTML with an `id` (e.g., `id="outputVideo"`) for simplicity, then assign `video.src` when ready.

* We assume the output format (H.264 video in an MP4 container, likely with AAC audio by ffmpeg’s defaults) is playable by all modern browsers. We will set the blob MIME type to `video/mp4` when creating the Blob URL to help the browser recognize it.

No special styling is applied to the video element; it will display at the browser’s default size. (Developers can full-screen it or adjust as needed – our focus is not on presentation.)

### **Error Handling Strategy**

For this demo, robustness and debuggability are more important than user-friendly error messages:

* All ffmpeg operations (`ffmpeg.load()`, file fetch, `ffmpeg.run()`, etc.) will be wrapped in a `try/catch`. If any exception is thrown during the process, the catch block will execute.

On error, we will display a message like “Error occurred” and output the **entire error stack trace** to the page. We’ll use a `<pre id="errorLog">` element to preserve formatting of the stack (which often includes line breaks and indentation). For example:

 } catch (err) {  
    statusElem.textContent \= "Error during processing.";  
    errorLogElem.textContent \= err.stack || String(err);  
}

*   
* By printing `err.stack`, developers can see exactly where it failed (including internal stack frames) and copy this easily for troubleshooting. This is preferred over just showing `err.message` because it gives more context.

* We’ll ensure the error log is visible (for instance, using a `<pre>` which by default shows text in a block with whitespace preserved). We assume the developer using this spec is comfortable reading stack traces.

This simple error handling approach means the app won’t attempt to recover from errors; it just logs them. Given the purpose (a developer demo), this is acceptable and even desirable to quickly surface issues.

## **Implementation Details**

### **Sequence of Operations**

On page load, the following steps occur in order:

1. **Load ffmpeg.wasm Library:** The `<script>` from the CDN loads the library, making `FFmpeg` available globally. Immediately after, our inline script runs.

2. **Initialize ffmpeg Instance:** We create an ffmpeg instance with `FFmpeg.createFFmpeg(...)`. We set `{ log: true, corePath: '<cdn path to core-st>', progress: callback }`.

   * `log: true` is useful for development; it enables ffmpeg.wasm to print internal ffmpeg logs to the console. (We might not surface these logs in the UI, but having them in the browser console can help debugging if needed.)

`corePath` is set to the single-thread core WASM file on the CDN. This ensures the worker can retrieve the WASM binary. For example, using version 0.12.15:

 corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.15/dist/ffmpeg-core.js"

*  This file contains the WebAssembly and associated worker code for ffmpeg.

  * The `progress` callback updates a progress indicator. ffmpeg.wasm will call this periodically during the `ffmpeg.run()` operation. We’ll update a DOM element (text or progress bar) with the `ratio` (completed fraction of the output). For instance, `ratio = 0.5` means \~50% done.

  * **Reasoning:** Initializing early allows the heavy WASM download to start as soon as possible.

3. **Load ffmpeg WASM:** We call `await ffmpeg.load()`. This triggers download of the ffmpeg core (if not already cached) and initializes the WebAssembly. This step can be time-consuming (the WASM bundle is several megabytes, \~20-30MB). We will update the status text to “Loading FFmpeg…” during this phase so the user knows something is happening.

   * If desired, we could capture progress of this download too. (The library doesn’t provide a direct callback for WASM download progress by default, but since `log: true`, one might intercept network progress events. However, to keep things simple, we’ll just show a static "Loading..." until it's done.)

4. **Fetch the Video File:** Once ffmpeg is ready, we fetch **Big Buck Bunny (10s, WebM)** from the given URL. We use `FFmpeg.fetchFile()` utility to retrieve the file and convert it to a format suitable for ffmpeg.wasm. This utility returns a `Uint8Array` of the file data. We then write that data into ffmpeg’s virtual filesystem:

   * `await FFmpeg.fetchFile(<url>)` gives us the file data.

   * `ffmpeg.FS('writeFile', 'input.webm', fileData)` writes the data as `/input.webm` in the in-memory FS.

   * We update status to “Downloading video…” while the fetch is in progress. After writing the file, we might update status to “Transcoding…”.

   * **CORS Note:** The video URL (on `raw.githubusercontent.com`) must allow cross-origin requests. We assume this URL is accessible and returns appropriate CORS headers for `fetch` to succeed. (We expect GitHub’s raw file hosting to allow it, as this is a known test file for ffmpeg.wasm.)

   * This approach avoids any file input dialog – the video is loaded programmatically. It’s a small 180p, 10-second clip (\~1.4MB), which is quick to download and transcode, ideal for a demo. (Using a small file is an intentional choice to keep the demo fast and avoid taxing the browser.)

5. **Run the Transcoding:** We invoke ffmpeg to convert the file: `await ffmpeg.run('-i', 'input.webm', 'output.mp4')`. This is analogous to the FFmpeg command `ffmpeg -i input.webm output.mp4`. We rely on FFmpeg to choose appropriate codecs:

   * Given the input is VP8/Vorbis (WebM) and output filename is `.mp4`, ffmpeg.wasm should use H.264 for video and AAC (or possibly MP3) for audio by default. These are included in the ffmpeg.wasm build. The result will be a standard MP4 file playable in browsers.

   * During this step, our earlier `progress` callback will be actively updating the progress indicator. For example, we might see it go from 0% to 100%. We’ll ensure the UI reflects that (e.g., if using a `<progress>` element, set its `.value = ratio*100`).

   * The conversion is CPU-intensive. Because we’re using the single-threaded WASM, all work happens in one web worker thread. The UI should remain responsive (since it’s in a worker), but the conversion might take a few seconds. For a 10s clip, this should be quite fast (a few hundred milliseconds to a couple seconds, depending on the device).

   * We keep `ffmpeg.run` simple with only input and output arguments (no extra encoding options) to minimize complexity. This produces a full output (video+audio) by default.

6. **Retrieve the Output:** After `ffmpeg.run` completes, the virtual FS now has `/output.mp4`. We read it: `const data = ffmpeg.FS('readFile', 'output.mp4')`, which returns a Uint8Array of the MP4 file bits.

   * We then create a Blob from this data: `new Blob([data.buffer], { type: 'video/mp4' })`. (Note: `data` is a Uint8Array, and `data.buffer` is the underlying ArrayBuffer. We wrap it in an array because Blob constructor expects an array of parts.)

   * Create a temporary object URL: `const videoURL = URL.createObjectURL(blob)`.

   * Assign this URL to our video player: `videoElement.src = videoURL`.

   * At this point, we update the status text to “Done” (or similar) and perhaps hide the progress indicator. The user will see the video player’s controls become active (the play button can be clicked to watch the result).

   * We might also consider revoking the object URL later (via `URL.revokeObjectURL`) to free memory, but since the page isn’t likely to produce many videos or live long, we can omit that for simplicity. A note can be made that a developer should revoke the URL if creating many objects or on unload.

7. **Post-Process Cleanup (Optional):** For completeness, one could free the FFmpeg FS memory: e.g., `ffmpeg.FS('unlink', 'input.webm')` and `'output.mp4'`, or even call `ffmpeg.exit()` to terminate the ffmpeg WASM worker. In an ephemeral demo page this isn’t strictly required. We will mention this possibility in comments, but focus on the main flow in code.

8. **Error Display:** If any step above throws an error (network failure, wasm load issue, out-of-memory, etc.), the `catch` block will:

   * Update the status or progress area to indicate failure.

   * Print the error stack to the error `<pre>` element. This might include stack frames inside ffmpeg.wasm or a message like “abort() at …” if the WASM had an issue.

   * No further actions are taken; the user (developer) is expected to read the log and diagnose.

### **Code Structure and Notable Patterns**

The code will be written in plain JavaScript. A possible structure in the HTML file is:

* **HTML Elements:** Minimal elements with `id` attributes for easy selection:

  1. A container (e.g., `<div id="status"></div>`) to show status messages and/or progress text.

  2. Optionally a `<progress id="progressBar" max="100">` for a visual progress bar.

  3. The video element (`<video id="outputVideo" controls></video>`) for output.

  4. A `<pre id="errorLog" style="color:red;"></pre>` for error output (colored red or default monospace to stand out).

* **Script inclusion:** The ffmpeg.wasm CDN script in the `<head>` or top of `<body>`, then an inline `<script>` that contains an immediately executed async function as described.

* **Using Async/Await:** We leverage async/await for clarity:

  1. Because we can’t use top-level await in a classic script, we’ll wrap our logic in `(async () => { ... })();`. This self-invoking function is called as soon as it’s defined.

  2. Inside it, we use `await ffmpeg.load()`, `await ffmpeg.run(...)`, etc., which makes the sequence easy to read in order.

* **Logging:** Since `log: true`, ffmpeg will log messages like progress or info to `console.log`. We aren’t actively capturing those, but a developer can open the browser console to see ffmpeg’s own output (which might include encoding frames, percentage, etc.). Our custom progress UI is derived from the `progress` callback provided by ffmpeg.wasm, which is more high-level.

* **Timing:** We expect the following rough timeline when the page loads:

  1. \<1s: Library script loaded (depending on CDN and network).

  2. 1-3s: WASM downloaded (`ffmpeg.load()`).

  3. \~0.5s: Video file fetched (size \~1.4MB).

  4. \~1-2s: Transcoding done. So within a few seconds the video is ready. During this time, the user sees the status/progress updates.

We will provide code examples below that follow this structure.

## **Ultra-Minimal HTML Implementation Variants**

Below are a few ultra-minimal variants of the HTML file. Each variant meets the same functional requirements, with slight differences in UI presentation or code style. All are plain HTML files that can be opened directly or served on a static server. They are intentionally kept small and simple, suitable for quick testing or inclusion in a Codespaces environment.

**Note:** Remember to replace version numbers (`0.12.15` used here as an example) with the latest stable ffmpeg.wasm versions as needed. Each variant can be saved as an `.html` file and run in a modern browser.

### **Variant A: Text Status and Percentage Progress**

This variant uses textual status updates and a percentage display for progress. It also includes a preformatted area for errors.

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
  \<meta charset="UTF-8" /\>  
  \<title\>ffmpeg.wasm Demo – WebM to MP4\</title\>  
  \<\!-- Load ffmpeg.wasm library (UMD build) from CDN \--\>  
  \<script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.min.js"\>\</script\>  
\</head\>  
\<body\>  
  \<h1\>WebM to MP4 Transcoder\</h1\>  
  \<div id="status"\>Initializing...\</div\>  
  \<div id="progressText"\>Progress: 0%\</div\>  
  \<video id="outputVideo" controls\>\</video\>  
  \<pre id="errorLog" style="color: red; white-space: pre-wrap;"\>\</pre\>

  \<script\>  
    (async () \=\> {  
      const { createFFmpeg, fetchFile } \= FFmpeg;  // using global FFmpeg object  
      const ffmpeg \= createFFmpeg({  
        log: true,  
        corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.15/dist/ffmpeg-core.js",  
        progress: ({ ratio }) \=\> {  
          // Update progress percentage  
          const percent \= Math.round(ratio \* 100);  
          document.getElementById('progressText').textContent \= \`Progress: ${percent}%\`;  
        }  
      });  
      try {  
        document.getElementById('status').textContent \= "Loading ffmpeg.wasm...";  
        await ffmpeg.load();  // Load WASM  
        document.getElementById('status').textContent \= "Fetching video file...";  
        // Download Big Buck Bunny video data  
        const videoData \= await fetchFile("https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big\_Buck\_Bunny\_180\_10s.webm");  
        // Write the file to FS  
        ffmpeg.FS('writeFile', 'input.webm', videoData);  
        document.getElementById('status').textContent \= "Transcoding to MP4...";  
        // Run ffmpeg conversion  
        await ffmpeg.run('-i', 'input.webm', 'output.mp4');  
        document.getElementById('status').textContent \= "Done transcoding\!";  
        // Read the result  
        const outputData \= ffmpeg.FS('readFile', 'output.mp4');  
        // Create a blob URL from the output file  
        const videoBlob \= new Blob(\[outputData.buffer\], { type: 'video/mp4' });  
        const videoURL \= URL.createObjectURL(videoBlob);  
        // Set the video player's source to the blob URL  
        const videoElem \= document.getElementById('outputVideo');  
        videoElem.src \= videoURL;  
        videoElem.poster \= "";  // (optional) clear any poster or loading state  
        // Clean up progress text now that we're done  
        document.getElementById('progressText').textContent \= "Progress: 100%";  
      } catch (err) {  
        document.getElementById('status').textContent \= "Error during processing.";  
        const errLog \= document.getElementById('errorLog');  
        errLog.textContent \= err.stack ? err.stack : err.toString();  
      }  
    })();  
  \</script\>  
\</body\>  
\</html\>

**Explanation of Variant A:** This implementation uses two text `<div>`s for status and progress. The progress callback updates the text content to show a percentage. We included a heading (`<h1>`) just for clarity of the demo (can be removed for absolute minimalism). The error `<pre>` uses `white-space: pre-wrap` so that long lines wrap if necessary but still preserve newlines.

### **Variant B: Native Progress Bar Element**

This variant replaces the percentage text with an HTML `<progress>` element for a visual indicator. This provides a minimal progress bar without any extra JavaScript (beyond setting its value).

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
  \<meta charset="UTF-8" /\>  
  \<title\>ffmpeg.wasm Demo – WebM to MP4\</title\>  
  \<script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.min.js"\>\</script\>  
\</head\>  
\<body\>  
  \<div id="status"\>Starting up...\</div\>  
  \<progress id="progressBar" value="0" max="100" style="width: 100%; max-width:400px;"\>\</progress\>\<br/\>  
  \<video id="outputVideo" controls\>\</video\>  
  \<pre id="errorLog" style="color:red; white-space:pre;"\>\</pre\>

  \<script\>  
    (async () \=\> {  
      const ffmpeg \= FFmpeg.createFFmpeg({  
        log: true,  
        corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.15/dist/ffmpeg-core.js",  
        progress: ({ ratio }) \=\> {  
          // Update progress bar value (0 to 100\)  
          document.getElementById('progressBar').value \= Math.round(ratio \* 100);  
        }  
      });  
      try {  
        const statusEl \= document.getElementById('status');  
        statusEl.textContent \= "Loading FFmpeg library...";  
        await ffmpeg.load();  
        statusEl.textContent \= "Downloading video...";  
        const data \= await FFmpeg.fetchFile("https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big\_Buck\_Bunny\_180\_10s.webm");  
        ffmpeg.FS('writeFile', 'input.webm', data);  
        statusEl.textContent \= "Transcoding...";  
        await ffmpeg.run('-i', 'input.webm', 'output.mp4');  
        statusEl.textContent \= "Transcoding complete\!";  
        const result \= ffmpeg.FS('readFile', 'output.mp4');  
        const blob \= new Blob(\[result.buffer\], { type: 'video/mp4' });  
        document.getElementById('outputVideo').src \= URL.createObjectURL(blob);  
      } catch (err) {  
        document.getElementById('status').textContent \= "Error occurred\!";  
        document.getElementById('errorLog').textContent \= err.stack || err;  
      }  
    })();  
  \</script\>  
\</body\>  
\</html\>

**Explanation of Variant B:** We use `<progress id="progressBar">` which by default renders as a bar. The style attribute is purely to make it full-width (for visibility) with a max width. The progress callback simply sets the `value` attribute. As the ratio goes from 0 to 1, the bar fills accordingly. We break a line (`<br/>`) after the progress bar to separate it from the video. Otherwise, the flow is the same. We also demonstrate accessing `FFmpeg.createFFmpeg` directly off the global in one line (as opposed to destructuring). The error log here uses `white-space: pre` to preserve formatting but not wrap lines (since it’s in a fixed container, horizontal scroll may appear for long lines).

### **Variant C: Simplest Markup & Logging to a Single Element**

This variant goes even simpler on the HTML: it uses one `<div>` as a log output that accumulates messages, and doesn’t separate status/progress explicitly. Progress is indicated by updating the same log. It also creates the video element on the fly rather than pre-declaring it.

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
  \<meta charset="UTF-8" /\>  
  \<title\>ffmpeg.wasm Single-Page Demo\</title\>  
  \<script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.min.js"\>\</script\>  
  \<style\> body { font-family: sans-serif; } \</style\>  
\</head\>  
\<body\>  
  \<div id="log"\>\</div\>  
  \<\!-- video element will be created by script \--\>  
  \<script\>  
    (async () \=\> {  
      const logEl \= document.getElementById('log');  
      const log \= (msg) \=\> {   
        logEl.textContent \+= msg \+ "\\n";  // append message  
      };  
      const ffmpeg \= FFmpeg.createFFmpeg({  
        log: false,  // (we'll handle our own logging)  
        corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.15/dist/ffmpeg-core.js",  
        progress: ({ ratio }) \=\> {  
          log(\`Progress: ${Math.round(ratio\*100)}%\`);  
        }  
      });  
      try {  
        log("Loading ffmpeg.wasm...");  
        await ffmpeg.load();  
        log("Fetching video...");  
        const data \= await FFmpeg.fetchFile("https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big\_Buck\_Bunny\_180\_10s.webm");  
        ffmpeg.FS('writeFile', 'input.webm', data);  
        log("Transcoding started...");  
        await ffmpeg.run('-i', 'input.webm', 'output.mp4');  
        log("Transcoding completed.");  
        const output \= ffmpeg.FS('readFile', 'output.mp4');  
        const blob \= new Blob(\[output.buffer\], { type: 'video/mp4' });  
        const url \= URL.createObjectURL(blob);  
        // Create video element now and set source  
        const vid \= document.createElement('video');  
        vid.controls \= true;  
        vid.src \= url;  
        document.body.appendChild(vid);  
        log("Output video ready. Click play to view.");  
      } catch (err) {  
        log("Error: " \+ (err.stack || err));  
      }  
    })();  
  \</script\>  
\</body\>  
\</html\>

**Explanation of Variant C:** Here we maximize simplicity:

* Only one `<div id="log">` is present initially. We use this as a multi-line log output (appending text messages). This avoids having separate elements for status, progress, or errors. Everything is just appended to `#log` sequentially.

* We turned off `log: true` in ffmpeg to avoid cluttering the console (since we’re logging our own messages; a developer can toggle it if needed).

* The video element is not in the HTML; we dynamically create it with `document.createElement('video')` after transcoding. This shows an alternative approach: injecting into DOM via script. We append it to the body when ready.

* Styling is minimal: a simple font-family on body to make text a bit more readable, but otherwise no special layout.

* The progress is indicated by text lines like “Progress: 10%”, “Progress: 20%”, etc., appearing in the log div. This will result in multiple lines of progress (since we append each time). This is somewhat verbose, but it demonstrates progress over time and is still minimal implementation-wise.

* Errors, if any, are logged as a single line starting with “Error: …” including the stack or message.

Each of these variants can be run as-is. They all fulfill the core behavior: loading ffmpeg.wasm from CDN, converting the remote WebM to MP4 on load, showing progress, and displaying the video with a play button.

## **Assumptions and Limitations**

* **Browser Support:** The solution assumes a **modern browser** with WebAssembly and Web Worker support (e.g., recent versions of Chrome, Firefox, Edge, Safari). The single-threaded WASM does **not** require `SharedArrayBuffer`, so no special cross-origin isolation headers are needed. However, very old browsers or IE11 are not supported. We assume ES6+ support for Promise, async/await, etc.

* **Network Access:** The environment where this runs must have internet access to:

  * Load the ffmpeg.wasm scripts from CDN.

  * Fetch the Big Buck Bunny video from GitHub’s raw URL. In offline scenarios, this would fail. (Developers could host those files locally if needed, but that’s outside our scope.)

* **Content Size and Performance:** The included test video is small (10 seconds, 320x180 resolution). The spec assumes this size to keep demo performance reasonable. Larger videos will exponentially increase memory usage and processing time. In a real app, transcoding a lengthy or high-res video in-browser could be very slow or even crash the browser due to memory limits. This demo is meant for small media files.

* **ffmpeg.wasm Version Compatibility:** We pinned version `0.12.15` (as an example) for the scripts. The corePath and main script versions should match. If using a newer version, update both accordingly. Future ffmpeg.wasm versions might have slight API changes. (For instance, version 0.11 vs 0.12 changed how the global is accessed.) This spec assumes the API as of 0.12.x where `FFmpeg.createFFmpeg` and `FFmpeg.fetchFile` exist.

* **Memory Limitations:** ffmpeg.wasm runs entirely in the browser memory. Writing the file into the virtual FS means the video bytes are stored in memory twice (once in JS heap as the Uint8Array from fetch, and once in WASM memory for ffmpeg FS). For a 1.4MB file this is fine. But for a 100MB video, this would be heavy (200MB+ memory). Additionally, the WASM will allocate buffers for processing. Developers should be mindful of memory constraints. This demo doesn’t implement streaming or chunked processing – it’s all in-memory.

* **Output Format Support:** We assume the output MP4 (H.264/AAC) is supported by the browser’s video player (this is true for virtually all modern browsers). If a different output or input were used, compatibility would need verification. Also, audio is preserved from the input WebM to output MP4. The demo doesn’t explicitly show it, but the resulting MP4 should have audio if the input did.

* **No User Interaction Required:** The design is that everything happens automatically. We assume this is acceptable for the developer’s use-case. If this were a user-facing app, we’d need a file input and perhaps not auto-download a video without consent. Here we bypass that for simplicity.

* **GitHub Codespaces Compatibility:** The provided code is plain HTML/JS, which can be opened in a browser or within a Codespaces preview. No special server is required; it’s static content. Just ensure to serve or preview the HTML over HTTP(s) if testing in a sandboxed environment (some browsers don’t allow WASM to load from local `file://` due to security – serving via a local dev server or the Codespaces preview is recommended).

* **Cleanup:** The spec does not explicitly clean up the ffmpeg instance after use. In a long-running single-page app, you might call `ffmpeg.exit()` to terminate the worker and free memory once done. Here, since the page would likely be closed or refreshed after use, we omit this for simplicity. Similarly, the Blob URL is not revoked; if the page is not long-lived, this isn’t an issue, but in a single-page app that converts multiple files, you’d want to call `URL.revokeObjectURL` on old videos to free memory.

By understanding these assumptions and constraints, a developer can implement the single-page app with confidence. The provided variants give a starting point that can be adjusted for different minimal UIs or integrated into a larger application. The focus remains on demonstrating ffmpeg.wasm’s capabilities in a straightforward, developer-friendly manner.