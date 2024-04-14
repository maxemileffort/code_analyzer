from flask import Flask, request, jsonify
from openai import OpenAI
import os

app = Flask(__name__)
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Placeholder for your assistant and file id storage
assistant_id = "your-assistant-id"
file_ids = []

@app.route('/upload', methods=['POST'])
def upload_files_and_issue():
    # Check if the post request has the file part
    if 'files' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    
    files = request.files.getlist('files')
    issue_text = request.form['issueText']
    
    # Save files and prepare file_ids for use with the assistant
    uploaded_file_ids = []
    for file in files:
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Assuming files need to be saved and sent to OpenAI
        path = os.path.join('/path/to/save', file.filename)
        file.save(path)
        
        # Create a file object with OpenAI (pseudo-code)
        file_object = client.files.create(
            file=open(path, "rb"),
            purpose='assistants'
        )
        uploaded_file_ids.append(file_object.id)
    
    # Store file ids if necessary or directly use them for a one-time operation
    global file_ids
    file_ids = uploaded_file_ids

    # Create a thread to process the issue text and files
    thread = client.beta.threads.create(
        messages=[
            {
                "role": "user",
                "content": issue_text,
                "file_ids": uploaded_file_ids
            }
        ]
    )

    # Run the assistant
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant_id,
        model="gpt-4-turbo",
        instructions="Analyze the GitHub issue and provide solutions based on the uploaded code files.",
        tools=[{"type": "code_interpreter"}, {"type": "retrieval"}]
    )

    # Fetch the results (pseudo-code, synchronous for simplicity)
    results = client.beta.threads.messages.list(thread_id=thread.id)

    # Return results to client
    return jsonify({'analysis': results.messages[-1].content}), 200

if __name__ == '__main__':
    app.run(debug=True)
