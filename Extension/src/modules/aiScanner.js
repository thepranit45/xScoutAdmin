class AI_Scanner {
    constructor() {
        this.lastScanResult = 0;
        this.patterns = [
            /\/\/ Here is (the|a) code/gi,
            /\/\/ I hope this helps/gi,
            /\/\/ Explanation:/gi,
            /\/\/ This (function|class|code) (will|is used to)/gi,
            /\/\/.*(ChatGPT|Claude|OpenAI|Anthropic)/gi,
            /\/\/ Step [1-9]:/gi, // Common AI step-by-step formatting
            /'''/g, // Markdown fencing often left in copy-pasted blocks
            /```/g,
            /\/\/ (Total complexity|Time complexity):/gi, // Common in academic AI outputs
        ];
    }

    analyzeCode(code) {
        if (!code || typeof code !== 'string') return 0;

        let score = 0;

        // 1. Text-based heuristics (comments, markdown fences)
        this.patterns.forEach(pattern => {
            if (pattern.test(code)) {
                score += 0.25;
            }
        });

        // 2. Structural Heuristics
        // Too many comments relative to code (AI tends to verbose-comment)
        const totalLines = code.split('\n').length;
        const commentLines = (code.match(/\/\/|\/\*|\*/g) || []).length;
        if (totalLines > 10 && (commentLines / totalLines) > 0.6) {
            score += 0.15;
        }

        // 3. Perfect Formatting (Hard to detect, but we check for common fencing marks)
        if (code.includes('```')) score += 0.2;

        this.lastScanResult = Math.min(score, 1).toFixed(2);
        return parseFloat(this.lastScanResult);
    }
}

module.exports = { AI_Scanner };
