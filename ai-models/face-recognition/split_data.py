# split_data.py
import glob, random, shutil, os

images = sorted(glob.glob("images/*.jpg"))
if len(images) < 2:
    raise SystemExit('At least two labeled JPEGs are required under images/.')
for image in images:
    if not os.path.isfile(f"labels/{os.path.splitext(os.path.basename(image))[0]}.txt"):
        raise SystemExit('Missing annotation; use an explicit empty label for a negative example.')
if os.path.exists('dataset'):
    raise SystemExit('Use a new dataset directory to avoid stale train/validation files.')
random.Random(42).shuffle(images)
for kind in ['images', 'labels']:
    for split in ['train', 'val']:
        os.makedirs(f'dataset/{kind}/{split}', exist_ok=True)

split_idx = int(len(images) * 0.8)  # 80% train, 20% val
train_imgs = images[:split_idx]
val_imgs = images[split_idx:]

def move_files(img_list, split):
    for img_path in img_list:
        name = os.path.basename(img_path).replace(".jpg", "")
        shutil.copy(img_path, f"dataset/images/{split}/{name}.jpg")
        label_path = f"labels/{name}.txt"
        if os.path.exists(label_path):
            shutil.copy(label_path, f"dataset/labels/{split}/{name}.txt")

move_files(train_imgs, "train")
move_files(val_imgs, "val")

print(f"Train: {len(train_imgs)}, Val: {len(val_imgs)}")
