export default class LanguagePicker {
    
    constructor({ languages, languageSelector }, translationService) {
        this.elements = languages
        this.languageSelector = languageSelector

        this.translationService = translationService
    }

    init() {
        
        this.elements.en.addEventListener("click", this.translationService.updateLanguage.bind(this, "en"));
        this.elements.zh.addEventListener("click", this.translationService.updateLanguage.bind(this, "zh"));
        this.elements.ja.addEventListener("click", this.translationService.updateLanguage.bind(this, "ja"));
        this.elements.es.addEventListener("click", this.translationService.updateLanguage.bind(this, "es"));
      
        // Create a function to show the language selector options.
        const showLanguageOptions = (function () {
            this.languageSelector.className = "fixed-action-btn active";
        }).bind(this);

        // Create a function to hide the language selector options.
        const hideLanguageOptions = (function () {
            this.languageSelector.className = "fixed-action-btn";
        }).bind(this);

        // Add mouse over and mouse out events.
        this.languageSelector.addEventListener("mouseover", showLanguageOptions);
        this.languageSelector.addEventListener("mouseout", hideLanguageOptions);   
    }
}