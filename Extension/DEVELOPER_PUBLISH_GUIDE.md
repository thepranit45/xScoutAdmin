# How to Publish xScout Nexus Correctly

If the extension crashes with "Command not found", it usually means dependencies are missing. Follow this **exact** sequence to fix and republish.

## 1. Prepare Dependencies
1.  Open a terminal in `d:\xScout\Extension`.
2.  Install dependencies fresh:
    ```bash
    rm -rf node_modules
    npm install
    ```
    *(If on Windows cmd, use `rmdir /s /q node_modules`)*

## 2. Verify `.vscodeignore`
Ensure `node_modules` is **NOT** listed in `.vscodeignore`. It must be included in the package.
*   **Good:** `src/test`
*   **Bad:** `node_modules` (Delete this line if found!)

## 3. Package the Extension
1.  Run `vsce package`:
    ```bash
    npx vsce package
    ```
    *   This will create a new file, e.g., `xscout-nexus-0.0.7.vsix` (make sure to bump version in `package.json` first if needed).

## 4. Test Locally (Important!)
Before uploading, test it yourself:
1.  Go to VS Code Extensions tab.
2.  Click **...** (Views and More Actions) -> **Install from VSIX...**.
3.  Select your new `.vsix` file.
4.  Reload VS Code.
5.  Try `Ctrl+Shift+P` -> `xScout: Login`.
    *   **If it works:** Proceed to step 5.
    *   **If it fails:** Do not upload. Check errors.

## 5. Publish
1.  Data is good? Publish:
    ```bash
    npx vsce publish
    ```
    *(Or upload manually to marketplace website)*.
