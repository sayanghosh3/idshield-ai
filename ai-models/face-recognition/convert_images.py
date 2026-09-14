# convert_images.py
from PIL import Image
import glob, os

os.makedirs("images", exist_ok=True)

TARGET_TOTAL = 600

# Group tif files by their parent document folder
folders = glob.glob("raw_data/*/")
print(f"Found {len(folders)} document folders")
if not folders:
    raise SystemExit('No document folders found under raw_data; nothing to convert.')

images_per_folder = max(1, TARGET_TOTAL // len(folders))
print(f"Taking ~{images_per_folder} images per folder to reach ~{TARGET_TOTAL} total")

converted = 0

for folder in folders:
    tif_files = sorted(glob.glob(os.path.join(folder, "**/*.tif"), recursive=True))
    if not tif_files:
        continue

    # evenly spaced sampling across this folder's frames
    step = max(1, len(tif_files) // images_per_folder)
    sampled = tif_files[::step][:images_per_folder]

    for tif_path in sampled:
        rel_path = os.path.relpath(tif_path, "raw_data")
        safe_name = rel_path.replace(os.sep, "_").replace(".tif", ".jpg")
        out_path = os.path.join("images", safe_name)

        if os.path.exists(out_path):
            continue

        try:
            img = Image.open(tif_path).convert("RGB")
            img.save(out_path, quality=95)
            converted += 1
        except Exception as e:
            print(f"Failed on {tif_path}: {e}")

print(f"Done converting. Total converted: {converted}")
