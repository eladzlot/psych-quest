# Questionnaire Web Application Specification

## 1. Overview

The Questionnaire Web Application is a responsive single-page application designed for administering Likert-scale questionnaires. The application displays one question at a time, collects user responses, calculates scores, and generates detailed reports. It fully supports right-to-left languages (specifically Hebrew) and provides data export capabilities in multiple formats.

## 2. Application Structure

### 2.1 File Organization

```
/
├── index.html                # Main HTML document
├── resources/
│   ├── styles.css            # CSS stylesheet
│   ├── questionnaire.js      # Application logic
│   └── FrankRuhlLibre.ttf    # Hebrew font file
```

### 2.2 External Dependencies

- **jsPDF** (v2.5.1+): PDF generation library
- **jsPDF-AutoTable** (v3.5.28+): Table generation plugin for jsPDF

## 3. Core Features

### 3.1 User Interface

1. **Three-Screen Flow**:
   - Welcome screen with instructions and name/ID input
   - Question screen showing one question at a time
   - Results screen displaying the final score and export options

2. **Navigation**:
   - Automatic advancement to the next question upon answer selection
   - Back button to review/modify previous answers
   - Progress bar showing completion percentage

3. **Responsive Design**:
   - Support for mobile, tablet, and desktop screens
   - Appropriate layout adjustments based on screen size

### 3.2 Questionnaire Configuration

The application is initialized using a configuration object with the following structure:

```javascript
const questionnaireConfig = {
    // Basic information
    title: "שאלון דוגמה",
    instructions: "אנא ענה/י על השאלות הבאות בכנות...",
    
    // Styling configuration
    fontFamily: 'HebrewFont',
    fontPath: 'resources/FrankRuhlLibre.ttf',
    
    // Scoring configuration
    scoringBase: 0,  // 0-based (0-4) or 1-based (1-5)
    
    // Response options (same for all questions)
    responseOptions: [
        { value: 0, label: "מאוד לא מסכימ/ה" },
        { value: 1, label: "לא מסכימ/ה" },
        { value: 2, label: "ניטרלי" },
        { value: 3, label: "מסכימ/ה" },
        { value: 4, label: "מאוד מסכימ/ה" }
    ],
    
    // Questions array
    questions: [
        {
            id: "q1",
            text: "אני מרגיש/ה שאני יכול/ה להשיג את המטרות שלי.",
            reverseScore: false
        },
        {
            id: "q2",
            text: "אני מרגיש/ה לחץ רב במהלך היום.",
            reverseScore: true
        },
        // Additional questions...
    ]
}
```

### 3.3 Scoring System

1. **Score Calculation**:
   - Sum of all question responses
   - Support for 0-based (0-4) or 1-based (1-5) scoring
   - Support for reverse-scored questions

2. **Reverse Scoring**:
   - For questions marked with `reverseScore: true`
   - Automatically inverts the score (e.g., 0→4, 1→3, 2→2, 3→1, 4→0)

### 3.4 Data Export

1. **JSON Export**:
   - Includes all questionnaire data:
     - User information
     - Date and time
     - Questions and responses
     - Calculated scores
   - Downloaded as a file named `questionnaire_results_[USERNAME]_[DATE].json`

2. **PDF Export**:
   - Professional layout with RTL support
   - Includes:
     - Title and user information
     - Date and time of completion
     - Total score
     - Table of questions and answers
     - Color-coded highlighting for highest scores
   - Embedded JSON metadata for programmatic extraction
   - Downloaded as a file named `שאלון_[USERNAME]_[DATE].pdf`

3. **Data Persistence**:
   - Results saved to localStorage with 24-hour expiration
   - Automatic cleanup of expired data

## 4. Technical Implementation

### 4.1 URL Parameters

The application supports the following URL parameters:

| Parameter   | Description                                                 | Example                          |
|-------------|-------------------------------------------------------------|----------------------------------|
| `name` or `id` | Pre-fills the name/ID field with the provided value     | `?name=דוד`                      |
| `autostart` | Automatically starts the questionnaire after loading        | `?id=12345&autostart=true`       |

### 4.2 Hebrew Language Support

1. **Font Integration**:
   - Custom Hebrew font (Frank Ruhl Libre) loaded dynamically
   - CSS variables for font consistency throughout the application
   - Font configurable via the questionnaire settings

2. **RTL Text Handling**:
   - Direction set to RTL for proper Hebrew text display
   - Special handling for mixed content (Hebrew and numbers)
   - PDF generation with proper RTL text support

