import os
import zipfile
import sys
import shutil

def find_and_unzip(search_string):
    # Find the zip file in the script's root directory
    zip_file = None
    for file in os.listdir():
        if file.endswith('.zip'):
            zip_file = file
            break
    
    if not zip_file:
        print("No zip file found in the directory.")
        return

    # Unzip the file
    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall("extracted_files")

    # Ensure target directory exists
    target_directory = "target_files"
    if not os.path.exists(target_directory):
        os.makedirs(target_directory)

    # Recursively search for the substring in the extracted files and copy matches
    def search_files(directory):
        for root, _, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                with open(file_path, 'r', errors='ignore') as f:
                    if search_string in f.read():
                        print(f"Found '{search_string}' in {file_path}")
                        if '\\tests\\' not in file_path:
                            shutil.copy(file_path, target_directory)

    search_files("extracted_files")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py [search_string]")
        sys.exit(1)

    search_string = sys.argv[1]
    find_and_unzip(search_string)
