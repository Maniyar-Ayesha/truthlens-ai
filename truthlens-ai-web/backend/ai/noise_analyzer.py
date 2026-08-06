import sys
import json
import os
import cv2
import numpy as np

image_path = sys.argv[1]

def analyze_noise(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None:
            return {"noise_level": 0, "noise_uniformity": 0.5, "is_uniform_noise": True, "manipulated_regions": [], "points": ["Could not load image"]}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        noise = cv2.GaussianBlur(gray, (5, 5), 0) - gray
        noise_level = np.std(noise)

        noise_uniformity = 1.0 - (np.std(np.abs(noise)) / (noise_level + 1e-6))

        is_uniform_noise = noise_uniformity > 0.7

        manipulated_regions = []
        if noise_level > 30:
            manipulated_regions.append("High noise level detected")
        if is_uniform_noise:
            manipulated_regions.append("Uniform noise pattern (suspicious)")

        return {
            "noise_level": round(float(noise_level), 2),
            "noise_uniformity": round(float(noise_uniformity), 2),
            "is_uniform_noise": is_uniform_noise,
            "manipulated_regions": manipulated_regions,
            "points": [
                f"Noise level: {noise_level:.2f}",
                f"Noise uniformity: {noise_uniformity:.2f}",
                f"Uniform noise: {'Yes' if is_uniform_noise else 'No'}",
                f"Manipulated regions: {len(manipulated_regions)}",
            ],
        }
    except Exception as e:
        return {
            "noise_level": 0,
            "noise_uniformity": 0.5,
            "is_uniform_noise": True,
            "manipulated_regions": [],
            "points": [f"Noise analysis failed: {str(e)}"],
        }

if __name__ == "__main__":
    try:
        result = analyze_noise(image_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "noise_level": 0,
            "noise_uniformity": 0.5,
            "is_uniform_noise": True,
            "manipulated_regions": [],
            "points": [f"Error: {str(e)}"],
        }))