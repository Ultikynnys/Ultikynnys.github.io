import os

def update_index_files(root_dir):
    target_files = ["index.html", "programming-portfolio.html", "3d-portfolio.html"]
    # New footer fetching snippet that evaluates inline scripts
    new_footer_fetch = (
        "fetch('footer.html')\n"
        "  .then(response => response.text())\n"
        "  .then(html => {\n"
        "    const container = document.getElementById('footer-container');\n"
        "    container.innerHTML = html;\n"
        "    container.querySelectorAll('script').forEach(oldScript => {\n"
        "      const newScript = document.createElement('script');\n"
        "      newScript.textContent = oldScript.textContent;\n"
        "      document.body.appendChild(newScript);\n"
        "    });\n"
        "  })\n"
        "  .catch(error => console.error('Failed to load footer:', error));"
    )

    for file_name in target_files:
        file_path = os.path.join(root_dir, file_name)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            if "fetch('footer.html')" in content:
                # Replace the original fetch snippet with the new snippet
                # Assumption: the previous snippet starts at the fetch call and ends at the .catch block.
                # We perform a simple string replace.
                # Adjust the marker text below if your original snippet differs.
                start_marker = "fetch('footer.html')"
                end_marker = ".catch(error => console.error('Failed to load footer:', error));"
                # Find the block to be replaced
                start_index = content.find(start_marker)
                end_index = content.find(end_marker, start_index)
                if start_index != -1 and end_index != -1:
                    end_index += len(end_marker)
                    old_snippet = content[start_index:end_index]
                    new_content = content.replace(old_snippet, new_footer_fetch)
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated footer fetch in {file_path}")
                else:
                    print(f"Could not locate complete footer fetch snippet in {file_path}")
            else:
                print(f"No footer fetch snippet found in {file_path}.")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    # Change root_dir as needed; here we use the current working directory
    root_dir = os.getcwd()
    update_index_files(root_dir)