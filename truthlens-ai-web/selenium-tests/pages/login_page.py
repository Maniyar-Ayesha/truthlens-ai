from selenium.webdriver.common.by import By
from .base_page import BasePage

class LoginPage(BasePage):
    URL = "http://localhost:3000/login"

    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password']")
    SUBMIT_BUTTON = (By.XPATH, "//button[contains(text(), 'Login')]")
    DASHBOARD_HEADER = (By.XPATH, "//h1[contains(text(), 'Dashboard') or contains(text(), 'Analytics')]")
    ERROR_MSG = (By.CSS_SELECTOR, ".text-red-500")

    def __init__(self, driver):
        super().__init__(driver)

    def load(self):
        self.go_to(self.URL)

    def login(self, email, password):
        self.send_keys(self.EMAIL_INPUT, email)
        self.send_keys(self.PASSWORD_INPUT, password)
        self.click(self.SUBMIT_BUTTON)

    def is_dashboard_loaded(self):
        return self.is_visible(self.DASHBOARD_HEADER)

    def get_error_message(self):
        if self.is_visible(self.ERROR_MSG):
            return self.get_text(self.ERROR_MSG)
        return ""
