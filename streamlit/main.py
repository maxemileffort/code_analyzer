import streamlit as st

import requests
import json

# Assuming 'conversationContext' and other states are stored globally if needed across reruns
if 'conversationContext' not in st.session_state:
    st.session_state['conversationContext'] = []
if 'codeChunks' not in st.session_state:
    st.session_state['codeChunks'] = []

# Constants
API_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-3.5-turbo"

def get_system_prompt():
    systemPrompt = (
        "You are an amazing web and app developer. "
        "Your specialty is in React and React Native. Many developers "
        "regard your ability to troubleshoot issues as unmatched."
    )
    return systemPrompt

def check_and_truncate(conversationArray):
    joined_context = " ".join([item['content'] for item in conversationArray])
    if len(joined_context) > 25000:
        conversationArray.pop(0)
    return conversationArray

def build_payload(model, msgs):
    return json.dumps({
        "model": model,
        "messages": msgs
    })

def send_payload(data):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {st.session_state["api_key"]}'
    }
    response = requests.post(API_URL, headers=headers, data=data)
    if response.status_code == 200:
        return response.json()['choices'][0]['message']['content']
    else:
        return f"HTTP error! Status: {response.status_code}"

def process_interaction(issue_text):
    system_prompt = get_system_prompt()
    st.session_state['conversationContext'].append({'role': 'system', 'content': system_prompt})

    issue_prompt = f"I have found an issue on Github that could use your expertise.\n{issue_text}\nNow I will send you some code so that we can find the part that is likely causing the issue mentioned above. Please let me know if you are ready."
    st.session_state['conversationContext'].append({'role': 'user', 'content': issue_prompt})

    st.session_state['conversationContext'] = check_and_truncate(st.session_state['conversationContext'])

    payload = build_payload(MODEL, st.session_state['conversationContext'])
    response = send_payload(payload)

    st.session_state['conversationContext'].append({'role': 'assistant', 'content': response})
    return response

def main():
    st.title('GitHub Issue Analyzer')

    with st.expander("Add/Change API Key"):
        new_api_key = st.text_input("Enter your OpenAI API key here", type="password")
        save_button = st.button("Save API Key")
        if save_button:
            st.session_state['api_key'] = new_api_key
            st.success("API Key saved!")

    uploaded_files = st.file_uploader("Upload Code Files:", accept_multiple_files=True, type=['js', 'py', 'java', 'ts', 'tsx', 'html'])

    issue_text = st.text_area("Paste GitHub Issue:", height=150)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        if st.button("Ingest Code"):
            if uploaded_files:
                st.success("Files ingested and processed.")
            else:
                st.error("Please upload code files first.")

    with col2:
        if st.button("Analyze Issue"):
            if issue_text:
                st.write("Issue analysis in progress...")
            else:
                st.warning("Please paste the GitHub issue before analyzing.")

    with col3:
        if st.button("Scan Code"):
            if issue_text:
                st.write("Scanning code...")
            else:
                st.warning("Please enter an issue description first.")

    with col4:
        if st.button("Find Solutions"):
            if issue_text:
                st.write("Finding solutions...")
            else:
                st.warning("Please enter an issue description first.")

    with st.container():
        st.header("Analysis Report:")
        analysis_result = st.empty()

        st.header("Possible Solutions:")
        solutions = st.empty()

        st.header("Coded Solutions:")
        coded_solutions = st.empty()

if __name__ == "__main__":
    main()
