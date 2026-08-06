import pytest
from pages.news_page import NewsPage

def test_news_empty_input(driver):
    news_page = NewsPage(driver)
    news_page.load()
    news_page.select_news_tab()
    # Clicking analyze without entering text shouldn't navigate away usually, 
    # or should show a toast error
    news_page.analyze_text("")
    # It should not reach the Result page
    from selenium.common.exceptions import TimeoutException
    try:
        pred = news_page.get_prediction()
        assert False, "Should not reach result page with empty input"
    except TimeoutException:
        assert True