### 4.3 PDF Generation

1. **Visual Elements**:
   - Professional layout with title, user info, and date
   - Table of questions with answers and scores
   - Color highlights for highest scores (red) and second-highest scores (orange)
   - Legend explaining the color coding

2. **Technical Features**:
   - Hebrew font embedding in the PDF
   - RTL text direction support
   - Embedded JSON metadata for data extraction
   - Dated filename for easy organization

### 4.4 Data Extraction (R Integration)

The application provides functionality for extracting data from multiple PDF files using R:

1. **R Script Features**:
   - Reads all PDF files in a specified folder
   - Extracts embedded JSON metadata
   - Creates a dataframe with user IDs and question responses
   - Exports data to CSV for further analysis

2. **Required R Packages**:
   - pdftools
   - jsonlite
   - dplyr
   - tidyr
   - stringr

## 5. Accessibility and Usability

### 5.1 Accessibility Features

1. **Keyboard Navigation**:
   - Enter key to submit name/ID
   - Navigation between questions with keyboard
   - Focus management for form elements

2. **Visual Feedback**:
   - Clear indication of selected answers
   - Progress visualization
   - Error messaging for validation

### 5.2 Error Handling

1. **Form Validation**:
   - Required name/ID field
   - Prevention of form submission without data

2. **Robust Error Recovery**:
   - Graceful degradation when fonts cannot be loaded
   - Fallback to system fonts when necessary
   - Error alerts for PDF generation failures

## 6. Class Structure

The application uses an object-oriented approach with a primary `Questionnaire` class:

### 6.1 Key Methods

| Method                   | Description                                               |
|--------------------------|-----------------------------------------------------------|
| `constructor(config)`    | Initializes the questionnaire with the provided config    |
| `setupQuestionnaire()`   | Sets up the questionnaire UI elements                     |
| `startQuestionnaire()`   | Begins the questionnaire flow                             |
| `showCurrentQuestion()`  | Displays the current question                             |
| `selectOption()`         | Handles user selection and advances                       |
| `calculateScore()`       | Calculates the total score with reverse scoring logic     |
| `showResults()`          | Displays the results screen with final score              |
| `exportAsJson()`         | Exports results as JSON file                              |
| `exportAsPdf()`          | Generates and downloads a PDF report                      |
| `saveResults()`          | Saves results to localStorage with 24hr expiration        |
| `cleanupExpiredResults()`| Removes any expired results from localStorage             |

## 7. Extension Points

The application is designed with the following extension points:

1. **Additional Export Formats**:
   - Structure allows for adding new export formats
   - Metadata already collected for various output options

2. **Custom Scoring Algorithms**:
   - The scoring system can be extended to support weighted questions
   - Additional calculation methods can be added

3. **Multi-language Support**:
   - The font and RTL handling can be adapted for other languages
   - Configuration structure allows for language-specific settings

## 8. Browser Compatibility

The application is designed to work on:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

Mobile browser support includes:
- Safari on iOS (latest 2 versions)
- Chrome on Android (latest 2 versions)

## 9. Performance Considerations

1. **Font Loading Optimization**:
   - Asynchronous font loading to prevent blocking
   - Font caching for repeat visits

2. **PDF Generation**:
   - Optimized cell rendering for large questionnaires
   - Memory-efficient handling of embedded metadata

3. **Data Storage**:
   - Automatic cleanup of expired localStorage data
   - Efficient JSON serialization for saved responses

## Appendix A: Sample R Code for Data Extraction

```r
# Function to extract data from questionnaire PDFs
extract_questionnaire_data <- function(folder_path) {
  # List all PDF files in the folder
  pdf_files <- list.files(path = folder_path, pattern = "\\.pdf$", full.names = TRUE)
  
  # Process each PDF file
  all_data <- list()
  for (pdf_file in pdf_files) {
    tryCatch({
      # Extract PDF metadata which contains our JSON
      pdf_info <- pdf_info(pdf_file)
      
      # Parse the JSON data from the customData field
      if (!is.null(pdf_info$keys$customData)) {
        json_data <- fromJSON(pdf_info$keys$customData)
        
        # Extract relevant data and add to results
        # ... [data extraction code]
      }
    }, error = function(e) {
      warning(paste("Error processing", basename(pdf_file), ":", e$message))
    })
  }
  
  # Convert to dataframe and return
  result_df <- bind_rows(lapply(all_data, as.data.frame))
  return(result_df)
}
```
