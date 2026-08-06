import sys
import json
import os
import cv2
import numpy as np
from PIL import Image

image_path = sys.argv[1]

def run_ela(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGB")
        img.save("/tmp/ela_temp.png", quality=90)

        temp_img = Image.open("/tmp/ela_temp.png")
        original = np.array(img).astype(float)
        temp = np.array(temp_img).astype(float)

        diff = np.abs(original - temp)
        diff = np.mean(diff, axis=2)

        ela_score = np.mean(diff)
        ela_map = (diff * 255 / (np.max(diff) + 1e-6)).astype(np.uint8)

        manipulated_regions = []
        if ela_score > 10:
            manipulated_regions.append("High error level variation detected")
        if np.max(diff) > 30:
            manipulated_regions.append("Localized high-error regions found")

        heatmap_url = None

        return {
            "ela_score": round(float(ela_score), 2),
            "manipulated_regions": manipulated_regions,
            "heatmap_url": heatmap_url,
            "points": [
                f"ELA score: {ela_score:.2f}",
                f"Max error: {np.max(diff):.2f}",
                f"Manipulated regions: {len(manipulated_regions)}",
            ],
        }
    except Exception as e:
        return {
            "ela_score": 0,
            "manipulated_regions": [],
            "heatmap_url": None,
            "points": [f"ELA analysis failed: {str(e)}"],
        }

if __name__ == "__main__":
    try:
        result = run_ela(image_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "ela_score": 0,
            "manipulated_regions": [],
            "heatmap_url": None,
            "points": [f"Error: {str(e)}"],
        }))