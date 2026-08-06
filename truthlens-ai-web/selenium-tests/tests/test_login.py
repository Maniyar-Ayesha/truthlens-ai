import pytest
from pages.login_page import LoginPage

def test_invalid_login(driver):
    login_page = LoginPage(driver)
    login_page.load()
    login_page.login("wrong@example.com", "wrongpassword")
    # We expect some error or not to be redirected
    assert login_page.is_dashboard_loaded() == False

def test_empty_credentials(driver):
    login_page = LoginPage(driver)
    login_page.load()
    login_page.login("", "")
    assert login_page.is_dashboard_loaded() == False
