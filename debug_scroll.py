from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        url = "http://localhost:20265"
        print(f"Navigating to {url}")
        try:
            page.goto(url, timeout=60000)
            page.wait_for_load_state('networkidle')
            time.sleep(2)  # Wait for initial animations
            
            # Take screenshot at top
            page.screenshot(path="debug_0_top.png")
            print("Captured top screenshot")
            
            # Get total scroll height
            total_height = page.evaluate("document.body.scrollHeight")
            viewport_height = page.viewport_size['height']
            print(f"Total height: {total_height}, Viewport height: {viewport_height}")
            
            # Scroll in 5 steps
            for i in range(1, 6):
                scroll_pos = (total_height - viewport_height) * (i / 5)
                page.evaluate(f"window.scrollTo(0, {scroll_pos})")
                time.sleep(1)  # Wait for GSAP scrub
                page.screenshot(path=f"debug_{i}_scroll.png")
                print(f"Captured scroll step {i} at {scroll_pos}")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
