/**
 * Questionnaire Application
 * A dynamic, step-by-step questionnaire with scoring capabilities
 */

// Variable to store the loaded font data
let hebFont = '';

// Load the Hebrew font
async function loadHebrewFont() {
    try {
        // Get font path from config if available, or use default
        const fontPath = window.questionnaireConfig?.fontPath || 'resources/FrankRuhlLibre.ttf';
        
        const response = await fetch(fontPath);
        if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
        
        const fontBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(fontBuffer);
        
        // Convert buffer to Base64 in chunks to prevent call stack overflow
        let binaryString = '';
        const CHUNK_SIZE = 8192; // Adjust if necessary
        for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
            binaryString += String.fromCharCode(...uint8Array.slice(i, i + CHUNK_SIZE));
        }
        hebFont = btoa(binaryString);
        console.log("Hebrew font loaded successfully");
    } catch (error) {
        console.error("Error loading Hebrew font:", error);
    }
}

class Questionnaire {
    constructor(config) {
        // Store configuration
        this.config = config;
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.userName = "";
        
        // Initialize DOM elements
        this.initializeElements();
        this.initializeEventListeners();
        
        // Setup the questionnaire
        this.setupQuestionnaire();
        
        // Set up custom font if provided
        this.setupFont();
        
        // Check for name/ID in URL
        this.checkUrlParams();
    }
    
    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Screens
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.questionScreen = document.getElementById('question-screen');
        this.resultsScreen = document.getElementById('results-screen');
        
        // Welcome screen elements
        this.questionnaireTitle = document.getElementById('questionnaire-title');
        this.instructionsElement = document.getElementById('instructions');
        this.userNameInput = document.getElementById('user-name');
        this.startButton = document.getElementById('start-btn');
        
        // Question screen elements
        this.progressBar = document.getElementById('progress-bar');
        this.currentQuestionElement = document.getElementById('current-question');
        this.totalQuestionsElement = document.getElementById('total-questions');
        this.questionTextElement = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-container');
        this.prevButton = document.getElementById('prev-btn');
        
