from selenium import webdriver

def get_driver(browser_name="chrome"):
    if browser_name.lower() == "chrome":
        options = webdriver.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--ignore-certificate-errors")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        driver = webdriver.Chrome(options=options)
    elif browser_name.lower() == "firefox":
        options = webdriver.FirefoxOptions()
        options.add_argument("--headless")
        driver = webdriver.Firefox(options=options)
    elif browser_name.lower() == "edge":
        options = webdriver.EdgeOptions()
        options.add_argument("--headless")
        driver = webdriver.Edge(options=options)
    else:
        raise ValueError(f"Browser {browser_name} not supported")
        
    driver.implicitly_wait(10)
    return driver
