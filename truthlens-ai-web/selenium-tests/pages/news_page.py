from selenium.webdriver.common.by import By
from .base_page import BasePage

class NewsPage(BasePage):
    URL = "http://localhost:3000/"

    NEWS_TAB = (By.XPATH, "//button[contains(text(), 'News')]")
    TEXT_AREA = (By.TAG_NAME, "textarea")
    ANALYZE_BTN = (By.XPATH, "//button[contains(text(), 'Analyze')]")
    RESULT_PREDICTION = (By.CSS_SELECTOR, ".text-4xl.font-bold") # Result prediction text
    
    def __init__(self, driver):
        super().__init__(driver)

    def load(self):
        self.go_to(self.URL)

    def select_news_tab(self):
        self.click(self.NEWS_TAB)

    def analyze_text(self, text):
        self.send_keys(self.TEXT_AREA, text)
        self.click(self.ANALYZE_BTN)

    def get_prediction(self):
        # Result page loads, wait for the prediction text
        return self.get_text(self.RESULT_PREDICTION)
