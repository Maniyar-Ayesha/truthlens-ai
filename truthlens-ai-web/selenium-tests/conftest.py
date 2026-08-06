import pytest
import os
from datetime import datetime
from utils.base_driver import get_driver

@pytest.fixture(scope="session")
def browser():
    return "chrome"

@pytest.fixture(scope="function")
def driver(browser):
    _driver = get_driver(browser)
    yield _driver
    _driver.quit()

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    pytest_html = item.config.pluginmanager.getplugin("html")
    outcome = yield
    report = outcome.get_result()
    extras = getattr(report, "extras", [])

    if report.when == "call":
        feature_request = item.funcargs.get("request", None)
        if report.failed and feature_request:
            driver = feature_request.getfixturevalue("driver")
            os.makedirs("reports/screenshots", exist_ok=True)
            screenshot_name = f"reports/screenshots/{item.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            driver.save_screenshot(screenshot_name)
            if pytest_html:
                # add screenshot to HTML report
                html = f'<div><img src="screenshots/{os.path.basename(screenshot_name)}" alt="screenshot" style="width:600px;height:auto;" onclick="window.open(this.src)" align="right"/></div>'
                extras.append(pytest_html.extras.html(html))
        report.extras = extras
