/**
 * Likert Questionnaire Web App
 * This JS module dynamically generates Likert-type questionnaires in Hebrew,
 * calculates scores, and generates a downloadable PDF report.
 *
 * Author: [Your Name]
 */

/**
 * Load Hebrew Font for PDF
 */

let hebFont = '';
(async () => {
    try {
        const response = await fetch('./FrankRuhlLibre.ttf');
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
        console.log("Font loaded successfully:", hebFont);
    } catch (error) {
        console.error("Error loading font:", error);
    }
})();



class LikertQuestionnaire {
    constructor(containerId, questionnaireData) {
        this.container = document.getElementById(containerId);
        this.data = questionnaireData;
        this.responses = new Array(this.data.questions.length).fill(null);
        this.init();
    }

    init() {
        this.renderForm();
    }

    renderForm() {
        this.container.innerHTML = '';

        // Personal Identifier Input
        const identifierLabel = document.createElement('label');
        identifierLabel.textContent = "מספר אישי:";
        const identifierInput = document.createElement('input');
        identifierInput.type = 'text';
        identifierInput.id = 'personalIdentifier';

        this.container.appendChild(identifierLabel);
        this.container.appendChild(identifierInput);

        // PDF Title Input
        const titleLabel = document.createElement('label');
        titleLabel.textContent = "כותרת הדוח:";
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = 'pdfTitle';

        this.container.appendChild(titleLabel);
        this.container.appendChild(titleInput);

        // Questions List
        this.data.questions.forEach((question, qIndex) => {
            const questionWrapper = document.createElement('div');
            questionWrapper.classList.add('question-wrapper');

            const questionText = document.createElement('p');
            questionText.textContent = question.text;
            questionWrapper.appendChild(questionText);

            this.data.options.forEach((option, oIndex) => {
                const optionWrapper = document.createElement('div');
                optionWrapper.classList.add('option-wrapper');

                const button = document.createElement('button');
                button.textContent = option;
                button.classList.add('option-button');
                button.addEventListener('click', () => {
                    this.responses[qIndex] = this.data.startFromZero ? oIndex : oIndex + 1;
                    this.highlightSelection(questionWrapper, button);
                });

                optionWrapper.appendChild(button);
                questionWrapper.appendChild(optionWrapper);
            });

            this.container.appendChild(questionWrapper);
        });

        // Submit Button
        const SUBMIT_BUTTON_TEXT = "הורדת דוח PDF";
        const submitButton = document.createElement('button');
        submitButton.textContent = SUBMIT_BUTTON_TEXT;
        submitButton.addEventListener('click', () => this.generatePDF());
        this.container.appendChild(submitButton);
    }

    highlightSelection(questionWrapper, selectedButton) {
        questionWrapper.querySelectorAll('.option-button').forEach(button => {
            button.classList.remove('selected');
        });
        selectedButton.classList.add('selected');
    }

    async generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        function reverseHebrewText(text) {
            return text.split('').reverse().join('');
        }

        // Load embedded Hebrew font (FrankRuhlLibre from hebFont variable)
        doc.addFileToVFS('FrankRuhlLibre.ttf', hebFont);
        doc.addFont('FrankRuhlLibre.ttf', 'FrankRuhlLibre', 'normal');
        doc.setFont('FrankRuhlLibre');
        
        // PDF Title and Meta Information
        const identifier = document.getElementById('personalIdentifier').value;
        const pdfTitle = document.getElementById('pdfTitle').value || "שאלון פסיכולוגי";
        const date = new Date().toLocaleDateString();

        doc.text(reverseHebrewText(pdfTitle), 105, 20, { align: "center" });
        doc.text(reverseHebrewText(`שם: ${identifier}`), 150, 30, { align: "right" });
        doc.text(reverseHebrewText(`תאריך: ${date}`), 150, 40, { align: "right" });

        // Prepare Table Data
        let tableData = [];
        let maxScore = this.data.options.length;
        let secondMaxScore = maxScore - 1;

        this.data.questions.forEach((question, qIndex) => {
            const response = this.responses[qIndex];
            if (response === null) return;

            let rowData = [response.toString(), reverseHebrewText(question.text)];

            tableData.push({
                data: rowData
            });
        });

        // Create Table in PDF
        doc.autoTable({
            head: [["הבושת", "הלאש"]],
            body: tableData.map(row => row.data),
            theme: "striped",
            startY: 50,
            styles: { font: "FrankRuhlLibre", fontStyle: "normal", halign: "right" }, // Align RTL
            columnStyles: { 0: { halign: "center" }, 1: { halign: "right" } },

            headStyles: { fillColor: [0, 0, 128], textColor: [255, 255, 255] },
            bodyStyles: tableData.map(row => row.styles),
            didParseCell: function (data) {
                if (data.section !== "body") return;
                
                const rowIndex = data.row.index;
                const score = parseInt(tableData[rowIndex].data[0]);
                // Apply colors to specific rows
                if (score === maxScore) {
                    data.cell.styles.fillColor = [255, 204, 203]; // Dull Red for highest score
                } else if (score === secondMaxScore && score>1) {
                    data.cell.styles.fillColor = [255, 249, 196]; // Dull Yellow for second-highest
                }
                
            }
            
        });

        // Save the PDF
        doc.save("questionnaire.pdf");
    }
}

// Example Usage
const exampleData = {
    startFromZero: false,
    options: ["מעט מאוד", "בינוני", "מאוד"],
    questions: [
        { text: "כמה אתה מרגיש שמח היום?" },
        { text: "כמה אתה חש מוטיבציה?" },
        { text: "כמה אתה עייף?" }
    ]
};

window.onload = () => {
    window.a = new LikertQuestionnaire('questionnaire-container', exampleData);
    
};