        // Results screen elements
        this.finalScoreElement = document.getElementById('final-score');
        this.exportJsonButton = document.getElementById('export-json-btn');
        this.exportPdfButton = document.getElementById('export-pdf-btn');
        this.restartButton = document.getElementById('restart-btn');
    }
    
    /**
     * Set up event listeners
     */
    initializeEventListeners() {
        // Welcome screen
        this.startButton.addEventListener('click', () => this.startQuestionnaire());
        
        // Add event listener for Enter key on name input field
        this.userNameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission behavior
                this.startQuestionnaire();
            }
        });
        
        // Question navigation
        this.prevButton.addEventListener('click', () => this.navigateToPreviousQuestion());
        
        // Results screen actions
        this.exportJsonButton.addEventListener('click', () => this.exportAsJson());
        this.exportPdfButton.addEventListener('click', () => this.exportAsPdf());
        this.restartButton.addEventListener('click', () => this.restartQuestionnaire());
    }
    
    /**
     * Set up the questionnaire with the provided configuration
     */
    setupQuestionnaire() {
        // Set questionnaire title and instructions
        this.questionnaireTitle.textContent = this.config.title;
        this.instructionsElement.textContent = this.config.instructions;
        
        // Update question count
        this.totalQuestionsElement.textContent = this.config.questions.length;
        
        // Check for any previously saved results and clean up expired ones
        this.cleanupExpiredResults();
    }
    
    /**
     * Start the questionnaire when user clicks start button
     */
    startQuestionnaire() {
        // Validate user name
        if (!this.userNameInput.value.trim()) {
            alert('אנא הזן שם או מזהה');
            return;
        }
        
        // Store user name
        this.userName = this.userNameInput.value.trim();
        
        // Switch to question screen
        this.switchScreen(this.welcomeScreen, this.questionScreen);
        
        // Load first question
        this.showCurrentQuestion();
    }
    
    /**
     * Display the current question
     */
    showCurrentQuestion() {
        const question = this.config.questions[this.currentQuestionIndex];
        
        // Update progress indicators
        this.updateProgress();
        
        // Display question text
        this.questionTextElement.textContent = question.text;
        
        // Create options
        this.renderOptions(question);
        
        // Update navigation
        this.prevButton.style.visibility = this.currentQuestionIndex > 0 ? 'visible' : 'hidden';
    }
    
    /**
     * Render the options for the current question
     */
    renderOptions(question) {
        // Clear previous options
        this.optionsContainer.innerHTML = '';
        
        // Add each option
        this.config.responseOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option.label;
            
            // Check if this option was previously selected
            if (this.answers[question.id] !== undefined && 
                this.answers[question.id] === option.value) {
                optionElement.classList.add('selected');
            }
            
            // Add click event
            optionElement.addEventListener('click', () => this.selectOption(question, option));
            
            this.optionsContainer.appendChild(optionElement);
        });
    }
    
    /**
     * Handle option selection
     */
    selectOption(question, option) {
        // Save the answer
        this.answers[question.id] = option.value;
        
        // Auto-advance to next question or show results
        if (this.currentQuestionIndex < this.config.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showCurrentQuestion();
        } else {
            this.showResults();
        }
    }
    
    /**
     * Navigate to the previous question
     */
    navigateToPreviousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showCurrentQuestion();
        }
    }
    
    /**
     * Update progress indicators
     */
    updateProgress() {
        // Update question number
        this.currentQuestionElement.textContent = this.currentQuestionIndex + 1;
        
        // Update progress bar
        const progressPercentage = ((this.currentQuestionIndex) / this.config.questions.length) * 100;
        this.progressBar.style.width = `${progressPercentage}%`;
    }
    
    /**
     * Calculate the final score
     */
    calculateScore() {
        let totalScore = 0;
        
        this.config.questions.forEach(question => {
            if (this.answers[question.id] !== undefined) {
                let score = this.answers[question.id];
                
                // Apply reverse scoring if needed
                if (question.reverseScore) {
                    const maxValue = this.config.responseOptions.length - 1;
                    score = maxValue - score;
                }
                
                totalScore += score;
            }
        });
        
        return totalScore;
    }
    
    /**
     * Show the results screen
     */
    showResults() {
        // Calculate score
        const score = this.calculateScore();
        
        // Display score
        this.finalScoreElement.textContent = score;
        
        // Save results with 1-day expiration
        this.saveResults();
        
        // Switch to results screen
        this.switchScreen(this.questionScreen, this.resultsScreen);
    }
    
    /**
     * Export results as JSON
     */
    exportAsJson() {
        const results = {
            userName: this.userName,
            date: new Date().toISOString(),
            questionnaire: {
                title: this.config.title,
                scoringBase: this.config.scoringBase
            },
            rawAnswers: this.answers,
            score: this.calculateScore(),
            questionDetails: this.config.questions.map(question => {
                const rawAnswer = this.answers[question.id];
                let processedAnswer = rawAnswer;
                
                // Apply reverse scoring for display
                if (question.reverseScore) {
                    const maxValue = this.config.responseOptions.length - 1;
                    processedAnswer = maxValue - rawAnswer;
                }
                
                return {
                    id: question.id,
                    text: question.text,
                    answer: rawAnswer,
                    processedAnswer: processedAnswer,
                    reverseScored: question.reverseScore
                };
            })
        };
        
        // Create a JSON blob and download it
        const blob = new Blob([JSON.stringify(results, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `questionnaire_results_${this.userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Export results as PDF with professional layout and RTL support
     */
    exportAsPdf() {
        try {
            // Use jsPDF with RTL support
            const { jsPDF } = window.jspdf;
            
            // Create a new PDF document
            const doc = new jsPDF({
                orientation: 'p', 
                unit: 'mm',
                format: 'a4',
                putOnlyUsedFonts: true
            });
            
            // Add RTL support
            doc.setR2L(true);
            
            // Check if Hebrew font is loaded
            if (hebFont) {
                try {
                    // Add the Hebrew font to the PDF
                    doc.addFileToVFS('FrankRuhlLibre.ttf', hebFont);
                    doc.addFont('FrankRuhlLibre.ttf', 'FrankRuhlLibre', 'normal');
                    doc.setFont('FrankRuhlLibre');
                    console.log('Hebrew font applied to PDF');
                } catch (fontError) {
                    console.error('Error applying Hebrew font to PDF:', fontError);
                    // Fall back to default font
                    doc.setFont('helvetica');
                }
            } else {
                console.warn('Hebrew font not loaded yet, using default font');
                doc.setFont('helvetica');
            }
            
            // Set font size for title
            doc.setFontSize(18);
            
            // Add title
            doc.text(this.config.title, doc.internal.pageSize.width / 2, 20, { align: "center" });
            
            // Set smaller font size for details
            doc.setFontSize(12);
            
            // Current date in Hebrew format
            const currentDate = new Date();
            const hebrewDateOptions = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            const dateString = currentDate.toLocaleDateString('he-IL', hebrewDateOptions);
            
            // Calculate score
            const finalScore = this.calculateScore();
            
            // Add basic information - fixed RTL text order
            const nameIdLabel = "שם/מזהה: ";
            doc.text(nameIdLabel + this.userName, doc.internal.pageSize.width - 20, 35, { align: "right" });
            // Other info lines
            const dateLabel = "תאריך: ";
            const scoreLabel = "ציון כולל: ";
            doc.text(dateLabel + dateString, doc.internal.pageSize.width - 20, 42, { align: "right" });
            doc.text(scoreLabel + finalScore, doc.internal.pageSize.width - 20, 49, { align: "right" });
            
            // Prepare data for table
            const tableColumn = [
                { title: "תשובה", dataKey: "answer" },
                { title: "ציון", dataKey: "score" },
                { title: "שאלה", dataKey: "question" }
            ];
            
            // Create data rows for the table
            const tableRows = [];
            
            // Determine highest and second highest possible scores
            const options = this.config.responseOptions;
            const maxValue = Math.max(...options.map(option => option.value));
            const sortedValues = [...options.map(option => option.value)].sort((a, b) => b - a);
            const highestScore = sortedValues[0];
            const secondHighestScore = sortedValues[1];
            
            // Add rows to the table
            this.config.questions.forEach(question => {
                const rawAnswer = this.answers[question.id];
                let finalValue = rawAnswer;
                
                // Apply reverse scoring if needed
                if (question.reverseScore) {
                    finalValue = maxValue - rawAnswer;
                }
                
                // Find the label for the selected option
                const selectedOption = this.config.responseOptions.find(opt => opt.value === rawAnswer);
                
                // Prepare row data
                const row = {
                    question: question.text,
                    score: finalValue,
                    answer: selectedOption ? selectedOption.label : ""
                };
                
                // Add row to table data
                tableRows.push(row);
            });
            
            // Set color directly in the cell properties rather than using willDrawCell
            // Create the table with RTL support
            doc.autoTable({
                head: [tableColumn.map(col => col.title)],
                body: tableRows.map(row => {
                    // Format the row with color information already set
                    const score = row.score;
                    const scoreCell = {
                        content: score,
                        styles: {}
                    };
                    
                    // Apply coloring for high scores
                    if (score === highestScore) {
                        scoreCell.styles.fillColor = [255, 205, 210]; // Light red for highest
                    } else if (score === secondHighestScore) {
                        scoreCell.styles.fillColor = [255, 243, 224]; // Light orange for second highest
                    }
                    
                    return [row.answer, scoreCell, row.question];
                }),
                startY: 60,
                theme: 'grid',
                styles: {
                    font: doc.getFont().fontName, // Use the current font
                    halign: 'right',
                    textColor: [0, 0, 0],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [74, 109, 167],
                    textColor: [255, 255, 255]
                }
            });
            
            // Add legend for colors at the bottom with direct text for RTL
            const legendY = doc.previousAutoTable.finalY + 15;
            
            // Draw color boxes for legend
            doc.setFillColor(255, 205, 210); // Light red for highest score (danger)
            doc.rect(doc.internal.pageSize.width - 60, legendY, 5, 5, 'F');
            doc.setFillColor(255, 243, 224); // Light orange for second highest (warning)
            doc.rect(doc.internal.pageSize.width - 60, legendY + 10, 5, 5, 'F');
            
            // Add legend text with separate strings to prevent mixing RTL
            const highestScoreText = "ציון גבוה ביותר";
            const secondHighestText = "ציון שני הכי גבוה";
            doc.text(highestScoreText, doc.internal.pageSize.width - 65, legendY + 4, { align: "right" });
            doc.text(secondHighestText, doc.internal.pageSize.width - 65, legendY + 14, { align: "right" });
            
            // Add footer with date generated
            doc.setFontSize(8);
            doc.text(
                `הופק באמצעות מערכת השאלונים ${dateString}`, 
                doc.internal.pageSize.width / 2, 
                doc.internal.pageSize.height - 10, 
                { align: "center" }
            );
            
            // Get formatted date for filename (yyyy-mm-dd format)
            const today = new Date();
            const dateForFilename = today.toISOString().split('T')[0]; // yyyy-mm-dd format
            
            // Save the PDF with date in the filename
            doc.save(`שאלון_${this.userName.replace(/\s+/g, '_')}_${dateForFilename}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('אירעה שגיאה בעת יצירת ה-PDF. נסה שוב מאוחר יותר.');
        }
    }
    
    /**
     * Save the current questionnaire results to localStorage with 1-day expiration
     */
    saveResults() {
        // Create a results object
        const results = {
            userName: this.userName,
            date: new Date().toISOString(),
            questionnaire: {
                title: this.config.title,
                scoringBase: this.config.scoringBase
            },
            answers: this.answers,
            score: this.calculateScore(),
            // Add expiration timestamp - 24 hours from now
            expiresAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).getTime()
        };
        
        // Save to localStorage with the current date as part of the key
        const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
        const storageKey = `questionnaire_${today}_${this.userName.replace(/\s+/g, '_')}`;
        
        try {
            localStorage.setItem(storageKey, JSON.stringify(results));
            console.log('Results saved successfully. Will expire in 24 hours.');
        } catch (error) {
            console.error('Error saving results to localStorage:', error);
        }
        
        // Clean up expired results
        this.cleanupExpiredResults();
    }
    
    /**
     * Remove any expired results from localStorage
     */
    cleanupExpiredResults() {
        const now = new Date().getTime();
        
        // Loop through all localStorage items
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Check if this is a questionnaire result
            if (key && key.startsWith('questionnaire_')) {
                try {
                    const storedData = JSON.parse(localStorage.getItem(key));
                    
                    // Check if the data has an expiration and if it's expired
                    if (storedData.expiresAt && storedData.expiresAt < now) {
                        // Remove expired item
                        localStorage.removeItem(key);
                        console.log(`Removed expired results: ${key}`);
                    }
                } catch (error) {
                    console.error(`Error processing localStorage item ${key}:`, error);
                }
            }
        }
    }
    
    /**
     * Restart the questionnaire
     */
    restartQuestionnaire() {
        // Reset answers and current question
        this.answers = {};
        this.currentQuestionIndex = 0;
        
        // Go back to welcome screen
        this.switchScreen(this.resultsScreen, this.welcomeScreen);
    }
    
    /**
     * Check URL parameters for name/ID
     */
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const nameParam = urlParams.get('name') || urlParams.get('id');
        
        if (nameParam) {
            // Set the name input and auto-start if requested
            this.userNameInput.value = decodeURIComponent(nameParam);
            
            // Auto-start if autostart parameter is present
            if (urlParams.has('autostart')) {
                this.startQuestionnaire();
            }
        }
    }
    
    /**
     * Setup custom font based on configuration
     */
    setupFont() {
        if (this.config.fontFamily && this.config.fontPath) {
            const styleElement = document.getElementById('dynamic-font-style');
            
            // Update font-face definition with custom font info
            styleElement.innerHTML = `
                @font-face {
                    font-family: '${this.config.fontFamily}';
                    src: url('${this.config.fontPath}') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                }
            `;
            
            // Update CSS variable for font family
            document.documentElement.style.setProperty('--font-family', 
                `'${this.config.fontFamily}', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`);
        }
    }
    
    /**
     * Switch between screens with animation
     */
    switchScreen(currentScreen, nextScreen) {
        currentScreen.classList.remove('active');
        
        // Small delay for animation
        setTimeout(() => {
            nextScreen.classList.add('active');
        }, 300);
    }
}

// Initialize the questionnaire when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // First load the Hebrew font
    await loadHebrewFont();
    
    // Then initialize the questionnaire
    const questionnaire = new Questionnaire(questionnaireConfig);
});
