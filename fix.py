import os
import re

# Extensions for files to scan and image file types
SCAN_EXTS = ('.html', '.md', '.js')
IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4')

# Regex to match references like "images/filename.ext"
pattern = re.compile(r'images/([\w\-.]+?\.(?:jpg|jpeg|png|gif|webp|mp4))', re.I)

def collect_references(root_dir):
    """
    Walks through the workspace and collects all file names (in the images folder) referenced
    in Markdown, HTML, and JavaScript files.
    """
    referenced = set()
    for dirpath, _, files in os.walk(root_dir):
        for file in files:
            if file.lower().endswith(SCAN_EXTS):
                filepath = os.path.join(dirpath, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = pattern.findall(content)
                        for m in matches:
                            referenced.add(m)
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    return referenced

def find_image_files(images_dir):
    """
    Lists all image, gif, and video files in the images folder.
    """
    image_files = set()
    for file in os.listdir(images_dir):
        if file.lower().endswith(IMAGE_EXTS):
            image_files.add(file)
    return image_files

def remove_unused_images(workspace_root, images_dir):
    """
    Deletes image files in images_dir that are not referenced in any scanned files.
    """
    referenced = collect_references(workspace_root)
    all_images = find_image_files(images_dir)

    print("Referenced image files:", referenced)
    print("All images found:", all_images)

    unused = all_images - referenced
    print("Unused images to be removed:", unused)

    for image in unused:
        image_path = os.path.join(images_dir, image)
        try:
            os.remove(image_path)
            print(f"Removed {image_path}")
        except Exception as e:
            print(f"Failed to remove {image_path}: {e}")

if __name__ == '__main__':
    # Set the workspace root (assumes this script is at the root level)
    workspace_root = os.getcwd()
    images_folder = os.path.join(workspace_root, 'images')
    
    if not os.path.isdir(images_folder):
        print(f"Images folder not found at {images_folder}")
    else:
        remove_unused_images(workspace_root, images_folder)