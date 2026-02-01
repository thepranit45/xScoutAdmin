const vscode = require('vscode');

class Behavior_Scanner {
    constructor() {
        this.wpm = 0;
        this.keystrokes = 0;
        this.backspaces = 0; // Fatigue metric
        this.pasteCount = 0; // Anti-cheat metric
        this.lastFocusTime = Date.now();
        this.startTime = Date.now();
        this.isFocused = true;
        this.setupListeners();
    }

    setupListeners() {
        // Track Typing
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.contentChanges.length > 0) {
                event.contentChanges.forEach(change => {
                    if (change.text.length > 50) {
                        // High volume text insertion -> Paste Detected
                        this.pasteCount++;
                        vscode.window.setStatusBarMessage('xScout: Large Paste Detected', 3000);
                    } else if (change.text === '' && change.rangeLength > 0) {
                        // Deletion -> Backspace
                        this.backspaces++;
                    } else {
                        // Normal typing
                        this.keystrokes++;
                    }
                });
                this.calculateWPM();
            }
        });

        // Track Focus/Blur for Flow State
        vscode.window.onDidChangeWindowState(windowState => {
            if (windowState.focused) {
                this.isFocused = true;
                this.lastFocusTime = Date.now(); // Reset focus timer? Or keep cumulative? 
                // Let's rely on continuous focus duration.
            } else {
                this.isFocused = false;
                this.lastFocusTime = Date.now(); // Reset on blur
            }
        });
    }

    calculateWPM() {
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        if (elapsedMinutes > 0) {
            // Simple WPM calculation
            this.wpm = Math.round((this.keystrokes / 5) / elapsedMinutes);
        }
    }

    getFlowState() {
        const focusDurationMin = (Date.now() - this.lastFocusTime) / 60000;

        if (!this.isFocused) return 'DISTRACTED';
        if (focusDurationMin > 10 && this.wpm > 30) return 'FLOW';
        if (this.wpm < 5 && focusDurationMin > 2) return 'IDLE';
        return 'NORMAL';
    }

    scan() {
        const totalActions = this.keystrokes + this.backspaces;
        const fatigueScore = totalActions > 0 ? Math.round((this.backspaces / totalActions) * 100) : 0;

        return {
            wpm: this.wpm,
            keystrokes: this.keystrokes,
            backspaces: this.backspaces,
            pasteCount: this.pasteCount, // Cumulative since start
            fatigue: fatigueScore,
            flowState: this.getFlowState()
        };
    }
}

module.exports = { Behavior_Scanner };
